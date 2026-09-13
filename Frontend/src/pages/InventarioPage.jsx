import { useCallback, useMemo, useState } from 'react'
import { Plus, Trash2, Package, HandHelping, Undo2 } from 'lucide-react'
import { inventarioApi, prestamosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const ESTADOS = ['DISPONIBLE', 'EN_USO', 'MANTENIMIENTO', 'DE_BAJA']
const ESTADOS_EDITABLES = ['DISPONIBLE', 'MANTENIMIENTO', 'DE_BAJA']

const ESTADO_LABEL = {
  DISPONIBLE: 'Disponible',
  EN_USO: 'Prestamo',
  MANTENIMIENTO: 'Mantenimiento',
  DE_BAJA: 'De baja',
}

const ESTADO_BADGE = {
  DISPONIBLE: 'bg-green-50 text-green-700',
  EN_USO: 'bg-amber-50 text-amber-700',
  MANTENIMIENTO: 'bg-slate-100 text-slate-600',
  DE_BAJA: 'bg-red-50 text-red-700',
}

export default function InventarioPage() {
  const { isAdmin } = useAuth()
  const bienesFetcher = useCallback(() => inventarioApi.list(), [])
  const { data: bienes, loading, error, reload, setError } = useList(bienesFetcher)
  const prestamosFetcher = useCallback(() => prestamosApi.list(), [])
  const { data: prestamos, loading: loadingPrestamos, reload: reloadPrestamos } = useList(prestamosFetcher)

  const columnHeaders = isAdmin
    ? ['Nombre (equipo)', 'Codigo IC', 'Codigo interno', 'Categoria', 'Cantidad', 'Estado', 'Ubicacion', 'Acciones']
    : ['Nombre (equipo)', 'Codigo IC', 'Codigo interno', 'Categoria', 'Cantidad', 'Estado', 'Ubicacion', '']

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', codigoIC: '', codigoInventario: '', categoria: '', cantidad: 1, estado: 'DISPONIBLE', ubicacion: '' })
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const nombrePorBienId = useMemo(() => new Map(bienes.map((b) => [b.id, b.nombre])), [bienes])

  const reloadTodo = () => {
    reload()
    reloadPrestamos()
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await inventarioApi.create({ ...form, cantidad: Number(form.cantidad) || 1 })
      setShowForm(false)
      setForm({ nombre: '', codigoIC: '', codigoInventario: '', categoria: '', cantidad: 1, estado: 'DISPONIBLE', ubicacion: '' })
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

  const handleEstadoChange = async (bien, estado) => {
    if (estado === bien.estado) return
    setBusyId(bien.id)
    setError(null)
    try {
      await inventarioApi.setEstado(bien.id, estado)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleSolicitar = async (bien) => {
    setBusyId(bien.id)
    setError(null)
    try {
      await prestamosApi.solicitar({ bienId: bien.id })
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleDevolver = async (prestamo) => {
    setBusyId(`p-${prestamo.id}`)
    setError(null)
    try {
      await prestamosApi.devolver(prestamo.id)
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Inventario"
        action={isAdmin && (
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo bien
          </PrimaryButton>
        )}
      />

      <ErrorBanner message={error} />

      <Table headers={columnHeaders}>
        {loading && <LoadingRow colSpan={columnHeaders.length} />}
        {!loading && bienes.length === 0 && <EmptyRow colSpan={columnHeaders.length} />}
        {!loading && bienes.map((b) => (
          <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-gray-400" /> {b.nombre}
            </td>
            <td className="px-3 py-2 text-gray-600">{b.codigoIC || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.codigoInventario || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.categoria || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.cantidad}</td>
            <td className="px-3 py-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[b.estado]}`}>
                {ESTADO_LABEL[b.estado] || b.estado}
              </span>
            </td>
            <td className="px-3 py-2 text-gray-600">{b.ubicacion || '—'}</td>
            {isAdmin ? (
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <select
                    className="input py-1 text-xs"
                    value={b.estado}
                    disabled={busyId === b.id || b.estado === 'EN_USO'}
                    title={b.estado === 'EN_USO' ? 'Registre la devolucion del prestamo antes de cambiar el estado' : undefined}
                    onChange={(e) => handleEstadoChange(b, e.target.value)}
                  >
                    {(b.estado === 'EN_USO' ? ESTADOS : ESTADOS_EDITABLES).map((s) => (
                      <option key={s} value={s} disabled={s === 'EN_USO'}>{ESTADO_LABEL[s]}</option>
                    ))}
                  </select>
                  <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            ) : (
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => handleSolicitar(b)}
                  disabled={b.estado !== 'DISPONIBLE' || busyId === b.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#052a18] disabled:text-gray-300 disabled:cursor-not-allowed hover:text-[#0e6b3c]"
                  title={b.estado !== 'DISPONIBLE' ? 'Este equipo no esta disponible' : 'Solicitar en prestamo'}
                >
                  <HandHelping className="w-3.5 h-3.5" /> {busyId === b.id ? 'Solicitando...' : 'Solicitar'}
                </button>
              </td>
            )}
          </tr>
        ))}
      </Table>

      <div className="mt-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2">
          {isAdmin ? 'Prestamos' : 'Mis prestamos'}
        </h2>
        <Table headers={isAdmin ? ['Bien', 'Usuario', 'Solicitado', 'Estado', 'Devuelto', ''] : ['Bien', 'Solicitado', 'Estado', 'Devuelto', '']}>
          {loadingPrestamos && <LoadingRow colSpan={isAdmin ? 6 : 5} />}
          {!loadingPrestamos && prestamos.length === 0 && <EmptyRow colSpan={isAdmin ? 6 : 5} />}
          {!loadingPrestamos && prestamos.map((p) => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{nombrePorBienId.get(p.bienId) || `#${p.bienId}`}</td>
              {isAdmin && <td className="px-3 py-2 text-gray-600">#{p.usuarioId}</td>}
              <td className="px-3 py-2 text-gray-600">{p.fechaSolicitud ? new Date(p.fechaSolicitud).toLocaleString() : '—'}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.estado === 'ACTIVO' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  {p.estado === 'ACTIVO' ? 'Activo' : 'Devuelto'}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600">{p.fechaDevolucion ? new Date(p.fechaDevolucion).toLocaleString() : '—'}</td>
              <td className="px-3 py-2 text-right">
                {p.estado === 'ACTIVO' && (
                  <button
                    onClick={() => handleDevolver(p)}
                    disabled={busyId === `p-${p.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#052a18] hover:text-[#0e6b3c] disabled:text-gray-300"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Devolver
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {showForm && (
        <Modal title="Nuevo bien de inventario" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Nombre (equipo)">
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Codigo IC">
                <input className="input" value={form.codigoIC} onChange={(e) => setForm({ ...form, codigoIC: e.target.value })} />
              </Field>
              <Field label="Codigo interno">
                <input className="input" value={form.codigoInventario} onChange={(e) => setForm({ ...form, codigoInventario: e.target.value })} />
              </Field>
            </div>
            <Field label="Cantidad">
              <input type="number" className="input" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
            </Field>
            <Field label="Categoria">
              <input className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estado">
                <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map((s) => <option key={s} value={s} disabled={s === 'EN_USO'}>{ESTADO_LABEL[s]}</option>)}
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
