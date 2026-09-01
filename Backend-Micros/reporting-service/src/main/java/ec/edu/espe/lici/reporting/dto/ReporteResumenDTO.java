package ec.edu.espe.lici.reporting.dto;

public record ReporteResumenDTO(
        String generadoPara,
        String rol,
        Integer totalProyectos,
        Integer totalInvestigadores,
        Integer totalPublicaciones,
        Integer totalDocumentos,
        Integer totalMemos,
        Integer totalBienesInventario,
        Integer totalComprasPublicas,
        Integer totalUsuarios
) {
}
