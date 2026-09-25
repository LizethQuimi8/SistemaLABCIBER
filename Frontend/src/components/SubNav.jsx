import { useEffect, useState } from 'react'
import { Home, FolderOpen, FileText, Users, Bell, User, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { notificacionesApi } from '../api/services'

const tabs = [
  { label: 'Inicio', icon: Home, view: 'dashboard' },
  { label: 'Proyectos', icon: FolderOpen, view: 'proyectos' },
  { label: 'Documentos', icon: FileText, view: 'documentos' },
  { label: 'Personal', icon: Users, view: 'investigadores' },
]

export default function SubNav({ currentView, onNavigate, onToggleMenu }) {
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
    <nav className="bg-[#0e6b3c] border-b border-[#16874c] relative z-20">
      {(showNotif || showAccount) && (
        <div className="fixed inset-0 z-10" onClick={closeAll} />
      )}
      <div className="flex items-stretch justify-between relative z-20">
        <div className="flex items-stretch min-w-0">
          <button
            onClick={onToggleMenu}
            className="flex items-center px-4 text-gray-200 hover:bg-[#052a18] hover:text-white transition-colors md:hidden"
            title="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:flex items-stretch overflow-x-auto">
            {tabs.map(({ label, icon: Icon, view }) => {
              const active = view && currentView === view
              return (
                <button
                  key={label}
                  onClick={() => view && onNavigate(view)}
                  disabled={!view}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap
                    ${active
                      ? 'bg-[#052a18] text-white border-brand-gold'
                      : 'text-gray-300 border-transparent hover:bg-[#052a18] hover:text-white disabled:hover:bg-transparent disabled:opacity-50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-stretch flex-shrink-0">
          {/* Mi Cuenta */}
          <div className="relative flex">
            <button
              onClick={() => { setShowAccount((v) => !v); setShowNotif(false) }}
              className="flex items-center gap-2 px-3 sm:px-5 py-3 text-sm font-medium text-gray-300 hover:bg-[#052a18] hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Cuenta</span>
            </button>
            {showAccount && (
              <div className="absolute right-0 top-full w-56 max-w-[85vw] bg-white border border-gray-200 rounded-b-lg shadow-lg py-2 z-30">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{usuario?.nombres} {usuario?.apellidos}</p>
                  <p className="text-xs text-gray-500 break-all">{usuario?.email}</p>
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
          <div className="relative flex">
            <button
              onClick={() => { setShowNotif((v) => !v); setShowAccount(false) }}
              className="flex items-center gap-2 px-3 sm:px-5 py-3 text-sm font-medium text-gray-300 hover:bg-[#052a18] hover:text-white transition-colors"
            >
              <div className="relative">
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Notificaciones</span>
            </button>
            {showNotif && (
              <div className="absolute right-0 top-full w-72 max-w-[90vw] bg-white border border-gray-200 rounded-b-lg shadow-lg py-2 z-30 max-h-80 overflow-y-auto">
                {notificaciones.length === 0 && (
                  <p className="px-4 py-3 text-xs text-gray-400">Sin notificaciones</p>
                )}
                {notificaciones.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => marcarLeida(n.id)}
                    className={`w-full text-left px-4 py-2 text-xs border-b border-gray-50 last:border-0 hover:bg-gray-50 ${!n.leida ? 'bg-green-50/50 font-medium text-gray-800' : 'text-gray-500'}`}
                  >
                    {n.mensaje}
                  </button>
                ))}
                <button
                  onClick={() => { onNavigate?.('notificaciones'); closeAll() }}
                  className="w-full text-center px-4 py-2 text-[11px] text-[#0e6b3c] hover:underline"
                >
                  Ver todas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
