package ec.edu.espe.lici.reporting.controller;

import ec.edu.espe.lici.reporting.dto.ReporteResumenDTO;
import ec.edu.espe.lici.reporting.service.ReporteAggregatorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReporteControllerTest {

    private ReporteAggregatorService aggregatorService;
    private ReporteController controller;

    @BeforeEach
    void setUp() {
        aggregatorService = mock(ReporteAggregatorService.class);
        controller = new ReporteController(aggregatorService);
    }

    private JwtAuthenticationToken tokenFor(String email, String rol) {
        Jwt jwt = new Jwt(
                "raw-token-value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "RS256"),
                Map.of("email", email, "roles", java.util.List.of(rol)));
        return new JwtAuthenticationToken(jwt);
    }

    @Test
    void mapsEachAggregatedCountToTheCorrectDtoFieldInOrder() {
        when(aggregatorService.contarProyectos("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(1)));
        when(aggregatorService.contarInvestigadores("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(2)));
        when(aggregatorService.contarPublicaciones("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(3)));
        when(aggregatorService.contarDocumentos("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(4)));
        when(aggregatorService.contarMemos("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(5)));
        when(aggregatorService.contarBienesInventario("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(6)));
        when(aggregatorService.contarComprasPublicas("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(7)));
        when(aggregatorService.contarUsuarios("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(8)));

        Mono<ReporteResumenDTO> result = controller.resumen(tokenFor("ada@espe.edu.ec", "ADMINISTRADOR"));

        StepVerifier.create(result)
                .expectNext(new ReporteResumenDTO("ada@espe.edu.ec", "ADMINISTRADOR", 1, 2, 3, 4, 5, 6, 7, 8))
                .verifyComplete();
    }

    @Test
    void leavesTheFieldNullWhenTheDownstreamServiceDeniedAccess() {
        when(aggregatorService.contarProyectos("Bearer raw-token-value")).thenReturn(Mono.just(Optional.empty()));
        when(aggregatorService.contarInvestigadores("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(2)));
        when(aggregatorService.contarPublicaciones("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(3)));
        when(aggregatorService.contarDocumentos("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(4)));
        when(aggregatorService.contarMemos("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(5)));
        when(aggregatorService.contarBienesInventario("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(6)));
        when(aggregatorService.contarComprasPublicas("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(7)));
        when(aggregatorService.contarUsuarios("Bearer raw-token-value")).thenReturn(Mono.just(Optional.of(8)));

        Mono<ReporteResumenDTO> result = controller.resumen(tokenFor("docente@espe.edu.ec", "DOCENTE_INVESTIGADOR"));

        StepVerifier.create(result)
                .expectNextMatches(dto -> dto.totalProyectos() == null && dto.totalInvestigadores() == 2)
                .verifyComplete();
    }
}
