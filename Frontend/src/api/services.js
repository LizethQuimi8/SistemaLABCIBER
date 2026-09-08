import { apiFetch } from './client'

// --- Auth / Usuarios (core-security-users-service) ---
export const login = (email, password) =>
  apiFetch('/api/auth/login', { method: 'POST', body: { email, password }, auth: false })

export const usuariosApi = {
  list: () => apiFetch('/api/usuarios'),
  create: (data) => apiFetch('/api/usuarios', { method: 'POST', body: data }),
  setEstado: (id, activo) => apiFetch(`/api/usuarios/${id}/estado?activo=${activo}`, { method: 'PATCH' }),
  remove: (id) => apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' }),
}

// --- Core Academic & Research Service ---
export const proyectosApi = {
  list: () => apiFetch('/api/proyectos'),
  create: (data) => apiFetch('/api/proyectos', { method: 'POST', body: data }),
  remove: (id) => apiFetch(`/api/proyectos/${id}`, { method: 'DELETE' }),
}

export const investigadoresApi = {
  list: () => apiFetch('/api/investigadores'),
  create: (data) => apiFetch('/api/investigadores', { method: 'POST', body: data }),
  remove: (id) => apiFetch(`/api/investigadores/${id}`, { method: 'DELETE' }),
}

export const publicacionesApi = {
  list: () => apiFetch('/api/publicaciones'),
  create: (data) => apiFetch('/api/publicaciones', { method: 'POST', body: data }),
  remove: (id) => apiFetch(`/api/publicaciones/${id}`, { method: 'DELETE' }),
}

// --- Document & Workflow Service ---
export const documentosApi = {
  list: () => apiFetch('/api/documentos'),
  create: (data) => apiFetch('/api/documentos', { method: 'POST', body: data }),
  remove: (id) => apiFetch(`/api/documentos/${id}`, { method: 'DELETE' }),
}

export const memosApi = {
  list: () => apiFetch('/api/memos'),
  create: (data) => apiFetch('/api/memos', { method: 'POST', body: data }),
  setEstado: (id, estado) => apiFetch(`/api/memos/${id}/estado?estado=${estado}`, { method: 'PATCH' }),
  remove: (id) => apiFetch(`/api/memos/${id}`, { method: 'DELETE' }),
}

export const notificacionesApi = {
  list: () => apiFetch('/api/notificaciones'),
  marcarLeida: (id) => apiFetch(`/api/notificaciones/${id}/leer`, { method: 'PATCH' }),
}

// --- Administrative & Logistics Service ---
export const inventarioApi = {
  list: () => apiFetch('/api/inventario'),
  create: (data) => apiFetch('/api/inventario', { method: 'POST', body: data }),
  remove: (id) => apiFetch(`/api/inventario/${id}`, { method: 'DELETE' }),
}

export const comprasApi = {
  list: () => apiFetch('/api/compras'),
  create: (data) => apiFetch('/api/compras', { method: 'POST', body: data }),
  remove: (id) => apiFetch(`/api/compras/${id}`, { method: 'DELETE' }),
}

// --- Reporting Service ---
export const reportesApi = {
  resumen: () => apiFetch('/api/reportes/resumen'),
}
