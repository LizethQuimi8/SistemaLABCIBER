import { FileText, FilePlus, Upload, RefreshCw, Search, Lock, Shield } from 'lucide-react'
import BarChart from './BarChart'

// ── Tarjeta de resumen de documentos ──────────────────────────────────────────
const docItems = [
  { label: 'Documentos recientes',      count: 5,  color: 'bg-green-500'  },
  { label: 'Documentos de Proyectos',   count: 13, color: 'bg-blue-500'   },
  { label: 'Memos y Correspondencia',   count: 0,  color: 'bg-red-500'    },
  { label: 'Portafolio de Proyectos',   count: 2,  color: 'bg-yellow-500' },
  { label: 'Consultar Publicaciones',   count: 0,  color: 'bg-blue-400'   },
]

function DocSummaryCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Total */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#1e293b] text-white p-2 rounded">
            <FileText className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-gray-600">Total de documentos</span>
        </div>
        <span className="text-3xl font-black text-[#0f172a]">33</span>
      </div>

      {/* Desglose */}
      <ul className="space-y-2">
        {docItems.map(({ label, count, color }) => (
          <li key={label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${color}`} />
              <span className="text-xs text-gray-700">{label}</span>
            </div>
            <span className="text-xs font-bold text-gray-800">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Tabla documentos pendientes de firma ──────────────────────────────────────
function PendingSignatureTable() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-[#0f172a] mb-3">Documentos Pendientes de Firma</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#1e293b] text-white">
              <th className="text-left px-3 py-2 font-semibold rounded-tl-sm">Documentos</th>
              <th className="text-center px-3 py-2 font-semibold">Pendientes</th>
              <th className="text-center px-3 py-2 font-semibold rounded-tr-sm">Firma</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-600">No Pendientes de Firma</td>
              <td className="px-3 py-2 text-center font-semibold text-gray-800">0</td>
              <td className="px-3 py-2 text-center font-semibold text-gray-800">0</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Accesos directos ───────────────────────────────────────────────────────────
const shortcuts = [
  { label: 'Registrar Nuevo Proyecto', icon: FilePlus,   color: 'bg-[#1e293b] hover:bg-[#334155]' },
  { label: 'Subir Memorando',          icon: Upload,     color: 'bg-[#1e293b] hover:bg-[#334155]' },
  { label: 'Actualizar Inventario',    icon: RefreshCw,  color: 'bg-[#1e293b] hover:bg-[#334155]' },
  { label: 'Consultar Publicaciones',  icon: Search,     color: 'bg-[#1e293b] hover:bg-[#334155]' },
]

function ShortcutsRow() {
  return (
    <div>
      <h3 className="text-sm font-bold text-[#0f172a] mb-3">Accesos Directos Destacados</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {shortcuts.map(({ label, icon: Icon, color }) => (
          <button
            key={label}
            className={`${color} text-white text-xs font-semibold px-4 py-4 rounded-lg
              flex items-center justify-center gap-2 text-center transition-colors shadow`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Banner ISO ────────────────────────────────────────────────────────────────
function IsoBanner() {
  return (
    <div className="bg-[#f1f5f9] border border-gray-300 rounded-lg flex items-center justify-between px-6 py-4 gap-4">
      <div className="flex items-center gap-4">
        {/* Candado */}
        <div className="bg-yellow-400 p-3 rounded-full">
          <Lock className="w-7 h-7 text-[#0f172a]" />
        </div>
        <p className="text-sm text-gray-700 font-medium max-w-xl">
          Este sistema cumple con los estándares de seguridad{' '}
          <span className="font-black text-[#0f172a]">ISO/IEC 27001:2013</span>{' '}
          para la gestión de la información.
        </p>
      </div>

      {/* Sello ISO */}
      <div className="flex items-center gap-1 border-2 border-[#0f172a] rounded px-3 py-2 flex-shrink-0">
        <Shield className="w-6 h-6 text-blue-600" />
        <div>
          <div className="text-[10px] font-bold text-blue-600 leading-none">ISO</div>
          <div className="text-base font-black text-[#0f172a] leading-none">27001</div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      {/* Título */}
      <div className="mb-4">
        <h2 className="text-base font-black text-[#0f172a] uppercase tracking-wide">
          Dashboard de Gestión Documental — LICI
        </h2>
        <div className="h-0.5 bg-[#1e293b] mt-1 w-48" />
      </div>

      {/* Fila 1: tarjeta doc + gráfica + tabla firma */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-1">
          <DocSummaryCard />
        </div>
        <div className="lg:col-span-1">
          <BarChart />
        </div>
        <div className="lg:col-span-1">
          <PendingSignatureTable />
        </div>
      </div>

      {/* Fila 2: accesos directos */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <ShortcutsRow />
      </div>

      {/* Fila 3: banner ISO */}
      <IsoBanner />
    </main>
  )
}
