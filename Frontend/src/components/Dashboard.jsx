import { useEffect, useState } from 'react'
import { FileText, FilePlus, Upload, RefreshCw, Search, Loader2, Target, FolderOpen, FlaskConical, UserCheck, BookOpen, Sparkles } from 'lucide-react'
import BarChart from './BarChart'
import { reportesApi, informacionLaboratorioApi } from '../api/services'
import { useAuth } from '../context/AuthContext'

// ── Tarjeta de resumen de documentos (datos reales del reporting-service) ─────
function DocSummaryCard({ resumen }) {
  const total = resumen?.totalDocumentos ?? 0
  const items = [
    { label: 'Documentos', count: resumen?.totalDocumentos ?? 0, color: 'bg-green-500' },
    { label: 'Portafolio de Proyectos', count: resumen?.totalProyectos ?? 0, color: 'bg-amber-500' },
    { label: 'Publicaciones', count: resumen?.totalPublicaciones ?? 0, color: 'bg-blue-500' },
    { label: 'Investigadores', count: resumen?.totalInvestigadores ?? 0, color: 'bg-purple-500' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#0e6b3c] to-[#052a18] text-white p-2.5 rounded-lg shadow">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-[#052a18]">Documentos y Correspondencia</span>
        </div>
        <span className="text-3xl font-black text-[#052a18]">{total}</span>
      </div>

      <ul className="space-y-1">
        {items.map(({ label, count, color }) => (
          <li key={label} className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
              <span className="text-xs text-gray-700">{label}</span>
            </div>
            <span className="text-xs font-bold text-gray-800">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Banner de Planificación Estratégica (vitrina de bienvenida para el rol
// Estudiante, que no tiene acceso a Documentos y por lo tanto no ve el resto
// del dashboard documental) ────────────────────────────────────────────────
function PlanificacionHero({ info, loading, onNavigate }) {
  const vacio = info && !info.mision && !info.vision

  return (
    <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-[#0e6b3c] via-[#0b5c33] to-[#052a18] text-white p-6">
      <Sparkles className="absolute -right-4 -top-4 w-28 h-28 text-white/10" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/15 backdrop-blur p-2.5 rounded-lg">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200">Laboratorio de Investigación de Ciberseguridad</p>
            <h3 className="text-base font-bold">Planificación Estratégica</h3>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center text-emerald-100 text-xs py-6">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
          </div>
        ) : vacio ? (
          <p className="text-xs text-emerald-100/80 mb-4">Esta sección todavía no ha sido completada.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            {info?.mision && (
              <div className="bg-white/10 backdrop-blur rounded-lg p-3.5 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 mb-1.5">Misión</p>
                <p className="text-xs leading-relaxed text-emerald-50 line-clamp-4">{info.mision}</p>
              </div>
            )}
            {info?.vision && (
              <div className="bg-white/10 backdrop-blur rounded-lg p-3.5 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 mb-1.5">Visión</p>
                <p className="text-xs leading-relaxed text-emerald-50 line-clamp-4">{info.vision}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onNavigate?.('planificacion')}
          className="inline-flex items-center gap-1.5 bg-white text-[#052a18] text-xs font-bold px-4 py-2 rounded-full hover:bg-emerald-50 transition-colors shadow"
        >
          Ver planificación completa <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}

// ── Tarjetas de estadísticas para el rol Estudiante (solo los módulos que
// puede ver: Proyectos, Investigadores, Publicaciones) ───────────────────────
function EstudianteStats({ resumen, loading, onNavigate }) {
  const items = [
    { label: 'Portafolio de Proyectos', value: resumen?.totalProyectos ?? 0, icon: FolderOpen, color: 'bg-amber-500', view: 'proyectos' },
    { label: 'Docentes Investigadores', value: resumen?.totalInvestigadores ?? 0, icon: UserCheck, color: 'bg-purple-500', view: 'investigadores' },
    { label: 'Artículos y Publicaciones', value: resumen?.totalPublicaciones ?? 0, icon: BookOpen, color: 'bg-blue-500', view: 'publicaciones' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
      {items.map(({ label, value, icon: Icon, color, view }) => (
        <button
          key={label}
          onClick={() => onNavigate?.(view)}
          className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3 text-left hover:border-[#0e6b3c] hover:shadow-md transition-all"
        >
          <div className={`${color} text-white p-2.5 rounded-lg flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-black text-[#052a18] leading-none">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-gray-300" /> : value}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1.5">{label}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Accesos directos ───────────────────────────────────────────────────────────
function ShortcutsRow({ onNavigate }) {
  const { canEditInventario, isEstudiante } = useAuth()
  const shortcuts = isEstudiante ? [
    { label: 'Planificación Estratégica', icon: Target, view: 'planificacion', color: 'from-emerald-500 to-emerald-700' },
    { label: 'Portafolio de Proyectos', icon: FolderOpen, view: 'proyectos', color: 'from-amber-400 to-amber-600' },
    { label: 'Publicaciones', icon: Search, view: 'publicaciones', color: 'from-purple-400 to-purple-600' },
    { label: 'CyberRange y Prácticas', icon: FlaskConical, view: 'cyberrange', color: 'from-sky-400 to-sky-600' },
  ] : [
    { label: 'Registrar Nuevo Proyecto', icon: FilePlus, view: 'proyectos', color: 'from-amber-400 to-amber-600' },
    { label: 'Subir Memorando', icon: Upload, view: 'documentos', color: 'from-sky-400 to-sky-600' },
    canEditInventario && { label: 'Actualizar Inventario', icon: RefreshCw, view: 'inventario', color: 'from-rose-400 to-rose-600' },
    { label: 'Consultar Publicaciones', icon: Search, view: 'publicaciones', color: 'from-purple-400 to-purple-600' },
  ].filter(Boolean)
  return (
    <div>
      <h3 className="text-sm font-bold text-[#052a18] mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#0e6b3c]" /> Accesos Directos Destacados
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {shortcuts.map(({ label, icon: Icon, view, color }) => (
          <button
            key={label}
            onClick={() => onNavigate?.(view)}
            className="group relative overflow-hidden bg-white border border-gray-200 rounded-xl p-5
              flex flex-col items-center gap-3 text-center shadow-sm
              hover:shadow-lg hover:-translate-y-1 hover:border-transparent transition-all duration-200"
          >
            <div className={`bg-gradient-to-br ${color} text-white p-3 rounded-full shadow group-hover:scale-110 transition-transform duration-200`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#052a18] leading-snug">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const { isAdmin, isEstudiante, usuario } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [infoPlanificacion, setInfoPlanificacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [resumenData, info] = await Promise.all([
          reportesApi.resumen(),
          // El rol Estudiante no tiene acceso a Documentos y Correspondencia;
          // para el resto esta llamada simplemente no se usa.
          isEstudiante ? informacionLaboratorioApi.obtener().catch(() => null) : Promise.resolve(null),
        ])
        if (cancelled) return
        setResumen(resumenData)
        setInfoPlanificacion(info)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isEstudiante])

  const chartData = resumen ? [
    { label: 'Proyectos', value: resumen.totalProyectos ?? 0, color: 'bg-green-500' },
    { label: 'Investigadores', value: resumen.totalInvestigadores ?? 0, color: 'bg-green-500' },
    { label: 'Publicaciones', value: resumen.totalPublicaciones ?? 0, color: 'bg-blue-500' },
    { label: 'Documentos', value: resumen.totalDocumentos ?? 0, color: 'bg-yellow-500' },
    { label: 'Inventario', value: resumen.totalBienesInventario ?? 0, color: 'bg-red-500' },
    ...(isAdmin ? [
      { label: 'Compras', value: resumen.totalComprasPublicas ?? 0, color: 'bg-red-500' },
      { label: 'Usuarios', value: resumen.totalUsuarios ?? 0, color: 'bg-purple-500' },
    ] : []),
  ] : []

  const fecha = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <div className="mb-5 flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-black text-[#052a18]">
            Hola, {usuario?.nombres || 'bienvenido'}
          </h2>
          <p className="text-xs text-gray-500 capitalize mt-0.5">{fecha}</p>
          <div className="h-0.5 bg-gradient-to-r from-[#0e6b3c] to-transparent mt-2 w-40" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2 mb-4">
          No fue posible cargar el resumen: {error}
        </div>
      )}

      {isEstudiante ? (
        <div className="space-y-4 mb-4">
          <PlanificacionHero info={infoPlanificacion} loading={loading} onNavigate={onNavigate} />
          <EstudianteStats resumen={resumen} loading={loading} onNavigate={onNavigate} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <DocSummaryCard resumen={resumen} />
          <BarChart data={chartData} loading={loading} />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <ShortcutsRow onNavigate={onNavigate} />
      </div>
    </main>
  )
}
