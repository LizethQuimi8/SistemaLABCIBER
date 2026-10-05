package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.CompraPublica;
import ec.edu.espe.lici.admin.domain.FaseCompra;
import ec.edu.espe.lici.admin.repository.CompraPublicaRepository;
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

class CompraPublicaControllerTest {

    private CompraPublicaRepository repository;
    private CompraPublicaController controller;

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        repository = mock(CompraPublicaRepository.class);
        controller = new CompraPublicaController(repository, storageDir.toString());
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

    private CompraPublica compraDe(Long id, Long usuarioSolicitanteId, String responsableIds) {
        return CompraPublica.builder().id(id).objetoContratacion("Compra de equipos")
                .fase(FaseCompra.PREPARATORIA).anio(2026)
                .usuarioSolicitanteId(usuarioSolicitanteId).responsableIds(responsableIds).build();
    }

    @Test
    void listarDevuelveTodasLasCompras() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(repository.findAll()).thenReturn(List.of(compraDe(1L, 5L, null), compraDe(2L, 5L, null)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void obtenerLanzaNotFoundCuandoNoExiste() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.obtener(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void crearIgnoraElIdEnviadoYAsignaAlCreadorComoSolicitante() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        CompraPublica nueva = CompraPublica.builder().id(999L).objetoContratacion("Nueva compra").anio(2026).build();
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nueva);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNull();
        assertThat(response.getBody().getUsuarioSolicitanteId()).isEqualTo(7L);
    }

    @Test
    void elCreadorPuedeActualizarSuPropioProceso() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        CompraPublica existente = compraDe(1L, 7L, null);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));
        CompraPublica request = CompraPublica.builder().objetoContratacion("Compra actualizada")
                .fase(FaseCompra.CONTRACTUAL).numeroProceso("SIE-2026-01").anio(2027)
                .responsables("Ing. Gancino").responsableIds("12").build();

        CompraPublica actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getObjetoContratacion()).isEqualTo("Compra actualizada");
        assertThat(actualizado.getFase()).isEqualTo(FaseCompra.CONTRACTUAL);
        assertThat(actualizado.getNumeroProceso()).isEqualTo("SIE-2026-01");
        assertThat(actualizado.getAnio()).isEqualTo(2027);
        assertThat(actualizado.getResponsables()).isEqualTo("Ing. Gancino");
        assertThat(actualizado.getResponsableIds()).isEqualTo("12");
    }

    @Test
    void unResponsableListadoPuedeActualizarElProceso() {
        authenticateAs(12L, "DOCENTE_INVESTIGADOR");
        CompraPublica existente = compraDe(1L, 7L, "12,15");
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));
        CompraPublica request = CompraPublica.builder().objetoContratacion("Actualizado por responsable")
                .fase(FaseCompra.PREPARATORIA).anio(2026).responsableIds("12,15").build();

        CompraPublica actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getObjetoContratacion()).isEqualTo("Actualizado por responsable");
    }

    @Test
    void unUsuarioAjenoNoPuedeActualizarElProceso() {
        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        CompraPublica existente = compraDe(1L, 7L, "12,15");
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        CompraPublica request = CompraPublica.builder().objetoContratacion("Intento ajeno").anio(2026).build();

        assertThatThrownBy(() -> controller.actualizar(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }

    @Test
    void unAdministradorPuedeActualizarCualquierProceso() {
        authenticateAs(1L, "ADMINISTRADOR");
        CompraPublica existente = compraDe(1L, 7L, "12,15");
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));
        CompraPublica request = CompraPublica.builder().objetoContratacion("Editado por admin").anio(2026).build();

        CompraPublica actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getObjetoContratacion()).isEqualTo("Editado por admin");
    }

    @Test
    void cambiarFaseActualizaSoloLaFaseCuandoEsResponsable() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        CompraPublica existente = compraDe(1L, 7L, null);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));

        CompraPublica actualizado = controller.cambiarFase(1L, FaseCompra.ENTREGA_BIENES);

        assertThat(actualizado.getFase()).isEqualTo(FaseCompra.ENTREGA_BIENES);
        assertThat(actualizado.getObjetoContratacion()).isEqualTo("Compra de equipos");
    }

    @Test
    void unUsuarioAjenoNoPuedeCambiarLaFase() {
        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(compraDe(1L, 7L, "12")));

        assertThatThrownBy(() -> controller.cambiarFase(1L, FaseCompra.ENTREGA_BIENES))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void eliminarLanzaNotFoundCuandoNoExiste() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(repository.existsById(5L)).thenReturn(false);

        assertThatThrownBy(() -> controller.eliminar(5L)).isInstanceOf(ResponseStatusException.class);

        verify(repository, never()).deleteById(any());
    }

    @Test
    void soloElAdministradorPuedeEliminar() {
        authenticateAs(7L, "RESPONSABLE_COMPRAS");

        assertThatThrownBy(() -> controller.eliminar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).deleteById(any());
    }

    @Test
    void subirArchivoGuardaElBinarioYActualizaLosMetadatosCuandoEsElCreador() throws IOException {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        CompraPublica compra = compraDe(1L, 7L, null);
        when(repository.findById(1L)).thenReturn(Optional.of(compra));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "resolucion.pdf", "application/pdf", "contenido".getBytes());

        CompraPublica actualizado = controller.subirArchivo(1L, archivo);

        assertThat(actualizado.getArchivoNombreArchivo()).isEqualTo("resolucion.pdf");
        assertThat(actualizado.getArchivoContentType()).isEqualTo("application/pdf");
        assertThat(actualizado.getArchivoRuta()).endsWith(".pdf");
        assertThat(storageDir.resolve(actualizado.getArchivoRuta())).exists();
    }

    @Test
    void unUsuarioAjenoNoPuedeSubirElArchivo() {
        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(compraDe(1L, 7L, "12")));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "resolucion.pdf", "application/pdf", "contenido".getBytes());

        assertThatThrownBy(() -> controller.subirArchivo(1L, archivo))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }

    @Test
    void descargarArchivoDevuelveElRecursoConElContentTypeOriginal() throws IOException {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        CompraPublica compra = compraDe(1L, 7L, null);
        when(repository.findById(1L)).thenReturn(Optional.of(compra));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "resolucion.pdf", "application/pdf", "contenido".getBytes());
        CompraPublica subido = controller.subirArchivo(1L, archivo);
        when(repository.findById(1L)).thenReturn(Optional.of(subido));

        ResponseEntity<Resource> respuesta = controller.descargarArchivo(1L);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(respuesta.getBody().exists()).isTrue();
    }

    @Test
    void descargarArchivoLanzaNotFoundSiNoSeHaSubidoNada() {
        when(repository.findById(1L)).thenReturn(Optional.of(compraDe(1L, 7L, null)));

        assertThatThrownBy(() -> controller.descargarArchivo(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void subirZipEntregaRechazaSiLaFaseAunNoLlegaAEntregaDeBienes() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(compraDe(1L, 7L, null)));
        MockMultipartFile zip = new MockMultipartFile("archivo", "entrega.zip", "application/zip", "contenido".getBytes());

        assertThatThrownBy(() -> controller.subirZipEntrega(1L, zip))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void subirZipEntregaRechazaUnArchivoQueNoEsZip() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        CompraPublica compra = compraDe(1L, 7L, null);
        compra.setFase(FaseCompra.ENTREGA_BIENES);
        when(repository.findById(1L)).thenReturn(Optional.of(compra));
        MockMultipartFile noZip = new MockMultipartFile("archivo", "documento.pdf", "application/pdf", "contenido".getBytes());

        assertThatThrownBy(() -> controller.subirZipEntrega(1L, noZip))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void unResponsablePuedeSubirElZipDeEntregaUnaVezEnEsaFase() throws IOException {
        authenticateAs(12L, "DOCENTE_INVESTIGADOR");
        CompraPublica compra = compraDe(1L, 7L, "12");
        compra.setFase(FaseCompra.ENTREGA_BIENES);
        when(repository.findById(1L)).thenReturn(Optional.of(compra));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile zip = new MockMultipartFile("archivo", "entrega.zip", "application/zip", "contenido".getBytes());

        CompraPublica actualizado = controller.subirZipEntrega(1L, zip);

        assertThat(actualizado.getZipEntregaNombreArchivo()).isEqualTo("entrega.zip");
        assertThat(actualizado.getZipEntregaRuta()).endsWith(".zip");
        assertThat(storageDir.resolve(actualizado.getZipEntregaRuta())).exists();
    }

    @Test
    void unUsuarioAjenoNoPuedeSubirElZipDeEntrega() {
        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        CompraPublica compra = compraDe(1L, 7L, "12");
        compra.setFase(FaseCompra.ENTREGA_BIENES);
        when(repository.findById(1L)).thenReturn(Optional.of(compra));
        MockMultipartFile zip = new MockMultipartFile("archivo", "entrega.zip", "application/zip", "contenido".getBytes());

        assertThatThrownBy(() -> controller.subirZipEntrega(1L, zip))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }
}
