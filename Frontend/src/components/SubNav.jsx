import { Home, FolderOpen, FileText, Users, ShieldCheck, HelpCircle } from 'lucide-react'

const tabs = [
  { label: 'Inicio', icon: Home, view: 'dashboard' },
  { label: 'Proyectos', icon: FolderOpen, view: 'proyectos' },
  { label: 'Documentos', icon: FileText, view: 'documentos' },
  { label: 'Personal', icon: Users, view: 'investigadores' },
  { label: 'Normativas (ISO 27001)', icon: ShieldCheck, view: null },
  { label: 'Ayuda', icon: HelpCircle, view: null },
]

export default function SubNav({ currentView, onNavigate }) {
  return (
    <nav className="bg-[#1e293b] border-b border-[#334155]">
      <div className="flex items-stretch">
        {tabs.map(({ label, icon: Icon, view }) => {
          const active = view && currentView === view
          return (
            <button
              key={label}
              onClick={() => view && onNavigate(view)}
              disabled={!view}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2
                ${active
                  ? 'bg-[#0f172a] text-white border-yellow-400'
                  : 'text-gray-300 border-transparent hover:bg-[#0f172a] hover:text-white disabled:hover:bg-transparent disabled:opacity-50'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
