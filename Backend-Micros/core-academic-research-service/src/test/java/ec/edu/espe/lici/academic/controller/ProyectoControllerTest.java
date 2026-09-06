package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.EstadoProyecto;
import ec.edu.espe.lici.academic.domain.Proyecto;
import ec.edu.espe.lici.academic.repository.ProyectoRepository;
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

class ProyectoControllerTest {

    private ProyectoRepository proyectoRepository;
    private ProyectoController controller;

    @BeforeEach
    void setUp() {
        proyectoRepository = mock(ProyectoRepository.class);
        controller = new ProyectoController(proyectoRepository);
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

    private Proyecto proyectoDe(Long id, long responsableId) {
        return Proyecto.builder().id(id).nombre("Proyecto X").estado(EstadoProyecto.EN_EJECUCION)
                .usuarioResponsableId(responsableId).build();
    }

    @Test
    void administradorVeTodosLosProyectos() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(proyectoRepository.findAll()).thenReturn(List.of(proyectoDe(1L, 5L), proyectoDe(2L, 9L)));

        List<Proyecto> resultado = controller.listar();

        assertThat(resultado).hasSize(2);
        verify(proyectoRepository, never()).findByUsuarioResponsableId(any());
    }

    @Test
    void docenteSoloVeSusPropiosProyectos() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findByUsuarioResponsableId(7L)).thenReturn(List.of(proyectoDe(3L, 7L)));

        List<Proyecto> resultado = controller.listar();

        assertThat(resultado).hasSize(1);
        verify(proyectoRepository, never()).findAll();
    }

    @Test
    void docenteNoPuedeVerElProyectoDeOtroUsuario() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(proyectoDe(1L, 99L)));

        assertThatThrownBy(() -> controller.obtener(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void obtenerLanzaNotFoundCuandoElProyectoNoExiste() {
        authenticateAs(7L, "ADMINISTRADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.obtener(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void crearAsignaAutomaticamenteAlDocenteComoResponsable() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        Proyecto nuevo = Proyecto.builder().nombre("Nuevo").estado(EstadoProyecto.PLANIFICACION)
                .usuarioResponsableId(999L).build();
        when(proyectoRepository.save(any(Proyecto.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getUsuarioResponsableId()).isEqualTo(7L);
    }

    @Test
    void crearRespetaElResponsableIndicadoCuandoLoCreaUnAdministrador() {
        authenticateAs(1L, "ADMINISTRADOR");
        Proyecto nuevo = Proyecto.builder().nombre("Nuevo").estado(EstadoProyecto.PLANIFICACION)
                .usuarioResponsableId(42L).build();
        when(proyectoRepository.save(any(Proyecto.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getBody().getUsuarioResponsableId()).isEqualTo(42L);
    }

    @Test
    void docenteNoPuedeEliminarElProyectoDeOtroUsuario() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(proyectoDe(1L, 99L)));

        assertThatThrownBy(() -> controller.eliminar(1L)).isInstanceOf(ResponseStatusException.class);

        verify(proyectoRepository, never()).delete(any());
    }

    @Test
    void docenteNoPuedeReasignarElResponsableAlActualizar() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        Proyecto existente = proyectoDe(1L, 7L);
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(proyectoRepository.save(any(Proyecto.class))).thenAnswer(inv -> inv.getArgument(0));
        Proyecto request = Proyecto.builder().nombre("Actualizado").estado(EstadoProyecto.EN_EJECUCION)
                .usuarioResponsableId(999L).build();

        Proyecto actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getUsuarioResponsableId()).isEqualTo(7L);
    }
}
