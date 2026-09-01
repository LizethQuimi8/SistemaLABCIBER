package ec.edu.espe.lici.security.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import ec.edu.espe.lici.security.domain.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    private final RsaKeyProvider rsaKeyProvider;
    private final String issuer;
    private final long expirationMinutes;

    public JwtService(RsaKeyProvider rsaKeyProvider,
                       @Value("${lici.jwt.issuer}") String issuer,
                       @Value("${lici.jwt.expiration-minutes}") long expirationMinutes) {
        this.rsaKeyProvider = rsaKeyProvider;
        this.issuer = issuer;
        this.expirationMinutes = expirationMinutes;
    }

    public long getExpirationSeconds() {
        return expirationMinutes * 60;
    }

    public String issueToken(Usuario usuario) {
        try {
            Instant now = Instant.now();
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(String.valueOf(usuario.getId()))
                    .issuer(issuer)
                    .claim("email", usuario.getEmail())
                    .claim("nombres", usuario.getNombres())
                    .claim("apellidos", usuario.getApellidos())
                    .claim("roles", List.of(usuario.getRol().name()))
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                    .build();

            JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256)
                    .keyID(rsaKeyProvider.getRsaKey().getKeyID())
                    .build();

            SignedJWT signedJWT = new SignedJWT(header, claims);
            signedJWT.sign(new RSASSASigner(rsaKeyProvider.getRsaKey()));
            return signedJWT.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("No fue posible firmar el token JWT", e);
        }
    }
}
