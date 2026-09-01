package ec.edu.espe.lici.security.controller;

import ec.edu.espe.lici.security.domain.Usuario;
import ec.edu.espe.lici.security.dto.LoginRequest;
import ec.edu.espe.lici.security.dto.LoginResponse;
import ec.edu.espe.lici.security.dto.UsuarioResponse;
import ec.edu.espe.lici.security.repository.UsuarioRepository;
import ec.edu.espe.lici.security.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager,
                           UsuarioRepository usuarioRepository,
                           JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Credenciales invalidas"));

        String token = jwtService.issueToken(usuario);

        return ResponseEntity.ok(new LoginResponse(
                token,
                "Bearer",
                jwtService.getExpirationSeconds(),
                UsuarioResponse.from(usuario)));
    }
}
