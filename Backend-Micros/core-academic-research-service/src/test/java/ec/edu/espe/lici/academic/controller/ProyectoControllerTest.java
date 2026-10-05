package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.EstadoProyecto;
import ec.edu.espe.lici.academic.domain.Proyecto;
import ec.edu.espe.lici.academic.repository.ProyectoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
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

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        proyectoRepository = mock(ProyectoRepository.class);
        controller = new ProyectoController(proyectoRepository, storageDir.toString());
    }

    private MockMultipartFile documentoAprobacion() {
        return new MockMultipartFile("archivo", "aprobacion.pdf", "application/pdf", "contenido".getBytes());
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
    void cualquierUsuarioVeTodosLosProyectos() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findAll()).thenReturn(List.of(proyectoDe(1L, 5L), proyectoDe(2L, 9L)));

        List<Proyecto> resultado = controller.listar();

        assertThat(resultado).hasSize(2);
    }

    @Test
    void unDocentePuedeVerElProyectoDeOtroUsuario() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(proyectoDe(1L, 99L)));

        assertThat(controller.obtener(1L).getId()).isEqualTo(1L);
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
    void unDocenteNoPuedeEditarElProyectoDeOtroUsuario() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(proyectoDe(1L, 99L)));
        Proyecto request = Proyecto.builder().nombre("Actualizado").estado(EstadoProyecto.EN_EJECUCION).build();

        assertThatThrownBy(() -> controller.actualizar(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(proyectoRepository, never()).save(any());
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

    @Test
    void elResponsablePuedeSubirElDocumentoDeAprobacion() throws IOException {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(proyectoDe(1L, 7L)));
        when(proyectoRepository.save(any(Proyecto.class))).thenAnswer(inv -> inv.getArgument(0));

        Proyecto actualizado = controller.subirDocumentoAprobacion(1L, documentoAprobacion());

        assertThat(actualizado.getDocumentoAprobacionNombreArchivo()).isEqualTo("aprobacion.pdf");
        assertThat(actualizado.getDocumentoAprobacionRuta()).endsWith(".pdf");
        assertThat(storageDir.resolve(actualizado.getDocumentoAprobacionRuta())).exists();
    }

    @Test
    void unDocenteNoPuedeSubirElDocumentoDeAprobacionDeOtroUsuario() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(proyectoDe(1L, 99L)));

        assertThatThrownBy(() -> controller.subirDocumentoAprobacion(1L, documentoAprobacion()))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(proyectoRepository, never()).save(any());
    }

    @Test
    void cualquierUsuarioPuedeDescargarElDocumentoDeAprobacion() throws IOException {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(proyectoDe(1L, 7L)));
        when(proyectoRepository.save(any(Proyecto.class))).thenAnswer(inv -> inv.getArgument(0));
        Proyecto conDocumento = controller.subirDocumentoAprobacion(1L, documentoAprobacion());
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(conDocumento));

        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        ResponseEntity<Resource> respuesta = controller.descargarDocumentoAprobacion(1L);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getBody().exists()).isTrue();
    }

    @Test
    void descargarDocumentoAprobacionLanzaNotFoundSiNoSeHaSubidoNada() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(proyectoRepository.findById(1L)).thenReturn(Optional.of(proyectoDe(1L, 7L)));

        assertThatThrownBy(() -> controller.descargarDocumentoAprobacion(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
