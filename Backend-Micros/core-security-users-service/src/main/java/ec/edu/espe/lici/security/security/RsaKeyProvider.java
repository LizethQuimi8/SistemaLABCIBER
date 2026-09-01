package ec.edu.espe.lici.security.security;

import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.stereotype.Component;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;

/**
 * Genera el par de llaves RSA que firma los JWT emitidos por este servicio.
 * Se genera una vez por arranque del servicio; en produccion debe reemplazarse
 * por una llave persistida (KMS, vault, keystore montado) para que los tokens
 * sigan siendo validos tras un reinicio o entre replicas.
 */
@Component
public class RsaKeyProvider {

    private final RSAKey rsaKey;
    private final RSAPublicKey publicKey;

    public RsaKeyProvider() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair keyPair = generator.generateKeyPair();
            this.publicKey = (RSAPublicKey) keyPair.getPublic();
            this.rsaKey = new RSAKey.Builder(publicKey)
                    .privateKey((RSAPrivateKey) keyPair.getPrivate())
                    .keyID(UUID.randomUUID().toString())
                    .build();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("No fue posible generar el par de llaves RSA", e);
        }
    }

    public RSAKey getRsaKey() {
        return rsaKey;
    }

    public RSAKey getPublicRsaKey() {
        return rsaKey.toPublicJWK();
    }

    /** Clave publica en su forma nativa de java.security, sin pasar por Nimbus (evita JOSEException). */
    public RSAPublicKey getPublicKey() {
        return publicKey;
    }
}
