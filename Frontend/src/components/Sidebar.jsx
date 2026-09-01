import { useState } from 'react'
import {
  Package,
  ShoppingCart,
  Mail,
  UserCheck,
  Briefcase,
  BookOpen,
  Users,
  Shield,
  BarChart2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

const menuItems = [
  {
    id: 'inventario',
    label: 'INVENTARIO',
    icon: Package,
    children: [
      'Activos de Información',
      'Equipos Tecnológicos',
      'Software Licenciado',
      'Infraestructura',
    ],
  },
  {
    id: 'compras',
    label: 'COMPRAS PÚBLICAS',
    icon: ShoppingCart,
    children: [
      'Proceso de Contratación',
      'Proveedores',
      'Órdenes de Compra',
    ],
  },
  {
    id: 'memos',
    label: 'MEMOS Y CORRESPONDENCIA',
    icon: Mail,
    children: [
      'Memorandos Internos',
      'Oficios',
      'Circulares',
    ],
  },
  {
    id: 'docentes',
    label: 'INFORMACIÓN DE DOCENTES INVESTIGADORES',
    icon: UserCheck,
    children: [],
  },
  {
    id: 'portafolio',
    label: 'PORTAFOLIO DE PROYECTOS',
    icon: Briefcase,
    children: [],
  },
  {
    id: 'articulos',
    label: 'ARTÍCULOS CIENTÍFICOS Y PUBLICACIONES',
    icon: BookOpen,
    children: [
      'Publicaciones Indexadas',
      'Revistas Científicas',
      'Congresos',
    ],
  },
  {
    id: 'usuarios',
    label: 'Gestión de Usuarios',
    icon: Users,
    children: [
      'Crear Usuario',
      'Roles y Permisos',
      'Auditoría',
    ],
  },
  {
    id: 'seguridad',
    label: 'Políticas de Seguridad',
    icon: Shield,
    children: [
      'ISO 27001',
      'Controles',
      'Incidentes',
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: BarChart2,
    children: [
      'Reporte General',
      'Estadísticas',
      'Exportar',
    ],
  },
]

export default function Sidebar() {
  const [openMenus, setOpenMenus] = useState({})

  const toggle = (id) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="w-52 bg-[#1e293b] text-white flex flex-col flex-shrink-0 overflow-y-auto">
      {/* Header menú */}
      <div className="bg-[#0f172a] px-4 py-3 border-b border-[#334155]">
        <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
          Menú Principal
        </span>
      </div>

      <nav className="flex-1">
        {menuItems.map(({ id, label, icon: Icon, children }) => (
          <div key={id} className="border-b border-[#334155]">
            {/* Item principal */}
            <button
              onClick={() => children.length > 0 && toggle(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold
                hover:bg-[#0f172a] transition-colors group
                ${openMenus[id] ? 'bg-[#0f172a] text-white' : 'text-gray-300'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-white" />
              <span className="flex-1 leading-tight">{label}</span>
              {children.length > 0 && (
                openMenus[id]
                  ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              )}
            </button>

            {/* Submenú desplegable */}
            {children.length > 0 && openMenus[id] && (
              <div className="bg-[#0f172a]">
                {children.map((child) => (
                  <button
                    key={child}
                    className="w-full text-left px-8 py-2 text-xs text-gray-400
                      hover:text-white hover:bg-[#334155] transition-colors border-l-2 border-transparent
                      hover:border-yellow-400"
                  >
                    • {child}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
