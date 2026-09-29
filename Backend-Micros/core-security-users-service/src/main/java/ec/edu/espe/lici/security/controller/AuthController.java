package ec.edu.espe.lici.security.controller;

import ec.edu.espe.lici.security.domain.Usuario;
import ec.edu.espe.lici.security.dto.CambiarPasswordRequest;
import ec.edu.espe.lici.security.dto.LoginRequest;
import ec.edu.espe.lici.security.dto.LoginResponse;
import ec.edu.espe.lici.security.dto.UsuarioResponse;
import ec.edu.espe.lici.security.repository.UsuarioRepository;
import ec.edu.espe.lici.security.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager,
                           UsuarioRepository usuarioRepository,
                           JwtService jwtService,
                           PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
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

    /**
     * Autoservicio para el flujo de primer ingreso: cambia la contraseña
     * temporal por una propia y limpia el indicador "primerIngresoPendiente".
     * Solo exige estar autenticado (cualquier rol) ya que opera sobre el
     * propio usuario del token.
     */
    @PatchMapping("/primer-ingreso")
    public ResponseEntity<UsuarioResponse> completarPrimerIngreso(@AuthenticationPrincipal Jwt jwt,
                                                                    @Valid @RequestBody CambiarPasswordRequest request) {
        Long id = Long.valueOf(jwt.getSubject());
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        usuario.setPasswordHash(passwordEncoder.encode(request.nuevaPassword()));
        usuario.setPrimerIngresoPendiente(false);
        usuario = usuarioRepository.save(usuario);

        return ResponseEntity.ok(UsuarioResponse.from(usuario));
    }
}
