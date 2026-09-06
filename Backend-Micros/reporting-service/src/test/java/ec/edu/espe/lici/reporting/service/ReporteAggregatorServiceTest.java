package ec.edu.espe.lici.reporting.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.test.StepVerifier;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Usa un HttpServer del JDK como doble de los servicios downstream para no
 * depender de mocks de red externos y para probar el camino no bloqueante real.
 */
class ReporteAggregatorServiceTest {

    private HttpServer server;
    private String baseUrl;
    private ReporteAggregatorService aggregatorService;

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/api/proyectos", exchange -> respond(exchange, 200, "[1,2,3]"));
        server.createContext("/api/investigadores", exchange -> respond(exchange, 403, ""));
        server.start();
        baseUrl = "http://localhost:" + server.getAddress().getPort();

        aggregatorService = new ReporteAggregatorService(
                WebClient.builder(), baseUrl, baseUrl, baseUrl, baseUrl);
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    private void respond(com.sun.net.httpserver.HttpExchange exchange, int status, String body) throws java.io.IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
        if (bytes.length > 0) {
            exchange.getResponseBody().write(bytes);
        }
        exchange.close();
    }

    @Test
    void returnsTheListSizeWrappedInOptionalWhenTheDownstreamCallSucceeds() {
        StepVerifier.create(aggregatorService.contarProyectos("Bearer test-token"))
                .expectNext(Optional.of(3))
                .verifyComplete();
    }

    @Test
    void returnsEmptyOptionalInsteadOfFailingWhenTheDownstreamCallIsForbidden() {
        StepVerifier.create(aggregatorService.contarInvestigadores("Bearer test-token"))
                .expectNext(Optional.empty())
                .verifyComplete();
    }
}
