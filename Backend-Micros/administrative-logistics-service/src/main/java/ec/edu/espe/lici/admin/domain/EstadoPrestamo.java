package ec.edu.espe.lici.admin.domain;

public enum EstadoPrestamo {
    /** Recien solicitado, a la espera de que Admin. Infraestructura lo apruebe o rechace. */
    PENDIENTE,
    /** Admin. Infraestructura ya aprobo; a la espera de la confirmacion final del ADMINISTRADOR. */
    APROBADO_INFRAESTRUCTURA,
    /** El ADMINISTRADOR confirmo: el bien esta en poder del solicitante. */
    ACTIVO,
    /** Aprobado y ya devuelto. */
    DEVUELTO,
    /** Admin. Infraestructura o el ADMINISTRADOR lo rechazo; el bien nunca llego a entregarse. */
    RECHAZADO
}
