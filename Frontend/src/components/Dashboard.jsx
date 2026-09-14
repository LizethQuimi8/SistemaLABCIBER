import { useEffect, useState } from 'react'
import { FileText, FilePlus, Upload, RefreshCw, Search, Loader2 } from 'lucide-react'
import BarChart from './BarChart'
import { reportesApi, documentosApi } from '../api/services'
import { useAuth } from '../context/AuthContext'

// ── Tarjeta de resumen de documentos (datos reales del reporting-service) ─────
function DocSummaryCard({ resumen }) {
  const total = (resumen?.totalDocumentos ?? 0) + (resumen?.totalMemos ?? 0)
  const items = [
    { label: 'Documentos', count: resumen?.totalDocumentos ?? 0, color: 'bg-green-500' },
    { label: 'Memos y Correspondencia', count: resumen?.totalMemos ?? 0, color: 'bg-red-500' },
    { label: 'Portafolio de Proyectos', count: resumen?.totalProyectos ?? 0, color: 'bg-yellow-500' },
    { label: 'Publicaciones', count: resumen?.totalPublicaciones ?? 0, color: 'bg-blue-400' },
    { label: 'Investigadores', count: resumen?.totalInvestigadores ?? 0, color: 'bg-purple-400' },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0e6b3c] text-white p-2 rounded">
            <FileText className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-gray-600">Documentos + Memos</span>
        </div>
        <span className="text-3xl font-black text-[#052a18]">{total}</span>
      </div>

      <ul className="space-y-2">
        {items.map(({ label, count, color }) => (
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

// ── Tabla documentos pendientes de firma (datos reales) ───────────────────────
function PendingSignatureTable({ pendientes, loading }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-[#052a18] mb-3">Documentos Pendientes de Firma</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0e6b3c] text-white">
              <th className="text-left px-3 py-2 font-semibold rounded-tl-sm">Documento</th>
              <th className="text-center px-3 py-2 font-semibold">Firmante</th>
              <th className="text-center px-3 py-2 font-semibold rounded-tr-sm">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Cargando...
              </td></tr>
            )}
            {!loading && pendientes.length === 0 && (
              <tr className="border-b border-gray-100">
                <td className="px-3 py-2 text-gray-600" colSpan={3}>No hay documentos pendientes de firma</td>
              </tr>
            )}
            {!loading && pendientes.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">{d.titulo}</td>
                <td className="px-3 py-2 text-center font-semibold text-gray-800">#{d.firmanteId}</td>
                <td className="px-3 py-2 text-center font-semibold text-amber-600">{d.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Accesos directos ───────────────────────────────────────────────────────────
function ShortcutsRow({ onNavigate }) {
  const shortcuts = [
    { label: 'Registrar Nuevo Proyecto', icon: FilePlus, view: 'proyectos' },
    { label: 'Subir Memorando', icon: Upload, view: 'memos' },
    { label: 'Actualizar Inventario', icon: RefreshCw, view: 'inventario' },
    { label: 'Consultar Publicaciones', icon: Search, view: 'publicaciones' },
  ]
  return (
    <div>
      <h3 className="text-sm font-bold text-[#052a18] mb-3">Accesos Directos Destacados</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {shortcuts.map(({ label, icon: Icon, view }) => (
          <button
            key={label}
            onClick={() => onNavigate?.(view)}
            className="bg-[#0e6b3c] hover:bg-[#16874c] text-white text-xs font-semibold px-4 py-4 rounded-lg
              flex items-center justify-center gap-2 text-center transition-colors shadow"
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const { isAdmin } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [resumenData, documentos] = await Promise.all([
          reportesApi.resumen(),
          documentosApi.list().catch(() => []),
        ])
        if (cancelled) return
        setResumen(resumenData)
        setPendientes((documentos || []).filter((d) => d.estado === 'PENDIENTE_FIRMA'))
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const chartData = resumen ? [
    { label: 'Proyectos', value: resumen.totalProyectos ?? 0, color: 'bg-green-500' },
    { label: 'Investigadores', value: resumen.totalInvestigadores ?? 0, color: 'bg-green-500' },
    { label: 'Publicaciones', value: resumen.totalPublicaciones ?? 0, color: 'bg-blue-500' },
    { label: 'Documentos', value: resumen.totalDocumentos ?? 0, color: 'bg-yellow-500' },
    { label: 'Memos', value: resumen.totalMemos ?? 0, color: 'bg-yellow-500' },
    { label: 'Inventario', value: resumen.totalBienesInventario ?? 0, color: 'bg-red-500' },
    ...(isAdmin ? [
      { label: 'Compras', value: resumen.totalComprasPublicas ?? 0, color: 'bg-red-500' },
      { label: 'Usuarios', value: resumen.totalUsuarios ?? 0, color: 'bg-purple-500' },
    ] : []),
  ] : []

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-base font-black text-[#052a18] uppercase tracking-wide">
          Dashboard de Gestión Documental — LICI
        </h2>
        <div className="h-0.5 bg-[#0e6b3c] mt-1 w-48" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2 mb-4">
          No fue posible cargar el resumen: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-1">
          <DocSummaryCard resumen={resumen} />
        </div>
        <div className="lg:col-span-1">
          <BarChart data={chartData} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <PendingSignatureTable pendientes={pendientes} loading={loading} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <ShortcutsRow onNavigate={onNavigate} />
      </div>
    </main>
  )
}
