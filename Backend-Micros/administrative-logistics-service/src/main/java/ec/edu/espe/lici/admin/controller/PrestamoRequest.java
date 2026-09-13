package ec.edu.espe.lici.admin.controller;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/** Cuerpo de la solicitud de prestamo: solo el bien y una observacion opcional.
 * El usuarioId, estado y fechas los fija el servidor. */
@Getter
@Setter
public class PrestamoRequest {

    @NotNull
    private Long bienId;

    private String observaciones;
}
