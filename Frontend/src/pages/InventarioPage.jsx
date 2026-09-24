import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Trash2, Package, HandHelping, Undo2, Upload, Eye, Search, X,
  Monitor, Cpu, Keyboard, Mouse, Printer, Armchair, Router, Camera,
  Projector, HardDrive, Server, Laptop, Headphones, Boxes, CheckCircle2, Wrench, Ban,
} from 'lucide-react'
import { inventarioApi, prestamosApi, usuariosApi } from '../api/services'
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

const PRESTAMO_ESTADO_LABEL = {
  PENDIENTE: 'Pendiente',
  APROBADO_INFRAESTRUCTURA: 'Esperando confirmación',
  ACTIVO: 'Activo',
  DEVUELTO: 'Devuelto',
  RECHAZADO: 'Rechazado',
}

const PRESTAMO_ESTADO_BADGE = {
  PENDIENTE: 'bg-amber-50 text-amber-700',
  APROBADO_INFRAESTRUCTURA: 'bg-sky-50 text-sky-700',
  ACTIVO: 'bg-blue-50 text-blue-700',
  DEVUELTO: 'bg-green-50 text-green-700',
  RECHAZADO: 'bg-red-50 text-red-700',
}

const SOLICITUD_INICIAL = { fechaDesde: '', fechaHasta: '', motivo: '', observaciones: '' }

const PAGE_SIZE = 12

// Normaliza el nombre del equipo a una categoria legible (p. ej. "monitor dell " -> "Monitor").
function categoriaDe(bien) {
  const base = (bien.categoria || bien.nombre || '').trim()
  if (!base) return 'Otros'
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase()
}

const ICONOS_CATEGORIA = [
  [/monitor|pantalla/i, Monitor],
  [/cpu|computad|desktop|torre/i, Cpu],
  [/laptop|portatil|notebook/i, Laptop],
  [/teclado/i, Keyboard],
  [/mouse|raton/i, Mouse],
  [/impresora/i, Printer],
  [/silla|escritorio|mueble/i, Armchair],
  [/router|switch|access point|red/i, Router],
  [/camara/i, Camera],
  [/proyector/i, Projector],
  [/disco|almacenamiento/i, HardDrive],
  [/servidor/i, Server],
  [/audifono|diadema|parlante/i, Headphones],
]

function iconoPara(nombre) {
  const match = ICONOS_CATEGORIA.find(([regex]) => regex.test(nombre || ''))
  return match ? match[1] : Package
}

