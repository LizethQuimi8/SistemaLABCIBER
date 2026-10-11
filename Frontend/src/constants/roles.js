// Nombres para mostrar en pantalla; el valor interno (clave) sigue siendo el
// rol tal como vive en el JWT y la base de datos — esto es solo de visualizacion.
export const ROL_LABEL = {
  ADMINISTRADOR: 'Jefe de Laboratorio',
  DOCENTE_INVESTIGADOR: 'Miembros Investigadores',
  INVESTIGADOR_COLABORADOR: 'Investigadores Colaboradores',
  ESTUDIANTE: 'Estudiantes de Pregrado y Posgrado',
  ADMIN_INFRAESTRUCTURA: 'Admin. Infraestructura',
  RESPONSABLE_COMPRAS: 'Responsable Compras',
}

export function nombreRol(rol) {
  return ROL_LABEL[rol] || rol
}
