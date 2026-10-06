import { apiFetch, apiUpload, apiFetchBlob } from './client'

// --- Auth / Usuarios (core-security-users-service) ---
export const login = (email, password) =>
  apiFetch('/api/auth/login', { method: 'POST', body: { email, password }, auth: false })

/** Autoservicio del flujo de primer ingreso: cambia la contraseña temporal por una propia. */
export const completarPrimerIngreso = (nuevaPassword) =>
  apiFetch('/api/auth/primer-ingreso', { method: 'PATCH', body: { nuevaPassword } })

export const usuariosApi = {
  list: () => apiFetch('/api/usuarios'),
  /** Id + nombre de todos los usuarios; accesible a cualquier rol autenticado (selectores de "responsable"). */
  directorio: () => apiFetch('/api/usuarios/directorio'),
  create: (data) => apiFetch('/api/usuarios', { method: 'POST', body: data }),
  update: (id, data) => apiFetch(`/api/usuarios/${id}`, { method: 'PUT', body: data }),
  setEstado: (id, activo) => apiFetch(`/api/usuarios/${id}/estado?activo=${activo}`, { method: 'PATCH' }),
  remove: (id) => apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' }),
}

// --- Core Academic & Research Service ---
export const proyectosApi = {
  list: () => apiFetch('/api/proyectos'),
  create: (data) => apiFetch('/api/proyectos', { method: 'POST', body: data }),
  update: (id, data) => apiFetch(`/api/proyectos/${id}`, { method: 'PUT', body: data }),
  subirDocumentoAprobacion: (id, file) => apiUpload(`/api/proyectos/${id}/documento-aprobacion`, file),
  verDocumentoAprobacion: (id) => apiFetchBlob(`/api/proyectos/${id}/documento-aprobacion`),
  remove: (id) => apiFetch(`/api/proyectos/${id}`, { method: 'DELETE' }),
}

export const investigadoresApi = {
  list: () => apiFetch('/api/investigadores'),
  create: (data) => apiFetch('/api/investigadores', { method: 'POST', body: data }),
  update: (id, data) => apiFetch(`/api/investigadores/${id}`, { method: 'PUT', body: data }),
  subirCurriculum: (id, file) => apiUpload(`/api/investigadores/${id}/curriculum`, file),
  verCurriculum: (id) => apiFetchBlob(`/api/investigadores/${id}/curriculum`),
  subirHorario: (id, file) => apiUpload(`/api/investigadores/${id}/horario`, file),
  verHorario: (id) => apiFetchBlob(`/api/investigadores/${id}/horario`),
  remove: (id) => apiFetch(`/api/investigadores/${id}`, { method: 'DELETE' }),
}

export const publicacionesApi = {
  list: () => apiFetch('/api/publicaciones'),
  create: (data) => apiFetch('/api/publicaciones', { method: 'POST', body: data }),
  update: (id, data) => apiFetch(`/api/publicaciones/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiFetch(`/api/publicaciones/${id}`, { method: 'DELETE' }),
}

// --- Document & Workflow Service ---
export const documentosApi = {
  list: () => apiFetch('/api/documentos'),
  create: (data) => apiFetch('/api/documentos', { method: 'POST', body: data }),
  update: (id, data) => apiFetch(`/api/documentos/${id}`, { method: 'PUT', body: data }),
  subirArchivo: (id, file) => apiUpload(`/api/documentos/${id}/archivo`, file),
  verArchivo: (id) => apiFetchBlob(`/api/documentos/${id}/archivo`),
  remove: (id) => apiFetch(`/api/documentos/${id}`, { method: 'DELETE' }),
}

export const manualesApi = {
  list: () => apiFetch('/api/manuales'),
  crear: (titulo, descripcion, tipo, archivo) => apiUpload('/api/manuales', archivo, { fields: { titulo, descripcion, tipo } }),
  actualizar: (id, titulo, descripcion, tipo, archivo) => apiUpload(`/api/manuales/${id}`, archivo, { method: 'PUT', fields: { titulo, descripcion, tipo } }),
  verArchivo: (id) => apiFetchBlob(`/api/manuales/${id}/archivo`),
  remove: (id) => apiFetch(`/api/manuales/${id}`, { method: 'DELETE' }),
}

export const notificacionesApi = {
  list: () => apiFetch('/api/notificaciones'),
  marcarLeida: (id) => apiFetch(`/api/notificaciones/${id}/leer`, { method: 'PATCH' }),
}

// --- Administrative & Logistics Service ---
export const inventarioApi = {
  list: () => apiFetch('/api/inventario'),
  create: (data) => apiFetch('/api/inventario', { method: 'POST', body: data }),
  setEstado: (id, estado) => apiFetch(`/api/inventario/${id}/estado?estado=${estado}`, { method: 'PATCH' }),
  /** Importa/actualiza en bloque la matriz institucional de inventario (Excel .xlsx). */
  importar: (file) => apiUpload('/api/inventario/importar', file),
  remove: (id) => apiFetch(`/api/inventario/${id}`, { method: 'DELETE' }),
}

export const prestamosApi = {
  list: () => apiFetch('/api/prestamos'),
  obtener: (id) => apiFetch(`/api/prestamos/${id}`),
  solicitar: (data) => apiFetch('/api/prestamos', { method: 'POST', body: data }),
  aprobar: (id) => apiFetch(`/api/prestamos/${id}/aprobar`, { method: 'PATCH' }),
  rechazar: (id) => apiFetch(`/api/prestamos/${id}/rechazar`, { method: 'PATCH' }),
  subirActaDevolucion: (id, archivo) => apiUpload(`/api/prestamos/${id}/devolucion`, archivo),
  aprobarDevolucion: (id) => apiFetch(`/api/prestamos/${id}/aprobar-devolucion`, { method: 'PATCH' }),
  rechazarDevolucion: (id, observacion) => apiFetch(
    `/api/prestamos/${id}/rechazar-devolucion${observacion ? `?observacion=${encodeURIComponent(observacion)}` : ''}`,
    { method: 'PATCH' },
  ),
  verActa: (id) => apiFetchBlob(`/api/prestamos/${id}/acta`),
}

export const comprasApi = {
  list: () => apiFetch('/api/compras'),
  create: (data) => apiFetch('/api/compras', { method: 'POST', body: data }),
  update: (id, data) => apiFetch(`/api/compras/${id}`, { method: 'PUT', body: data }),
  setFase: (id, fase) => apiFetch(`/api/compras/${id}/fase?fase=${fase}`, { method: 'PATCH' }),
  subirArchivo: (id, file) => apiUpload(`/api/compras/${id}/archivo`, file),
  verArchivo: (id) => apiFetchBlob(`/api/compras/${id}/archivo`),
  subirZipEntrega: (id, file) => apiUpload(`/api/compras/${id}/zip-entrega`, file),
  verZipEntrega: (id) => apiFetchBlob(`/api/compras/${id}/zip-entrega`),
  remove: (id) => apiFetch(`/api/compras/${id}`, { method: 'DELETE' }),
}

// --- Reporting Service ---
export const reportesApi = {
  resumen: () => apiFetch('/api/reportes/resumen'),
}
