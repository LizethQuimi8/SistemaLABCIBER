import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Power, Wand2, ShieldAlert, UserCheck, UserX } from 'lucide-react'
import { usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { nombreRol } from '../constants/roles'

const ROLES = [
  'ADMINISTRADOR',
  'DOCENTE_INVESTIGADOR',
  'INVESTIGADOR_COLABORADOR',
  'ESTUDIANTE',
  'ADMIN_INFRAESTRUCTURA',
  'RESPONSABLE_COMPRAS',
]
const FORM_INICIAL = { nombres: '', apellidos: '', email: '', password: '', cedula: '', rol: 'DOCENTE_INVESTIGADOR' }

// Un color por rol, reutilizado en el avatar y el distintivo de rol de cada fila.
const ROL_COLOR = {
  ADMINISTRADOR: { badge: 'bg-emerald-100 text-emerald-700', avatar: 'bg-emerald-500' },
  ADMIN_INFRAESTRUCTURA: { badge: 'bg-sky-100 text-sky-700', avatar: 'bg-sky-500' },
  DOCENTE_INVESTIGADOR: { badge: 'bg-purple-100 text-purple-700', avatar: 'bg-purple-500' },
  INVESTIGADOR_COLABORADOR: { badge: 'bg-indigo-100 text-indigo-700', avatar: 'bg-indigo-500' },
  ESTUDIANTE: { badge: 'bg-amber-100 text-amber-700', avatar: 'bg-amber-500' },
  RESPONSABLE_COMPRAS: { badge: 'bg-rose-100 text-rose-700', avatar: 'bg-rose-500' },
}
const rolColor = (rol) => ROL_COLOR[rol] || { badge: 'bg-slate-100 text-slate-700', avatar: 'bg-slate-500' }
const iniciales = (nombres, apellidos) => `${(nombres || '?')[0]}${(apellidos || '')[0] || ''}`.toUpperCase()

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
  const [forzandoTodos, setForzandoTodos] = useState(false)
  const [avisoExito, setAvisoExito] = useState(null)

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

  const handleForzarPrimerIngresoATodos = async () => {
    const confirmado = confirm(
      '¿Forzar a TODOS los usuarios a pasar de nuevo por "Primer ingreso"?\n\n' +
      'Nadie pierde su contraseña actual: van a poder iniciar sesión normalmente, ' +
      'pero antes de ver el sistema tendrán que aceptar las políticas del laboratorio ' +
      'y definir una contraseña propia nueva.'
    )
    if (!confirmado) return
    setForzandoTodos(true)
    setError(null)
    setAvisoExito(null)
    try {
      await usuariosApi.forzarPrimerIngresoATodos()
      setAvisoExito('Listo: todos los usuarios deberán aceptar las políticas y definir una nueva contraseña en su próximo ingreso.')
    } catch (err) {
      setError(err.message)
    } finally {
      setForzandoTodos(false)
    }
  }

  const activos = useMemo(() => data.filter((u) => u.activo).length, [data])
  const inactivos = data.length - activos

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Gestión de Usuarios"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleForzarPrimerIngresoATodos}
              disabled={forzandoTodos}
              title="Obliga a todos a aceptar las políticas y definir una contraseña nueva en su próximo ingreso"
              className="flex items-center gap-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="w-4 h-4" /> {forzandoTodos ? 'Aplicando...' : 'Forzar cambio de contraseña a todos'}
            </button>
            <PrimaryButton onClick={openCreate}>
              <Plus className="w-4 h-4" /> Nuevo usuario
            </PrimaryButton>
          </div>
        }
      />

      <ErrorBanner message={error} />
      {avisoExito && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg px-4 py-2 mb-4">
          {avisoExito}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatCard icon={Users} label="Usuarios" value={data.length} color="from-[#0e6b3c] to-[#052a18]" />
        <StatCard icon={UserCheck} label="Activos" value={activos} color="from-emerald-500 to-emerald-700" />
        <StatCard icon={UserX} label="Inactivos" value={inactivos} color="from-slate-400 to-slate-600" />
      </div>

      <Table headers={['Usuario', 'Rol', 'Estado', '']}>
          {loading && <LoadingRow colSpan={4} />}
          {!loading && data.length === 0 && <EmptyRow colSpan={4} />}
          {!loading && data.map((u) => {
            const colores = rolColor(u.rol)
            return (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className={`${colores.avatar} text-white w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0`}>
                      {iniciales(u.nombres, u.apellidos)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{u.nombres} {u.apellidos}</p>
                      <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${colores.badge}`}>{nombreRol(u.rol)}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${u.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-[#052a18]" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleEstado(u)} className="text-gray-400 hover:text-[#052a18]" title="Activar/Desactivar">
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
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
                  {ROLES.map((r) => <option key={r} value={r}>{nombreRol(r)}</option>)}
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

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`bg-gradient-to-br ${color} text-white p-2.5 rounded-lg flex-shrink-0 shadow`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-[#052a18] leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1.5 truncate">{label}</p>
      </div>
    </div>
  )
}
