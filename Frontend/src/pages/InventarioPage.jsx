import { useCallback, useState } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import { inventarioApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const ESTADOS = ['DISPONIBLE', 'EN_USO', 'MANTENIMIENTO', 'DE_BAJA']

export default function InventarioPage() {
  const { isAdmin } = useAuth()
  const fetcher = useCallback(() => inventarioApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const columnHeaders = isAdmin
    ? ['Nombre', 'Codigo', 'Categoria', 'Cantidad', 'Estado', 'Ubicacion', 'Acciones']
    : ['Nombre', 'Codigo', 'Categoria', 'Cantidad', 'Estado', 'Ubicacion']
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', codigoInventario: '', categoria: '', cantidad: 1, estado: 'DISPONIBLE', ubicacion: '' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await inventarioApi.create({ ...form, cantidad: Number(form.cantidad) || 1 })
      setShowForm(false)
      setForm({ nombre: '', codigoInventario: '', categoria: '', cantidad: 1, estado: 'DISPONIBLE', ubicacion: '' })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este bien de inventario?')) return
    try {
      await inventarioApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Inventario"
        subtitle={`administrative-logistics-service — ${isAdmin ? 'CRUD completo (Administrador)' : 'solo lectura para Docente Investigador'}`}
        action={isAdmin && (
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo bien
          </PrimaryButton>
        )}
      />

      <ErrorBanner message={error} />

      <Table headers={columnHeaders}>
        {loading && <LoadingRow colSpan={columnHeaders.length} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={columnHeaders.length} />}
        {!loading && data.map((b) => (
          <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-gray-400" /> {b.nombre}
            </td>
            <td className="px-3 py-2 text-gray-600">{b.codigoInventario || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.categoria || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.cantidad}</td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold">{b.estado}</span>
            </td>
            <td className="px-3 py-2 text-gray-600">{b.ubicacion || '—'}</td>
            {isAdmin && (
              <td className="px-3 py-2 text-right">
                <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title="Nuevo bien de inventario" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Nombre">
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Codigo">
                <input className="input" value={form.codigoInventario} onChange={(e) => setForm({ ...form, codigoInventario: e.target.value })} />
              </Field>
              <Field label="Cantidad">
                <input type="number" className="input" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
              </Field>
            </div>
            <Field label="Categoria">
              <input className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estado">
                <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Ubicacion">
                <input className="input" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
              </Field>
            </div>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : 'Registrar bien'}
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
