package ec.edu.espe.lici.security.dto;

import ec.edu.espe.lici.security.domain.Rol;
import ec.edu.espe.lici.security.domain.Usuario;

public record UsuarioResponse(
        Long id,
        String nombres,
        String apellidos,
        String email,
        String cedula,
        Rol rol,
        boolean activo
) {
    public static UsuarioResponse from(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getNombres(), u.getApellidos(), u.getEmail(),
                u.getCedula(), u.getRol(), u.isActivo());
    }
}
