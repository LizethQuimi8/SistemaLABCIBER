package ec.edu.espe.lici.security.security;

import com.nimbusds.jose.jwk.RSAKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.UUID;

/**
 * Provee el par de llaves RSA que firma los JWT emitidos por este servicio.
 * Si {@code lici.jwt.private-key-path} apunta a un archivo PEM (PKCS8) existente,
 * la llave se carga desde ahi y se conserva un keyID estable entre reinicios/replicas.
 * Si no se configura, se genera una llave efimera solo apta para desarrollo local:
 * los tokens emitidos dejan de ser validos al reiniciar el servicio.
 */
@Slf4j
@Component
public class RsaKeyProvider {

    private final RSAKey rsaKey;
    private final RSAPublicKey publicKey;

    public RsaKeyProvider(
            @Value("${lici.jwt.private-key-path:}") String privateKeyPath,
            @Value("${lici.jwt.key-id:lici-auth-key-1}") String keyId) {
        try {
            KeyPair keyPair = loadOrGenerateKeyPair(privateKeyPath);
            this.publicKey = (RSAPublicKey) keyPair.getPublic();
            this.rsaKey = new RSAKey.Builder(publicKey)
                    .privateKey((RSAPrivateKey) keyPair.getPrivate())
                    .keyID(keyId)
                    .build();
        } catch (Exception e) {
            throw new IllegalStateException("No fue posible inicializar el par de llaves RSA", e);
        }
    }

    private KeyPair loadOrGenerateKeyPair(String privateKeyPath) throws IOException, NoSuchAlgorithmException, InvalidKeySpecException {
        if (privateKeyPath != null && !privateKeyPath.isBlank()) {
            Path path = Path.of(privateKeyPath);
            if (Files.exists(path)) {
                log.info("Cargando llave RSA persistida desde {}", privateKeyPath);
                return readPkcs8KeyPair(Files.readString(path));
            }
            log.warn("lici.jwt.private-key-path={} fue configurado pero el archivo no existe; " +
                    "se generara una llave RSA efimera (los tokens no sobreviviran un reinicio)", privateKeyPath);
        } else {
            log.warn("lici.jwt.private-key-path no esta configurado; se generara una llave RSA efimera. " +
                    "NO usar en produccion: los tokens dejan de validar tras un reinicio o con multiples replicas.");
        }
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }

    private KeyPair readPkcs8KeyPair(String pem) throws NoSuchAlgorithmException, InvalidKeySpecException {
        String base64 = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(base64);

        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        RSAPrivateCrtKey privateKey = (RSAPrivateCrtKey) keyFactory.generatePrivate(new PKCS8EncodedKeySpec(decoded));
        RSAPublicKeySpec publicKeySpec = new RSAPublicKeySpec(privateKey.getModulus(), privateKey.getPublicExponent());
        RSAPublicKey publicKey = (RSAPublicKey) keyFactory.generatePublic(publicKeySpec);
        return new KeyPair(publicKey, privateKey);
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
