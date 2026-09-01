package ec.edu.espe.lici.security.controller;

import com.nimbusds.jose.jwk.JWKSet;
import ec.edu.espe.lici.security.security.RsaKeyProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Publica la llave publica (JWKS) que usan los demas microservicios para
 * validar de forma independiente los tokens JWT emitidos por este servicio,
 * sin tener que llamarlo en cada peticion (validacion offline por firma).
 */
@RestController
public class JwksController {

    private final RsaKeyProvider rsaKeyProvider;

    public JwksController(RsaKeyProvider rsaKeyProvider) {
        this.rsaKeyProvider = rsaKeyProvider;
    }

    @GetMapping("/oauth2/jwks")
    public Map<String, Object> jwks() {
        return new JWKSet(rsaKeyProvider.getPublicRsaKey()).toJSONObject();
    }
}
