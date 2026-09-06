package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BienInventarioControllerTest {

    private BienInventarioRepository repository;
    private BienInventarioController controller;

    @BeforeEach
    void setUp() {
        repository = mock(BienInventarioRepository.class);
        controller = new BienInventarioController(repository);
    }

    private BienInventario bienDe(Long id) {
        return BienInventario.builder().id(id).nombre("Laptop").estado(EstadoBien.DISPONIBLE).cantidad(1).build();
    }

    @Test
    void listarDevuelveTodosLosBienes() {
        when(repository.findAll()).thenReturn(List.of(bienDe(1L), bienDe(2L)));

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
        BienInventario nuevo = BienInventario.builder().id(999L).nombre("Proyector").estado(EstadoBien.DISPONIBLE).build();
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNull();
    }

    @Test
    void actualizarSobrescribeLosCamposEditables() {
        BienInventario existente = bienDe(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));
        BienInventario request = BienInventario.builder().nombre("Laptop actualizada")
                .estado(EstadoBien.EN_USO).cantidad(3).ubicacion("Lab 2").build();

        BienInventario actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getNombre()).isEqualTo("Laptop actualizada");
        assertThat(actualizado.getEstado()).isEqualTo(EstadoBien.EN_USO);
        assertThat(actualizado.getCantidad()).isEqualTo(3);
    }

    @Test
    void eliminarLanzaNotFoundCuandoNoExiste() {
        when(repository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> controller.eliminar(1L)).isInstanceOf(ResponseStatusException.class);

        verify(repository, never()).deleteById(any());
    }
}
