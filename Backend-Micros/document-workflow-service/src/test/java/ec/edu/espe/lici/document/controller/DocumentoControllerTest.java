package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.Documento;
import ec.edu.espe.lici.document.domain.EstadoDocumento;
import ec.edu.espe.lici.document.domain.TipoDocumento;
import ec.edu.espe.lici.document.repository.DocumentoRepository;
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

class DocumentoControllerTest {

    private DocumentoRepository documentoRepository;
    private DocumentoController controller;

    @BeforeEach
    void setUp() {
        documentoRepository = mock(DocumentoRepository.class);
        controller = new DocumentoController(documentoRepository);
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

    private Documento documentoDe(Long id, Long usuarioId, Long firmanteId) {
        return Documento.builder().id(id).titulo("Doc").tipo(TipoDocumento.OFICIO)
                .estado(EstadoDocumento.BORRADOR).usuarioId(usuarioId).firmanteId(firmanteId).build();
    }

    @Test
    void elFirmantePuedeVerElDocumentoAunqueNoSeaElDueno() {
        authenticateAs(20L, "DOCENTE_INVESTIGADOR");
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documentoDe(1L, 5L, 20L)));

        Documento resultado = controller.obtener(1L);

        assertThat(resultado.getId()).isEqualTo(1L);
    }

    @Test
    void unTerceroSinRelacionNoPuedeVerElDocumento() {
        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documentoDe(1L, 5L, 20L)));

        assertThatThrownBy(() -> controller.obtener(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void elFirmanteNoPuedeEliminarUnDocumentoQueNoLePertenece() {
        authenticateAs(20L, "DOCENTE_INVESTIGADOR");
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documentoDe(1L, 5L, 20L)));

        assertThatThrownBy(() -> controller.eliminar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(documentoRepository, never()).delete(any());
    }

    @Test
    void elPropietarioSiPuedeEliminarSuDocumento() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Documento documento = documentoDe(1L, 5L, 20L);
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documento));

        controller.eliminar(1L);

        verify(documentoRepository).delete(documento);
    }

    @Test
    void listarCombinaDocumentosPropiosYDondeEsFirmante() {
        authenticateAs(20L, "DOCENTE_INVESTIGADOR");
        when(documentoRepository.findByUsuarioIdOrFirmanteId(20L, 20L))
                .thenReturn(List.of(documentoDe(1L, 5L, 20L)));

        assertThat(controller.listar()).hasSize(1);
        verify(documentoRepository, never()).findAll();
    }

    @Test
    void crearAsignaAlDocenteComoPropietario() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Documento nuevo = Documento.builder().titulo("Nuevo").tipo(TipoDocumento.INFORME).usuarioId(999L).build();
        when(documentoRepository.save(any(Documento.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getBody().getUsuarioId()).isEqualTo(5L);
    }
}
