package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.CompraPublica;
import ec.edu.espe.lici.admin.domain.FaseCompra;
import ec.edu.espe.lici.admin.repository.CompraPublicaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
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

    private CompraPublica compraDe(Long id) {
        return CompraPublica.builder().id(id).objetoContratacion("Compra de equipos")
                .fase(FaseCompra.PREPARATORIA).anio(2026).build();
    }

    @Test
    void listarDevuelveTodasLasCompras() {
        when(repository.findAll()).thenReturn(List.of(compraDe(1L), compraDe(2L)));

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
    void crearIgnoraElIdEnviadoEnElCuerpo() {
        CompraPublica nueva = CompraPublica.builder().id(999L).objetoContratacion("Nueva compra").anio(2026).build();
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nueva);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNull();
    }

    @Test
    void actualizarSobrescribeLosCamposEditables() {
        CompraPublica existente = compraDe(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));
        CompraPublica request = CompraPublica.builder().objetoContratacion("Compra actualizada")
                .fase(FaseCompra.CONTRACTUAL).numeroProceso("SIE-2026-01").anio(2027)
                .responsables("Ing. Gancino").build();

        CompraPublica actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getObjetoContratacion()).isEqualTo("Compra actualizada");
        assertThat(actualizado.getFase()).isEqualTo(FaseCompra.CONTRACTUAL);
        assertThat(actualizado.getNumeroProceso()).isEqualTo("SIE-2026-01");
        assertThat(actualizado.getAnio()).isEqualTo(2027);
        assertThat(actualizado.getResponsables()).isEqualTo("Ing. Gancino");
    }

    @Test
    void cambiarFaseActualizaSoloLaFase() {
        CompraPublica existente = compraDe(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(CompraPublica.class))).thenAnswer(inv -> inv.getArgument(0));

        CompraPublica actualizado = controller.cambiarFase(1L, FaseCompra.ENTREGA_BIENES);

        assertThat(actualizado.getFase()).isEqualTo(FaseCompra.ENTREGA_BIENES);
        assertThat(actualizado.getObjetoContratacion()).isEqualTo("Compra de equipos");
    }

    @Test
    void eliminarLanzaNotFoundCuandoNoExiste() {
        when(repository.existsById(5L)).thenReturn(false);

        assertThatThrownBy(() -> controller.eliminar(5L)).isInstanceOf(ResponseStatusException.class);

        verify(repository, never()).deleteById(any());
    }

    @Test
    void subirArchivoGuardaElBinarioYActualizaLosMetadatos() throws IOException {
        CompraPublica compra = compraDe(1L);
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
    void descargarArchivoDevuelveElRecursoConElContentTypeOriginal() throws IOException {
        CompraPublica compra = compraDe(1L);
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
        when(repository.findById(1L)).thenReturn(Optional.of(compraDe(1L)));

        assertThatThrownBy(() -> controller.descargarArchivo(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
