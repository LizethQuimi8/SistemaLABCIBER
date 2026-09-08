import {
  Home,
  Package,
  ShoppingCart,
  Mail,
  Bell,
  UserCheck,
  Briefcase,
  BookOpen,
  FileText,
  Users,
  BarChart2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { id: 'dashboard', label: 'Inicio', icon: Home },
  { id: 'proyectos', label: 'Portafolio de Proyectos', icon: Briefcase },
  { id: 'investigadores', label: 'Docentes Investigadores', icon: UserCheck },
  { id: 'publicaciones', label: 'Artículos y Publicaciones', icon: BookOpen },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'memos', label: 'Memos y Correspondencia', icon: Mail },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'compras', label: 'Compras Públicas', icon: ShoppingCart, adminOnly: true },
  { id: 'usuarios', label: 'Gestión de Usuarios', icon: Users, adminOnly: true },
  { id: 'reportes', label: 'Reportes', icon: BarChart2 },
]

export default function Sidebar({ currentView, onNavigate }) {
  const { isAdmin } = useAuth()
  const items = menuItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="w-52 bg-[#1e293b] text-white flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="bg-[#0f172a] px-4 py-3 border-b border-[#334155]">
        <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
          Menú Principal
        </span>
      </div>

      <nav className="flex-1">
        {items.map(({ id, label, icon: Icon }) => {
          const active = currentView === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold
                border-b border-[#334155] hover:bg-[#0f172a] transition-colors group
                ${active ? 'bg-[#0f172a] text-white border-l-2 border-l-yellow-400' : 'text-gray-300'}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-yellow-400' : 'text-gray-400 group-hover:text-white'}`} />
              <span className="flex-1 leading-tight">{label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
