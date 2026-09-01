package ec.edu.espe.lici.reporting.controller;

import ec.edu.espe.lici.reporting.dto.ReporteResumenDTO;
import ec.edu.espe.lici.reporting.service.ReporteAggregatorService;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteAggregatorService aggregatorService;

    public ReporteController(ReporteAggregatorService aggregatorService) {
        this.aggregatorService = aggregatorService;
    }

    /**
     * Dashboard consolidado. El alcance de los datos (global vs. propio) lo
     * decide cada servicio de dominio segun el rol embebido en el JWT
     * propagado, no este servicio.
     */
    @GetMapping("/resumen")
    public ReporteResumenDTO resumen(JwtAuthenticationToken authentication) {
        Jwt jwt = authentication.getToken();
        String bearerToken = "Bearer " + jwt.getTokenValue();
        String rol = jwt.getClaimAsStringList("roles").isEmpty() ? "DESCONOCIDO" : jwt.getClaimAsStringList("roles").get(0);

        return new ReporteResumenDTO(
                jwt.getClaimAsString("email"),
                rol,
                aggregatorService.contarProyectos(bearerToken),
                aggregatorService.contarInvestigadores(bearerToken),
                aggregatorService.contarPublicaciones(bearerToken),
                aggregatorService.contarDocumentos(bearerToken),
                aggregatorService.contarMemos(bearerToken),
                aggregatorService.contarBienesInventario(bearerToken),
                aggregatorService.contarComprasPublicas(bearerToken),
                aggregatorService.contarUsuarios(bearerToken));
    }
}
