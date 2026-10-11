// Nombres para mostrar en pantalla; el valor interno (clave) sigue siendo el
// rol tal como vive en el JWT y la base de datos — esto es solo de visualizacion.
export const ROL_LABEL = {
  ADMINISTRADOR: 'Jefe de Laboratorio',
  ADMIN_INFRAESTRUCTURA: 'Admin. Infraestructura',
  DOCENTE_INVESTIGADOR: 'Docente Investigador',
  RESPONSABLE_COMPRAS: 'Responsable Compras',
}

export function nombreRol(rol) {
  return ROL_LABEL[rol] || rol
}
