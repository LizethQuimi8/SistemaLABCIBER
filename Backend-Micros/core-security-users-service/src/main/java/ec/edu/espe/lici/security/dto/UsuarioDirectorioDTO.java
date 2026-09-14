package ec.edu.espe.lici.security.dto;

import ec.edu.espe.lici.security.domain.Usuario;

/** Version minima del usuario (sin email/cedula/rol) para poblar selectores de
 * "responsable" en otros modulos sin exponer /api/usuarios completo a Docentes. */
public record UsuarioDirectorioDTO(Long id, String nombres, String apellidos) {
    public static UsuarioDirectorioDTO from(Usuario u) {
        return new UsuarioDirectorioDTO(u.getId(), u.getNombres(), u.getApellidos());
    }
}
