import { useCallback, useMemo, useState } from 'react'
import { Plus, Trash2, Mail, CheckCheck, Eye } from 'lucide-react'
import { memosApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const FORM_INICIAL = { asunto: '', contenido: '', destinatarioId: '' }

export default function MemosPage() {
  const { usuario } = useAuth()
  const fetcher = useCallback(() => memosApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [archivo, setArchivo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingId, setViewingId] = useState(null)

  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const memo = await memosApi.create({ ...form, destinatarioId: Number(form.destinatarioId) })
      if (archivo) {
        await memosApi.subirArchivo(memo.id, archivo)
      }
      setShowForm(false)
      setForm(FORM_INICIAL)
      setArchivo(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEstado = async (id, estado) => {
    try {
      await memosApi.setEstado(id, estado)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este memo?')) return
    try {
      await memosApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVer = async (memo) => {
    setViewingId(memo.id)
    setError(null)
    try {
      const blob = await memosApi.verArchivo(memo.id)
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
        title="Memos y Correspondencia"
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo memo
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Asunto', 'De', 'Para', 'Estado', 'Archivo', '']}>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={6} />}
        {!loading && data.map((m) => (
          <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400" /> {m.asunto}
            </td>
            <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(m.remitenteId) || `#${m.remitenteId}`}</td>
            <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(m.destinatarioId) || `#${m.destinatarioId}`}</td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-semibold">{m.estado}</span>
            </td>
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
            <td className="px-3 py-2 text-right flex items-center justify-end gap-2">
              {String(m.destinatarioId) === String(usuario?.id) && m.estado === 'ENVIADO' && (
                <button onClick={() => handleEstado(m.id, 'LEIDO')} className="text-[#0e6b3c] hover:text-[#052a18]" title="Marcar como leido">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title="Nuevo memo" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Asunto">
              <input required className="input" value={form.asunto} onChange={(e) => setForm({ ...form, asunto: e.target.value })} />
            </Field>
            <Field label="Destinatario">
              <select required className="input" value={form.destinatarioId} onChange={(e) => setForm({ ...form, destinatarioId: e.target.value })}>
                <option value="" disabled>Seleccionar destinatario...</option>
                {directorio.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                ))}
              </select>
            </Field>
            <Field label="Contenido">
              <textarea required className="input" rows={3} value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} />
            </Field>
            <Field label="Archivo adjunto (opcional)">
              <input type="file" className="input" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? (archivo ? 'Subiendo...' : 'Enviando...') : 'Enviar memo'}
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
