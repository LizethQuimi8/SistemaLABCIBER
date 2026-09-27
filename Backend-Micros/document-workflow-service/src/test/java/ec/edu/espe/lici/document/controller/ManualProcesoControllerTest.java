package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.ManualProceso;
import ec.edu.espe.lici.document.repository.ManualProcesoRepository;
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

class ManualProcesoControllerTest {

    private ManualProcesoRepository manualProcesoRepository;
    private ManualProcesoController controller;

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        manualProcesoRepository = mock(ManualProcesoRepository.class);
        controller = new ManualProcesoController(manualProcesoRepository, storageDir.toString());
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

    private ManualProceso manualDe(Long id) {
        return ManualProceso.builder().id(id).titulo("Manual de laboratorio").usuarioId(1L).build();
    }

    @Test
    void listarEsPublicoParaCualquierUsuarioAutenticado() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(manualProcesoRepository.findAll()).thenReturn(List.of(manualDe(1L), manualDe(2L)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void unDocenteNoPuedeCrearUnManual() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        MockMultipartFile archivo = new MockMultipartFile("archivo", "manual.pdf", "application/pdf", "contenido".getBytes());

        assertThatThrownBy(() -> controller.crear("Manual", null, archivo))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(manualProcesoRepository, never()).save(any());
    }

    @Test
    void unAdministradorPuedeCrearUnManualYGuardaElArchivo() throws IOException {
        authenticateAs(1L, "ADMINISTRADOR");
        when(manualProcesoRepository.save(any(ManualProceso.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "manual.pdf", "application/pdf", "contenido".getBytes());

        var response = controller.crear("Manual de laboratorio", "Descripcion", archivo);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ManualProceso creado = response.getBody();
        assertThat(creado.getTitulo()).isEqualTo("Manual de laboratorio");
        assertThat(creado.getNombreArchivo()).isEqualTo("manual.pdf");
        assertThat(creado.getContentType()).isEqualTo("application/pdf");
        assertThat(creado.getRutaArchivo()).endsWith(".pdf");
        assertThat(storageDir.resolve(creado.getRutaArchivo())).exists();
    }

    @Test
    void unDocenteNoPuedeActualizarUnManual() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");

        assertThatThrownBy(() -> controller.actualizar(1L, "Nuevo titulo", null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(manualProcesoRepository, never()).save(any());
    }

    @Test
    void unAdministradorPuedeActualizarElTituloSinReemplazarElArchivo() throws IOException {
        authenticateAs(1L, "ADMINISTRADOR");
        ManualProceso existente = manualDe(1L);
        existente.setRutaArchivo("manual-1-viejo.pdf");
        when(manualProcesoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(manualProcesoRepository.save(any(ManualProceso.class))).thenAnswer(inv -> inv.getArgument(0));

        ManualProceso actualizado = controller.actualizar(1L, "Titulo actualizado", "Nueva descripcion", null);

        assertThat(actualizado.getTitulo()).isEqualTo("Titulo actualizado");
        assertThat(actualizado.getRutaArchivo()).isEqualTo("manual-1-viejo.pdf");
    }

    @Test
    void unDocenteNoPuedeEliminarUnManual() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");

        assertThatThrownBy(() -> controller.eliminar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(manualProcesoRepository, never()).delete(any());
    }

    @Test
    void unAdministradorSiPuedeEliminarUnManual() {
        authenticateAs(1L, "ADMINISTRADOR");
        ManualProceso existente = manualDe(1L);
        when(manualProcesoRepository.findById(1L)).thenReturn(Optional.of(existente));

        controller.eliminar(1L);

        verify(manualProcesoRepository).delete(existente);
    }

    @Test
    void descargarArchivoDevuelveElRecursoConElContentTypeOriginal() throws IOException {
        authenticateAs(1L, "ADMINISTRADOR");
        when(manualProcesoRepository.save(any(ManualProceso.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "manual.pdf", "application/pdf", "contenido".getBytes());
        ManualProceso creado = controller.crear("Manual", null, archivo).getBody();
        when(manualProcesoRepository.findById(creado.getId())).thenReturn(Optional.of(creado));

        ResponseEntity<Resource> respuesta = controller.descargarArchivo(creado.getId());

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(respuesta.getBody().exists()).isTrue();
    }

    @Test
    void descargarArchivoLanzaNotFoundSiNoSeHaSubidoNada() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(manualProcesoRepository.findById(1L)).thenReturn(Optional.of(manualDe(1L)));

        assertThatThrownBy(() -> controller.descargarArchivo(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
