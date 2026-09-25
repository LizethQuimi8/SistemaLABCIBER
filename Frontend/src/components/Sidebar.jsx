import {
  Home,
  Package,
  ShoppingCart,
  Bell,
  UserCheck,
  Briefcase,
  BookOpen,
  FileText,
  Users,
  BarChart2,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { id: 'dashboard', label: 'Inicio', icon: Home },
  { id: 'proyectos', label: 'Portafolio de Proyectos', icon: Briefcase },
  { id: 'investigadores', label: 'Docentes Investigadores', icon: UserCheck },
  { id: 'publicaciones', label: 'Artículos y Publicaciones', icon: BookOpen },
  { id: 'documentos', label: 'Documentos y Correspondencia', icon: FileText },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'compras', label: 'Compras Públicas', icon: ShoppingCart },
  { id: 'usuarios', label: 'Gestión de Usuarios', icon: Users, adminOnly: true },
  { id: 'reportes', label: 'Reportes', icon: BarChart2 },
]

export default function Sidebar({ currentView, onNavigate, open, onClose }) {
  const { isAdmin } = useAuth()
  const items = menuItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />
      )}
      <aside
        className={`w-64 md:w-52 bg-[#0e6b3c] text-white flex flex-col flex-shrink-0 overflow-y-auto
          fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="bg-[#052a18] px-4 py-3 border-b border-[#16874c] flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
            Menú Principal
          </span>
          <button onClick={onClose} className="text-gray-300 hover:text-white md:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1">
          {items.map(({ id, label, icon: Icon }) => {
            const active = currentView === id
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold
                  border-b border-[#16874c] hover:bg-[#052a18] transition-colors group
                  ${active ? 'bg-[#052a18] text-white border-l-2 border-l-brand-gold' : 'text-gray-300'}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-brand-gold' : 'text-gray-400 group-hover:text-white'}`} />
                <span className="flex-1 leading-tight">{label}</span>
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
