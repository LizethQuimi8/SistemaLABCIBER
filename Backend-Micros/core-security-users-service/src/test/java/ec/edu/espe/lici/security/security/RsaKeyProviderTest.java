package ec.edu.espe.lici.security.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class RsaKeyProviderTest {

    @Test
    void generatesAnEphemeralKeyWhenNoPathIsConfigured() {
        RsaKeyProvider provider = new RsaKeyProvider("", "test-kid");

        assertThat(provider.getRsaKey().getKeyID()).isEqualTo("test-kid");
        assertThat(provider.getPublicKey()).isNotNull();
        assertThat(provider.getRsaKey().isPrivate()).isTrue();
    }

    @Test
    void generatesAnEphemeralKeyWhenConfiguredPathDoesNotExist(@TempDir Path tempDir) {
        Path missing = tempDir.resolve("does-not-exist.pem");

        RsaKeyProvider provider = new RsaKeyProvider(missing.toString(), "fallback-kid");

        assertThat(provider.getRsaKey().getKeyID()).isEqualTo("fallback-kid");
        assertThat(provider.getPublicKey()).isNotNull();
    }

    @Test
    void loadsThePersistedKeyFromAPkcs8PemFileAndKeepsTheSameModulus(@TempDir Path tempDir) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair keyPair = generator.generateKeyPair();
        BigInteger expectedModulus = ((RSAPublicKey) keyPair.getPublic()).getModulus();

        String pem = "-----BEGIN PRIVATE KEY-----\n"
                + Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(keyPair.getPrivate().getEncoded())
                + "\n-----END PRIVATE KEY-----\n";
        Path keyFile = tempDir.resolve("private_key.pem");
        Files.writeString(keyFile, pem);

        RsaKeyProvider first = new RsaKeyProvider(keyFile.toString(), "persisted-kid");
        RsaKeyProvider second = new RsaKeyProvider(keyFile.toString(), "persisted-kid");

        assertThat(first.getPublicKey().getModulus()).isEqualTo(expectedModulus);
        assertThat(second.getPublicKey().getModulus()).isEqualTo(expectedModulus);
        assertThat(first.getRsaKey().getKeyID()).isEqualTo(second.getRsaKey().getKeyID());
    }
}
