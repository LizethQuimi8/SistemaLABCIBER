import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, FolderOpen, FileUp, Eye } from 'lucide-react'
import { proyectosApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const ESTADOS = ['PLANIFICACION', 'EN_EJECUCION', 'FINALIZADO', 'CANCELADO']
const FORM_INICIAL = { nombre: '', descripcion: '', estado: 'PLANIFICACION', presupuesto: '', avancePorcentaje: 0, usuarioResponsableId: '' }

export default function ProyectosPage() {
  const { isAdmin, usuario } = useAuth()
  const fetcher = useCallback(() => proyectosApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingProyecto, setEditingProyecto] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [documentoAprobacion, setDocumentoAprobacion] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingId, setViewingId] = useState(null)

  const openCreate = () => {
    setEditingId(null)
    setEditingProyecto(null)
    setForm(FORM_INICIAL)
    setDocumentoAprobacion(null)
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditingId(p.id)
    setEditingProyecto(p)
    setForm({
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      estado: p.estado || 'PLANIFICACION',
      presupuesto: p.presupuesto ?? '',
      avancePorcentaje: p.avancePorcentaje ?? 0,
      usuarioResponsableId: p.usuarioResponsableId ? String(p.usuarioResponsableId) : '',
    })
    setDocumentoAprobacion(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        presupuesto: form.presupuesto ? Number(form.presupuesto) : null,
        avancePorcentaje: Number(form.avancePorcentaje) || 0,
        usuarioResponsableId: form.usuarioResponsableId ? Number(form.usuarioResponsableId) : null,
      }
      let id = editingId
      if (editingId) {
        await proyectosApi.update(editingId, payload)
      } else {
        const creado = await proyectosApi.create(payload)
        id = creado.id
      }
      if (documentoAprobacion) await proyectosApi.subirDocumentoAprobacion(id, documentoAprobacion)
      setShowForm(false)
      setEditingId(null)
      setEditingProyecto(null)
      setForm(FORM_INICIAL)
      setDocumentoAprobacion(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerDocumento = async (p) => {
    setViewingId(p.id)
    setError(null)
    try {
      const blob = await proyectosApi.verDocumentoAprobacion(p.id)
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
    if (!confirm('¿Eliminar este proyecto?')) return
    try {
      await proyectosApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const puedeEditar = (p) => isAdmin || p.usuarioResponsableId === usuario?.id

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Portafolio de Proyectos"
        action={
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo proyecto
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Nombre', 'Estado', 'Avance', 'Presupuesto', 'Responsable', 'Doc. aprobación', '']}>
        {loading && <LoadingRow colSpan={7} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={7} />}
        {!loading && data.map((p) => (
          <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-gray-400" /> {p.nombre}
            </td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold">
                {p.estado}
              </span>
            </td>
            <td className="px-3 py-2 text-gray-600">{p.avancePorcentaje ?? 0}%</td>
            <td className="px-3 py-2 text-gray-600">{p.presupuesto ?? '—'}</td>
            <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(p.usuarioResponsableId) || `#${p.usuarioResponsableId}`}</td>
            <td className="px-3 py-2">
              <ArchivoBoton
                disponible={!!p.documentoAprobacionRuta}
                cargando={viewingId === p.id}
                titulo={p.documentoAprobacionNombreArchivo}
                onClick={() => handleVerDocumento(p)}
              />
            </td>
            <td className="px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-2">
                {puedeEditar(p) && (
                  <button onClick={() => openEdit(p)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {puedeEditar(p) && (
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title={editingId ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Nombre">
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Field>
            <Field label="Descripcion">
              <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <Field label="Estado">
              <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Presupuesto (USD)">
                <input type="number" className="input" value={form.presupuesto} onChange={(e) => setForm({ ...form, presupuesto: e.target.value })} />
              </Field>
              <Field label="Avance (%)">
                <input type="number" min="0" max="100" className="input" value={form.avancePorcentaje} onChange={(e) => setForm({ ...form, avancePorcentaje: e.target.value })} />
              </Field>
            </div>
            <Field label="Usuario responsable">
              {isAdmin ? (
                <select className="input" value={form.usuarioResponsableId} onChange={(e) => setForm({ ...form, usuarioResponsableId: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {directorio.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                  ))}
                </select>
              ) : (
                <input className="input bg-gray-50 text-gray-500" value={`${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim()} disabled />
              )}
            </Field>
            <ArchivoInput
              label={editingProyecto?.documentoAprobacionRuta ? 'Reemplazar documento de aprobación (PDF)' : 'Documento de aprobación (PDF)'}
              file={documentoAprobacion}
              onChange={setDocumentoAprobacion}
              placeholder={editingProyecto?.documentoAprobacionNombreArchivo}
            />
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? (documentoAprobacion ? 'Subiendo...' : 'Guardando...') : editingId ? 'Guardar cambios' : 'Crear proyecto'}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </main>
  )
}

function ArchivoBoton({ disponible, cargando, titulo, onClick, icon: Icon = Eye, etiqueta = 'Ver' }) {
  if (!disponible) return <span className="text-gray-400 text-xs">Sin subir</span>
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
      title={titulo || etiqueta}
    >
      <Icon className="w-3.5 h-3.5" /> {cargando ? 'Abriendo...' : etiqueta}
    </button>
  )
}

function ArchivoInput({ label, file, onChange, placeholder, icon: Icon = FileUp }) {
  return (
    <Field label={label}>
      <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
        <Icon className="w-4 h-4 flex-shrink-0" />
        {file ? file.name : (placeholder || 'Subir archivo PDF')}
        <input type="file" accept=".pdf" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
    </Field>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  )
}
