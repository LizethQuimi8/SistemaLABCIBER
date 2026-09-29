package ec.edu.espe.lici.security.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarPasswordRequest(
        @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres") String nuevaPassword
) {
}
