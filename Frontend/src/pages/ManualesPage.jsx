import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, FileText, Eye, Upload } from 'lucide-react'
import { manualesApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const FORM_INICIAL = { titulo: '', descripcion: '' }

export default function ManualesPage() {
  const { isAdmin } = useAuth()
  const fetcher = useCallback(() => manualesApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingManual, setEditingManual] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [archivo, setArchivo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingId, setViewingId] = useState(null)

  const openCreate = () => {
    setEditingId(null)
    setEditingManual(null)
    setForm(FORM_INICIAL)
    setArchivo(null)
    setShowForm(true)
  }

  const openEdit = (m) => {
    setEditingId(m.id)
    setEditingManual(m)
    setForm({ titulo: m.titulo || '', descripcion: m.descripcion || '' })
    setArchivo(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await manualesApi.actualizar(editingId, form.titulo, form.descripcion, archivo)
      } else {
        if (!archivo) {
          throw new Error('Selecciona el archivo PDF del manual')
        }
        await manualesApi.crear(form.titulo, form.descripcion, archivo)
      }
      setShowForm(false)
      setEditingId(null)
      setEditingManual(null)
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
    if (!confirm('¿Eliminar este manual/proceso?')) return
    try {
      await manualesApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVer = async (manual) => {
    setViewingId(manual.id)
    setError(null)
    try {
      const blob = await manualesApi.verArchivo(manual.id)
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
        title="Manuales y Procesos"
        action={isAdmin && (
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo manual
          </PrimaryButton>
        )}
      />

      <ErrorBanner message={error} />

      <Table headers={isAdmin ? ['Título', 'Descripción', 'Archivo', ''] : ['Título', 'Descripción', 'Archivo']}>
        {loading && <LoadingRow colSpan={isAdmin ? 4 : 3} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={isAdmin ? 4 : 3} message="No hay manuales o procesos cargados todavía" />}
        {!loading && data.map((m) => (
          <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> {m.titulo}
            </td>
            <td className="px-3 py-2 text-gray-600 max-w-[320px] truncate" title={m.descripcion}>{m.descripcion || '—'}</td>
            <td className="px-3 py-2">
              {m.rutaArchivo ? (
                <button
                  onClick={() => handleVer(m)}
                  disabled={viewingId === m.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                  title={m.nombreArchivo || 'Ver archivo'}
                >
                  <Eye className="w-3.5 h-3.5" /> {viewingId === m.id ? 'Abriendo...' : 'Ver'}
                </button>
              ) : (
                <span className="text-gray-400 text-xs">Sin archivo</span>
              )}
            </td>
            {isAdmin && (
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(m)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title={editingId ? 'Editar manual/proceso' : 'Nuevo manual/proceso'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Título">
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Manual de uso del laboratorio" />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <Field label={editingManual?.rutaArchivo ? 'Reemplazar archivo PDF (opcional)' : 'Archivo PDF'}>
              <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
                <Upload className="w-4 h-4 flex-shrink-0" />
                {archivo ? archivo.name : (editingManual?.nombreArchivo || 'Subir archivo PDF')}
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </label>
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear manual'}
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
