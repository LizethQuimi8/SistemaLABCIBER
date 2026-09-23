import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, UserCheck } from 'lucide-react'
import { investigadoresApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { useAuth } from '../context/AuthContext'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

const FORM_INICIAL = { nombreCompleto: '', tituloAcademico: '', areaInvestigacion: '', biografia: '', usuarioId: '' }

export default function InvestigadoresPage() {
  const { isAdmin } = useAuth()
  const fetcher = useCallback(() => investigadoresApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [saving, setSaving] = useState(false)

  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(FORM_INICIAL)
    setShowForm(true)
  }

  const openEdit = (inv) => {
    setEditingId(inv.id)
    setForm({
      nombreCompleto: inv.nombreCompleto || '',
      tituloAcademico: inv.tituloAcademico || '',
      areaInvestigacion: inv.areaInvestigacion || '',
      biografia: inv.biografia || '',
      usuarioId: String(inv.usuarioId ?? ''),
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await investigadoresApi.update(editingId, form)
      } else {
        await investigadoresApi.create({ ...form, usuarioId: Number(form.usuarioId) })
      }
      setShowForm(false)
      setEditingId(null)
      setForm(FORM_INICIAL)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este perfil de investigador?')) return
    try {
      await investigadoresApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Investigadores"
        action={
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo perfil
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Nombre', 'Titulo academico', 'Area', 'Usuario', '']}>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && data.map((inv) => (
          <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-gray-400" /> {inv.nombreCompleto}
            </td>
            <td className="px-3 py-2 text-gray-600">{inv.tituloAcademico || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{inv.areaInvestigacion || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(inv.usuarioId) || `#${inv.usuarioId}`}</td>
            <td className="px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => openEdit(inv)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title={editingId ? 'Editar perfil de investigador' : 'Nuevo perfil de investigador'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!editingId && (
              <Field label="Usuario">
                <select
                  required
                  className="input"
                  value={form.usuarioId}
                  onChange={(e) => setForm({ ...form, usuarioId: e.target.value })}
                >
                  <option value="" disabled>Seleccionar usuario...</option>
                  {directorio.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Nombre completo">
              <input required className="input" value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} />
            </Field>
            <Field label="Titulo academico">
              <input className="input" value={form.tituloAcademico} onChange={(e) => setForm({ ...form, tituloAcademico: e.target.value })} />
            </Field>
            <Field label="Area de investigacion">
              <input className="input" value={form.areaInvestigacion} onChange={(e) => setForm({ ...form, areaInvestigacion: e.target.value })} />
            </Field>
            <Field label="Biografia">
              <textarea className="input" rows={3} value={form.biografia} onChange={(e) => setForm({ ...form, biografia: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear perfil'}
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
