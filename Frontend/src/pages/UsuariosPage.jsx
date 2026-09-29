import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Power, Wand2 } from 'lucide-react'
import { usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

const ROLES = ['ADMINISTRADOR', 'DOCENTE_INVESTIGADOR', 'ADMIN_INFRAESTRUCTURA', 'RESPONSABLE_COMPRAS']
const FORM_INICIAL = { nombres: '', apellidos: '', email: '', password: '', cedula: '', rol: 'DOCENTE_INVESTIGADOR' }

/** Contraseña temporal aleatoria: la persona la cambia en su primer ingreso. */
function generarPasswordPredeterminada() {
  const caracteres = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let clave = ''
  for (let i = 0; i < 10; i++) {
    clave += caracteres[Math.floor(Math.random() * caracteres.length)]
  }
  return clave
}

export default function UsuariosPage() {
  const fetcher = useCallback(() => usuariosApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [saving, setSaving] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)

  const handleGenerarPassword = () => {
    setForm((f) => ({ ...f, password: generarPasswordPredeterminada() }))
    setMostrarPassword(true)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(FORM_INICIAL)
    setMostrarPassword(false)
    setShowForm(true)
  }

  const openEdit = (u) => {
    setEditingId(u.id)
    setForm({ nombres: u.nombres, apellidos: u.apellidos, email: u.email, password: '', cedula: u.cedula || '', rol: u.rol })
    setMostrarPassword(false)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await usuariosApi.update(editingId, form)
      } else {
        await usuariosApi.create(form)
      }
      setShowForm(false)
      setForm(FORM_INICIAL)
      setEditingId(null)
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
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Gestión de Usuarios"
        action={
          <PrimaryButton onClick={openCreate}>
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
              <button onClick={() => openEdit(u)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => toggleEstado(u)} className="text-gray-500 hover:text-[#052a18]" title="Activar/Desactivar">
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
        <Modal title={editingId ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
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
            <Field label={editingId ? 'Contraseña (dejar en blanco para no cambiarla)' : 'Contraseña temporal'}>
              <div className="flex items-center gap-2">
                <input
                  required={!editingId}
                  type={mostrarPassword ? 'text' : 'password'}
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                {!editingId && (
                  <button
                    type="button"
                    onClick={handleGenerarPassword}
                    title="Generar contraseña predeterminada"
                    className="flex-shrink-0 flex items-center gap-1 border border-gray-300 hover:border-[#0e6b3c] hover:text-[#0e6b3c] text-gray-500 text-xs font-semibold px-3 py-2 rounded"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Generar
                  </button>
                )}
              </div>
              {!editingId && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Cópiala y compártela con la persona: en su primer ingreso se le pedirá crear su propia contraseña.
                </p>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID">
                <input className="input" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
              </Field>
              <Field label="Rol">
                <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear usuario'}
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
