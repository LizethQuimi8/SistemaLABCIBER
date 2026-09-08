import { useCallback, useState } from 'react'
import { Plus, Trash2, Mail, CheckCheck } from 'lucide-react'
import { memosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

export default function MemosPage() {
  const { usuario } = useAuth()
  const fetcher = useCallback(() => memosApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ asunto: '', contenido: '', destinatarioId: '' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await memosApi.create({ ...form, destinatarioId: Number(form.destinatarioId) })
      setShowForm(false)
      setForm({ asunto: '', contenido: '', destinatarioId: '' })
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

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Memos y Correspondencia"
        subtitle="document-workflow-service — visible para remitente y destinatario."
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo memo
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Asunto', 'De', 'Para', 'Estado', '']}>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && data.map((m) => (
          <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400" /> {m.asunto}
            </td>
            <td className="px-3 py-2 text-gray-600">#{m.remitenteId}</td>
            <td className="px-3 py-2 text-gray-600">#{m.destinatarioId}</td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-semibold">{m.estado}</span>
            </td>
            <td className="px-3 py-2 text-right flex items-center justify-end gap-2">
              {String(m.destinatarioId) === String(usuario?.id) && m.estado === 'ENVIADO' && (
                <button onClick={() => handleEstado(m.id, 'LEIDO')} className="text-blue-600 hover:text-blue-800" title="Marcar como leido">
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
            <Field label="Id del destinatario">
              <input required type="number" className="input" value={form.destinatarioId} onChange={(e) => setForm({ ...form, destinatarioId: e.target.value })} />
            </Field>
            <Field label="Contenido">
              <textarea required className="input" rows={3} value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Enviando...' : 'Enviar memo'}
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
