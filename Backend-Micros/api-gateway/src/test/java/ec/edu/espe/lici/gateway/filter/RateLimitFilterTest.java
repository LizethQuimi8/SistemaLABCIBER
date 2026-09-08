package ec.edu.espe.lici.gateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    @Test
    void allowsRequestsWithinTheLimitAndRejectsOnceItIsExceeded() {
        RateLimitFilter filter = new RateLimitFilter(3, 60);
        ServerWebExchange exchange = exchangeFrom("192.168.1.10", 5555);

        for (int i = 0; i < 3; i++) {
            filter.filter(exchange, ex -> Mono.empty()).block();
            assertThat(exchange.getResponse().getStatusCode()).isNull();
        }

        filter.filter(exchange, ex -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void tracksEachClientIpIndependently() {
        RateLimitFilter filter = new RateLimitFilter(1, 60);
        ServerWebExchange first = exchangeFrom("10.0.0.1", 1111);
        ServerWebExchange second = exchangeFrom("10.0.0.2", 2222);

        filter.filter(first, ex -> Mono.empty()).block();
        filter.filter(second, ex -> Mono.empty()).block();

        assertThat(first.getResponse().getStatusCode()).isNull();
        assertThat(second.getResponse().getStatusCode()).isNull();
    }

    private ServerWebExchange exchangeFrom(String ip, int port) {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/auth/login")
                .remoteAddress(new InetSocketAddress(ip, port))
                .build();
        return MockServerWebExchange.from(request);
    }
}
