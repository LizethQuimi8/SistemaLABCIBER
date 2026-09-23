package ec.edu.espe.lici.admin.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Extrae el id de usuario y el rol desde los claims del JWT validado por el
 * resource server. La autorizacion por propiedad ("solo mis prestamos") se
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

    public static boolean isAdminInfraestructura() {
        return jwt().getClaimAsStringList("roles").contains("ADMIN_INFRAESTRUCTURA");
    }

    /** Token crudo del usuario actual, para reenviarlo (propagar la sesion) en
     * llamadas salientes a otros microservicios. */
    public static String rawToken() {
        return jwt().getTokenValue();
    }

    private static Jwt jwt() {
        JwtAuthenticationToken token = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        return token.getToken();
    }
}
