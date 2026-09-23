package ec.edu.espe.lici.security.dto;

import ec.edu.espe.lici.security.domain.Rol;
import ec.edu.espe.lici.security.domain.Usuario;

/** Version minima del usuario (sin email/cedula) para poblar selectores de
 * "responsable" en otros modulos sin exponer /api/usuarios completo a Docentes.
 * Incluye el rol porque otros microservicios lo usan para ubicar, por ejemplo,
 * a que usuarios notificar como ADMINISTRADOR (ver flujo de aprobacion de
 * prestamos en administrative-logistics-service). */
public record UsuarioDirectorioDTO(Long id, String nombres, String apellidos, Rol rol) {
    public static UsuarioDirectorioDTO from(Usuario u) {
        return new UsuarioDirectorioDTO(u.getId(), u.getNombres(), u.getApellidos(), u.getRol());
    }
}
