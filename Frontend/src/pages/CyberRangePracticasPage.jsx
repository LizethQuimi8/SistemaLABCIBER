import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Upload, Search, Server, FlaskConical, FileDown } from 'lucide-react'
import { cyberRangeApi, practicasApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { estiloEncabezadoReporte, htmlEncabezadoReporte } from '../utils/reportePlantilla'

export default function CyberRangePracticasPage() {
  const [tab, setTab] = useState('cyberrange')

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader title="CyberRange y Prácticas-Ensayos" />

      <div className="flex items-center gap-2 mb-5 border-b border-gray-200">
        <TabButton active={tab === 'cyberrange'} onClick={() => setTab('cyberrange')} icon={Server}>
          CyberRange
        </TabButton>
        <TabButton active={tab === 'practicas'} onClick={() => setTab('practicas')} icon={FlaskConical}>
          Prácticas y Ensayos
        </TabButton>
      </div>

      {tab === 'cyberrange' ? <CyberRangeTab /> : <PracticasTab />}
    </main>
  )
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors
        ${active ? 'border-[#0e6b3c] text-[#052a18]' : 'border-transparent text-gray-500 hover:text-[#0e6b3c]'}`}
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  )
}

const CYBERRANGE_FORM_INICIAL = { titulo: '', descripcion: '' }

function CyberRangeTab() {
  const { isAdmin } = useAuth()
  const fetcher = useCallback(() => cyberRangeApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingDocumento, setEditingDocumento] = useState(null)
  const [form, setForm] = useState(CYBERRANGE_FORM_INICIAL)
  const [archivo, setArchivo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingId, setViewingId] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return data
    return data.filter((d) =>
      (d.titulo || '').toLowerCase().includes(termino) || (d.descripcion || '').toLowerCase().includes(termino)
    )
  }, [data, busqueda])

  const openCreate = () => {
    setEditingId(null)
    setEditingDocumento(null)
    setForm(CYBERRANGE_FORM_INICIAL)
    setArchivo(null)
    setShowForm(true)
  }

  const openEdit = (d) => {
    setEditingId(d.id)
    setEditingDocumento(d)
    setForm({ titulo: d.titulo || '', descripcion: d.descripcion || '' })
    setArchivo(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await cyberRangeApi.actualizar(editingId, form.titulo, form.descripcion, archivo)
      } else {
        if (!archivo) throw new Error('Selecciona el archivo del documento')
        await cyberRangeApi.crear(form.titulo, form.descripcion, archivo)
      }
      setShowForm(false)
      setEditingId(null)
      setEditingDocumento(null)
      setForm(CYBERRANGE_FORM_INICIAL)
      setArchivo(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento del CyberRange?')) return
    try {
      await cyberRangeApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVer = async (documento) => {
    setViewingId(documento.id)
    setError(null)
    try {
      const blob = await cyberRangeApi.verArchivo(documento.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="relative w-full max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o descripción..."
            className="input pl-8 text-xs py-1.5 w-full"
          />
        </div>
        {isAdmin && (
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo documento
          </PrimaryButton>
        )}
      </div>

      <ErrorBanner message={error} />

      <Table headers={isAdmin ? ['Título', 'Descripción', 'Archivo', ''] : ['Título', 'Descripción', 'Archivo']}>
        {loading && <LoadingRow colSpan={isAdmin ? 4 : 3} />}
        {!loading && filtrados.length === 0 && (
          <EmptyRow colSpan={isAdmin ? 4 : 3} message={data.length === 0 ? 'No hay documentos del CyberRange cargados todavía' : 'Ningún documento coincide con la búsqueda'} />
        )}
        {!loading && filtrados.map((d) => (
          <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-gray-400" /> {d.titulo}
            </td>
            <td className="px-3 py-2 text-gray-600 max-w-[320px] truncate" title={d.descripcion}>{d.descripcion || '—'}</td>
            <td className="px-3 py-2">
              {d.rutaArchivo ? (
                <button
                  onClick={() => handleVer(d)}
                  disabled={viewingId === d.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                  title={d.nombreArchivo || 'Ver archivo'}
                >
                  <Eye className="w-3.5 h-3.5" /> {viewingId === d.id ? 'Abriendo...' : 'Ver'}
                </button>
              ) : (
                <span className="text-gray-400 text-xs">Sin archivo</span>
              )}
            </td>
            {isAdmin && (
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(d)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title={editingId ? 'Editar documento' : 'Nuevo documento del CyberRange'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Título">
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Topología del escenario 1" />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <Field label={editingDocumento?.rutaArchivo ? 'Reemplazar archivo (opcional)' : 'Archivo'}>
              <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
                <Upload className="w-4 h-4 flex-shrink-0" />
                {archivo ? archivo.name : (editingDocumento?.nombreArchivo || 'Subir archivo')}
                <input type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </label>
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear documento'}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </div>
  )
}

const PRACTICA_FORM_INICIAL = { titulo: '', fecha: '', descripcion: '' }

function PracticasTab() {
  const { isAdmin, usuario } = useAuth()
  const fetcher = useCallback(() => practicasApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingPractica, setEditingPractica] = useState(null)
  const [form, setForm] = useState(PRACTICA_FORM_INICIAL)
  const [responsableId, setResponsableId] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingId, setViewingId] = useState(null)

  const puedeEditar = (p) => isAdmin || p.responsableId === usuario?.id

  const openCreate = () => {
    setEditingId(null)
    setEditingPractica(null)
    setForm({ ...PRACTICA_FORM_INICIAL, fecha: new Date().toISOString().slice(0, 10) })
    setResponsableId(isAdmin ? '' : String(usuario?.id ?? ''))
    setArchivo(null)
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditingId(p.id)
    setEditingPractica(p)
    setForm({ titulo: p.titulo || '', fecha: p.fecha || '', descripcion: p.descripcion || '' })
    setResponsableId(String(p.responsableId ?? ''))
    setArchivo(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        titulo: form.titulo,
        fecha: form.fecha,
        descripcion: form.descripcion,
        responsableId: responsableId ? Number(responsableId) : null,
      }
      let id = editingId
      if (editingId) {
        await practicasApi.actualizar(editingId, payload)
      } else {
        const creada = await practicasApi.crear(payload)
        id = creada.id
      }
      if (archivo) await practicasApi.subirArchivo(id, archivo)
      setShowForm(false)
      setEditingId(null)
      setEditingPractica(null)
      setForm(PRACTICA_FORM_INICIAL)
      setArchivo(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro de práctica/ensayo?')) return
    try {
      await practicasApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVer = async (p) => {
    setViewingId(p.id)
    setError(null)
    try {
      const blob = await practicasApi.verArchivo(p.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingId(null)
    }
  }

  const generarReporte = () => {
    const filas = data.map((p) => `
      <tr>
        <td>${escapeHtml(p.titulo)}</td>
        <td>${p.fecha || '—'}</td>
        <td>${escapeHtml(nombrePorUsuarioId.get(p.responsableId) || `#${p.responsableId}`)}</td>
        <td>${escapeHtml(p.descripcion || '—')}</td>
      </tr>`).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Reporte Practicas y Ensayos</title>
      <style>
        ${estiloEncabezadoReporte()}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#0e6b3c;color:#fff}
      </style></head><body>
      ${htmlEncabezadoReporte('Reporte de Prácticas y Ensayos', `Generado: ${new Date().toLocaleString()} — Total de registros: ${data.length}`)}
      <table>
        <thead><tr><th>Título</th><th>Fecha</th><th>Responsable</th><th>Descripción</th></tr></thead>
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
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <button
          onClick={generarReporte}
          className="flex items-center gap-2 bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] text-xs font-semibold px-4 py-2 rounded transition-colors"
        >
          <FileDown className="w-4 h-4" /> Generar reporte
        </button>
        <PrimaryButton onClick={openCreate}>
          <Plus className="w-4 h-4" /> Registrar práctica/ensayo
        </PrimaryButton>
      </div>

      <ErrorBanner message={error} />

      <Table headers={['Título', 'Fecha', 'Responsable', 'Descripción', 'Archivo', '']}>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={6} message="Sin prácticas o ensayos registrados todavía" />}
        {!loading && data.map((p) => (
          <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-gray-400" /> {p.titulo}
            </td>
            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.fecha || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(p.responsableId) || `#${p.responsableId}`}</td>
            <td className="px-3 py-2 text-gray-600 max-w-[260px] truncate" title={p.descripcion}>{p.descripcion || '—'}</td>
            <td className="px-3 py-2">
              {p.archivoRuta ? (
                <button
                  onClick={() => handleVer(p)}
                  disabled={viewingId === p.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                  title={p.archivoNombreArchivo || 'Ver archivo'}
                >
                  <Eye className="w-3.5 h-3.5" /> {viewingId === p.id ? 'Abriendo...' : 'Ver'}
                </button>
              ) : (
                <span className="text-gray-400 text-xs">Sin archivo</span>
              )}
            </td>
            <td className="px-3 py-2 text-right">
              {puedeEditar(p) && (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(p)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title={editingId ? 'Editar práctica/ensayo' : 'Registrar práctica/ensayo'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Título">
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Práctica de análisis forense" />
            </Field>
            <Field label="Fecha">
              <input required type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </Field>
            <Field label="Responsable">
              {isAdmin ? (
                <select className="input" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {directorio.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                  ))}
                </select>
              ) : (
                <input className="input bg-gray-50 text-gray-500" value={`${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim()} disabled />
              )}
            </Field>
            <Field label="Descripción del desarrollo">
              <textarea required rows={4} className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <Field label={editingPractica?.archivoRuta ? 'Reemplazar documento de respaldo (opcional)' : 'Documento de respaldo (opcional)'}>
              <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
                <Upload className="w-4 h-4 flex-shrink-0" />
                {archivo ? archivo.name : (editingPractica?.archivoNombreArchivo || 'Subir archivo')}
                <input type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </label>
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar'}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </div>
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
