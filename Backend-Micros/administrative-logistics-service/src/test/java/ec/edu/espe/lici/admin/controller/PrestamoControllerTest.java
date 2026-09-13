package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.domain.EstadoPrestamo;
import ec.edu.espe.lici.admin.domain.Prestamo;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.repository.PrestamoRepository;
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

class PrestamoControllerTest {

    private PrestamoRepository prestamoRepository;
    private BienInventarioRepository bienInventarioRepository;
    private PrestamoController controller;

    @BeforeEach
    void setUp() {
        prestamoRepository = mock(PrestamoRepository.class);
        bienInventarioRepository = mock(BienInventarioRepository.class);
        controller = new PrestamoController(prestamoRepository, bienInventarioRepository);
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
        PrestamoRequest request = new PrestamoRequest();
        request.setBienId(bienId);
        return request;
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
    void solicitarMarcaElBienComoEnUsoYCreaElPrestamoDelDocenteActual() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        BienInventario bien = bienDe(1L, EstadoBien.DISPONIBLE);
        when(bienInventarioRepository.findById(1L)).thenReturn(Optional.of(bien));
        when(bienInventarioRepository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(prestamoRepository.save(any(Prestamo.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.solicitar(requestDe(1L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getUsuarioId()).isEqualTo(5L);
        assertThat(response.getBody().getBienId()).isEqualTo(1L);
        assertThat(bien.getEstado()).isEqualTo(EstadoBien.EN_USO);
    }

    @Test
    void unDocenteNoPuedeDevolverElPrestamoDeOtro() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Prestamo prestamo = Prestamo.builder().id(1L).bienId(1L).usuarioId(42L).estado(EstadoPrestamo.ACTIVO).build();
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
        Prestamo prestamo = Prestamo.builder().id(1L).bienId(1L).usuarioId(5L).estado(EstadoPrestamo.ACTIVO).build();
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
    void devolverRechazaUnPrestamoYaDevuelto() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Prestamo prestamo = Prestamo.builder().id(1L).bienId(1L).usuarioId(5L).estado(EstadoPrestamo.DEVUELTO).build();
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
                Prestamo.builder().id(1L).bienId(1L).usuarioId(5L).estado(EstadoPrestamo.ACTIVO).build()));

        assertThat(controller.listar()).hasSize(1);
        verify(prestamoRepository, never()).findAll();
    }

    @Test
    void listarDevuelveTodoParaUnAdministrador() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(prestamoRepository.findAll()).thenReturn(List.of(
                Prestamo.builder().id(1L).bienId(1L).usuarioId(5L).estado(EstadoPrestamo.ACTIVO).build(),
                Prestamo.builder().id(2L).bienId(2L).usuarioId(9L).estado(EstadoPrestamo.ACTIVO).build()));

        assertThat(controller.listar()).hasSize(2);
    }
}
