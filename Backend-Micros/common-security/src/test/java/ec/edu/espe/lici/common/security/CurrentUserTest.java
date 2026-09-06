package ec.edu.espe.lici.common.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CurrentUserTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String subject, String rol) {
        Jwt jwt = new Jwt(
                "token",
                Instant.now(),
                Instant.now().plusSeconds(60),
                Map.of("alg", "RS256"),
                Map.of("sub", subject, "roles", List.of(rol)));
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    @Test
    void idReturnsTheSubjectClaimAsALong() {
        authenticateAs("42", "DOCENTE_INVESTIGADOR");

        assertThat(CurrentUser.id()).isEqualTo(42L);
    }

    @Test
    void isAdministradorIsTrueOnlyForTheAdministradorRole() {
        authenticateAs("1", "ADMINISTRADOR");
        assertThat(CurrentUser.isAdministrador()).isTrue();

        authenticateAs("2", "DOCENTE_INVESTIGADOR");
        assertThat(CurrentUser.isAdministrador()).isFalse();
    }
}
