package ec.edu.espe.lici.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JwtResourceServerAutoConfigurationTest {

    private final JwtResourceServerAutoConfiguration config = new JwtResourceServerAutoConfiguration();

    @Test
    void convertsTheRolesClaimIntoRolePrefixedAuthorities() {
        JwtAuthenticationConverter converter = config.jwtAuthenticationConverter();
        Jwt jwt = new Jwt(
                "token",
                Instant.now(),
                Instant.now().plusSeconds(60),
                Map.of("alg", "RS256"),
                Map.of("sub", "1", "roles", List.of("ADMINISTRADOR", "DOCENTE_INVESTIGADOR")));

        var authorities = converter.convert(jwt).getAuthorities();

        assertThat(authorities)
                .extracting(a -> a.getAuthority())
                .containsExactlyInAnyOrder("ROLE_ADMINISTRADOR", "ROLE_DOCENTE_INVESTIGADOR");
    }
}
