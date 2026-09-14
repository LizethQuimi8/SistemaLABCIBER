// Cliente HTTP hacia el API Gateway. Todo el trafico del frontend pasa por
// el Gateway (puerto 8080), nunca directo a un microservicio.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const TOKEN_KEY = 'lici_token'
const USER_KEY = 'lici_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function setSession(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(usuario))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return null

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession()
      window.dispatchEvent(new CustomEvent('lici:unauthorized'))
    }
    const message = data?.message || data?.error || `Error ${response.status}`
    throw new ApiError(response.status, message)
  }

  return data
}

/** Sube un archivo (multipart/form-data); el navegador fija el Content-Type con el boundary. */
export async function apiUpload(path, file, fieldName = 'archivo') {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const formData = new FormData()
  formData.append(fieldName, file)

  const response = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
      window.dispatchEvent(new CustomEvent('lici:unauthorized'))
    }
    const message = data?.message || data?.error || `Error ${response.status}`
    throw new ApiError(response.status, message)
  }

  return data
}

/** Descarga un archivo binario protegido (requiere el Bearer token) como Blob, para previsualizarlo. */
export async function apiFetchBlob(path) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${BASE_URL}${path}`, { method: 'GET', headers })

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
      window.dispatchEvent(new CustomEvent('lici:unauthorized'))
    }
    let message = `Error ${response.status}`
    try {
      const data = await response.json()
      message = data?.message || data?.error || message
    } catch {
      // el cuerpo del error no era JSON (o no habia cuerpo); se usa el mensaje generico
    }
    throw new ApiError(response.status, message)
  }

  return response.blob()
}

export { ApiError }
