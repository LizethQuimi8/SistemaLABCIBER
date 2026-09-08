import { useCallback, useState } from 'react'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import { comprasApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

export default function ComprasPage() {
  const fetcher = useCallback(() => comprasApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ descripcion: '', numeroProceso: '', tipoContratacion: '', monto: '' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await comprasApi.create({ ...form, monto: form.monto ? Number(form.monto) : null })
      setShowForm(false)
      setForm({ descripcion: '', numeroProceso: '', tipoContratacion: '', monto: '' })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta compra?')) return
    try {
      await comprasApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Compras Públicas"
        subtitle="administrative-logistics-service — modulo exclusivo del Administrador (Docente Investigador sin acceso)."
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nueva compra
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Descripcion', 'N° Proceso', 'Tipo', 'Monto', 'Estado', '']}>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={6} />}
        {!loading && data.map((c) => (
          <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-gray-400" /> {c.descripcion}
            </td>
            <td className="px-3 py-2 text-gray-600">{c.numeroProceso || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{c.tipoContratacion || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{c.monto ?? '—'}</td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-semibold">{c.estado}</span>
            </td>
            <td className="px-3 py-2 text-right">
              <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title="Nueva compra publica" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Descripcion">
              <input required className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="N° de proceso">
                <input className="input" value={form.numeroProceso} onChange={(e) => setForm({ ...form, numeroProceso: e.target.value })} />
              </Field>
              <Field label="Monto (USD)">
                <input type="number" className="input" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
              </Field>
            </div>
            <Field label="Tipo de contratacion">
              <input className="input" value={form.tipoContratacion} onChange={(e) => setForm({ ...form, tipoContratacion: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : 'Registrar compra'}
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
