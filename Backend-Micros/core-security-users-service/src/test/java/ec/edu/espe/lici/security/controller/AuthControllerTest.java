package ec.edu.espe.lici.security.controller;

import ec.edu.espe.lici.security.domain.Rol;
import ec.edu.espe.lici.security.domain.Usuario;
import ec.edu.espe.lici.security.dto.LoginRequest;
import ec.edu.espe.lici.security.dto.LoginResponse;
import ec.edu.espe.lici.security.repository.UsuarioRepository;
import ec.edu.espe.lici.security.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    private AuthenticationManager authenticationManager;
    private UsuarioRepository usuarioRepository;
    private JwtService jwtService;
    private AuthController authController;

    @BeforeEach
    void setUp() {
        authenticationManager = mock(AuthenticationManager.class);
        usuarioRepository = mock(UsuarioRepository.class);
        jwtService = mock(JwtService.class);
        authController = new AuthController(authenticationManager, usuarioRepository, jwtService);
    }

    @Test
    void returnsATokenAndUserDataWhenCredentialsAreValid() {
        Usuario usuario = Usuario.builder()
                .id(1L)
                .nombres("Ada")
                .apellidos("Lovelace")
                .email("ada@espe.edu.ec")
                .rol(Rol.ADMINISTRADOR)
                .activo(true)
                .build();
        when(usuarioRepository.findByEmail("ada@espe.edu.ec")).thenReturn(Optional.of(usuario));
        when(jwtService.issueToken(usuario)).thenReturn("signed-token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        ResponseEntity<LoginResponse> response = authController.login(
                new LoginRequest("ada@espe.edu.ec", "correct-password"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().accessToken()).isEqualTo("signed-token");
        assertThat(response.getBody().expiresInSeconds()).isEqualTo(3600L);
        assertThat(response.getBody().usuario().email()).isEqualTo("ada@espe.edu.ec");

        verify(authenticationManager).authenticate(
                new UsernamePasswordAuthenticationToken("ada@espe.edu.ec", "correct-password"));
    }

    @Test
    void propagatesTheAuthenticationFailureAndNeverIssuesATokenWithWrongCredentials() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Credenciales invalidas"));

        assertThatThrownBy(() -> authController.login(new LoginRequest("ada@espe.edu.ec", "wrong")))
                .isInstanceOf(BadCredentialsException.class);

        verifyNoInteractions(usuarioRepository, jwtService);
    }

    @Test
    void rejectsLoginWhenAuthenticationSucceedsButTheUserNoLongerExists() {
        when(usuarioRepository.findByEmail("ghost@espe.edu.ec")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authController.login(new LoginRequest("ghost@espe.edu.ec", "whatever")))
                .isInstanceOf(BadCredentialsException.class);

        verifyNoInteractions(jwtService);
    }
}
