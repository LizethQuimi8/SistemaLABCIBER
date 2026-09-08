import { useEffect, useState } from 'react'
import { Bell, User, Globe, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { notificacionesApi } from '../api/services'

export default function Navbar({ onNavigate }) {
  const { usuario, logout } = useAuth()
  const [notificaciones, setNotificaciones] = useState([])
  const [showNotif, setShowNotif] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  useEffect(() => {
    let cancelled = false
    notificacionesApi.list().then((data) => { if (!cancelled) setNotificaciones(data || []) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const unread = notificaciones.filter((n) => !n.leida).length

  const marcarLeida = async (id) => {
    try {
      await notificacionesApi.marcarLeida(id)
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)))
    } catch {
      // silencioso: el usuario puede reintentar desde la pagina de Notificaciones
    }
  }

  const closeAll = () => { setShowNotif(false); setShowAccount(false) }

  return (
    <header className="bg-white text-[#0f172a] w-full border-b border-gray-200 shadow-sm relative z-20">
      {(showNotif || showAccount) && (
        <div className="fixed inset-0 z-10" onClick={closeAll} />
      )}
      <div className="flex items-center justify-between px-4 h-16 relative z-20">
        <div className="flex items-center gap-3">
          <img
            src="/espe-logo.png"
            alt="Escudo ESPE"
            className="object-contain flex-shrink-0"
            style={{ width: '130px', height: '58px' }}
          />
          <div>
            <h1 className="text-xl font-black text-[#0f172a] tracking-wide leading-tight">
              UNIVERSIDAD DE LAS FUERZAS ARMADAS ESPE
            </h1>
            <p className="text-[11px] text-gray-500 tracking-wider uppercase">
              SISTEMA DE GESTIÓN DOCUMENTAL — LABORATORIO DE INVESTIGACIÓN DE CIBERSEGURIDAD (LICI)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="flex items-center gap-1 border border-gray-400 rounded px-2 py-1">
            <Shield className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="text-[10px] font-bold text-blue-600 leading-none">ISO</div>
              <div className="text-[10px] font-black text-[#0f172a] leading-none">27001</div>
            </div>
          </div>

          {/* Mi Cuenta */}
          <div className="relative">
            <button
              onClick={() => { setShowAccount((v) => !v); setShowNotif(false) }}
              className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#0f172a] transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="text-[10px]">Mi Cuenta</span>
            </button>
            {showAccount && (
              <div className="absolute right-0 top-10 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-30">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{usuario?.nombres} {usuario?.apellidos}</p>
                  <p className="text-xs text-gray-500">{usuario?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                    {usuario?.rol}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>

          {/* Notificaciones */}
          <div className="relative">
            <button
              onClick={() => { setShowNotif((v) => !v); setShowAccount(false) }}
              className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#0f172a] transition-colors"
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </div>
              <span className="text-[10px]">Notificaciones</span>
            </button>
            {showNotif && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-30 max-h-80 overflow-y-auto">
                {notificaciones.length === 0 && (
                  <p className="px-4 py-3 text-xs text-gray-400">Sin notificaciones</p>
                )}
                {notificaciones.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => marcarLeida(n.id)}
                    className={`w-full text-left px-4 py-2 text-xs border-b border-gray-50 last:border-0 hover:bg-gray-50 ${!n.leida ? 'bg-blue-50/50 font-medium text-gray-800' : 'text-gray-500'}`}
                  >
                    {n.mensaje}
                  </button>
                ))}
                <button
                  onClick={() => { onNavigate?.('notificaciones'); closeAll() }}
                  className="w-full text-center px-4 py-2 text-[11px] text-blue-600 hover:underline"
                >
                  Ver todas
                </button>
              </div>
            )}
          </div>

          <button className="flex items-center gap-1 text-gray-600 hover:text-[#0f172a] transition-colors border border-gray-300 rounded px-2 py-1">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">ES</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
