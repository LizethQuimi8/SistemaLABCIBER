package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.Documento;
import ec.edu.espe.lici.document.domain.EstadoDocumento;
import ec.edu.espe.lici.document.domain.TipoDocumento;
import ec.edu.espe.lici.document.repository.DocumentoRepository;
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

class DocumentoControllerTest {

    private DocumentoRepository documentoRepository;
    private DocumentoController controller;

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        documentoRepository = mock(DocumentoRepository.class);
        controller = new DocumentoController(documentoRepository, storageDir.toString());
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

    private Documento documentoDe(Long id, Long usuarioId) {
        return Documento.builder().id(id).titulo("Doc").tipo(TipoDocumento.INFORME)
                .estado(EstadoDocumento.BORRADOR).usuarioId(usuarioId).build();
    }

    @Test
    void listarDevuelveTodosLosDocumentosACualquierUsuario() {
        authenticateAs(20L, "DOCENTE_INVESTIGADOR");
        when(documentoRepository.findAll()).thenReturn(List.of(documentoDe(1L, 5L), documentoDe(2L, 9L)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void cualquierUsuarioPuedeVerUnDocumentoQueNoLePertenece() {
        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documentoDe(1L, 5L)));

        assertThat(controller.obtener(1L).getId()).isEqualTo(1L);
    }

    @Test
    void crearAsignaComoPropietarioAQuienLoSube() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Documento nuevo = Documento.builder().titulo("Nuevo").tipo(TipoDocumento.MEMORANDO).build();
        when(documentoRepository.save(any(Documento.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getBody().getUsuarioId()).isEqualTo(5L);
    }

    @Test
    void cualquierUsuarioPuedeEditarUnDocumentoQueNoLePertenece() {
        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documentoDe(1L, 5L)));
        when(documentoRepository.save(any(Documento.class))).thenAnswer(inv -> inv.getArgument(0));
        Documento request = Documento.builder().titulo("Editado").tipo(TipoDocumento.OTRO)
                .estado(EstadoDocumento.ARCHIVADO).build();

        Documento actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getTitulo()).isEqualTo("Editado");
    }

    @Test
    void subirArchivoGuardaElBinarioYActualizaLosMetadatos() throws IOException {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Documento documento = documentoDe(1L, 5L);
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documento));
        when(documentoRepository.save(any(Documento.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "informe.pdf", "application/pdf", "contenido".getBytes());

        Documento actualizado = controller.subirArchivo(1L, archivo);

        assertThat(actualizado.getNombreArchivo()).isEqualTo("informe.pdf");
        assertThat(actualizado.getContentType()).isEqualTo("application/pdf");
        assertThat(actualizado.getRutaArchivo()).endsWith(".pdf");
        assertThat(actualizado.getHashArchivo()).isNotBlank();
        assertThat(storageDir.resolve(actualizado.getRutaArchivo())).exists();
    }

    @Test
    void descargarArchivoDevuelveElRecursoConElContentTypeOriginal() throws IOException {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Documento documento = documentoDe(1L, 5L);
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documento));
        when(documentoRepository.save(any(Documento.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "informe.pdf", "application/pdf", "contenido".getBytes());
        Documento subido = controller.subirArchivo(1L, archivo);
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(subido));

        ResponseEntity<Resource> respuesta = controller.descargarArchivo(1L);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(respuesta.getBody().exists()).isTrue();
    }

    @Test
    void descargarArchivoLanzaNotFoundSiNoSeHaSubidoNada() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documentoDe(1L, 5L)));

        assertThatThrownBy(() -> controller.descargarArchivo(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void unDocenteNoPuedeEliminarNiSuPropioDocumento() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");

        assertThatThrownBy(() -> controller.eliminar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(documentoRepository, never()).delete(any());
    }

    @Test
    void unAdministradorSiPuedeEliminarCualquierDocumento() {
        authenticateAs(1L, "ADMINISTRADOR");
        Documento documento = documentoDe(1L, 5L);
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documento));

        controller.eliminar(1L);

        verify(documentoRepository).delete(documento);
    }
}
