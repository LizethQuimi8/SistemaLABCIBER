package ec.edu.espe.lici.admin.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/** Cuerpo de la solicitud de prestamo: el bien, el rango de fechas que lo
 * necesita, el motivo y una observacion opcional. El usuarioId y el estado
 * los fija el servidor. */
@Getter
@Setter
public class PrestamoRequest {

    @NotNull
    private Long bienId;

    @NotNull
    private LocalDate fechaDesde;

    @NotNull
    private LocalDate fechaHasta;

    @NotBlank
    private String motivo;

    private String observaciones;
}
