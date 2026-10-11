package ec.edu.espe.lici.admin.domain;

public enum EstadoPrestamo {
    /** Recien solicitado, a la espera de que Admin. Infraestructura lo evalue y apruebe o rechace. */
    PENDIENTE,
    /** Admin. Infraestructura ya evaluo y aprobo; a la espera de la autorizacion final del ADMINISTRADOR (Jefe de Laboratorio). */
    APROBADO_INFRAESTRUCTURA,
    /** El ADMINISTRADOR autorizo el prestamo; a la espera de que se genere y
     * suba el Acta de Entrega firmada (Admin. Infraestructura, como custodio
     * del bien, formaliza la entrega) antes de que el bien pase a EN_USO. */
    AUTORIZADO,
    /** El Acta de Entrega quedo firmada y cargada: el bien esta en poder del solicitante. */
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
