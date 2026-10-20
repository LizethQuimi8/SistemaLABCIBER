package ec.edu.espe.lici.document.domain;

/** Las categorias de la estructura organizacional del laboratorio. */
public enum CategoriaGrupoTrabajo {
    /** Jefe de Laboratorio (maximo responsable, rol ADMINISTRADOR). */
    JEFE_LABORATORIO,
    /** Coordinadores de Areas de Trabajo de Investigacion del Laboratorio (GASI, CHET, SASS, ...). */
    COORDINADOR_AREA,
    /** Comisiones de Operatividad del Laboratorio (Compras Publicas, Bienes e Infraestructura, ...). */
    COMISION,
    /** Macro-areas de trabajo del Consejo Cientifico (CORD, SSCRYPT, GGRISK). */
    MACRO_AREA
}