export default function InventarioPage() {
  const { isAdmin, canEditInventario } = useAuth()
  const bienesFetcher = useCallback(() => inventarioApi.list(), [])
  const { data: bienes, loading, error, reload, setError } = useList(bienesFetcher)
  const prestamosFetcher = useCallback(() => prestamosApi.list(), [])
  const { data: prestamos, loading: loadingPrestamos, reload: reloadPrestamos } = useList(prestamosFetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)

  const columnHeaders = canEditInventario
    ? ['Nombre (equipo)', 'Codigo IC', 'Codigo interno', 'Marca', 'Custodio', 'Estado', '', 'Acciones']
    : ['Nombre (equipo)', 'Codigo IC', 'Codigo interno', 'Marca', 'Custodio', 'Estado', '', '']

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', codigoIC: '', codigoInventario: '', categoria: '', cantidad: 1, estado: 'DISPONIBLE', ubicacion: '' })
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const importInputRef = useRef(null)
  const [solicitudBien, setSolicitudBien] = useState(null)
  const [solicitudForm, setSolicitudForm] = useState(SOLICITUD_INICIAL)
  const [solicitando, setSolicitando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODOS')
  const [estadoFiltro, setEstadoFiltro] = useState('TODOS')
  const [pagina, setPagina] = useState(1)

  const nombrePorBienId = useMemo(() => new Map(bienes.map((b) => [b.id, b.nombre])), [bienes])
  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )

  // PENDIENTE: puede aprobar/rechazar Admin. Infraestructura o el Administrador.
  // APROBADO_INFRAESTRUCTURA: solo el Administrador da la confirmacion final (o la rechaza).
  const puedeAprobarORechazar = (p) =>
    (canEditInventario && p.estado === 'PENDIENTE') || (isAdmin && p.estado === 'APROBADO_INFRAESTRUCTURA')

  const categorias = useMemo(() => {
    const conteo = new Map()
    bienes.forEach((b) => {
      const cat = categoriaDe(b)
      conteo.set(cat, (conteo.get(cat) || 0) + 1)
    })
    return [...conteo.entries()].sort((a, b) => b[1] - a[1])
  }, [bienes])

  const stats = useMemo(() => ({
    total: bienes.length,
    disponible: bienes.filter((b) => b.estado === 'DISPONIBLE').length,
    prestamo: bienes.filter((b) => b.estado === 'EN_USO').length,
    mantenimiento: bienes.filter((b) => b.estado === 'MANTENIMIENTO').length,
    deBaja: bienes.filter((b) => b.estado === 'DE_BAJA').length,
  }), [bienes])

  const bienesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return bienes.filter((b) => {
      if (categoriaFiltro !== 'TODOS' && categoriaDe(b) !== categoriaFiltro) return false
      if (estadoFiltro !== 'TODOS' && b.estado !== estadoFiltro) return false
      if (!termino) return true
      return [b.nombre, b.marca, b.custodio, b.codigoIC, b.codigoInventario, b.numeroSerie]
        .some((campo) => (campo || '').toLowerCase().includes(termino))
    })
  }, [bienes, categoriaFiltro, estadoFiltro, busqueda])

  useEffect(() => { setPagina(1) }, [categoriaFiltro, estadoFiltro, busqueda])

  const totalPaginas = Math.max(1, Math.ceil(bienesFiltrados.length / PAGE_SIZE))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const bienesPagina = bienesFiltrados.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE)

  const limpiarFiltros = () => {
    setBusqueda('')
    setCategoriaFiltro('TODOS')
    setEstadoFiltro('TODOS')
  }

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

  const abrirSolicitud = (bien) => {
    setSolicitudBien(bien)
    setSolicitudForm(SOLICITUD_INICIAL)
  }

  const handleSolicitarSubmit = async (e) => {
    e.preventDefault()
    setSolicitando(true)
    setError(null)
    try {
      await prestamosApi.solicitar({ bienId: solicitudBien.id, ...solicitudForm })
      setSolicitudBien(null)
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setSolicitando(false)
    }
  }

  const handleAprobar = async (prestamo) => {
    setBusyId(`p-${prestamo.id}`)
    setError(null)
    try {
      await prestamosApi.aprobar(prestamo.id)
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleRechazar = async (prestamo) => {
    if (!confirm('¿Rechazar esta solicitud de préstamo?')) return
    setBusyId(`p-${prestamo.id}`)
    setError(null)
    try {
      await prestamosApi.rechazar(prestamo.id)
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleImportarClick = () => importInputRef.current?.click()

  const handleImportarFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setError(null)
    setImportResult(null)
    try {
      const resultado = await inventarioApi.importar(file)
      setImportResult(resultado)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
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
        action={canEditInventario && (
          <div className="flex items-center gap-2">
            <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportarFile} />
            <button
              onClick={handleImportarClick}
              disabled={importing}
              className="flex items-center gap-2 bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] disabled:opacity-50 text-xs font-semibold px-4 py-2 rounded transition-colors"
            >
              <Upload className="w-4 h-4" /> {importing ? 'Importando...' : 'Importar matriz Excel'}
            </button>
            <PrimaryButton onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Nuevo bien
            </PrimaryButton>
          </div>
        )}
      />

      <ErrorBanner message={error} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard icon={Boxes} label="Total" value={stats.total} color="bg-[#0e6b3c]" />
        <StatCard icon={CheckCircle2} label="Disponibles" value={stats.disponible} color="bg-green-600" />
        <StatCard icon={HandHelping} label="En préstamo" value={stats.prestamo} color="bg-amber-500" />
        <StatCard icon={Wrench} label="Mantenimiento" value={stats.mantenimiento} color="bg-slate-500" />
        <StatCard icon={Ban} label="De baja" value={stats.deBaja} color="bg-red-500" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, marca, custodio o código..."
            className="input pl-9 pr-8 w-full"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-2">
          <FiltroChip active={categoriaFiltro === 'TODOS'} onClick={() => setCategoriaFiltro('TODOS')}>
            Todos ({bienes.length})
          </FiltroChip>
          {categorias.map(([cat, count]) => {
            const Icono = iconoPara(cat)
            return (
              <FiltroChip key={cat} active={categoriaFiltro === cat} onClick={() => setCategoriaFiltro(cat)}>
                <Icono className="w-3.5 h-3.5" /> {cat} ({count})
              </FiltroChip>
            )
          })}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <FiltroChip small active={estadoFiltro === 'TODOS'} onClick={() => setEstadoFiltro('TODOS')}>Cualquier estado</FiltroChip>
          {ESTADOS.map((s) => (
            <FiltroChip key={s} small active={estadoFiltro === s} onClick={() => setEstadoFiltro(s)}>
              {ESTADO_LABEL[s]}
            </FiltroChip>
          ))}
          {(busqueda || categoriaFiltro !== 'TODOS' || estadoFiltro !== 'TODOS') && (
            <button onClick={limpiarFiltros} className="text-xs text-gray-400 hover:text-red-600 ml-1 flex-shrink-0">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {importResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-xs">
          <div className="flex items-start justify-between gap-4">
            <p className="text-gray-700">
              Importación completa: <strong>{importResult.creados}</strong> bienes creados, <strong>{importResult.actualizados}</strong> actualizados.
            </p>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {importResult.estadosNoReconocidos?.length > 0 && (
            <p className="text-amber-700 mt-2">
              Estados no reconocidos (se dejaron como Disponible, revisar manualmente): {importResult.estadosNoReconocidos.join(', ')}
            </p>
          )}
          {importResult.errores?.length > 0 && (
            <ul className="text-red-700 mt-2 list-disc list-inside">
              {importResult.errores.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <Table headers={columnHeaders}>
        {loading && <LoadingRow colSpan={columnHeaders.length} />}
        {!loading && bienesFiltrados.length === 0 && (
          <EmptyRow colSpan={columnHeaders.length} message={bienes.length === 0 ? 'Sin registros todavia' : 'Ningún bien coincide con los filtros aplicados'} />
        )}
        {!loading && bienesPagina.map((b) => {
          const Icono = iconoPara(categoriaDe(b))
          return (
          <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 even:bg-gray-50/40">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <span className="bg-[#f3faf6] text-[#0e6b3c] p-1.5 rounded flex-shrink-0">
                <Icono className="w-3.5 h-3.5" />
              </span>
              {b.nombre}
            </td>
            <td className="px-3 py-2 text-gray-600">{b.codigoIC || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.codigoInventario || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.marca || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.custodio || '—'}</td>
            <td className="px-3 py-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[b.estado]}`}>
                {ESTADO_LABEL[b.estado] || b.estado}
              </span>
            </td>
            <td className="px-3 py-2">
              <button onClick={() => setDetalle(b)} className="text-gray-400 hover:text-[#0e6b3c]" title="Ver detalle">
                <Eye className="w-3.5 h-3.5" />
              </button>
            </td>
            {canEditInventario ? (
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
                  onClick={() => abrirSolicitud(b)}
                  disabled={b.estado !== 'DISPONIBLE'}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#052a18] disabled:text-gray-300 disabled:cursor-not-allowed hover:text-[#0e6b3c]"
                  title={b.estado !== 'DISPONIBLE' ? 'Este equipo no esta disponible' : 'Solicitar en prestamo'}
                >
                  <HandHelping className="w-3.5 h-3.5" /> Solicitar
                </button>
              </td>
            )}
          </tr>
          )
        })}
      </Table>

      {!loading && bienesFiltrados.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>
            Mostrando {(paginaSegura - 1) * PAGE_SIZE + 1}–{Math.min(paginaSegura * PAGE_SIZE, bienesFiltrados.length)} de {bienesFiltrados.length}
          </span>
          {totalPaginas > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaSegura === 1}
                className="px-2.5 py-1 rounded border border-gray-300 bg-white disabled:opacity-40 hover:border-[#0e6b3c]"
              >
                ‹
              </button>
              <span className="px-2 font-semibold text-gray-700">{paginaSegura} / {totalPaginas}</span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaSegura === totalPaginas}
                className="px-2.5 py-1 rounded border border-gray-300 bg-white disabled:opacity-40 hover:border-[#0e6b3c]"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2">
          {canEditInventario ? 'Prestamos' : 'Mis prestamos'}
        </h2>
        <Table headers={canEditInventario
          ? ['Bien', 'Usuario', 'Periodo', 'Motivo', 'Estado', 'Devuelto', '']
          : ['Bien', 'Periodo', 'Motivo', 'Estado', 'Devuelto', '']}>
          {loadingPrestamos && <LoadingRow colSpan={canEditInventario ? 7 : 6} />}
          {!loadingPrestamos && prestamos.length === 0 && <EmptyRow colSpan={canEditInventario ? 7 : 6} />}
          {!loadingPrestamos && prestamos.map((p) => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{nombrePorBienId.get(p.bienId) || `#${p.bienId}`}</td>
              {canEditInventario && (
                <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(p.usuarioId) || `#${p.usuarioId}`}</td>
              )}
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.fechaDesde || '—'} a {p.fechaHasta || '—'}</td>
              <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={p.motivo}>{p.motivo || '—'}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRESTAMO_ESTADO_BADGE[p.estado] || 'bg-gray-100 text-gray-600'}`}>
                  {PRESTAMO_ESTADO_LABEL[p.estado] || p.estado}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600">{p.fechaDevolucion ? new Date(p.fechaDevolucion).toLocaleString() : '—'}</td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  {puedeAprobarORechazar(p) && (
                    <button
                      onClick={() => handleAprobar(p)}
                      disabled={busyId === `p-${p.id}`}
                      className="text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                      title={p.estado === 'APROBADO_INFRAESTRUCTURA' ? 'Confirmar y activar el prestamo' : 'Aprobar (pasa a espera de confirmacion del administrador)'}
                    >
                      {p.estado === 'APROBADO_INFRAESTRUCTURA' ? 'Confirmar' : 'Aprobar'}
                    </button>
                  )}
                  {puedeAprobarORechazar(p) && (
                    <button
                      onClick={() => handleRechazar(p)}
                      disabled={busyId === `p-${p.id}`}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:text-gray-300"
                    >
                      Rechazar
                    </button>
                  )}
                  {p.estado === 'ACTIVO' && (
                    <button
                      onClick={() => handleDevolver(p)}
                      disabled={busyId === `p-${p.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#052a18] hover:text-[#0e6b3c] disabled:text-gray-300"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Devolver
                    </button>
                  )}
                </div>
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

      {solicitudBien && (
        <Modal title={`Solicitar prestamo: ${solicitudBien.nombre}`} onClose={() => setSolicitudBien(null)}>
          <form onSubmit={handleSolicitarSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde">
                <input
                  required type="date" className="input"
                  value={solicitudForm.fechaDesde}
                  onChange={(e) => setSolicitudForm({ ...solicitudForm, fechaDesde: e.target.value })}
                />
              </Field>
              <Field label="Hasta">
                <input
                  required type="date" className="input"
                  min={solicitudForm.fechaDesde || undefined}
                  value={solicitudForm.fechaHasta}
                  onChange={(e) => setSolicitudForm({ ...solicitudForm, fechaHasta: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Motivo (para que lo necesita)">
              <textarea
                required rows={2} className="input"
                value={solicitudForm.motivo}
                onChange={(e) => setSolicitudForm({ ...solicitudForm, motivo: e.target.value })}
              />
            </Field>
            <Field label="Observaciones (opcional)">
              <textarea
                rows={2} className="input"
                value={solicitudForm.observaciones}
                onChange={(e) => setSolicitudForm({ ...solicitudForm, observaciones: e.target.value })}
              />
            </Field>
            <PrimaryButton type="submit" disabled={solicitando} className="w-full justify-center">
              {solicitando ? 'Enviando...' : 'Enviar solicitud'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {detalle && (
        <Modal title={detalle.nombre} onClose={() => setDetalle(null)}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <DetalleCampo label="Codigo IC" valor={detalle.codigoIC} />
              <DetalleCampo label="Codigo interno" valor={detalle.codigoInventario} />
              <DetalleCampo label="Marca" valor={detalle.marca} />
              <DetalleCampo label="Numero de serie" valor={detalle.numeroSerie} />
              <DetalleCampo label="Categoria" valor={detalle.categoria} />
              <DetalleCampo label="Cantidad" valor={detalle.cantidad} />
              <DetalleCampo label="Ubicacion" valor={detalle.ubicacion} />
              <DetalleCampo label="Custodio" valor={detalle.custodio} />
            </div>
            <DetalleCampo label="Descripcion" valor={detalle.descripcion} bloque />
            <DetalleCampo label="Detalles tecnicos" valor={detalle.detallesTecnicos} bloque />
            <DetalleCampo label="Observaciones" valor={detalle.observaciones} bloque />
          </div>
        </Modal>
      )}
    </main>
  )
}

function DetalleCampo({ label, valor, bloque }) {
  return (
    <div className={bloque ? 'block' : ''}>
      <span className="block text-xs font-semibold text-gray-500 mb-0.5">{label}</span>
      <span className="text-gray-800">{valor || '—'}</span>
    </div>
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
    <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
      <div className={`${color} text-white p-2 rounded-lg flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black text-[#052a18] leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1 truncate">{label}</p>
      </div>
    </div>
  )
}

function FiltroChip({ active, onClick, children, small }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 flex-shrink-0 rounded-full border font-semibold whitespace-nowrap transition-colors
        ${small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}
        ${active ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
    >
      {children}
    </button>
  )
}
