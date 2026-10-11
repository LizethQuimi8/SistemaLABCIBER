import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Target, Eye, Upload, Search } from 'lucide-react'
import { planificacionEstrategicaApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const FORM_INICIAL = { titulo: '', descripcion: '' }

export default function PlanificacionEstrategicaPage() {
  const { isAdmin } = useAuth()
  const fetcher = useCallback(() => planificacionEstrategicaApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingDocumento, setEditingDocumento] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
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
    setForm(FORM_INICIAL)
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
        await planificacionEstrategicaApi.actualizar(editingId, form.titulo, form.descripcion, archivo)
      } else {
        if (!archivo) {
          throw new Error('Selecciona el archivo PDF del documento')
        }
        await planificacionEstrategicaApi.crear(form.titulo, form.descripcion, archivo)
      }
      setShowForm(false)
      setEditingId(null)
      setEditingDocumento(null)
      setForm(FORM_INICIAL)
      setArchivo(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento de planificación estratégica?')) return
    try {
      await planificacionEstrategicaApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVer = async (documento) => {
    setViewingId(documento.id)
    setError(null)
    try {
      const blob = await planificacionEstrategicaApi.verArchivo(documento.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingId(null)
    }
  }

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Planificación Estratégica"
        action={isAdmin && (
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo documento
          </PrimaryButton>
        )}
      />

      <ErrorBanner message={error} />

      <div className="relative mb-3 max-w-xs">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título o descripción..."
          className="input pl-8 text-xs py-1.5 w-full"
        />
      </div>

      <Table headers={isAdmin ? ['Título', 'Descripción', 'Archivo', ''] : ['Título', 'Descripción', 'Archivo']}>
        {loading && <LoadingRow colSpan={isAdmin ? 4 : 3} />}
        {!loading && filtrados.length === 0 && (
          <EmptyRow colSpan={isAdmin ? 4 : 3} message={data.length === 0 ? 'No hay documentos de planificación estratégica cargados todavía' : 'Ningún documento coincide con la búsqueda'} />
        )}
        {!loading && filtrados.map((d) => (
          <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-gray-400" /> {d.titulo}
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
        <Modal title={editingId ? 'Editar documento' : 'Nuevo documento de planificación estratégica'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Título">
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Plan Estratégico 2026-2030" />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <Field label={editingDocumento?.rutaArchivo ? 'Reemplazar archivo PDF (opcional)' : 'Archivo PDF'}>
              <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
                <Upload className="w-4 h-4 flex-shrink-0" />
                {archivo ? archivo.name : (editingDocumento?.nombreArchivo || 'Subir archivo PDF')}
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </label>
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear documento'}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </main>
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
