package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.CyberRangeDocumento;
import ec.edu.espe.lici.document.repository.CyberRangeDocumentoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
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

class CyberRangeDocumentoControllerTest {

    private CyberRangeDocumentoRepository repository;
    private CyberRangeDocumentoController controller;

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        repository = mock(CyberRangeDocumentoRepository.class);
        controller = new CyberRangeDocumentoController(repository, storageDir.toString());
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
    void unDocenteNoPuedeCrearUnDocumento() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        MockMultipartFile archivo = new MockMultipartFile("archivo", "topologia.pdf", "application/pdf", "contenido".getBytes());

        assertThatThrownBy(() -> controller.crear("Topologia", null, archivo))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }

    @Test
    void unAdministradorPuedeCrearUnDocumentoYGuardaElArchivo() throws IOException {
        authenticateAs(1L, "ADMINISTRADOR");
        when(repository.save(any(CyberRangeDocumento.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "topologia.pdf", "application/pdf", "contenido".getBytes());

        var response = controller.crear("Topologia del escenario 1", "Descripcion", archivo);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getTitulo()).isEqualTo("Topologia del escenario 1");
        assertThat(response.getBody().getRutaArchivo()).endsWith(".pdf");
        assertThat(storageDir.resolve(response.getBody().getRutaArchivo())).exists();
    }

    @Test
    void listarEsPublicoParaCualquierUsuarioAutenticado() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(repository.findAll()).thenReturn(List.of(
                CyberRangeDocumento.builder().id(1L).titulo("Doc 1").usuarioId(1L).build()));

        assertThat(controller.listar()).hasSize(1);
    }

    @Test
    void unDocenteNoPuedeEliminarUnDocumento() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");

        assertThatThrownBy(() -> controller.eliminar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).delete(any());
    }

    @Test
    void unAdministradorSiPuedeEliminarUnDocumento() {
        authenticateAs(1L, "ADMINISTRADOR");
        CyberRangeDocumento existente = CyberRangeDocumento.builder().id(1L).titulo("Doc").usuarioId(1L).build();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));

        controller.eliminar(1L);

        verify(repository).delete(existente);
    }

    @Test
    void descargarArchivoLanzaNotFoundSiNoSeHaSubidoNada() {
        when(repository.findById(1L)).thenReturn(Optional.of(
                CyberRangeDocumento.builder().id(1L).titulo("Doc").usuarioId(1L).build()));

        assertThatThrownBy(() -> controller.descargarArchivo(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
