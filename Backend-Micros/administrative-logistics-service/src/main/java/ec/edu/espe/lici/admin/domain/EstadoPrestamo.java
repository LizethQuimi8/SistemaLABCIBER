package ec.edu.espe.lici.admin.domain;

public enum EstadoPrestamo {
    /** Recien solicitado, a la espera de que Admin. Infraestructura lo apruebe o rechace. */
    PENDIENTE,
    /** Admin. Infraestructura ya aprobo; a la espera de la confirmacion final del ADMINISTRADOR. */
    APROBADO_INFRAESTRUCTURA,
    /** El ADMINISTRADOR confirmo: el bien esta en poder del solicitante. */
    ACTIVO,
    /** El solicitante subio el acta de devolucion firmada; a la espera de que
     * TANTO Admin. Infraestructura COMO el ADMINISTRADOR la validen (cada
     * uno firma por separado, en cualquier orden) o de que cualquiera de los
     * dos la rechace por archivo incorrecto. */
    DEVOLUCION_PENDIENTE,
    /** Ambos (Admin. Infraestructura y el ADMINISTRADOR) firmaron la devolucion: el bien vuelve a estar disponible. */
    DEVUELTO,
    /** Admin. Infraestructura o el ADMINISTRADOR lo rechazo; el bien nunca llego a entregarse. */
    RECHAZADO
}
