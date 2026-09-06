package ec.edu.espe.lici.reporting.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Optional;

/**
 * Servicio de solo lectura: agrega conteos consultando a los demas
 * microservicios via REST, propagando el mismo JWT del usuario que llamo a
 * este endpoint. Como cada servicio ya filtra por propiedad segun el rol del
 * token (ver CurrentUser en cada dominio), un DOCENTE_INVESTIGADOR recibe de
 * forma natural solo el conteo de sus propios registros, y un
 * ADMINISTRADOR recibe el total global, sin logica adicional aqui.
 *
 * Todas las llamadas son no bloqueantes y se componen con Mono.zip en el
 * controller: ninguna consulta debe bloquear el event-loop de WebFlux.
 */
@Service
public class ReporteAggregatorService {

    private final WebClient webClient;
    private final String securityServiceUrl;
    private final String academicServiceUrl;
    private final String documentServiceUrl;
    private final String adminServiceUrl;

    public ReporteAggregatorService(WebClient.Builder webClientBuilder,
                                     @Value("${lici.services.security-service-url}") String securityServiceUrl,
                                     @Value("${lici.services.academic-service-url}") String academicServiceUrl,
                                     @Value("${lici.services.document-service-url}") String documentServiceUrl,
                                     @Value("${lici.services.admin-service-url}") String adminServiceUrl) {
        this.webClient = webClientBuilder.build();
        this.securityServiceUrl = securityServiceUrl;
        this.academicServiceUrl = academicServiceUrl;
        this.documentServiceUrl = documentServiceUrl;
        this.adminServiceUrl = adminServiceUrl;
    }

    public Mono<Optional<Integer>> contarProyectos(String bearerToken) {
        return contarLista(academicServiceUrl + "/api/proyectos", bearerToken);
    }

    public Mono<Optional<Integer>> contarInvestigadores(String bearerToken) {
        return contarLista(academicServiceUrl + "/api/investigadores", bearerToken);
    }

    public Mono<Optional<Integer>> contarPublicaciones(String bearerToken) {
        return contarLista(academicServiceUrl + "/api/publicaciones", bearerToken);
    }

    public Mono<Optional<Integer>> contarDocumentos(String bearerToken) {
        return contarLista(documentServiceUrl + "/api/documentos", bearerToken);
    }

    public Mono<Optional<Integer>> contarMemos(String bearerToken) {
        return contarLista(documentServiceUrl + "/api/memos", bearerToken);
    }

    public Mono<Optional<Integer>> contarBienesInventario(String bearerToken) {
        return contarLista(adminServiceUrl + "/api/inventario", bearerToken);
    }

    public Mono<Optional<Integer>> contarComprasPublicas(String bearerToken) {
        return contarLista(adminServiceUrl + "/api/compras", bearerToken);
    }

    public Mono<Optional<Integer>> contarUsuarios(String bearerToken) {
        return contarLista(securityServiceUrl + "/api/usuarios", bearerToken);
    }

    /** Emite Optional.empty() si el usuario no tiene acceso al recurso (403) en vez de fallar todo el reporte. */
    private Mono<Optional<Integer>> contarLista(String url, String bearerToken) {
        return webClient.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, bearerToken)
                .retrieve()
                .bodyToMono(List.class)
                .map(List::size)
                .map(Optional::of)
                .onErrorResume(ex -> Mono.just(Optional.empty()));
    }
}
