package ec.edu.espe.lici.admin.domain;

public enum EstadoPrestamo {
    /** Recien solicitado, a la espera de que Admin. Infraestructura lo apruebe o rechace. */
    PENDIENTE,
    /** Admin. Infraestructura ya aprobo; a la espera de la confirmacion final del ADMINISTRADOR. */
    APROBADO_INFRAESTRUCTURA,
    /** El ADMINISTRADOR confirmo: el bien esta en poder del solicitante. */
    ACTIVO,
    /** El solicitante subio el acta de devolucion firmada; a la espera de que
     * Admin. Infraestructura la valide o la rechace por archivo incorrecto. */
    DEVOLUCION_PENDIENTE,
    /** Admin. Infraestructura ya valido el acta; a la espera de la firma
     * final del ADMINISTRADOR para cerrar la devolucion. */
    DEVOLUCION_APROBADA_INFRAESTRUCTURA,
    /** Devolucion confirmada por ambos (o por el ADMINISTRADOR directamente): el bien vuelve a estar disponible. */
    DEVUELTO,
    /** Admin. Infraestructura o el ADMINISTRADOR lo rechazo; el bien nunca llego a entregarse. */
    RECHAZADO
}
