import { useEffect, useState } from 'react'
import { BarChart2, Loader2 } from 'lucide-react'
import { reportesApi } from '../api/services'
import { PageHeader, ErrorBanner } from '../components/ui/PageShell'
import { useAuth } from '../context/AuthContext'

export default function ReportesPage() {
  const { usuario } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    reportesApi.resumen()
      .then(setResumen)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filas = resumen ? [
    ['Proyectos', resumen.totalProyectos],
    ['Investigadores', resumen.totalInvestigadores],
    ['Publicaciones', resumen.totalPublicaciones],
    ['Documentos', resumen.totalDocumentos],
    ['Memos', resumen.totalMemos],
    ['Bienes de inventario', resumen.totalBienesInventario],
    ['Compras públicas', resumen.totalComprasPublicas],
    ['Usuarios', resumen.totalUsuarios],
  ] : []

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Reportes"
        subtitle="reporting-service — agrega en tiempo real datos de los 4 servicios de dominio, propagando tu mismo token."
      />

      <ErrorBanner message={error} />

      {loading ? (
        <div className="flex items-center justify-center text-gray-400 text-sm py-10">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando reporte...
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#1e293b] text-white p-2 rounded">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Generado para {resumen?.generadoPara}</p>
              <p className="text-xs text-gray-500">
                Rol: {resumen?.rol} — {usuario?.rol === 'ADMINISTRADOR' ? 'dashboard global' : 'limitado a tu actividad'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filas.map(([label, value]) => (
              <div key={label} className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
                <p className="text-2xl font-black text-[#0f172a]">
                  {value === null || value === undefined ? '—' : value}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>

          {usuario?.rol !== 'ADMINISTRADOR' && (
            <p className="text-[11px] text-gray-400 mt-4">
              Los campos en "—" corresponden a módulos sin acceso para tu rol (Compras Públicas, Usuarios).
            </p>
          )}
        </div>
      )}
    </main>
  )
}
