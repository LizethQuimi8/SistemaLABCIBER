package ec.edu.espe.lici.admin.domain;

public enum EstadoPrestamo {
    /** Recien solicitado, a la espera de que un responsable lo apruebe o rechace. */
    PENDIENTE,
    /** Aprobado: el bien esta en poder del solicitante. */
    ACTIVO,
    /** Aprobado y ya devuelto. */
    DEVUELTO,
    /** Un ADMINISTRADOR lo rechazo; el bien nunca llego a entregarse. */
    RECHAZADO
}
