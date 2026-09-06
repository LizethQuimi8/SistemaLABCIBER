package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.Notificacion;
import ec.edu.espe.lici.document.repository.NotificacionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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

class NotificacionControllerTest {

    private NotificacionRepository notificacionRepository;
    private NotificacionController controller;

    @BeforeEach
    void setUp() {
        notificacionRepository = mock(NotificacionRepository.class);
        controller = new NotificacionController(notificacionRepository);
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
    void unAdministradorTambienSoloVeSusPropiasNotificaciones() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(notificacionRepository.findByUsuarioId(1L))
                .thenReturn(List.of(Notificacion.builder().id(1L).usuarioId(1L).mensaje("Hola").build()));

        assertThat(controller.listar()).hasSize(1);
        verify(notificacionRepository, never()).findAll();
    }

    @Test
    void marcarLeidaFallaSiLaNotificacionEsDeOtroUsuario() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Notificacion notificacion = Notificacion.builder().id(1L).usuarioId(42L).mensaje("Hola").build();
        when(notificacionRepository.findById(1L)).thenReturn(Optional.of(notificacion));

        assertThatThrownBy(() -> controller.marcarLeida(1L)).isInstanceOf(ResponseStatusException.class);

        verify(notificacionRepository, never()).save(any());
    }

    @Test
    void marcarLeidaFuncionaParaElDuenoDeLaNotificacion() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Notificacion notificacion = Notificacion.builder().id(1L).usuarioId(5L).mensaje("Hola").leida(false).build();
        when(notificacionRepository.findById(1L)).thenReturn(Optional.of(notificacion));
        when(notificacionRepository.save(any(Notificacion.class))).thenAnswer(inv -> inv.getArgument(0));

        Notificacion resultado = controller.marcarLeida(1L);

        assertThat(resultado.isLeida()).isTrue();
    }
}
