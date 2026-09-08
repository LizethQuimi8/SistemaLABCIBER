package ec.edu.espe.lici.security.security;

import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.SignedJWT;
import ec.edu.espe.lici.security.domain.Rol;
import ec.edu.espe.lici.security.domain.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String ISSUER = "test-issuer";
    private static final long EXPIRATION_MINUTES = 5;

    private RsaKeyProvider rsaKeyProvider;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        rsaKeyProvider = new RsaKeyProvider("", "test-kid");
        jwtService = new JwtService(rsaKeyProvider, ISSUER, EXPIRATION_MINUTES);
    }

    @Test
    void expirationSecondsMatchesConfiguredMinutes() {
        assertThat(jwtService.getExpirationSeconds()).isEqualTo(EXPIRATION_MINUTES * 60);
    }

    @Test
    void issuedTokenIsSignedAndCarriesTheExpectedClaims() throws Exception {
        Usuario usuario = Usuario.builder()
                .id(42L)
                .nombres("Ada")
                .apellidos("Lovelace")
                .email("ada@espe.edu.ec")
                .rol(Rol.ADMINISTRADOR)
                .build();

        String token = jwtService.issueToken(usuario);
        SignedJWT signedJWT = SignedJWT.parse(token);

        assertThat(signedJWT.verify(new RSASSAVerifier(rsaKeyProvider.getPublicKey()))).isTrue();
        assertThat(signedJWT.getHeader().getKeyID()).isEqualTo("test-kid");

        var claims = signedJWT.getJWTClaimsSet();
        assertThat(claims.getSubject()).isEqualTo("42");
        assertThat(claims.getIssuer()).isEqualTo(ISSUER);
        assertThat(claims.getStringClaim("email")).isEqualTo("ada@espe.edu.ec");
        assertThat(claims.getStringListClaim("roles")).containsExactly("ADMINISTRADOR");
        assertThat(claims.getExpirationTime()).isAfter(claims.getIssueTime());
        assertThat(claims.getExpirationTime().toInstant())
                .isCloseTo(Instant.now().plusSeconds(EXPIRATION_MINUTES * 60),
                        org.assertj.core.api.Assertions.within(2, java.time.temporal.ChronoUnit.SECONDS));
    }
}
