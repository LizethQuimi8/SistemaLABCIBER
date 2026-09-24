import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ShoppingCart, FileDown, FileUp, Eye } from 'lucide-react'
import { comprasApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const TIPOS_CONTRATACION = ['Ínfima Cuantía', 'Subasta Inversa']

const FASES = ['PREPARATORIA', 'PRECONTRACTUAL', 'CONTRACTUAL', 'ENTREGA_BIENES', 'PAGO_PROVEEDOR']

const FASE_LABEL = {
  PREPARATORIA: 'Preparatoria',
  PRECONTRACTUAL: 'Precontractual',
  CONTRACTUAL: 'Contractual',
  ENTREGA_BIENES: 'Entrega de bienes',
  PAGO_PROVEEDOR: 'Pago al proveedor',
}

const FASE_BADGE = {
  PREPARATORIA: 'bg-red-50 text-red-700',
  PRECONTRACTUAL: 'bg-orange-50 text-orange-700',
  CONTRACTUAL: 'bg-lime-50 text-lime-700',
  ENTREGA_BIENES: 'bg-green-50 text-green-700',
  PAGO_PROVEEDOR: 'bg-blue-50 text-blue-700',
}

const FASE_DOT = {
  PREPARATORIA: 'bg-red-500',
  PRECONTRACTUAL: 'bg-orange-500',
  CONTRACTUAL: 'bg-lime-500',
  ENTREGA_BIENES: 'bg-green-500',
  PAGO_PROVEEDOR: 'bg-blue-500',
}

const anioActual = new Date().getFullYear()
const FORM_INICIAL = {
  objetoContratacion: '', numeroProceso: '', tipoContratacion: '', monto: '',
  anio: String(anioActual), responsables: '', fase: 'PREPARATORIA',
}

export default function ComprasPage() {
  const { canEditCompras } = useAuth()
  const fetcher = useCallback(() => comprasApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [responsablesIds, setResponsablesIds] = useState([])
  const [archivo, setArchivo] = useState(null)
  const [archivoActualNombre, setArchivoActualNombre] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [anioFiltro, setAnioFiltro] = useState('TODOS')
  const [showReportForm, setShowReportForm] = useState(false)
  const [reporteAnio, setReporteAnio] = useState('TODOS')

  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )

  const toggleResponsable = (usuarioId) => {
    setResponsablesIds((prev) => (
      prev.includes(usuarioId) ? prev.filter((id) => id !== usuarioId) : [...prev, usuarioId]
    ))
  }

  const anios = useMemo(
    () => [...new Set(data.map((c) => c.anio).filter(Boolean))].sort((a, b) => b - a),
    [data]
  )

  const filtradas = useMemo(
    () => (anioFiltro === 'TODOS' ? data : data.filter((c) => c.anio === Number(anioFiltro))),
    [data, anioFiltro]
  )

  const conteoPorFase = useMemo(() => {
    const conteo = Object.fromEntries(FASES.map((f) => [f, 0]))
    filtradas.forEach((c) => { if (conteo[c.fase] !== undefined) conteo[c.fase] += 1 })
    return conteo
  }, [filtradas])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...FORM_INICIAL, anio: anioFiltro === 'TODOS' ? String(anioActual) : anioFiltro })
    setResponsablesIds([])
    setArchivo(null)
    setArchivoActualNombre(null)
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({
      objetoContratacion: c.objetoContratacion || '',
      numeroProceso: c.numeroProceso || '',
      tipoContratacion: c.tipoContratacion || '',
      monto: c.monto ?? '',
      anio: String(c.anio ?? anioActual),
      responsables: c.responsables || '',
      fase: c.fase || 'PREPARATORIA',
    })
    const nombresGuardados = (c.responsables || '').split(',').map((s) => s.trim()).filter(Boolean)
    setResponsablesIds(directorio.filter((u) => nombresGuardados.includes(`${u.nombres} ${u.apellidos}`)).map((u) => u.id))
    setArchivo(null)
    setArchivoActualNombre(c.archivoNombreArchivo || null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const responsables = responsablesIds.map((id) => nombrePorUsuarioId.get(id)).filter(Boolean).join(', ')
      const payload = { ...form, responsables, monto: form.monto ? Number(form.monto) : null, anio: Number(form.anio) }
      let id = editingId
      if (editingId) {
        await comprasApi.update(editingId, payload)
      } else {
        const creada = await comprasApi.create(payload)
        id = creada.id
      }
      if (archivo) {
        await comprasApi.subirArchivo(id, archivo)
      }
      setShowForm(false)
      setEditingId(null)
      setForm(FORM_INICIAL)
      setResponsablesIds([])
      setArchivo(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerArchivo = async (compra) => {
    setViewingId(compra.id)
    setError(null)
    try {
      const blob = await comprasApi.verArchivo(compra.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este objeto de contratación?')) return
    try {
      await comprasApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleFaseChange = async (compra, fase) => {
    if (fase === compra.fase) return
    setBusyId(compra.id)
    setError(null)
    try {
      await comprasApi.setFase(compra.id, fase)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const abrirGenerarReporte = () => {
    setReporteAnio(anioFiltro)
    setShowReportForm(true)
  }

  const generarReporte = (e) => {
    e.preventDefault()
    const items = reporteAnio === 'TODOS' ? data : data.filter((c) => c.anio === Number(reporteAnio))
    const filas = items.map((c) => `
      <tr>
        <td>${escapeHtml(c.objetoContratacion)}</td>
        <td>${escapeHtml(c.numeroProceso || '—')}</td>
        <td>${escapeHtml(c.tipoContratacion || '—')}</td>
        <td>${FASE_LABEL[c.fase] || c.fase}</td>
        <td>${escapeHtml(c.responsables || '—')}</td>
        <td>${c.monto != null ? Number(c.monto).toLocaleString('es-EC', { style: 'currency', currency: 'USD' }) : '—'}</td>
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
      <p>Año: ${reporteAnio === 'TODOS' ? 'Todos' : reporteAnio} — Generado: ${new Date().toLocaleString()} — Total de procesos: ${items.length}</p>
      <table>
        <thead><tr><th>Objeto de contratación</th><th>N° proceso</th><th>Tipo</th><th>Fase</th><th>Responsables</th><th>Monto</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="6">Sin registros</td></tr>'}</tbody>
      </table>
      </body></html>`

    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    ventana.print()
    setShowReportForm(false)
  }

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Compras Públicas"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={abrirGenerarReporte}
              className="flex items-center gap-2 bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] text-xs font-semibold px-4 py-2 rounded transition-colors"
            >
              <FileDown className="w-4 h-4" /> Generar reporte
            </button>
            {canEditCompras && (
              <PrimaryButton onClick={openCreate}>
                <Plus className="w-4 h-4" /> Nuevo objeto de contratación
              </PrimaryButton>
            )}
          </div>
        }
      />

      <ErrorBanner message={error} />

      {/* Semaforizacion: conteo por fase del anio filtrado */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {FASES.map((f) => (
          <div key={f} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${FASE_DOT[f]}`} />
            <div>
              <div className="text-xl font-black text-[#052a18] leading-none">{conteoPorFase[f]}</div>
              <div className="text-[10px] text-gray-500 mt-1">{FASE_LABEL[f]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtro por anio */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setAnioFiltro('TODOS')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${anioFiltro === 'TODOS' ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
        >
          Todos
        </button>
        {anios.map((a) => (
          <button
            key={a}
            onClick={() => setAnioFiltro(String(a))}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${anioFiltro === String(a) ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
          >
            {a}
          </button>
        ))}
      </div>

      <Table headers={canEditCompras ? ['Objeto de contratación', 'N° Proceso', 'Tipo', 'Monto', 'Responsables', 'Archivo', 'Fase', ''] : ['Objeto de contratación', 'N° Proceso', 'Tipo', 'Monto', 'Responsables', 'Archivo', 'Fase']}>
        {loading && <LoadingRow colSpan={canEditCompras ? 8 : 7} />}
        {!loading && filtradas.length === 0 && <EmptyRow colSpan={canEditCompras ? 8 : 7} />}
        {!loading && filtradas.map((c) => (
          <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-gray-400" /> {c.objetoContratacion}
            </td>
            <td className="px-3 py-2 text-gray-600">{c.numeroProceso || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{c.tipoContratacion || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{c.monto ?? '—'}</td>
            <td className="px-3 py-2 text-gray-600">{c.responsables || '—'}</td>
            <td className="px-3 py-2">
              {c.archivoRuta ? (
                <button
                  onClick={() => handleVerArchivo(c)}
                  disabled={viewingId === c.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                  title={c.archivoNombreArchivo || 'Ver archivo'}
                >
                  <Eye className="w-3.5 h-3.5" /> {viewingId === c.id ? 'Abriendo...' : 'Ver'}
                </button>
              ) : (
                <span className="text-gray-400 text-xs">Sin archivo</span>
              )}
            </td>
            <td className="px-3 py-2">
              {canEditCompras ? (
                <select
                  className={`text-[10px] font-semibold rounded-full px-2 py-1 border-0 ${FASE_BADGE[c.fase]}`}
                  value={c.fase}
                  disabled={busyId === c.id}
                  onChange={(e) => handleFaseChange(c, e.target.value)}
                  title="Cambiar fase"
                >
                  {FASES.map((f) => <option key={f} value={f}>{FASE_LABEL[f]}</option>)}
                </select>
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${FASE_BADGE[c.fase]}`}>
                  {FASE_LABEL[c.fase] || c.fase}
                </span>
              )}
            </td>
            {canEditCompras && (
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(c)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title={editingId ? 'Editar objeto de contratación' : 'Nuevo objeto de contratación'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Objeto de contratación">
              <input required className="input" value={form.objetoContratacion} onChange={(e) => setForm({ ...form, objetoContratacion: e.target.value })} placeholder="Ej. Adquisición de rack" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="N° de proceso">
                <input className="input" value={form.numeroProceso} onChange={(e) => setForm({ ...form, numeroProceso: e.target.value })} />
              </Field>
              <Field label="Tipo de contratación">
                <select required className="input" value={form.tipoContratacion} onChange={(e) => setForm({ ...form, tipoContratacion: e.target.value })}>
                  <option value="" disabled>Seleccionar...</option>
                  {TIPOS_CONTRATACION.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monto (USD)">
                <input type="number" className="input" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
              </Field>
              <Field label="Año">
                <input type="number" required className="input" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} />
              </Field>
            </div>
            <Field label="Responsables">
              <div className="border border-gray-300 rounded max-h-32 overflow-y-auto divide-y divide-gray-100">
                {directorio.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-400">Cargando usuarios...</p>
                )}
                {directorio.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={responsablesIds.includes(u.id)}
                      onChange={() => toggleResponsable(u.id)}
                    />
                    {u.nombres} {u.apellidos}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Fase">
              <select className="input" value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}>
                {FASES.map((f) => <option key={f} value={f}>{FASE_LABEL[f]}</option>)}
              </select>
            </Field>
            <Field label={archivoActualNombre ? 'Reemplazar archivo' : 'Archivo'}>
              <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
                <FileUp className="w-4 h-4 flex-shrink-0" />
                {archivo ? archivo.name : (archivoActualNombre || 'Subir archivo (PDF, Word, etc.)')}
                <input type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </label>
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {showReportForm && (
        <Modal title="Generar reporte de compras públicas" onClose={() => setShowReportForm(false)}>
          <form onSubmit={generarReporte} className="space-y-3">
            <Field label="Año a incluir en el reporte">
              <select className="input" value={reporteAnio} onChange={(e) => setReporteAnio(e.target.value)}>
                <option value="TODOS">Todos los años</option>
                {anios.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <PrimaryButton type="submit" className="w-full justify-center">
              <FileDown className="w-4 h-4" /> Generar reporte
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </main>
  )
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  )
}
