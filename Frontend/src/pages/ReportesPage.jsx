import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart2, Loader2, ShoppingCart, BookOpen, ShieldCheck, FileDown } from 'lucide-react'
import { reportesApi, comprasApi, usuariosApi, publicacionesApi, investigadoresApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner } from '../components/ui/PageShell'
import { useAuth } from '../context/AuthContext'

const FASES = ['PREPARATORIA', 'PRECONTRACTUAL', 'CONTRACTUAL', 'ENTREGA_BIENES', 'PAGO_PROVEEDOR']

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
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const [anio, setAnio] = useState('TODOS')
  const [responsable, setResponsable] = useState('TODOS')
  const [fasesSeleccionadas, setFasesSeleccionadas] = useState([])

  const anios = useMemo(
    () => [...new Set(compras.map((c) => c.anio).filter(Boolean))].sort((a, b) => b - a),
    [compras]
  )

  const responsables = useMemo(
    () => [...directorio].map((u) => `${u.nombres} ${u.apellidos}`).sort(),
    [directorio]
  )

  const toggleFase = (fase) => {
    setFasesSeleccionadas((prev) => (prev.includes(fase) ? prev.filter((f) => f !== fase) : [...prev, fase]))
  }

  const filtradas = useMemo(() => compras.filter((c) => {
    if (anio !== 'TODOS' && c.anio !== Number(anio)) return false
    if (responsable !== 'TODOS' && !(c.responsables || '').includes(responsable)) return false
    if (fasesSeleccionadas.length > 0 && !fasesSeleccionadas.includes(c.fase)) return false
    return true
  }), [compras, anio, responsable, fasesSeleccionadas])

  const totalMonto = useMemo(
    () => filtradas.reduce((suma, c) => suma + Number(c.monto || 0), 0),
    [filtradas]
  )

  const pagadas = filtradas.filter((c) => c.fase === 'PAGO_PROVEEDOR')

  const limpiarFiltros = () => {
    setAnio('TODOS')
    setResponsable('TODOS')
    setFasesSeleccionadas([])
  }

  const generarReporte = () => {
    const filas = filtradas.map((c) => `
      <tr>
        <td>${escapeHtml(c.objetoContratacion)}</td>
        <td>${c.anio ?? '—'}</td>
        <td>${FASE_LABEL[c.fase] || c.fase}</td>
        <td>${escapeHtml(c.responsables || '—')}</td>
        <td>${c.monto != null ? formatoMonto(c.monto) : '—'}</td>
      </tr>`).join('')

    const criterios = [
      `Año: ${anio === 'TODOS' ? 'Todos' : anio}`,
      `Responsable: ${responsable === 'TODOS' ? 'Todos' : responsable}`,
      `Etapa(s): ${fasesSeleccionadas.length ? fasesSeleccionadas.map((f) => FASE_LABEL[f]).join(', ') : 'Todas'}`,
    ].join(' — ')

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
      <p>${criterios} — Generado: ${new Date().toLocaleString()}</p>
      <p><strong>${filtradas.length}</strong> compras públicas encontradas, de las cuales <strong>${pagadas.length}</strong> ya llegaron a fase de pago al proveedor, por un monto total de <strong>${formatoMonto(totalMonto)}</strong>.</p>
      <table>
        <thead><tr><th>Objeto de contratación</th><th>Año</th><th>Etapa</th><th>Responsables</th><th>Monto</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="5">Sin registros</td></tr>'}</tbody>
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

      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Año</p>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
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

      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Etapa (puedes elegir varias)</p>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {FASES.map((f) => (
          <button
            key={f}
            onClick={() => toggleFase(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${fasesSeleccionadas.includes(f) ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
          >
            {FASE_LABEL[f]}
          </button>
        ))}
      </div>

      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Responsable</p>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          className="input py-1.5 text-xs w-56"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
        >
          <option value="TODOS">Todos</option>
          {responsables.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {(anio !== 'TODOS' || responsable !== 'TODOS' || fasesSeleccionadas.length > 0) && (
          <button onClick={limpiarFiltros} className="text-xs text-gray-400 hover:text-red-600">
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center text-gray-400 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{filtradas.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Compras públicas encontradas</p>
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

function ReportePublicaciones() {
  const fetcher = useCallback(() => publicacionesApi.list(), [])
  const { data: publicaciones, loading } = useList(fetcher)
  const investigadoresFetcher = useCallback(() => investigadoresApi.list(), [])
  const { data: investigadores } = useList(investigadoresFetcher)
  const [anio, setAnio] = useState('TODOS')
  const [investigadorId, setInvestigadorId] = useState('TODOS')

  const nombrePorInvestigadorId = useMemo(
    () => new Map(investigadores.map((inv) => [inv.id, inv.nombreCompleto])),
    [investigadores]
  )

  const anios = useMemo(
    () => [...new Set(publicaciones.map((p) => p.anioPublicacion).filter(Boolean))].sort((a, b) => b - a),
    [publicaciones]
  )

  const filtradas = useMemo(() => publicaciones.filter((p) => {
    if (anio !== 'TODOS' && p.anioPublicacion !== Number(anio)) return false
    if (investigadorId !== 'TODOS' && p.investigadorId !== Number(investigadorId)) return false
    return true
  }), [publicaciones, anio, investigadorId])

  const conDoi = filtradas.filter((p) => p.doi)

  const limpiarFiltros = () => {
    setAnio('TODOS')
    setInvestigadorId('TODOS')
  }

  const generarReporte = () => {
    const filas = filtradas.map((p) => `
      <tr>
        <td>${escapeHtml(p.titulo)}</td>
        <td>${escapeHtml(p.revista || '—')}</td>
        <td>${p.anioPublicacion ?? '—'}</td>
        <td>${escapeHtml(p.doi || '—')}</td>
        <td>${escapeHtml(nombrePorInvestigadorId.get(p.investigadorId) || '—')}</td>
      </tr>`).join('')

    const criterios = [
      `Año: ${anio === 'TODOS' ? 'Todos' : anio}`,
      `Investigador: ${investigadorId === 'TODOS' ? 'Todos' : (nombrePorInvestigadorId.get(Number(investigadorId)) || '—')}`,
    ].join(' — ')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Reporte Publicaciones</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        p{font-size:12px;color:#555;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#0e6b3c;color:#fff}
      </style></head><body>
      <h1>Reporte de Artículos y Publicaciones — LICI</h1>
      <p>${criterios} — Generado: ${new Date().toLocaleString()}</p>
      <p><strong>${filtradas.length}</strong> publicaciones encontradas, de las cuales <strong>${conDoi.length}</strong> tienen DOI registrado.</p>
      <table>
        <thead><tr><th>Titulo</th><th>Revista</th><th>Año</th><th>DOI</th><th>Investigador</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="5">Sin registros</td></tr>'}</tbody>
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
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-[#052a18]">Reporte de Artículos y Publicaciones</p>
        </div>
        <button
          onClick={generarReporte}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] disabled:opacity-50 text-xs font-semibold px-4 py-2 rounded transition-colors"
        >
          <FileDown className="w-4 h-4" /> Generar reporte
        </button>
      </div>

      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Año</p>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
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

      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Investigador</p>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          className="input py-1.5 text-xs w-56"
          value={investigadorId}
          onChange={(e) => setInvestigadorId(e.target.value)}
        >
          <option value="TODOS">Todos</option>
          {investigadores.map((inv) => <option key={inv.id} value={inv.id}>{inv.nombreCompleto}</option>)}
        </select>
        {(anio !== 'TODOS' || investigadorId !== 'TODOS') && (
          <button onClick={limpiarFiltros} className="text-xs text-gray-400 hover:text-red-600">
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center text-gray-400 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{filtradas.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Publicaciones encontradas</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{conDoi.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Con DOI registrado</p>
          </div>
        </div>
      )}
    </div>
  )
}

const CONTROLES_ISO = [
  { dominio: 'A.5 Políticas de seguridad', control: 'Roles y permisos definidos por módulo (Administrador, Admin. Infraestructura, Responsable Compras, Docente Investigador)', estado: 'Implementado' },
  { dominio: 'A.6 Organización de la seguridad', control: 'Separación de funciones: cada rol solo puede escribir en su módulo asignado; el resto queda en solo lectura', estado: 'Implementado' },
  { dominio: 'A.9 Control de acceso', control: 'Autenticación OAuth2 / JWT (firmado RS256), control de acceso basado en roles (RBAC) verificado en cada endpoint', estado: 'Implementado' },
  { dominio: 'A.10 Criptografía', control: 'Tokens JWT firmados con clave RSA; tráfico cifrado en tránsito (HTTPS) en el despliegue público', estado: 'Implementado' },
  { dominio: 'A.11 Seguridad física y del entorno', control: 'Depende de la infraestructura donde se aloje el servidor (fuera del alcance del software)', estado: 'No aplica al software' },
  { dominio: 'A.12 Seguridad de las operaciones', control: 'Registro de fecha de creación/carga en documentos, bienes, compras y publicaciones; respaldo de base de datos a cargo del administrador del servidor', estado: 'Parcial' },
  { dominio: 'A.13 Seguridad de las comunicaciones', control: 'CORS restringido a orígenes autorizados; comunicación entre microservicios vía red interna', estado: 'Implementado' },
  { dominio: 'A.16 Gestión de incidentes', control: 'Sistema interno de notificaciones (solicitudes de préstamo, aprobaciones, avisos) para trazabilidad de eventos', estado: 'Parcial' },
  { dominio: 'A.18 Cumplimiento', control: 'Este reporte, generado a partir de datos reales del sistema', estado: 'Implementado' },
]

function ReporteISO27001() {
  const [resumen, setResumen] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([reportesApi.resumen(), usuariosApi.list()])
      .then(([r, u]) => { setResumen(r); setUsuarios(u || []) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const activos = usuarios.filter((u) => u.activo).length
  const inactivos = usuarios.length - activos

  const porRol = useMemo(() => {
    const conteo = {}
    usuarios.forEach((u) => { conteo[u.rol] = (conteo[u.rol] || 0) + 1 })
    return conteo
  }, [usuarios])

  const generarReporte = () => {
    const filasControles = CONTROLES_ISO.map((c) => `
      <tr>
        <td>${escapeHtml(c.dominio)}</td>
        <td>${escapeHtml(c.control)}</td>
        <td>${escapeHtml(c.estado)}</td>
      </tr>`).join('')

    const filasRoles = Object.entries(porRol).map(([rol, n]) => `<tr><td>${escapeHtml(rol)}</td><td>${n}</td></tr>`).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Reporte Cumplimiento ISO 27001</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        h2{font-size:14px;margin:20px 0 8px;color:#0e6b3c}
        p{font-size:12px;color:#555;margin:0 0 10px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#0e6b3c;color:#fff}
      </style></head><body>
      <h1>Reporte de Cumplimiento ISO/IEC 27001 — Sistema de Gestión Documental LICI</h1>
      <p>Generado: ${new Date().toLocaleString()}</p>
      <p>Este reporte resume los controles de seguridad de la información implementados en el sistema y un
      corte del estado actual (usuarios, activos y documentos gestionados), como evidencia de cumplimiento
      frente a los dominios del Anexo A de la norma ISO/IEC 27001.</p>

      <h2>1. Controles de seguridad implementados</h2>
      <table>
        <thead><tr><th>Dominio</th><th>Control aplicado</th><th>Estado</th></tr></thead>
        <tbody>${filasControles}</tbody>
      </table>

      <h2>2. Usuarios del sistema</h2>
      <table>
        <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
        <tbody>
          <tr><td>Usuarios activos</td><td>${activos}</td></tr>
          <tr><td>Usuarios inactivos</td><td>${inactivos}</td></tr>
        </tbody>
      </table>
      <table>
        <thead><tr><th>Rol</th><th>Cantidad</th></tr></thead>
        <tbody>${filasRoles || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody>
      </table>

      <h2>3. Activos de información gestionados</h2>
      <table>
        <thead><tr><th>Módulo</th><th>Registros</th></tr></thead>
        <tbody>
          <tr><td>Documentos y correspondencia</td><td>${resumen?.totalDocumentos ?? '—'}</td></tr>
          <tr><td>Bienes de inventario</td><td>${resumen?.totalBienesInventario ?? '—'}</td></tr>
          <tr><td>Proyectos</td><td>${resumen?.totalProyectos ?? '—'}</td></tr>
          <tr><td>Investigadores</td><td>${resumen?.totalInvestigadores ?? '—'}</td></tr>
          <tr><td>Publicaciones</td><td>${resumen?.totalPublicaciones ?? '—'}</td></tr>
          <tr><td>Compras públicas</td><td>${resumen?.totalComprasPublicas ?? '—'}</td></tr>
        </tbody>
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
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#052a18]">Reporte de Cumplimiento ISO 27001</p>
            <p className="text-[11px] text-gray-400">Controles de seguridad implementados y corte del sistema</p>
          </div>
        </div>
        <button
          onClick={generarReporte}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] disabled:opacity-50 text-xs font-semibold px-4 py-2 rounded transition-colors"
        >
          <FileDown className="w-4 h-4" /> Generar reporte
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="flex items-center justify-center text-gray-400 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{activos}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Usuarios activos</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{inactivos}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Usuarios inactivos</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{CONTROLES_ISO.filter((c) => c.estado === 'Implementado').length}/{CONTROLES_ISO.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Controles implementados</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 text-center bg-gray-50">
            <p className="text-2xl font-black text-[#052a18]">{resumen?.totalDocumentos ?? '—'}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Documentos gestionados</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportesPage() {
  const { usuario, isAdmin } = useAuth()
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
      <ReportePublicaciones />
      {isAdmin && <ReporteISO27001 />}
    </main>
  )
}
