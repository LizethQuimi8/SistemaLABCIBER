import { Home, FolderOpen, FileText, Users } from 'lucide-react'

const tabs = [
  { label: 'Inicio', icon: Home, view: 'dashboard' },
  { label: 'Proyectos', icon: FolderOpen, view: 'proyectos' },
  { label: 'Documentos', icon: FileText, view: 'documentos' },
  { label: 'Personal', icon: Users, view: 'investigadores' },
]

export default function SubNav({ currentView, onNavigate }) {
  return (
    <nav className="bg-[#0e6b3c] border-b border-[#16874c]">
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
    </nav>
  )
}
