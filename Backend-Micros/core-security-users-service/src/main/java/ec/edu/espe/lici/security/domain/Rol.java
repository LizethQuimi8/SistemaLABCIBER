package ec.edu.espe.lici.security.domain;

public enum Rol {
    ADMINISTRADOR,
    DOCENTE_INVESTIGADOR,
    /** Docentes, postdoctorales o profesionales externos que colaboran en proyectos del laboratorio. */
    INVESTIGADOR_COLABORADOR,
    /** Estudiantes, maestrantes y doctorandos (pasantias, trabajos de integracion curricular). */
    ESTUDIANTE,
    /** Responsable del modulo de Inventario (bienes): CRUD ahi, solo lectura en el resto. */
    ADMIN_INFRAESTRUCTURA,
    /** Responsable del modulo de Compras Publicas: CRUD ahi, solo lectura en el resto. */
    RESPONSABLE_COMPRAS
}
