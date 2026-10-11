package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.InformacionLaboratorio;
import ec.edu.espe.lici.document.repository.InformacionLaboratorioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InformacionLaboratorioControllerTest {

    private InformacionLaboratorioRepository repository;
    private InformacionLaboratorioController controller;

    @BeforeEach
    void setUp() {
        repository = mock(InformacionLaboratorioRepository.class);
        controller = new InformacionLaboratorioController(repository);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(long userId, String rol) {
        Jwt jwt = new Jwt(
                "token",
                Instant.now(),
                Instant.now().plusSeconds(60),
                Map.of("alg", "RS256"),
                Map.of("sub", String.valueOf(userId), "roles", List.of(rol)));
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    @Test
    void obtenerDevuelveUnObjetoVacioSiNoHayNadaGuardado() {
        when(repository.findAll()).thenReturn(List.of());

        InformacionLaboratorio info = controller.obtener();

        assertThat(info.getMision()).isNull();
        assertThat(info.getId()).isNull();
    }

    @Test
    void obtenerDevuelveElRegistroExistente() {
        InformacionLaboratorio existente = InformacionLaboratorio.builder().id(1L).mision("Nuestra mision").build();
        when(repository.findAll()).thenReturn(List.of(existente));

        assertThat(controller.obtener().getMision()).isEqualTo("Nuestra mision");
    }

    @Test
    void unDocenteNoPuedeActualizarLaInformacion() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        InformacionLaboratorio request = InformacionLaboratorio.builder().mision("Intento").build();

        assertThatThrownBy(() -> controller.actualizar(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }

    @Test
    void unAdministradorPuedeCrearLaInformacionLaPrimeraVez() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(repository.findAll()).thenReturn(List.of());
        when(repository.save(any(InformacionLaboratorio.class))).thenAnswer(inv -> inv.getArgument(0));
        InformacionLaboratorio request = InformacionLaboratorio.builder()
                .queEsElLaboratorio("Descripcion").mision("Mision").vision("Vision").objetivos("Objetivos").build();

        InformacionLaboratorio actualizado = controller.actualizar(request);

        assertThat(actualizado.getMision()).isEqualTo("Mision");
        assertThat(actualizado.getVision()).isEqualTo("Vision");
    }

    @Test
    void unAdministradorActualizaElRegistroExistenteEnVezDeCrearUnoNuevo() {
        authenticateAs(1L, "ADMINISTRADOR");
        InformacionLaboratorio existente = InformacionLaboratorio.builder().id(7L).mision("Vieja").build();
        when(repository.findAll()).thenReturn(List.of(existente));
        when(repository.save(any(InformacionLaboratorio.class))).thenAnswer(inv -> inv.getArgument(0));
        InformacionLaboratorio request = InformacionLaboratorio.builder().mision("Nueva mision").build();

        InformacionLaboratorio actualizado = controller.actualizar(request);

        assertThat(actualizado.getId()).isEqualTo(7L);
        assertThat(actualizado.getMision()).isEqualTo("Nueva mision");
    }
}
