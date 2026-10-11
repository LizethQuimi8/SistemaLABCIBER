package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.Mantenimiento;
import ec.edu.espe.lici.admin.domain.TipoMantenimiento;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.repository.MantenimientoRepository;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MantenimientoControllerTest {

    private MantenimientoRepository mantenimientoRepository;
    private BienInventarioRepository bienInventarioRepository;
    private MantenimientoController controller;

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        mantenimientoRepository = mock(MantenimientoRepository.class);
        bienInventarioRepository = mock(BienInventarioRepository.class);
        controller = new MantenimientoController(mantenimientoRepository, bienInventarioRepository, storageDir.toString());
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

    private MantenimientoController.MantenimientoRequest requestDe(Long bienId) {
        MantenimientoController.MantenimientoRequest request = new MantenimientoController.MantenimientoRequest();
        request.setBienId(bienId);
        request.setTipo(TipoMantenimiento.PREVENTIVO);
        request.setFecha(LocalDate.now());
        request.setDescripcion("Limpieza y revision general");
        return request;
    }

    @Test
    void crearRechazaSiElBienNoEstaInventariado() {
        authenticateAs(7L, "ADMIN_INFRAESTRUCTURA");
        when(bienInventarioRepository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> controller.crear(requestDe(1L)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(mantenimientoRepository, never()).save(any());
    }

    @Test
    void crearRegistraElMantenimientoConElUsuarioActual() {
        authenticateAs(7L, "ADMIN_INFRAESTRUCTURA");
        when(bienInventarioRepository.existsById(1L)).thenReturn(true);
        when(mantenimientoRepository.save(any(Mantenimiento.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(requestDe(1L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getBienId()).isEqualTo(1L);
        assertThat(response.getBody().getTipo()).isEqualTo(TipoMantenimiento.PREVENTIVO);
        assertThat(response.getBody().getUsuarioId()).isEqualTo(7L);
    }

    @Test
    void listarFiltraPorBienCuandoSeIndica() {
        when(mantenimientoRepository.findByBienId(1L)).thenReturn(List.of(
                Mantenimiento.builder().id(1L).bienId(1L).tipo(TipoMantenimiento.CORRECTIVO).build()));

        assertThat(controller.listar(1L)).hasSize(1);
        verify(mantenimientoRepository, never()).findAll();
    }

    @Test
    void listarDevuelveTodoCuandoNoSeIndicaBien() {
        when(mantenimientoRepository.findAll()).thenReturn(List.of(
                Mantenimiento.builder().id(1L).bienId(1L).build(),
                Mantenimiento.builder().id(2L).bienId(2L).build()));

        assertThat(controller.listar(null)).hasSize(2);
    }

    @Test
    void subirArchivoGuardaElBinarioYActualizaLosMetadatos() throws IOException {
        Mantenimiento mantenimiento = Mantenimiento.builder().id(1L).bienId(1L).tipo(TipoMantenimiento.CORRECTIVO).build();
        when(mantenimientoRepository.findById(1L)).thenReturn(Optional.of(mantenimiento));
        when(mantenimientoRepository.save(any(Mantenimiento.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "informe.pdf", "application/pdf", "contenido".getBytes());

        Mantenimiento actualizado = controller.subirArchivo(1L, archivo);

        assertThat(actualizado.getArchivoNombreArchivo()).isEqualTo("informe.pdf");
        assertThat(actualizado.getArchivoRuta()).endsWith(".pdf");
        assertThat(storageDir.resolve(actualizado.getArchivoRuta())).exists();
    }

    @Test
    void descargarArchivoDevuelveElRecursoConElContentTypeOriginal() throws IOException {
        Mantenimiento mantenimiento = Mantenimiento.builder().id(1L).bienId(1L).tipo(TipoMantenimiento.CORRECTIVO).build();
        when(mantenimientoRepository.findById(1L)).thenReturn(Optional.of(mantenimiento));
        when(mantenimientoRepository.save(any(Mantenimiento.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "informe.pdf", "application/pdf", "contenido".getBytes());
        Mantenimiento subido = controller.subirArchivo(1L, archivo);
        when(mantenimientoRepository.findById(1L)).thenReturn(Optional.of(subido));

        ResponseEntity<Resource> respuesta = controller.descargarArchivo(1L);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getBody().exists()).isTrue();
    }

    @Test
    void eliminarEliminaElRegistro() {
        Mantenimiento mantenimiento = Mantenimiento.builder().id(1L).bienId(1L).build();
        when(mantenimientoRepository.findById(1L)).thenReturn(Optional.of(mantenimiento));

        controller.eliminar(1L);

        verify(mantenimientoRepository).delete(mantenimiento);
    }

    @Test
    void eliminarLanzaNotFoundCuandoNoExiste() {
        when(mantenimientoRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.eliminar(1L)).isInstanceOf(ResponseStatusException.class);
    }
}
