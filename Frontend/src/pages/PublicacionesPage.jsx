import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { publicacionesApi, investigadoresApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const FORM_INICIAL = { titulo: '', revista: '', anioPublicacion: new Date().getFullYear(), doi: '', resumen: '', usuarioAutorId: '' }

export default function PublicacionesPage() {
  const { isAdmin, usuario } = useAuth()
  const fetcher = useCallback(() => publicacionesApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const investigadoresFetcher = useCallback(() => investigadoresApi.list(), [])
  const { data: investigadores } = useList(investigadoresFetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [saving, setSaving] = useState(false)

  const investigadorIdPorUsuarioId = useMemo(
    () => new Map(investigadores.map((inv) => [inv.usuarioId, inv.id])),
    [investigadores]
  )
  const usuarioIdPorInvestigadorId = useMemo(
    () => new Map(investigadores.map((inv) => [inv.id, inv.usuarioId])),
    [investigadores]
  )

  const abrirCrear = () => {
    setEditingId(null)
    setForm({ ...FORM_INICIAL, usuarioAutorId: isAdmin ? '' : String(usuario?.id ?? '') })
    setShowForm(true)
  }

  const abrirEditar = (p) => {
    setEditingId(p.id)
    setForm({
      titulo: p.titulo || '',
      revista: p.revista || '',
      anioPublicacion: p.anioPublicacion || new Date().getFullYear(),
      doi: p.doi || '',
      resumen: p.resumen || '',
      usuarioAutorId: p.investigadorId ? String(usuarioIdPorInvestigadorId.get(p.investigadorId) ?? '') : '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let investigadorId = null
      if (form.usuarioAutorId) {
        const usuarioId = Number(form.usuarioAutorId)
        investigadorId = investigadorIdPorUsuarioId.get(usuarioId)
        if (!investigadorId) {
          // Este usuario aun no tiene perfil en Docentes Investigadores: se crea uno minimo al vuelo.
          const nuevo = await investigadoresApi.create({ usuarioId, nombreCompleto: nombrePorUsuarioId.get(usuarioId) || '' })
          investigadorId = nuevo.id
        }
      }
      const payload = {
        titulo: form.titulo,
        revista: form.revista,
        doi: form.doi,
        resumen: form.resumen,
        anioPublicacion: Number(form.anioPublicacion) || null,
        investigadorId,
      }
      if (editingId) {
        await publicacionesApi.update(editingId, payload)
      } else {
        await publicacionesApi.create(payload)
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
    if (!confirm('¿Eliminar esta publicacion?')) return
    try {
      await publicacionesApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const puedeEditar = (p) => isAdmin || p.usuarioId === usuario?.id

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Artículos Científicos y Publicaciones"
        action={
          <PrimaryButton onClick={abrirCrear}>
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
            <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(p.usuarioId) || `#${p.usuarioId}`}</td>
            <td className="px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-2">
                {puedeEditar(p) && (
                  <button onClick={() => abrirEditar(p)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
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
        <Modal title={editingId ? 'Editar publicacion' : 'Nueva publicacion'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
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
            <Field label="Investigador">
              {isAdmin ? (
                <select className="input" value={form.usuarioAutorId} onChange={(e) => setForm({ ...form, usuarioAutorId: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {directorio.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                  ))}
                </select>
              ) : (
                <input className="input bg-gray-50 text-gray-500" value={`${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim()} disabled />
              )}
            </Field>
            <Field label="Resumen">
              <textarea className="input" rows={2} value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear publicacion'}
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
