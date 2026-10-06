import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, FileText, Eye, Upload, Search } from 'lucide-react'
import { manualesApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const TIPOS = ['MANUAL', 'PROCESO', 'OTRO']
const TIPO_LABEL = { MANUAL: 'Manual', PROCESO: 'Proceso', OTRO: 'Otro' }
const FORM_INICIAL = { titulo: '', descripcion: '', tipo: 'MANUAL' }

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
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('TODOS')

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return data.filter((m) => {
      if (tipoFiltro !== 'TODOS' && (m.tipo || 'MANUAL') !== tipoFiltro) return false
      if (!termino) return true
      return (m.titulo || '').toLowerCase().includes(termino) || (m.descripcion || '').toLowerCase().includes(termino)
    })
  }, [data, busqueda, tipoFiltro])

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
    setForm({ titulo: m.titulo || '', descripcion: m.descripcion || '', tipo: m.tipo || 'MANUAL' })
    setArchivo(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await manualesApi.actualizar(editingId, form.titulo, form.descripcion, form.tipo, archivo)
      } else {
        if (!archivo) {
          throw new Error('Selecciona el archivo PDF del manual')
        }
        await manualesApi.crear(form.titulo, form.descripcion, form.tipo, archivo)
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

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <FiltroChip active={tipoFiltro === 'TODOS'} onClick={() => setTipoFiltro('TODOS')}>Todos</FiltroChip>
        {TIPOS.map((t) => (
          <FiltroChip key={t} active={tipoFiltro === t} onClick={() => setTipoFiltro(t)}>{TIPO_LABEL[t]}</FiltroChip>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o descripción..."
            className="input pl-8 text-xs py-1.5 w-full"
          />
        </div>
      </div>

      <Table headers={isAdmin ? ['Título', 'Tipo', 'Descripción', 'Archivo', ''] : ['Título', 'Tipo', 'Descripción', 'Archivo']}>
        {loading && <LoadingRow colSpan={isAdmin ? 5 : 4} />}
        {!loading && filtrados.length === 0 && (
          <EmptyRow colSpan={isAdmin ? 5 : 4} message={data.length === 0 ? 'No hay manuales o procesos cargados todavía' : 'Ningún manual coincide con los filtros aplicados'} />
        )}
        {!loading && filtrados.map((m) => (
          <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> {m.titulo}
            </td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-[#f3faf6] text-[#0e6b3c] text-[10px] font-semibold">
                {TIPO_LABEL[m.tipo] || TIPO_LABEL.MANUAL}
              </span>
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
            <Field label="Tipo">
              <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
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

function FiltroChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${active ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
    >
      {children}
    </button>
  )
}
