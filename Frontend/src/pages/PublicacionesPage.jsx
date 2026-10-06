import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen, Filter } from 'lucide-react'
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
  const [autorFiltro, setAutorFiltro] = useState('TODOS')
  const [anioFiltro, setAnioFiltro] = useState('TODOS')

  const investigadorIdPorUsuarioId = useMemo(
    () => new Map(investigadores.map((inv) => [inv.usuarioId, inv.id])),
    [investigadores]
  )
  const usuarioIdPorInvestigadorId = useMemo(
    () => new Map(investigadores.map((inv) => [inv.id, inv.usuarioId])),
    [investigadores]
  )

  // El "Autor" que se ve y edita es el Investigador asignado (investigadorId),
  // no el usuarioId (quien creo/es dueño del registro, usado solo para permisos de edicion).
  const nombreAutorDe = (p) => {
    if (!p.investigadorId) return null
    const usuarioId = usuarioIdPorInvestigadorId.get(p.investigadorId)
    return usuarioId ? nombrePorUsuarioId.get(usuarioId) : null
  }

  const autores = useMemo(() => {
    const ids = new Set(data.map((p) => p.investigadorId).filter(Boolean))
    return [...ids]
      .map((id) => ({ id, nombre: nombrePorUsuarioId.get(usuarioIdPorInvestigadorId.get(id)) || `#${id}` }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [data, nombrePorUsuarioId, usuarioIdPorInvestigadorId])

  const anios = useMemo(
    () => [...new Set(data.map((p) => p.anioPublicacion).filter(Boolean))].sort((a, b) => b - a),
    [data]
  )

  const dataFiltrada = useMemo(() => {
    return data.filter((p) => {
      if (autorFiltro !== 'TODOS' && String(p.investigadorId) !== autorFiltro) return false
      if (anioFiltro !== 'TODOS' && String(p.anioPublicacion) !== anioFiltro) return false
      return true
    })
  }, [data, autorFiltro, anioFiltro])

  const limpiarFiltros = () => {
    setAutorFiltro('TODOS')
    setAnioFiltro('TODOS')
  }

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

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
          <Filter className="w-3.5 h-3.5" /> Filtrar por autor y año
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select className="input py-1.5 text-xs w-56" value={autorFiltro} onChange={(e) => setAutorFiltro(e.target.value)}>
            <option value="TODOS">Todos los autores</option>
            {autores.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
          </select>
          <div className="flex items-center gap-2 flex-wrap">
            <FiltroChip active={anioFiltro === 'TODOS'} onClick={() => setAnioFiltro('TODOS')}>Todos los años</FiltroChip>
            {anios.map((a) => (
              <FiltroChip key={a} active={anioFiltro === String(a)} onClick={() => setAnioFiltro(String(a))}>{a}</FiltroChip>
            ))}
          </div>
          {(autorFiltro !== 'TODOS' || anioFiltro !== 'TODOS') && (
            <button onClick={limpiarFiltros} className="text-xs text-gray-400 hover:text-red-600">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <Table headers={['Titulo', 'Revista', 'Año', 'DOI', 'Autor', '']}>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && dataFiltrada.length === 0 && <EmptyRow colSpan={6} message={data.length === 0 ? 'Sin registros todavia' : 'Ningún artículo coincide con los filtros aplicados'} />}
        {!loading && dataFiltrada.map((p) => (
          <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-gray-400" /> {p.titulo}
            </td>
            <td className="px-3 py-2 text-gray-600">{p.revista || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{p.anioPublicacion || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{p.doi || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{nombreAutorDe(p) || '—'}</td>
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

function FiltroChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 flex-shrink-0 rounded-full border font-semibold whitespace-nowrap transition-colors px-3 py-1.5 text-xs
        ${active ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
    >
      {children}
    </button>
  )
}
