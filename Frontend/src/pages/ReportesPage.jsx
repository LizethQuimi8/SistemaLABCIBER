import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart2, Loader2, ShoppingCart, BookOpen, ShieldCheck, FileDown } from 'lucide-react'
import { reportesApi, comprasApi, usuariosApi, publicacionesApi, investigadoresApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner } from '../components/ui/PageShell'
import { useAuth } from '../context/AuthContext'
import { nombreRol } from '../constants/roles'
import { estiloEncabezadoReporte, htmlEncabezadoReporte, htmlFirmasReporte } from '../utils/reportePlantilla'

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
        ${estiloEncabezadoReporte()}
        p.detalle{font-size:12px;color:#333;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#0e6b3c;color:#fff}
      </style></head><body>
      ${htmlEncabezadoReporte('Reporte de Compras Públicas', `${criterios} — Generado: ${new Date().toLocaleString()}`)}
      <p class="detalle"><strong>${filtradas.length}</strong> compras públicas encontradas, de las cuales <strong>${pagadas.length}</strong> ya llegaron a fase de pago al proveedor, por un monto total de <strong>${formatoMonto(totalMonto)}</strong>.</p>
      <table>
        <thead><tr><th>Objeto de contratación</th><th>Año</th><th>Etapa</th><th>Responsables</th><th>Monto</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="5">Sin registros</td></tr>'}</tbody>
      </table>
      ${htmlFirmasReporte(['Jefe de Laboratorio', 'Responsable de Compras Públicas'])}
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
        ${estiloEncabezadoReporte()}
        p.detalle{font-size:12px;color:#333;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#0e6b3c;color:#fff}
      </style></head><body>
      ${htmlEncabezadoReporte('Reporte de Artículos y Publicaciones', `${criterios} — Generado: ${new Date().toLocaleString()}`)}
      <p class="detalle"><strong>${filtradas.length}</strong> publicaciones encontradas, de las cuales <strong>${conDoi.length}</strong> tienen DOI registrado.</p>
      <table>
        <thead><tr><th>Titulo</th><th>Revista</th><th>Año</th><th>DOI</th><th>Investigador</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="5">Sin registros</td></tr>'}</tbody>
      </table>
      ${htmlFirmasReporte(['Jefe de Laboratorio'])}
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
  { codigo: 'A.5', dominio: 'A.5 Políticas de seguridad', control: 'Roles y permisos definidos por módulo (Administrador, Admin. Infraestructura, Responsable Compras, Docente Investigador)', estado: 'Implementado' },
  { codigo: 'A.6', dominio: 'A.6 Organización de la seguridad', control: 'Separación de funciones: cada rol solo puede escribir en su módulo asignado; el resto queda en solo lectura', estado: 'Implementado' },
  { codigo: 'A.9', dominio: 'A.9 Control de acceso', control: 'Autenticación OAuth2 / JWT (firmado RS256), control de acceso basado en roles (RBAC) verificado en cada endpoint', estado: 'Implementado' },
  { codigo: 'A.10', dominio: 'A.10 Criptografía', control: 'Tokens JWT firmados con clave RSA; tráfico cifrado en tránsito (HTTPS) en el despliegue público', estado: 'Implementado' },
  {
    codigo: 'A.11', dominio: 'A.11 Seguridad física y del entorno',
    control: 'Depende de la infraestructura donde se aloje el servidor (fuera del alcance del software)', estado: 'No aplica al software',
    recomendacion: 'Documentar, a cargo del administrador del servidor, los controles físicos del sitio donde se aloja el sistema (acceso restringido a la sala/rack, UPS, climatización, videovigilancia). Aunque este dominio no lo cubre el software, sigue siendo responsabilidad institucional evidenciarlo.',
  },
  {
    codigo: 'A.12', dominio: 'A.12 Seguridad de las operaciones',
    control: 'Registro de fecha de creación/carga en documentos, bienes, compras y publicaciones; respaldo de base de datos a cargo del administrador del servidor', estado: 'Parcial',
    recomendacion: 'Formalizar una política de respaldos automatizados y periódicos (frecuencia, retención y pruebas de restauración) en vez de respaldos manuales, y documentar un procedimiento de gestión de cambios para despliegues en producción.',
  },
  { codigo: 'A.13', dominio: 'A.13 Seguridad de las comunicaciones', control: 'CORS restringido a orígenes autorizados; comunicación entre microservicios vía red interna', estado: 'Implementado' },
  {
    codigo: 'A.16', dominio: 'A.16 Gestión de incidentes',
    control: 'Sistema interno de notificaciones (solicitudes de préstamo, aprobaciones, avisos) para trazabilidad de eventos', estado: 'Parcial',
    recomendacion: 'Ampliar el registro de eventos para incluir un log dedicado de incidentes de seguridad (intentos fallidos de acceso, bloqueos de cuenta, accesos sospechosos) con un responsable designado para revisarlo periódicamente.',
  },
  { codigo: 'A.18', dominio: 'A.18 Cumplimiento', control: 'Este reporte, generado a partir de datos reales del sistema', estado: 'Implementado' },
]

function colorEstadoIso(estado) {
  if (estado === 'Implementado') return 'implementado'
  if (estado === 'Parcial') return 'parcial'
  return 'no-aplica'
}

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

    const celdasMapaCalor = CONTROLES_ISO.map((c) => `
      <div class="celda-calor ${colorEstadoIso(c.estado)}">
        <p class="codigo">${escapeHtml(c.codigo)}</p>
        <p class="nombre">${escapeHtml(c.dominio.replace(`${c.codigo} `, ''))}</p>
        <span class="estado-tag">${escapeHtml(c.estado)}</span>
      </div>`).join('')

    const pendientes = CONTROLES_ISO.filter((c) => c.recomendacion)
    const filasRecomendaciones = pendientes.map((c) => `
      <tr>
        <td>${escapeHtml(c.dominio)}</td>
        <td><span class="estado-tag ${colorEstadoIso(c.estado)}">${escapeHtml(c.estado)}</span></td>
        <td>${escapeHtml(c.recomendacion)}</td>
      </tr>`).join('')

    const filasRoles = Object.entries(porRol).map(([rol, n]) => `<tr><td>${escapeHtml(nombreRol(rol))}</td><td>${n}</td></tr>`).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Reporte Cumplimiento ISO 27001</title>
      <style>
        ${estiloEncabezadoReporte()}
        h2{font-size:14px;margin:20px 0 8px;color:#0e6b3c}
        p.detalle{font-size:12px;color:#333;margin:0 0 10px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#0e6b3c;color:#fff}
        .mapa-calor{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
        .celda-calor{border-radius:8px;padding:10px 12px;color:#fff;page-break-inside:avoid}
        .celda-calor .codigo{font-size:15px;font-weight:800;margin:0 0 2px}
        .celda-calor .nombre{font-size:10px;line-height:1.3;margin:0 0 8px;opacity:.95;min-height:26px}
        .celda-calor .estado-tag{display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;background:rgba(255,255,255,.28);padding:2px 7px;border-radius:999px}
        .celda-calor.implementado{background:#0e6b3c}
        .celda-calor.parcial{background:#c58a1f}
        .celda-calor.no-aplica{background:#6b7280}
        .leyenda-calor{display:flex;gap:16px;font-size:10.5px;color:#444;margin-bottom:18px}
        .leyenda-calor span{display:flex;align-items:center;gap:5px}
        .leyenda-calor i{width:10px;height:10px;border-radius:3px;display:inline-block}
        .leyenda-calor i.implementado{background:#0e6b3c}
        .leyenda-calor i.parcial{background:#c58a1f}
        .leyenda-calor i.no-aplica{background:#6b7280}
        td .estado-tag{color:#fff;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
        td .estado-tag.implementado{background:#0e6b3c}
        td .estado-tag.parcial{background:#c58a1f}
        td .estado-tag.no-aplica{background:#6b7280}
      </style></head><body>
      ${htmlEncabezadoReporte('Reporte de Cumplimiento ISO/IEC 27001', `Generado: ${new Date().toLocaleString()}`)}
      <p class="detalle">Este reporte resume los controles de seguridad de la información implementados en el sistema y un
      corte del estado actual (usuarios, activos y documentos gestionados), como evidencia de cumplimiento
      frente a los dominios del Anexo A de la norma ISO/IEC 27001.</p>

      <h2>1. Controles de seguridad implementados</h2>
      <table>
        <thead><tr><th>Dominio</th><th>Control aplicado</th><th>Estado</th></tr></thead>
        <tbody>${filasControles}</tbody>
      </table>

      <h2>2. Mapa de calor de cumplimiento (Anexo A)</h2>
      <div class="mapa-calor">${celdasMapaCalor}</div>
      <div class="leyenda-calor">
        <span><i class="implementado"></i> Implementado</span>
        <span><i class="parcial"></i> Parcial</span>
        <span><i class="no-aplica"></i> No aplica al software</span>
      </div>

      <h2>3. Recomendaciones de mejora</h2>
      ${pendientes.length > 0 ? `
      <table>
        <thead><tr><th>Dominio</th><th>Estado</th><th>Recomendación</th></tr></thead>
        <tbody>${filasRecomendaciones}</tbody>
      </table>` : '<p class="detalle">Todos los controles evaluados están Implementados; no hay recomendaciones pendientes.</p>'}

      <h2>4. Usuarios del sistema</h2>
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

      <h2>5. Activos de información gestionados</h2>
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
      ${htmlFirmasReporte(['Jefe de Laboratorio'])}
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
                Rol: {nombreRol(resumen?.rol)} — {usuario?.rol === 'ADMINISTRADOR' ? 'dashboard global' : 'limitado a tu actividad'}
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
