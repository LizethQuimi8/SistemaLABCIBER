package ec.edu.espe.lici.academic.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Extrae el id de usuario y el rol desde los claims del JWT validado por el
 * resource server. La autorizacion por propiedad ("solo mis proyectos") se
 * resuelve aqui, comparando este id con el usuarioId dueno del recurso.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Long id() {
        Jwt jwt = jwt();
        return Long.valueOf(jwt.getSubject());
    }

    public static boolean isAdministrador() {
        return jwt().getClaimAsStringList("roles").contains("ADMINISTRADOR");
    }

    private static Jwt jwt() {
        JwtAuthenticationToken token = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        return token.getToken();
    }
}
