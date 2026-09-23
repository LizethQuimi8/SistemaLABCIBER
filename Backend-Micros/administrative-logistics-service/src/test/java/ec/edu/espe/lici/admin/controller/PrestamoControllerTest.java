package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.domain.EstadoPrestamo;
import ec.edu.espe.lici.admin.domain.Prestamo;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.repository.PrestamoRepository;
import ec.edu.espe.lici.admin.service.NotificacionClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PrestamoControllerTest {

    private PrestamoRepository prestamoRepository;
    private BienInventarioRepository bienInventarioRepository;
    private NotificacionClient notificacionClient;
    private PrestamoController controller;

    @BeforeEach
    void setUp() {
        prestamoRepository = mock(PrestamoRepository.class);
        bienInventarioRepository = mock(BienInventarioRepository.class);
        notificacionClient = mock(NotificacionClient.class);
        controller = new PrestamoController(prestamoRepository, bienInventarioRepository, notificacionClient);
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

    private BienInventario bienDe(Long id, EstadoBien estado) {
        return BienInventario.builder().id(id).nombre("Laptop").estado(estado).cantidad(1).build();
    }

    private PrestamoRequest requestDe(Long bienId) {
        return requestDe(bienId, LocalDate.now(), LocalDate.now().plusDays(3));
    }

    private PrestamoRequest requestDe(Long bienId, LocalDate desde, LocalDate hasta) {
        PrestamoRequest request = new PrestamoRequest();
        request.setBienId(bienId);
        request.setFechaDesde(desde);
        request.setFechaHasta(hasta);
        request.setMotivo("Practica de laboratorio");
        return request;
    }

    private Prestamo prestamoDe(Long id, Long bienId, Long usuarioId, EstadoPrestamo estado) {
        return Prestamo.builder().id(id).bienId(bienId).usuarioId(usuarioId).estado(estado)
                .fechaDesde(LocalDate.now()).fechaHasta(LocalDate.now().plusDays(3)).motivo("Practica").build();
    }

    @Test
    void solicitarRechazaFechaHastaAnteriorADesde() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        PrestamoRequest request = requestDe(1L, LocalDate.now(), LocalDate.now().minusDays(1));

        assertThatThrownBy(() -> controller.solicitar(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(prestamoRepository, never()).save(any());
    }

    @Test
    void solicitarRechazaBienNoInventariado() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.solicitar(requestDe(1L)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(prestamoRepository, never()).save(any());
    }

    @Test
    void solicitarRechazaBienQueNoEstaDisponible() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.of(bienDe(1L, EstadoBien.MANTENIMIENTO)));

        assertThatThrownBy(() -> controller.solicitar(requestDe(1L)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(prestamoRepository, never()).save(any());
        verify(bienInventarioRepository, never()).save(any());
    }

    @Test
    void solicitarCreaElPrestamoPendienteSinTocarElBienYAvisaAInfraestructura() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        BienInventario bien = bienDe(1L, EstadoBien.DISPONIBLE);
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.of(bien));
        when(prestamoRepository.save(any(Prestamo.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.solicitar(requestDe(1L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getUsuarioId()).isEqualTo(5L);
        assertThat(response.getBody().getBienId()).isEqualTo(1L);
        assertThat(response.getBody().getMotivo()).isEqualTo("Practica de laboratorio");
        assertThat(bien.getEstado()).isEqualTo(EstadoBien.DISPONIBLE);
        verify(bienInventarioRepository, never()).save(any());
        verify(notificacionClient).notificarPorRol(eq("ADMIN_INFRAESTRUCTURA"), any(), any());
    }

    @Test
    void unDocenteNoPuedeAprobarPrestamos() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");

        assertThatThrownBy(() -> controller.aprobar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(prestamoRepository, never()).save(any());
    }

    @Test
    void adminInfraestructuraApruebaYActivaElBienYAvisaAlSolicitante() {
        authenticateAs(7L, "ADMIN_INFRAESTRUCTURA");
        Prestamo prestamo = prestamoDe(1L, 1L, 5L, EstadoPrestamo.PENDIENTE);
        BienInventario bien = bienDe(1L, EstadoBien.DISPONIBLE);
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamo));
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.of(bien));
        when(prestamoRepository.save(any(Prestamo.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bienInventarioRepository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        Prestamo aprobado = controller.aprobar(1L);

        assertThat(aprobado.getEstado()).isEqualTo(EstadoPrestamo.ACTIVO);
        assertThat(bien.getEstado()).isEqualTo(EstadoBien.EN_USO);
        verify(notificacionClient).notificarUsuario(eq(5L), any(), any());
        verify(notificacionClient).notificarPorRol(eq("ADMINISTRADOR"), any(), any());
    }

    @Test
    void administradorApruebaSinAvisarseASiMismo() {
        authenticateAs(1L, "ADMINISTRADOR");
        Prestamo prestamo = prestamoDe(1L, 1L, 5L, EstadoPrestamo.PENDIENTE);
        BienInventario bien = bienDe(1L, EstadoBien.DISPONIBLE);
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamo));
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.of(bien));
        when(prestamoRepository.save(any(Prestamo.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bienInventarioRepository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        controller.aprobar(1L);

        verify(notificacionClient).notificarUsuario(eq(5L), any(), any());
        verify(notificacionClient, never()).notificarPorRol(eq("ADMINISTRADOR"), any(), any());
    }

    @Test
    void aprobarRechazaSiElPrestamoNoEstaPendiente() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamoDe(1L, 1L, 5L, EstadoPrestamo.ACTIVO)));

        assertThatThrownBy(() -> controller.aprobar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(prestamoRepository, never()).save(any());
    }

    @Test
    void aprobarRechazaSiElBienYaNoEstaDisponible() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamoDe(1L, 1L, 5L, EstadoPrestamo.PENDIENTE)));
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.of(bienDe(1L, EstadoBien.EN_USO)));

        assertThatThrownBy(() -> controller.aprobar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(prestamoRepository, never()).save(any(Prestamo.class));
    }

    @Test
    void soloElAdministradorPuedeRechazar() {
        authenticateAs(7L, "ADMIN_INFRAESTRUCTURA");

        assertThatThrownBy(() -> controller.rechazar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(prestamoRepository, never()).save(any());
    }

    @Test
    void administradorRechazaMarcaRechazadoSinTocarElBienYAvisaAlSolicitante() {
        authenticateAs(1L, "ADMINISTRADOR");
        Prestamo prestamo = prestamoDe(1L, 1L, 5L, EstadoPrestamo.PENDIENTE);
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamo));
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.of(bienDe(1L, EstadoBien.DISPONIBLE)));
        when(prestamoRepository.save(any(Prestamo.class))).thenAnswer(inv -> inv.getArgument(0));

        Prestamo rechazado = controller.rechazar(1L);

        assertThat(rechazado.getEstado()).isEqualTo(EstadoPrestamo.RECHAZADO);
        verify(bienInventarioRepository, never()).save(any());
        verify(notificacionClient).notificarUsuario(eq(5L), any(), any());
    }

    @Test
    void rechazarRechazaSiElPrestamoNoEstaPendiente() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamoDe(1L, 1L, 5L, EstadoPrestamo.DEVUELTO)));

        assertThatThrownBy(() -> controller.rechazar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(prestamoRepository, never()).save(any());
    }

    @Test
    void unDocenteNoPuedeDevolverElPrestamoDeOtro() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Prestamo prestamo = prestamoDe(1L, 1L, 42L, EstadoPrestamo.ACTIVO);
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamo));

        assertThatThrownBy(() -> controller.devolver(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(prestamoRepository, never()).save(any());
    }

    @Test
    void devolverLiberaElBienYCierraElPrestamo() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Prestamo prestamo = prestamoDe(1L, 1L, 5L, EstadoPrestamo.ACTIVO);
        BienInventario bien = bienDe(1L, EstadoBien.EN_USO);
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamo));
        when(prestamoRepository.save(any(Prestamo.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.of(bien));
        when(bienInventarioRepository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        Prestamo devuelto = controller.devolver(1L);

        assertThat(devuelto.getEstado()).isEqualTo(EstadoPrestamo.DEVUELTO);
        assertThat(devuelto.getFechaDevolucion()).isNotNull();
        assertThat(bien.getEstado()).isEqualTo(EstadoBien.DISPONIBLE);
    }

    @Test
    void devolverRechazaUnPrestamoQueNoEstaActivo() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Prestamo prestamo = prestamoDe(1L, 1L, 5L, EstadoPrestamo.DEVUELTO);
        when(prestamoRepository.findById(1L)).thenReturn(Optional.of(prestamo));

        assertThatThrownBy(() -> controller.devolver(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void listarFiltraPorUsuarioParaUnDocente() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(prestamoRepository.findByUsuarioId(5L)).thenReturn(List.of(
                prestamoDe(1L, 1L, 5L, EstadoPrestamo.PENDIENTE)));

        assertThat(controller.listar()).hasSize(1);
        verify(prestamoRepository, never()).findAll();
    }

    @Test
    void listarDevuelveTodoParaUnAdministrador() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(prestamoRepository.findAll()).thenReturn(List.of(
                prestamoDe(1L, 1L, 5L, EstadoPrestamo.PENDIENTE),
                prestamoDe(2L, 2L, 9L, EstadoPrestamo.ACTIVO)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void listarDevuelveTodoParaAdminInfraestructura() {
        authenticateAs(7L, "ADMIN_INFRAESTRUCTURA");
        when(prestamoRepository.findAll()).thenReturn(List.of(
                prestamoDe(1L, 1L, 5L, EstadoPrestamo.PENDIENTE),
                prestamoDe(2L, 2L, 9L, EstadoPrestamo.ACTIVO)));

        assertThat(controller.listar()).hasSize(2);
        verify(prestamoRepository, never()).findByUsuarioId(any());
    }
}
