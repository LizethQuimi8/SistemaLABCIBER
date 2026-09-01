import { useState } from 'react'
import { Home, FolderOpen, FileText, Users, ShieldCheck, HelpCircle } from 'lucide-react'

const tabs = [
  { label: 'Inicio',              icon: Home },
  { label: 'Proyectos',           icon: FolderOpen },
  { label: 'Documentos',          icon: FileText },
  { label: 'Personal',            icon: Users },
  { label: 'Normativas (ISO 27001)', icon: ShieldCheck },
  { label: 'Ayuda',               icon: HelpCircle },
]

export default function SubNav() {
  const [active, setActive] = useState('Inicio')

  return (
    <nav className="bg-[#1e293b] border-b border-[#334155]">
      <div className="flex items-stretch">
        {tabs.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setActive(label)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2
              ${active === label
                ? 'bg-[#0f172a] text-white border-yellow-400'
                : 'text-gray-300 border-transparent hover:bg-[#0f172a] hover:text-white'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
