import { useCallback, useState } from 'react'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import { publicacionesApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

export default function PublicacionesPage() {
  const fetcher = useCallback(() => publicacionesApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', revista: '', anioPublicacion: new Date().getFullYear(), doi: '', resumen: '', investigadorId: '' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await publicacionesApi.create({
        ...form,
        anioPublicacion: Number(form.anioPublicacion) || null,
        investigadorId: form.investigadorId ? Number(form.investigadorId) : null,
      })
      setShowForm(false)
      setForm({ titulo: '', revista: '', anioPublicacion: new Date().getFullYear(), doi: '', resumen: '', investigadorId: '' })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta publicacion?')) return
    try {
      await publicacionesApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Artículos Científicos y Publicaciones"
        subtitle="core-academic-research-service — CRUD solo sobre publicaciones propias para el Docente Investigador."
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nueva publicacion
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Titulo', 'Revista', 'Año', 'DOI', 'Autor', '']}>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={6} />}
        {!loading && data.map((p) => (
          <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-gray-400" /> {p.titulo}
            </td>
            <td className="px-3 py-2 text-gray-600">{p.revista || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{p.anioPublicacion || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{p.doi || '—'}</td>
            <td className="px-3 py-2 text-gray-600">#{p.usuarioId}</td>
            <td className="px-3 py-2 text-right">
              <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title="Nueva publicacion" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Titulo">
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Revista">
                <input className="input" value={form.revista} onChange={(e) => setForm({ ...form, revista: e.target.value })} />
              </Field>
              <Field label="Año">
                <input type="number" className="input" value={form.anioPublicacion} onChange={(e) => setForm({ ...form, anioPublicacion: e.target.value })} />
              </Field>
            </div>
            <Field label="DOI">
              <input className="input" value={form.doi} onChange={(e) => setForm({ ...form, doi: e.target.value })} />
            </Field>
            <Field label="Id del investigador (opcional)">
              <input type="number" className="input" value={form.investigadorId} onChange={(e) => setForm({ ...form, investigadorId: e.target.value })} />
            </Field>
            <Field label="Resumen">
              <textarea className="input" rows={2} value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : 'Crear publicacion'}
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
