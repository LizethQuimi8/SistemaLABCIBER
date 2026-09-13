package ec.edu.espe.lici.admin.domain;

/** Fases del proceso de contratacion publica (SERCOP), en orden. El admin las
 * va avanzando manualmente a medida que el proceso real progresa. */
public enum FaseCompra {
    PREPARATORIA,
    PRECONTRACTUAL,
    CONTRACTUAL,
    ENTREGA_BIENES,
    PAGO_PROVEEDOR
}
