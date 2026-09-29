package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Publicacion;
import ec.edu.espe.lici.academic.repository.PublicacionRepository;
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

class PublicacionControllerTest {

    private PublicacionRepository publicacionRepository;
    private PublicacionController controller;

    @BeforeEach
    void setUp() {
        publicacionRepository = mock(PublicacionRepository.class);
        controller = new PublicacionController(publicacionRepository);
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

    private Publicacion publicacionDe(Long id, long usuarioId) {
        return Publicacion.builder().id(id).usuarioId(usuarioId).titulo("Un articulo").build();
    }

    @Test
    void cualquierUsuarioVeTodasLasPublicaciones() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(publicacionRepository.findAll()).thenReturn(List.of(publicacionDe(1L, 5L), publicacionDe(2L, 9L)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void crearAsignaAlDocenteComoAutor() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Publicacion nueva = Publicacion.builder().titulo("Nuevo articulo").usuarioId(999L).build();
        when(publicacionRepository.save(any(Publicacion.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nueva);

        assertThat(response.getBody().getUsuarioId()).isEqualTo(5L);
    }

    @Test
    void unDocentePuedeVerLaPublicacionDeOtro() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(publicacionRepository.findById(1L)).thenReturn(Optional.of(publicacionDe(1L, 42L)));

        assertThat(controller.obtener(1L).getId()).isEqualTo(1L);
    }

    @Test
    void unDocenteNoPuedeEditarLaPublicacionDeOtro() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(publicacionRepository.findById(1L)).thenReturn(Optional.of(publicacionDe(1L, 42L)));
        Publicacion request = Publicacion.builder().titulo("Editado").build();

        assertThatThrownBy(() -> controller.actualizar(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(publicacionRepository, never()).save(any());
    }

    @Test
    void unDocenteNoPuedeEliminarLaPublicacionDeOtro() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(publicacionRepository.findById(1L)).thenReturn(Optional.of(publicacionDe(1L, 42L)));

        assertThatThrownBy(() -> controller.eliminar(1L)).isInstanceOf(ResponseStatusException.class);

        verify(publicacionRepository, never()).delete(any());
    }
}
