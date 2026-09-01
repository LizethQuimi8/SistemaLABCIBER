package ec.edu.espe.lici.security.dto;

import ec.edu.espe.lici.security.domain.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UsuarioRequest(
        @NotBlank String nombres,
        @NotBlank String apellidos,
        @NotBlank @Email String email,
        @NotBlank String password,
        String cedula,
        @NotNull Rol rol
) {
}
