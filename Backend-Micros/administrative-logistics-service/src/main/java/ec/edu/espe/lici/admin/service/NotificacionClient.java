package ec.edu.espe.lici.admin.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cliente minimo (sin dependencias reactivas) hacia otros microservicios,
 * usado por el flujo de solicitud/aprobacion de prestamos: avisa al
 * responsable del rol correspondiente en cada paso (Admin. Infraestructura al
 * solicitar, ADMINISTRADOR al aprobarse, y al solicitante al resolverse).
 * Reenvia el JWT del usuario actual (mismo patron que reporting-service con
 * WebClient), asi que no necesita credenciales propias.
 *
 * Es deliberadamente "best-effort": si el otro servicio no responde, se
 * registra el error pero NUNCA se interrumpe la aprobacion/rechazo del
 * prestamo por un fallo de notificacion.
 */
@Service
public class NotificacionClient {

    private static final Logger log = LoggerFactory.getLogger(NotificacionClient.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String securityServiceUrl;
    private final String documentServiceUrl;

    public NotificacionClient(@Value("${lici.services.security-service-url}") String securityServiceUrl,
                               @Value("${lici.services.document-service-url}") String documentServiceUrl) {
        this.securityServiceUrl = securityServiceUrl;
        this.documentServiceUrl = documentServiceUrl;
    }

    public void notificarUsuario(Long usuarioId, String mensaje, String bearerToken) {
        notificarUsuario(usuarioId, mensaje, null, bearerToken);
    }

    /** Igual que notificarUsuario, pero adjunta el id del prestamo relacionado para poder mostrar su detalle. */
    public void notificarUsuario(Long usuarioId, String mensaje, Long referenciaId, String bearerToken) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("usuarioId", usuarioId);
            payload.put("mensaje", mensaje);
            payload.put("tipo", "PRESTAMO");
            payload.put("referenciaId", referenciaId);
            String json = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(documentServiceUrl + "/api/notificaciones"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + bearerToken)
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            httpClient.send(request, HttpResponse.BodyHandlers.discarding());
        } catch (Exception ex) {
            log.warn("No se pudo notificar al usuario {}: {}", usuarioId, ex.getMessage());
        }
    }

    /** Notifica a todos los usuarios que tengan el rol indicado (consulta el directorio con el token actual). */
    public void notificarPorRol(String rol, String mensaje, String bearerToken) {
        notificarPorRol(rol, mensaje, null, bearerToken);
    }

    /** Igual que notificarPorRol, pero adjunta el id del prestamo relacionado. */
    public void notificarPorRol(String rol, String mensaje, Long referenciaId, String bearerToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(securityServiceUrl + "/api/usuarios/directorio"))
                    .header("Authorization", "Bearer " + bearerToken)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("No se pudo obtener el directorio de usuarios (HTTP {})", response.statusCode());
                return;
            }
            List<Map<String, Object>> directorio = objectMapper.readValue(
                    response.body(), new TypeReference<List<Map<String, Object>>>() { });
            for (Map<String, Object> usuario : directorio) {
                if (rol.equals(usuario.get("rol"))) {
                    Long usuarioId = Long.valueOf(String.valueOf(usuario.get("id")));
                    notificarUsuario(usuarioId, mensaje, referenciaId, bearerToken);
                }
            }
        } catch (Exception ex) {
            log.warn("No se pudo notificar a los usuarios con rol {}: {}", rol, ex.getMessage());
        }
    }
}
