package ec.edu.espe.lici.security.dto;

import ec.edu.espe.lici.security.domain.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** password es obligatoria solo al crear (validado en UsuarioController.crear);
 * al actualizar puede llegar vacia/nula para conservar la contrasena actual. */
public record UsuarioRequest(
        @NotBlank String nombres,
        @NotBlank String apellidos,
        @NotBlank @Email String email,
        String password,
        String cedula,
        @NotNull Rol rol
) {
}
