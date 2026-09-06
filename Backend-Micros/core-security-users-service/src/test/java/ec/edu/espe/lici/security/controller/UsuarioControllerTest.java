package ec.edu.espe.lici.security.controller;

import ec.edu.espe.lici.security.domain.Rol;
import ec.edu.espe.lici.security.domain.Usuario;
import ec.edu.espe.lici.security.dto.UsuarioRequest;
import ec.edu.espe.lici.security.dto.UsuarioResponse;
import ec.edu.espe.lici.security.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UsuarioControllerTest {

    private UsuarioRepository usuarioRepository;
    private PasswordEncoder passwordEncoder;
    private UsuarioController controller;

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        controller = new UsuarioController(usuarioRepository, passwordEncoder);
    }

    private Usuario aUsuario() {
        return Usuario.builder()
                .id(1L)
                .nombres("Ada")
                .apellidos("Lovelace")
                .email("ada@espe.edu.ec")
                .passwordHash("hashed")
                .rol(Rol.DOCENTE_INVESTIGADOR)
                .activo(true)
                .build();
    }

    @Test
    void listarReturnsAllUsersMappedToResponses() {
        when(usuarioRepository.findAll()).thenReturn(List.of(aUsuario()));

        List<UsuarioResponse> result = controller.listar();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).email()).isEqualTo("ada@espe.edu.ec");
    }

    @Test
    void obtenerThrowsNotFoundWhenUserDoesNotExist() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.obtener(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void crearRejectsADuplicateEmailWithoutTouchingTheRepositorySave() {
        when(usuarioRepository.existsByEmail("ada@espe.edu.ec")).thenReturn(true);
        UsuarioRequest request = new UsuarioRequest("Ada", "Lovelace", "ada@espe.edu.ec", "pw123456", "1234567890", Rol.DOCENTE_INVESTIGADOR);

        assertThatThrownBy(() -> controller.crear(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void crearHashesThePasswordAndPersistsTheNewUser() {
        UsuarioRequest request = new UsuarioRequest("Ada", "Lovelace", "ada@espe.edu.ec", "plain-password", "1234567890", Rol.ADMINISTRADOR);
        when(usuarioRepository.existsByEmail("ada@espe.edu.ec")).thenReturn(false);
        when(passwordEncoder.encode("plain-password")).thenReturn("hashed-password");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario u = invocation.getArgument(0);
            u.setId(10L);
            return u;
        });

        ResponseEntity<UsuarioResponse> response = controller.crear(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(10L);

        verify(usuarioRepository).save(argThat(u -> u.getPasswordHash().equals("hashed-password")));
    }

    @Test
    void actualizarKeepsThePreviousPasswordWhenNoneIsProvided() {
        Usuario existing = aUsuario();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));
        UsuarioRequest request = new UsuarioRequest("Ada", "Byron", "ada@espe.edu.ec", "", "1234567890", Rol.ADMINISTRADOR);

        UsuarioResponse response = controller.actualizar(1L, request);

        assertThat(response.apellidos()).isEqualTo("Byron");
        assertThat(existing.getPasswordHash()).isEqualTo("hashed");
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void eliminarThrowsNotFoundInsteadOfDeletingAMissingUser() {
        when(usuarioRepository.existsById(5L)).thenReturn(false);

        assertThatThrownBy(() -> controller.eliminar(5L))
                .isInstanceOf(ResponseStatusException.class);

        verify(usuarioRepository, never()).deleteById(eq(5L));
    }
}
