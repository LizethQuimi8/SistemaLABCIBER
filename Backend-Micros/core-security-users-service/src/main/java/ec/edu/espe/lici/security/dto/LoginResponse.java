package ec.edu.espe.lici.security.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        UsuarioResponse usuario
) {
}
