import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getStoredUser, getToken, setSession, clearSession } from '../api/client'
import { login as loginRequest, completarPrimerIngreso as completarPrimerIngresoRequest } from '../api/services'

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

  /** Cierra el flujo de primer ingreso: guarda la nueva contraseña y refresca la sesion local. */
  const completarPrimerIngreso = useCallback(async (nuevaPassword) => {
    const usuarioActualizado = await completarPrimerIngresoRequest(nuevaPassword)
    setSession(getToken(), usuarioActualizado)
    setUsuario(usuarioActualizado)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUsuario(null)
    window.addEventListener('lici:unauthorized', onUnauthorized)
    return () => window.removeEventListener('lici:unauthorized', onUnauthorized)
  }, [])

  const isAdmin = usuario?.rol === 'ADMINISTRADOR'
  const isAdminInfraestructura = usuario?.rol === 'ADMIN_INFRAESTRUCTURA'
  const isResponsableCompras = usuario?.rol === 'RESPONSABLE_COMPRAS'
  // Cada rol especializado edita solo su modulo; el resto de pestañas les
  // queda en solo lectura (excepto Docentes Investigadores, que es editable
  // por cualquier usuario autenticado, ver InvestigadoresPage).
  const canEditInventario = isAdmin || isAdminInfraestructura
  const canEditCompras = isAdmin || isResponsableCompras

  return (
    <AuthContext.Provider value={{
      usuario, isAdmin, isAdminInfraestructura, isResponsableCompras,
      canEditInventario, canEditCompras, login, logout, completarPrimerIngreso, loading, error,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
