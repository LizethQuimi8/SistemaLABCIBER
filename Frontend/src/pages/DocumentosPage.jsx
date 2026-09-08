import { useCallback, useState } from 'react'
import { Plus, Trash2, FileText } from 'lucide-react'
import { documentosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

const TIPOS = ['MEMORANDO', 'OFICIO', 'INFORME', 'OTRO']
const ESTADOS = ['BORRADOR', 'PENDIENTE_FIRMA', 'FIRMADO', 'ARCHIVADO']

export default function DocumentosPage() {
  const fetcher = useCallback(() => documentosApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', tipo: 'MEMORANDO', rutaArchivo: '', hashArchivo: '', firmanteId: '', estado: 'BORRADOR' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await documentosApi.create({ ...form, firmanteId: form.firmanteId ? Number(form.firmanteId) : null })
      setShowForm(false)
      setForm({ titulo: '', tipo: 'MEMORANDO', rutaArchivo: '', hashArchivo: '', firmanteId: '', estado: 'BORRADOR' })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento?')) return
    try {
      await documentosApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Documentos y Correspondencia"
        subtitle="document-workflow-service — visible para el propietario o el firmante asignado; Administrador ve y firma todos."
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo documento
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Titulo', 'Tipo', 'Estado', 'Firmante', 'Propietario', '']}>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={6} />}
        {!loading && data.map((d) => (
          <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> {d.titulo}
            </td>
            <td className="px-3 py-2 text-gray-600">{d.tipo}</td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">{d.estado}</span>
            </td>
            <td className="px-3 py-2 text-gray-600">{d.firmanteId ? `#${d.firmanteId}` : '—'}</td>
            <td className="px-3 py-2 text-gray-600">#{d.usuarioId}</td>
            <td className="px-3 py-2 text-right">
              <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title="Nuevo documento" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Titulo">
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Ruta del archivo">
              <input className="input" placeholder="/files/documento.pdf" value={form.rutaArchivo} onChange={(e) => setForm({ ...form, rutaArchivo: e.target.value })} />
            </Field>
            <Field label="Id del firmante (opcional)">
              <input type="number" className="input" value={form.firmanteId} onChange={(e) => setForm({ ...form, firmanteId: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : 'Crear documento'}
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
