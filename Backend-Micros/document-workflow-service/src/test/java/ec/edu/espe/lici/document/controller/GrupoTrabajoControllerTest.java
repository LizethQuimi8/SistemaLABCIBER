package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.CategoriaGrupoTrabajo;
import ec.edu.espe.lici.document.domain.GrupoTrabajo;
import ec.edu.espe.lici.document.repository.GrupoTrabajoRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GrupoTrabajoControllerTest {

    private GrupoTrabajoRepository repository;
    private GrupoTrabajoController controller;

    @BeforeEach
    void setUp() {
        repository = mock(GrupoTrabajoRepository.class);
        controller = new GrupoTrabajoController(repository);
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

    private GrupoTrabajoController.GrupoTrabajoRequest requestValido() {
        return new GrupoTrabajoController.GrupoTrabajoRequest(
                CategoriaGrupoTrabajo.COORDINADOR_AREA, "GASI",
                "Gobernanza y Auditoria de Sistemas de la Informacion",
                "Mario Ron", "3", null, null);
    }

    @Test
    void listarDevuelveTodosOrdenadosPorCategoriaYOrden() {
        when(repository.findAllByOrderByCategoriaAscOrdenAsc()).thenReturn(List.of(
                GrupoTrabajo.builder().id(1L).categoria(CategoriaGrupoTrabajo.COORDINADOR_AREA).nombre("GASI").orden(1).build()));

        List<GrupoTrabajo> lista = controller.listar();

        assertThat(lista).hasSize(1);
        verify(repository).findAllByOrderByCategoriaAscOrdenAsc();
    }

    @Test
    void unDocenteNoPuedeCrearUnGrupoDeTrabajo() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");

        assertThatThrownBy(() -> controller.crear(requestValido()))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }

    @Test
    void elAdministradorPuedeCrearUnGrupoDeTrabajo() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(repository.findAllByOrderByCategoriaAscOrdenAsc()).thenReturn(List.of());
        when(repository.save(any(GrupoTrabajo.class))).thenAnswer(inv -> inv.getArgument(0));

        GrupoTrabajo creado = controller.crear(requestValido());

        assertThat(creado.getSigla()).isEqualTo("GASI");
        assertThat(creado.getCategoria()).isEqualTo(CategoriaGrupoTrabajo.COORDINADOR_AREA);
        assertThat(creado.getOrden()).isEqualTo(1);
    }

    @Test
    void elAdministradorPuedeEliminarUnGrupoDeTrabajo() {
        authenticateAs(1L, "ADMINISTRADOR");
        GrupoTrabajo existente = GrupoTrabajo.builder().id(9L).categoria(CategoriaGrupoTrabajo.COMISION).nombre("Compras Publicas").orden(1).build();
        when(repository.findById(9L)).thenReturn(java.util.Optional.of(existente));

        controller.eliminar(9L);

        verify(repository).delete(existente);
    }

    @Test
    void unAdminInfraestructuraNoPuedeEliminarUnGrupoDeTrabajo() {
        authenticateAs(2L, "ADMIN_INFRAESTRUCTURA");
        GrupoTrabajo existente = GrupoTrabajo.builder().id(9L).categoria(CategoriaGrupoTrabajo.COMISION).nombre("Compras Publicas").orden(1).build();
        when(repository.findById(9L)).thenReturn(java.util.Optional.of(existente));

        assertThatThrownBy(() -> controller.eliminar(9L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).delete(any());
    }
}
