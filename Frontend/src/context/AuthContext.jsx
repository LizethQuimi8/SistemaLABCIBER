import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getStoredUser, setSession, clearSession } from '../api/client'
import { login as loginRequest } from '../api/services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => getStoredUser())
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await loginRequest(email, password)
      setSession(response.accessToken, response.usuario)
      setUsuario(response.usuario)
      return true
    } catch (err) {
      const friendly = err.status === 401
        ? 'Correo o contraseña incorrectos'
        : err.message || 'No fue posible iniciar sesion'
      setError(friendly)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUsuario(null)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUsuario(null)
    window.addEventListener('lici:unauthorized', onUnauthorized)
    return () => window.removeEventListener('lici:unauthorized', onUnauthorized)
  }, [])

  const isAdmin = usuario?.rol === 'ADMINISTRADOR'

  return (
    <AuthContext.Provider value={{ usuario, isAdmin, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
