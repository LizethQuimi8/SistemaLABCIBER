package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Investigador;
import ec.edu.espe.lici.academic.repository.InvestigadorRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InvestigadorControllerTest {

    private InvestigadorRepository investigadorRepository;
    private InvestigadorController controller;

    @BeforeEach
    void setUp() {
        investigadorRepository = mock(InvestigadorRepository.class);
        controller = new InvestigadorController(investigadorRepository);
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

    private Investigador investigadorDe(Long id, long usuarioId) {
        return Investigador.builder().id(id).usuarioId(usuarioId).nombreCompleto("Ada Lovelace").build();
    }

    @Test
    void listarEsPublicoParaCualquierUsuarioAutenticado() {
        authenticateAs(1L, "DOCENTE_INVESTIGADOR");
        when(investigadorRepository.findAll()).thenReturn(List.of(investigadorDe(1L, 5L), investigadorDe(2L, 9L)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void crearAsignaAlDocenteComoDuenoDelPerfil() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Investigador nuevo = Investigador.builder().nombreCompleto("Ada").usuarioId(999L).build();
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getUsuarioId()).isEqualTo(5L);
    }

    @Test
    void unDocenteNoPuedeEditarElPerfilDeOtro() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigadorDe(1L, 42L)));
        Investigador request = Investigador.builder().nombreCompleto("Otro nombre").build();

        assertThatThrownBy(() -> controller.actualizar(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(investigadorRepository, never()).save(any());
    }

    @Test
    void unAdministradorPuedeEditarCualquierPerfil() {
        authenticateAs(1L, "ADMINISTRADOR");
        Investigador existente = investigadorDe(1L, 42L);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));
        Investigador request = Investigador.builder().nombreCompleto("Nombre actualizado").build();

        Investigador actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getNombreCompleto()).isEqualTo("Nombre actualizado");
    }

    @Test
    void unDocenteNoPuedeEliminarElPerfilDeOtro() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigadorDe(1L, 42L)));

        assertThatThrownBy(() -> controller.eliminar(1L)).isInstanceOf(ResponseStatusException.class);

        verify(investigadorRepository, never()).delete(any());
    }
}
