import { useCallback, useState } from 'react'
import { Plus, Trash2, FolderOpen } from 'lucide-react'
import { proyectosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

const ESTADOS = ['PLANIFICACION', 'EN_EJECUCION', 'FINALIZADO', 'CANCELADO']

export default function ProyectosPage() {
  const fetcher = useCallback(() => proyectosApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', descripcion: '', estado: 'PLANIFICACION', presupuesto: '', avancePorcentaje: 0 })
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await proyectosApi.create({
        ...form,
        presupuesto: form.presupuesto ? Number(form.presupuesto) : null,
        avancePorcentaje: Number(form.avancePorcentaje) || 0,
      })
      setShowForm(false)
      setForm({ nombre: '', descripcion: '', estado: 'PLANIFICACION', presupuesto: '', avancePorcentaje: 0 })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este proyecto?')) return
    try {
      await proyectosApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Portafolio de Proyectos"
        subtitle="core-academic-research-service — visibilidad segun rol: Administrador ve todos, Docente Investigador solo los propios."
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo proyecto
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Nombre', 'Estado', 'Avance', 'Presupuesto', 'Responsable', '']}>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={6} />}
        {!loading && data.map((p) => (
          <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-gray-400" /> {p.nombre}
            </td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                {p.estado}
              </span>
            </td>
            <td className="px-3 py-2 text-gray-600">{p.avancePorcentaje ?? 0}%</td>
            <td className="px-3 py-2 text-gray-600">{p.presupuesto ?? '—'}</td>
            <td className="px-3 py-2 text-gray-600">#{p.usuarioResponsableId}</td>
            <td className="px-3 py-2 text-right">
              <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title="Nuevo proyecto" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Nombre">
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Field>
            <Field label="Descripcion">
              <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <Field label="Estado">
              <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Presupuesto (USD)">
                <input type="number" className="input" value={form.presupuesto} onChange={(e) => setForm({ ...form, presupuesto: e.target.value })} />
              </Field>
              <Field label="Avance (%)">
                <input type="number" min="0" max="100" className="input" value={form.avancePorcentaje} onChange={(e) => setForm({ ...form, avancePorcentaje: e.target.value })} />
              </Field>
            </div>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : 'Crear proyecto'}
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
