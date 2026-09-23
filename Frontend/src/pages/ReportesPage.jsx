import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart2, Loader2, ShoppingCart, FileDown } from 'lucide-react'
import { reportesApi, comprasApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner } from '../components/ui/PageShell'
import { useAuth } from '../context/AuthContext'

const FASE_LABEL = {
  PREPARATORIA: 'Preparatoria',
  PRECONTRACTUAL: 'Precontractual',
  CONTRACTUAL: 'Contractual',
  ENTREGA_BIENES: 'Entrega de bienes',
  PAGO_PROVEEDOR: 'Pago al proveedor',
}

function formatoMonto(valor) {
  return Number(valor || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function ReporteComprasPublicas() {
  const fetcher = useCallback(() => comprasApi.list(), [])
  const { data: compras, loading } = useList(fetcher)
  const [anio, setAnio] = useState('TODOS')

  const anios = useMemo(
    () => [...new Set(compras.map((c) => c.anio).filter(Boolean))].sort((a, b) => b - a),
    [compras]
  )

  const filtradas = useMemo(
    () => (anio === 'TODOS' ? compras : compras.filter((c) => c.anio === Number(anio))),
    [compras, anio]
  )

  const totalMonto = useMemo(
    () => filtradas.reduce((suma, c) => suma + Number(c.monto || 0), 0),
    [filtradas]
  )

  const pagadas = filtradas.filter((c) => c.fase === 'PAGO_PROVEEDOR')

  const generarReporte = () => {
    const filas = filtradas.map((c) => `
      <tr>
        <td>${escapeHtml(c.objetoContratacion)}</td>
        <td>${FASE_LABEL[c.fase] || c.fase}</td>
        <td>${escapeHtml(c.responsables || '—')}</td>
        <td>${c.monto != null ? formatoMonto(c.monto) : '—'}</td>
      </tr>`).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Reporte Compras Publicas</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        p{font-size:12px;color:#555;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#0e6b3c;color:#fff}
      </style></head><body>
      <h1>Reporte de Compras Públicas — LICI</h1>
      <p>Año: ${anio === 'TODOS' ? 'Todos' : anio} — Generado: ${new Date().toLocaleString()}</p>
      <p><strong>${filtradas.length}</strong> compras públicas registradas, de las cuales <strong>${pagadas.length}</strong> ya llegaron a fase de pago al proveedor, por un monto total de <strong>${formatoMonto(totalMonto)}</strong>.</p>
      <table>
        <thead><tr><th>Objeto de contratación</th><th>Fase</th><th>Responsables</th><th>Monto</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="4">Sin registros</td></tr>'}</tbody>
      </table>
      </body></html>`

    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mt-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0e6b3c] text-white p-2 rounded">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-[#052a18]">Reporte de Compras Públicas</p>
        </div>
        <button
          onClick={generarReporte}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] disabled:opacity-50 text-xs font-semibold px-4 py-2 rounded transition-colors"
        >
          <FileDown className="w-4 h-4" /> Generar reporte
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setAnio('TODOS')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${anio === 'TODOS' ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
        >
          Todos
        </button>
        {anios.map((a) => (
          <button
            key={a}
            onClick={() => setAnio(String(a))}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${anio === String(a) ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
          >
            {a}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center text-gray-400 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{filtradas.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Compras públicas {anio === 'TODOS' ? '' : `en ${anio}`}</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{pagadas.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Ya pagadas al proveedor</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{formatoMonto(totalMonto)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Monto total</p>
          </div>
        </div>
      )}
    </div>
  )
}

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
    ['Bienes de inventario', resumen.totalBienesInventario],
    ['Compras públicas', resumen.totalComprasPublicas],
    ['Usuarios', resumen.totalUsuarios],
  ] : []

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Reportes"
      />

      <ErrorBanner message={error} />

      {loading ? (
        <div className="flex items-center justify-center text-gray-400 text-sm py-10">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando reporte...
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#0e6b3c] text-white p-2 rounded">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#052a18]">Generado para {resumen?.generadoPara}</p>
              <p className="text-xs text-gray-500">
                Rol: {resumen?.rol} — {usuario?.rol === 'ADMINISTRADOR' ? 'dashboard global' : 'limitado a tu actividad'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filas.map(([label, value]) => (
              <div key={label} className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
                <p className="text-2xl font-black text-[#052a18]">
                  {value === null || value === undefined ? '—' : value}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>

          {usuario?.rol !== 'ADMINISTRADOR' && (
            <p className="text-[11px] text-gray-400 mt-4">
              Los campos en "—" corresponden a módulos sin acceso para tu rol.
            </p>
          )}
        </div>
      )}

      <ReporteComprasPublicas />
    </main>
  )
}
