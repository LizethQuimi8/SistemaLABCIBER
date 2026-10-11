package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.PlanificacionEstrategica;
import ec.edu.espe.lici.document.repository.PlanificacionEstrategicaRepository;
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

class PlanificacionEstrategicaControllerTest {

    private PlanificacionEstrategicaRepository planificacionEstrategicaRepository;
    private PlanificacionEstrategicaController controller;

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        planificacionEstrategicaRepository = mock(PlanificacionEstrategicaRepository.class);
        controller = new PlanificacionEstrategicaController(planificacionEstrategicaRepository, storageDir.toString());
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

    private PlanificacionEstrategica documentoDe(Long id) {
        return PlanificacionEstrategica.builder().id(id).titulo("Plan Estrategico 2026-2030").usuarioId(1L).build();
    }

    @Test
    void listarEsPublicoParaCualquierUsuarioAutenticado() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(planificacionEstrategicaRepository.findAll()).thenReturn(List.of(documentoDe(1L), documentoDe(2L)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void unDocenteNoPuedeCrearUnDocumento() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        MockMultipartFile archivo = new MockMultipartFile("archivo", "plan.pdf", "application/pdf", "contenido".getBytes());

        assertThatThrownBy(() -> controller.crear("Plan", 2026, null, archivo))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(planificacionEstrategicaRepository, never()).save(any());
    }

    @Test
    void unAdministradorPuedeCrearUnDocumentoYGuardaElArchivo() throws IOException {
        authenticateAs(1L, "ADMINISTRADOR");
        when(planificacionEstrategicaRepository.save(any(PlanificacionEstrategica.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "plan.pdf", "application/pdf", "contenido".getBytes());

        var response = controller.crear("Plan Estrategico 2026-2030", 2026, "Descripcion", archivo);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        PlanificacionEstrategica creado = response.getBody();
        assertThat(creado.getTitulo()).isEqualTo("Plan Estrategico 2026-2030");
        assertThat(creado.getAnio()).isEqualTo(2026);
        assertThat(creado.getNombreArchivo()).isEqualTo("plan.pdf");
        assertThat(creado.getContentType()).isEqualTo("application/pdf");
        assertThat(creado.getRutaArchivo()).endsWith(".pdf");
        assertThat(storageDir.resolve(creado.getRutaArchivo())).exists();
    }

    @Test
    void unDocenteNoPuedeActualizarUnDocumento() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");

        assertThatThrownBy(() -> controller.actualizar(1L, "Nuevo titulo", null, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(planificacionEstrategicaRepository, never()).save(any());
    }

    @Test
    void unAdministradorPuedeActualizarElTituloSinReemplazarElArchivo() throws IOException {
        authenticateAs(1L, "ADMINISTRADOR");
        PlanificacionEstrategica existente = documentoDe(1L);
        existente.setRutaArchivo("planificacion-1-viejo.pdf");
        when(planificacionEstrategicaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(planificacionEstrategicaRepository.save(any(PlanificacionEstrategica.class))).thenAnswer(inv -> inv.getArgument(0));

        PlanificacionEstrategica actualizado = controller.actualizar(1L, "Titulo actualizado", 2027, "Nueva descripcion", null);

        assertThat(actualizado.getTitulo()).isEqualTo("Titulo actualizado");
        assertThat(actualizado.getRutaArchivo()).isEqualTo("planificacion-1-viejo.pdf");
    }

    @Test
    void unDocenteNoPuedeEliminarUnDocumento() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");

        assertThatThrownBy(() -> controller.eliminar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(planificacionEstrategicaRepository, never()).delete(any());
    }

    @Test
    void unAdministradorSiPuedeEliminarUnDocumento() {
        authenticateAs(1L, "ADMINISTRADOR");
        PlanificacionEstrategica existente = documentoDe(1L);
        when(planificacionEstrategicaRepository.findById(1L)).thenReturn(Optional.of(existente));

        controller.eliminar(1L);

        verify(planificacionEstrategicaRepository).delete(existente);
    }

    @Test
    void descargarArchivoDevuelveElRecursoConElContentTypeOriginal() throws IOException {
        authenticateAs(1L, "ADMINISTRADOR");
        when(planificacionEstrategicaRepository.save(any(PlanificacionEstrategica.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "plan.pdf", "application/pdf", "contenido".getBytes());
        PlanificacionEstrategica creado = controller.crear("Plan", 2026, null, archivo).getBody();
        when(planificacionEstrategicaRepository.findById(creado.getId())).thenReturn(Optional.of(creado));

        ResponseEntity<Resource> respuesta = controller.descargarArchivo(creado.getId());

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(respuesta.getBody().exists()).isTrue();
    }

    @Test
    void descargarArchivoLanzaNotFoundSiNoSeHaSubidoNada() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(planificacionEstrategicaRepository.findById(1L)).thenReturn(Optional.of(documentoDe(1L)));

        assertThatThrownBy(() -> controller.descargarArchivo(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
