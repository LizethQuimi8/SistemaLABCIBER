package ec.edu.espe.lici.document.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static Long id() {
        return Long.valueOf(jwt().getSubject());
    }

    public static boolean isAdministrador() {
        return jwt().getClaimAsStringList("roles").contains("ADMINISTRADOR");
    }

    private static Jwt jwt() {
        JwtAuthenticationToken token = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        return token.getToken();
    }
}
