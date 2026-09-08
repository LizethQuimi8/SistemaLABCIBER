import { useCallback, useState } from 'react'
import { Plus, Trash2, Users, Power } from 'lucide-react'
import { usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

const ROLES = ['ADMINISTRADOR', 'DOCENTE_INVESTIGADOR']

export default function UsuariosPage() {
  const fetcher = useCallback(() => usuariosApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombres: '', apellidos: '', email: '', password: '', cedula: '', rol: 'DOCENTE_INVESTIGADOR' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await usuariosApi.create(form)
      setShowForm(false)
      setForm({ nombres: '', apellidos: '', email: '', password: '', cedula: '', rol: 'DOCENTE_INVESTIGADOR' })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleEstado = async (u) => {
    try {
      await usuariosApi.setEstado(u.id, !u.activo)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try {
      await usuariosApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Gestión de Usuarios"
        subtitle="core-security-users-service — modulo exclusivo del Administrador."
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo usuario
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Nombre', 'Email', 'Rol', 'Estado', '']}>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && data.map((u) => (
          <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-gray-400" /> {u.nombres} {u.apellidos}
            </td>
            <td className="px-3 py-2 text-gray-600">{u.email}</td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">{u.rol}</span>
            </td>
            <td className="px-3 py-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {u.activo ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td className="px-3 py-2 text-right flex items-center justify-end gap-2">
              <button onClick={() => toggleEstado(u)} className="text-gray-500 hover:text-[#0f172a]" title="Activar/Desactivar">
                <Power className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title="Nuevo usuario" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombres">
                <input required className="input" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
              </Field>
              <Field label="Apellidos">
                <input required className="input" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
              </Field>
            </div>
            <Field label="Correo institucional">
              <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Contraseña">
              <input required type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cedula">
                <input className="input" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
              </Field>
              <Field label="Rol">
                <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : 'Crear usuario'}
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
