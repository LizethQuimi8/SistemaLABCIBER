package ec.edu.espe.lici.gateway.filter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Limitador de tasa simple por IP de cliente, en memoria (sin dependencia de Redis).
 * Suficiente para el despliegue actual (una sola instancia del gateway); si en el futuro
 * se corren multiples replicas del gateway, esto debe reemplazarse por un limitador
 * centralizado (p. ej. RequestRateLimiter de Spring Cloud Gateway respaldado por Redis).
 */
@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    private final int maxRequests;
    private final long windowMillis;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(
            @Value("${lici.rate-limit.max-requests:60}") int maxRequests,
            @Value("${lici.rate-limit.window-seconds:60}") long windowSeconds) {
        this.maxRequests = maxRequests;
        this.windowMillis = windowSeconds * 1000;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String clientId = resolveClientId(exchange.getRequest());
        Window window = windows.computeIfAbsent(clientId, id -> new Window());

        if (window.tryConsume(windowMillis, maxRequests)) {
            return chain.filter(exchange);
        }

        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        return exchange.getResponse().setComplete();
    }

    /**
     * Se usa la direccion TCP remota, no cabeceras como X-Forwarded-For, porque el
     * gateway recibe trafico directo del cliente y esas cabeceras son falsificables
     * por cualquiera que las envie.
     */
    private String resolveClientId(ServerHttpRequest request) {
        InetSocketAddress remoteAddress = request.getRemoteAddress();
        return remoteAddress != null && remoteAddress.getAddress() != null
                ? remoteAddress.getAddress().getHostAddress()
                : "unknown";
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000)
    void evictStaleWindows() {
        long now = Instant.now().toEpochMilli();
        windows.entrySet().removeIf(entry -> now - entry.getValue().windowStart.get() > windowMillis * 10);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private static final class Window {
        private final AtomicLong windowStart = new AtomicLong(Instant.now().toEpochMilli());
        private final AtomicInteger count = new AtomicInteger(0);

        synchronized boolean tryConsume(long windowMillis, int maxRequests) {
            long now = Instant.now().toEpochMilli();
            if (now - windowStart.get() >= windowMillis) {
                windowStart.set(now);
                count.set(0);
            }
            return count.incrementAndGet() <= maxRequests;
        }
    }
}
