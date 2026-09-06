package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.EstadoMemo;
import ec.edu.espe.lici.document.domain.Memo;
import ec.edu.espe.lici.document.repository.MemoRepository;
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

class MemoControllerTest {

    private MemoRepository memoRepository;
    private MemoController controller;

    @BeforeEach
    void setUp() {
        memoRepository = mock(MemoRepository.class);
        controller = new MemoController(memoRepository);
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

    private Memo memoDe(Long id, Long remitenteId, Long destinatarioId) {
        return Memo.builder().id(id).asunto("Asunto").contenido("Contenido")
                .estado(EstadoMemo.ENVIADO).remitenteId(remitenteId).destinatarioId(destinatarioId).build();
    }

    @Test
    void elDestinatarioPuedeLeerElMemoPeroNoEliminarlo() {
        authenticateAs(20L, "DOCENTE_INVESTIGADOR");
        when(memoRepository.findById(1L)).thenReturn(Optional.of(memoDe(1L, 5L, 20L)));

        assertThat(controller.obtener(1L).getId()).isEqualTo(1L);

        assertThatThrownBy(() -> controller.eliminar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
        verify(memoRepository, never()).delete(any());
    }

    @Test
    void elRemitenteSiPuedeEliminarSuPropioMemo() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Memo memo = memoDe(1L, 5L, 20L);
        when(memoRepository.findById(1L)).thenReturn(Optional.of(memo));

        controller.eliminar(1L);

        verify(memoRepository).delete(memo);
    }

    @Test
    void unTerceroNoPuedeVerElMemo() {
        authenticateAs(99L, "DOCENTE_INVESTIGADOR");
        when(memoRepository.findById(1L)).thenReturn(Optional.of(memoDe(1L, 5L, 20L)));

        assertThatThrownBy(() -> controller.obtener(1L)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void actualizarEstadoRequiereSerRemitenteODestinatario() {
        authenticateAs(20L, "DOCENTE_INVESTIGADOR");
        Memo memo = memoDe(1L, 5L, 20L);
        when(memoRepository.findById(1L)).thenReturn(Optional.of(memo));
        when(memoRepository.save(any(Memo.class))).thenAnswer(inv -> inv.getArgument(0));

        Memo actualizado = controller.actualizarEstado(1L, EstadoMemo.LEIDO);

        assertThat(actualizado.getEstado()).isEqualTo(EstadoMemo.LEIDO);
    }

    @Test
    void crearAsignaAlDocenteComoRemitente() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Memo nuevo = Memo.builder().asunto("Asunto").contenido("Contenido").remitenteId(999L).destinatarioId(20L).build();
        when(memoRepository.save(any(Memo.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getBody().getRemitenteId()).isEqualTo(5L);
    }

    @Test
    void listarCombinaEnviadosYRecibidos() {
        authenticateAs(20L, "DOCENTE_INVESTIGADOR");
        when(memoRepository.findByRemitenteIdOrDestinatarioId(20L, 20L)).thenReturn(List.of(memoDe(1L, 5L, 20L)));

        assertThat(controller.listar()).hasSize(1);
        verify(memoRepository, never()).findAll();
    }
}
