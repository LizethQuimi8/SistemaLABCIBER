package ec.edu.espe.lici.security.domain;

public enum Rol {
    ADMINISTRADOR,
    DOCENTE_INVESTIGADOR,
    /** Responsable del modulo de Inventario (bienes): CRUD ahi, solo lectura en el resto. */
    ADMIN_INFRAESTRUCTURA,
    /** Responsable del modulo de Compras Publicas: CRUD ahi, solo lectura en el resto. */
    RESPONSABLE_COMPRAS
}
