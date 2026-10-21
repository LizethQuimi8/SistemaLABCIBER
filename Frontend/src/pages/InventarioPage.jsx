import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Trash2, Package, HandHelping, Undo2, Upload, Eye, Search, X, Pencil,
  Monitor, Cpu, Keyboard, Mouse, Printer, Armchair, Router, Camera,
  Projector, HardDrive, Server, Laptop, Headphones, Boxes, CheckCircle2, Wrench, Ban,
  FileSignature, FileCheck2, FileX2, FileDown,
} from 'lucide-react'
import { inventarioApi, prestamosApi, usuariosApi, proyectosApi, mantenimientosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { estiloEncabezadoReporte, htmlEncabezadoReporte, htmlFirmasReporte } from '../utils/reportePlantilla'

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
  APROBADO_INFRAESTRUCTURA: 'Esperando autorización',
  AUTORIZADO: 'Autorizado, por entregar',
  ACTIVO: 'Activo',
  DEVOLUCION_PENDIENTE: 'Acta subida, por validar',
  DEVUELTO: 'Devuelto',
  RECHAZADO: 'Rechazado',
}

const PRESTAMO_ESTADO_BADGE = {
  PENDIENTE: 'bg-amber-50 text-amber-700',
  APROBADO_INFRAESTRUCTURA: 'bg-sky-50 text-sky-700',
  AUTORIZADO: 'bg-purple-50 text-purple-700',
  ACTIVO: 'bg-blue-50 text-blue-700',
  DEVOLUCION_PENDIENTE: 'bg-amber-50 text-amber-700',
  DEVUELTO: 'bg-green-50 text-green-700',
  RECHAZADO: 'bg-red-50 text-red-700',
}

const SOLICITUD_INICIAL = { fechaDesde: '', fechaHasta: '', motivo: '', proyectoId: '', observaciones: '' }

const FORM_INICIAL = {
  nombre: '', codigoIC: '', codigoInventario: '', categoria: '', cantidad: 1, estado: 'DISPONIBLE', ubicacion: '',
  marca: '', descripcion: '', numeroSerie: '', detallesTecnicos: '', custodio: '', observaciones: '',
}

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
  const { isAdmin, isAdminInfraestructura, canEditInventario, usuario } = useAuth()
  const bienesFetcher = useCallback(() => inventarioApi.list(), [])
  const { data: bienes, loading, error, reload, setError } = useList(bienesFetcher)
  const prestamosFetcher = useCallback(() => prestamosApi.list(), [])
  const { data: prestamos, loading: loadingPrestamos, reload: reloadPrestamos } = useList(prestamosFetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const proyectosFetcher = useCallback(() => proyectosApi.list(), [])
  const { data: proyectos } = useList(proyectosFetcher)
  const mantenimientosFetcher = useCallback(() => mantenimientosApi.list(), [])
  const { data: mantenimientos, loading: loadingMantenimientos, reload: reloadMantenimientos } = useList(mantenimientosFetcher)

  // Mismos nombres y orden de columnas que la matriz institucional de inventario.
  const COLUMNAS_MATRIZ = [
    'Nombre del Item', 'Marca', 'Descripción', 'Código de Bien ESPE', 'Número de Serie',
    'Código Laboratorio', 'Detalles técnicos', 'Estado', 'Custodio', 'Observación',
  ]
  const columnHeaders = canEditInventario
    ? [...COLUMNAS_MATRIZ, '', 'Acciones']
    : [...COLUMNAS_MATRIZ, '', '']

  const [showForm, setShowForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [eliminandoTodo, setEliminandoTodo] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const importInputRef = useRef(null)
  const [solicitudBien, setSolicitudBien] = useState(null)
  const [solicitudForm, setSolicitudForm] = useState(SOLICITUD_INICIAL)
  const [solicitando, setSolicitando] = useState(false)
  const [entregaPrestamo, setEntregaPrestamo] = useState(null)
  const [actaEntregaArchivo, setActaEntregaArchivo] = useState(null)
  const [subiendoActaEntrega, setSubiendoActaEntrega] = useState(false)
  const [devolucionPrestamo, setDevolucionPrestamo] = useState(null)
  const [actaArchivo, setActaArchivo] = useState(null)
  const [subiendoActa, setSubiendoActa] = useState(false)
  const [rechazoDevolucion, setRechazoDevolucion] = useState(null)
  const [observacionRechazo, setObservacionRechazo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODOS')
  const [estadoFiltro, setEstadoFiltro] = useState('TODOS')
  const [pagina, setPagina] = useState(1)
  const [showMantenimientoForm, setShowMantenimientoForm] = useState(false)
  const [editandoMantenimientoId, setEditandoMantenimientoId] = useState(null)
  const [mantenimientoForm, setMantenimientoForm] = useState({ bienId: '', tipo: 'PREVENTIVO', fecha: '', descripcion: '' })
  const [mantenimientoArchivo, setMantenimientoArchivo] = useState(null)
  const [savingMantenimiento, setSavingMantenimiento] = useState(false)
  const [viewingMantenimientoId, setViewingMantenimientoId] = useState(null)

  const nombrePorBienId = useMemo(() => new Map(bienes.map((b) => [b.id, b.nombre])), [bienes])
  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )
  const nombrePorProyectoId = useMemo(
    () => new Map(proyectos.map((p) => [p.id, p.nombre])),
    [proyectos]
  )

  // PENDIENTE: puede aprobar/rechazar Admin. Infraestructura o el Administrador.
  // APROBADO_INFRAESTRUCTURA: solo el Administrador da la autorizacion final.
  const puedeAprobar = (p) =>
    (canEditInventario && p.estado === 'PENDIENTE') || (isAdmin && p.estado === 'APROBADO_INFRAESTRUCTURA')

  // AUTORIZADO tambien se puede rechazar (p. ej. si el bien deja de estar disponible), solo el Administrador.
  const puedeRechazarSolicitud = (p) =>
    (canEditInventario && p.estado === 'PENDIENTE') ||
    (isAdmin && (p.estado === 'APROBADO_INFRAESTRUCTURA' || p.estado === 'AUTORIZADO'))

  // Custodio del Bien (Admin. Infraestructura) o el Administrador registran la
  // entrega formal (Acta de Entrega, Formulario F-02) una vez autorizado.
  const puedeEntregar = (p) => canEditInventario && p.estado === 'AUTORIZADO'

  // La devolucion exige AMBAS firmas (Admin. Infraestructura y Administrador),
  // sin orden fijo: cada quien firma por su lado y solo deja de poder hacerlo
  // una vez que ya registro su propia firma (espera a que firme el otro).
  const puedeFirmarDevolucion = (p) => {
    if (p.estado !== 'DEVOLUCION_PENDIENTE') return false
    if (isAdmin) return !p.devolucionFirmaAdministrador
    if (isAdminInfraestructura) return !p.devolucionFirmaInfraestructura
    return false
  }

  const puedeRechazarDevolucion = (p) => canEditInventario && p.estado === 'DEVOLUCION_PENDIENTE'

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
      const payload = { ...form, cantidad: Number(form.cantidad) || 1 }
      if (editandoId) {
        await inventarioApi.update(editandoId, payload)
      } else {
        await inventarioApi.create(payload)
      }
      setShowForm(false)
      setEditandoId(null)
      setForm(FORM_INICIAL)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const abrirNuevoBien = () => {
    setEditandoId(null)
    setForm(FORM_INICIAL)
    setShowForm(true)
  }

  const abrirEditarBien = (bien) => {
    setEditandoId(bien.id)
    setForm({
      nombre: bien.nombre || '',
      codigoIC: bien.codigoIC || '',
      codigoInventario: bien.codigoInventario || '',
      categoria: bien.categoria || '',
      cantidad: bien.cantidad ?? 1,
      estado: bien.estado || 'DISPONIBLE',
      ubicacion: bien.ubicacion || '',
      marca: bien.marca || '',
      descripcion: bien.descripcion || '',
      numeroSerie: bien.numeroSerie || '',
      detallesTecnicos: bien.detallesTecnicos || '',
      custodio: bien.custodio || '',
      observaciones: bien.observaciones || '',
    })
    setShowForm(true)
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
      await prestamosApi.solicitar({
        bienId: solicitudBien.id,
        ...solicitudForm,
        proyectoId: solicitudForm.proyectoId ? Number(solicitudForm.proyectoId) : null,
      })
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

  const handleEliminarTodoElInventario = async () => {
    const confirmado = confirm(
      `¿Eliminar TODO el inventario (${bienes.length} bienes)?\n\n` +
      'Esta acción no se puede deshacer. Úsala solo si vas a volver a importar la matriz completa desde cero. ' +
      'Los préstamos y mantenimientos ya registrados no se eliminan, pero quedarán referenciando bienes que ya no existen.'
    )
    if (!confirmado) return
    setEliminandoTodo(true)
    setError(null)
    try {
      await inventarioApi.removeTodo()
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setEliminandoTodo(false)
    }
  }

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

  const abrirMantenimiento = (bien) => {
    setEditandoMantenimientoId(null)
    setMantenimientoForm({ bienId: bien ? String(bien.id) : '', tipo: 'PREVENTIVO', fecha: new Date().toISOString().slice(0, 10), descripcion: '' })
    setMantenimientoArchivo(null)
    setShowMantenimientoForm(true)
  }

  const abrirEditarMantenimiento = (m) => {
    setEditandoMantenimientoId(m.id)
    setMantenimientoForm({ bienId: String(m.bienId), tipo: m.tipo, fecha: m.fecha || '', descripcion: m.descripcion || '' })
    setMantenimientoArchivo(null)
    setShowMantenimientoForm(true)
  }

  const handleSubmitMantenimiento = async (e) => {
    e.preventDefault()
    setSavingMantenimiento(true)
    setError(null)
    try {
      const payload = {
        bienId: Number(mantenimientoForm.bienId),
        tipo: mantenimientoForm.tipo,
        fecha: mantenimientoForm.fecha,
        descripcion: mantenimientoForm.descripcion,
      }
      const guardado = editandoMantenimientoId
        ? await mantenimientosApi.actualizar(editandoMantenimientoId, payload)
        : await mantenimientosApi.crear(payload)
      if (mantenimientoArchivo) {
        await mantenimientosApi.subirArchivo(guardado.id, mantenimientoArchivo)
      }
      setShowMantenimientoForm(false)
      setEditandoMantenimientoId(null)
      setMantenimientoArchivo(null)
      reloadMantenimientos()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingMantenimiento(false)
    }
  }

  const handleDeleteMantenimiento = async (id) => {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return
    try {
      await mantenimientosApi.remove(id)
      reloadMantenimientos()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVerMantenimientoArchivo = async (mantenimiento) => {
    setViewingMantenimientoId(mantenimiento.id)
    setError(null)
    try {
      const blob = await mantenimientosApi.verArchivo(mantenimiento.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingMantenimientoId(null)
    }
  }

  const abrirEntrega = (prestamo) => {
    setEntregaPrestamo(prestamo)
    setActaEntregaArchivo(null)
  }

  const generarActaEntrega = (prestamo) => {
    const bien = bienes.find((b) => b.id === prestamo.bienId)
    const nombreBien = bien?.nombre || `#${prestamo.bienId}`
    const usuarioResponsable = nombrePorUsuarioId.get(prestamo.usuarioId) || `#${prestamo.usuarioId}`
    const proyecto = prestamo.proyectoId ? (nombrePorProyectoId.get(prestamo.proyectoId) || `#${prestamo.proyectoId}`) : null
    const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}lici-sello.jpg`
    const espeLogoUrl = `${window.location.origin}${import.meta.env.BASE_URL}espe-logo.png`
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Acta de Entrega de Bienes Tecnológicos</title>
      <style>
        @page{margin:0}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1a1a1a}
        .encabezado{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:3px solid #0e6b3c;padding-bottom:16px;margin-bottom:24px}
        .encabezado .institucion{font-size:11px;letter-spacing:0.5px;color:#777;text-transform:uppercase;margin:0 0 6px}
        .encabezado h1{font-size:21px;color:#052a18;margin:0}
        .encabezado img{height:70px;width:auto;object-fit:contain;flex-shrink:0}
        .encabezado .centro{flex:1;text-align:center}
        p{font-size:12.5px;line-height:1.7;margin:0 0 10px}
        .datos{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;background:#f3faf6;border:1px solid #d7ece1;border-radius:8px;padding:16px 18px;margin-bottom:18px}
        .dato .etiqueta{display:block;font-size:10px;font-weight:700;color:#0e6b3c;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px}
        .dato .valor{font-size:13px;color:#111}
        .seccion-titulo{font-size:12.5px;font-weight:700;color:#052a18;margin:22px 0 8px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px;border-radius:6px;overflow:hidden}
        th,td{border:1px solid #d7ece1;padding:9px 10px;text-align:left}
        th{background:#0e6b3c;color:#fff;font-weight:600}
        .nota{font-size:11.5px;color:#555;font-style:italic;margin-top:16px}
        .firmas{margin-top:120px;display:flex;justify-content:space-between;gap:24px}
        .firmas div{flex:1;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:11px;color:#333}
        .pie{margin-top:40px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="encabezado">
        <img src="${espeLogoUrl}" alt="Universidad de las Fuerzas Armadas ESPE" />
        <div class="centro">
          <p class="institucion">Universidad de las Fuerzas Armadas ESPE</p>
          <h1>Acta de Entrega de Bienes Tecnológicos</h1>
        </div>
        <img src="${logoUrl}" alt="Laboratorio de Investigación de Ciberseguridad" />
      </div>

      <div class="datos">
        <div class="dato"><span class="etiqueta">Usuario responsable</span><span class="valor">${usuarioResponsable}</span></div>
        <div class="dato"><span class="etiqueta">Proyecto asociado</span><span class="valor">${proyecto || '—'}</span></div>
        <div class="dato"><span class="etiqueta">Fecha de entrega</span><span class="valor">${new Date().toLocaleDateString()}</span></div>
        <div class="dato"><span class="etiqueta">Fecha prevista de devolución</span><span class="valor">${prestamo.fechaHasta || '—'}</span></div>
      </div>

      <p class="seccion-titulo">Bien entregado:</p>
      <table>
        <thead><tr><th>Equipo</th><th>Código de bien</th><th>Estado del recurso</th></tr></thead>
        <tbody><tr><td>${nombreBien}</td><td>${bien?.codigoIC || bien?.codigoInventario || '—'}</td><td>Entregado / En uso</td></tr></tbody>
      </table>

      <p class="nota"><strong>Constancia:</strong> El Custodio del Bien certifica la entrega y el usuario responsable certifica haber recibido el equipo descrito en condiciones de funcionamiento conformes.</p>

      <div class="firmas">
        <div>Firma de quien entrega (Custodio del Bien)</div>
        <div>Firma de quien recibe (Usuario responsable)</div>
      </div>

      <p class="pie">Laboratorio de Investigación de Ciberseguridad — Departamento de Ciencias de la Computación — ESPE</p>
      </body></html>`

    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  const handleSubirActaEntrega = async (e) => {
    e.preventDefault()
    if (!actaEntregaArchivo || !entregaPrestamo) return
    setSubiendoActaEntrega(true)
    setError(null)
    try {
      await prestamosApi.subirActaEntrega(entregaPrestamo.id, actaEntregaArchivo)
      setEntregaPrestamo(null)
      setActaEntregaArchivo(null)
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendoActaEntrega(false)
    }
  }

  const handleVerActaEntrega = async (prestamo) => {
    try {
      const blob = await prestamosApi.verActaEntrega(prestamo.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch (err) {
      setError(err.message)
    }
  }

  const abrirDevolucion = (prestamo) => {
    setDevolucionPrestamo(prestamo)
    setActaArchivo(null)
  }

  const generarActa = (prestamo) => {
    const bien = nombrePorBienId.get(prestamo.bienId) || `#${prestamo.bienId}`
    const docente = `${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim()
    const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}lici-sello.jpg`
    const espeLogoUrl = `${window.location.origin}${import.meta.env.BASE_URL}espe-logo.png`
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Acta de Entrega / Devolución de Bienes</title>
      <style>
        @page{margin:0}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1a1a1a}
        .encabezado{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:3px solid #0e6b3c;padding-bottom:16px;margin-bottom:24px}
        .encabezado .institucion{font-size:11px;letter-spacing:0.5px;color:#777;text-transform:uppercase;margin:0 0 6px}
        .encabezado h1{font-size:21px;color:#052a18;margin:0}
        .encabezado img{height:70px;width:auto;object-fit:contain;flex-shrink:0}
        .encabezado .centro{flex:1;text-align:center}
        p{font-size:12.5px;line-height:1.7;margin:0 0 10px}
        .datos{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;background:#f3faf6;border:1px solid #d7ece1;border-radius:8px;padding:16px 18px;margin-bottom:18px}
        .dato .etiqueta{display:block;font-size:10px;font-weight:700;color:#0e6b3c;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px}
        .dato .valor{font-size:13px;color:#111}
        .seccion-titulo{font-size:12.5px;font-weight:700;color:#052a18;margin:22px 0 8px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px;border-radius:6px;overflow:hidden}
        th,td{border:1px solid #d7ece1;padding:9px 10px;text-align:left}
        th{background:#0e6b3c;color:#fff;font-weight:600}
        tbody tr:nth-child(even){background:#f8fdfb}
        .nota{font-size:11.5px;color:#555;font-style:italic;margin-top:16px}
        .firmas{margin-top:120px;display:flex;justify-content:space-between;gap:20px}
        .firmas div{flex:1;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:11px;color:#333}
        .pie{margin-top:40px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="encabezado">
        <img src="${espeLogoUrl}" alt="Universidad de las Fuerzas Armadas ESPE" />
        <div class="centro">
          <p class="institucion">Universidad de las Fuerzas Armadas ESPE</p>
          <h1>Acta de Entrega / Devolución de Bienes</h1>
        </div>
        <img src="${logoUrl}" alt="Laboratorio de Investigación de Ciberseguridad" />
      </div>

      <div class="datos">
        <div class="dato"><span class="etiqueta">Docente</span><span class="valor">${docente || '—'}</span></div>
        <div class="dato"><span class="etiqueta">Fecha de solicitud</span><span class="valor">${prestamo.fechaSolicitud ? new Date(prestamo.fechaSolicitud).toLocaleDateString() : '—'}</span></div>
        <div class="dato"><span class="etiqueta">Periodo de préstamo</span><span class="valor">${prestamo.fechaDesde || '—'} a ${prestamo.fechaHasta || '—'}</span></div>
        <div class="dato"><span class="etiqueta">Motivo</span><span class="valor">${prestamo.motivo || '—'}</span></div>
      </div>

      <p class="seccion-titulo">El docente ha solicitado los siguientes equipos:</p>
      <table>
        <thead><tr><th>Equipo</th><th>Motivo</th></tr></thead>
        <tbody><tr><td>${bien}</td><td>${prestamo.motivo || '—'}</td></tr></tbody>
      </table>

      <p class="nota"><strong>Constancia:</strong> Con la firma de este apartado, se certifica haber recibido los equipos descritos en esta acta a entera conformidad.</p>

      <div class="firmas">
        <div>Firma del Docente que solicitó</div>
        <div>Firma del Jefe de Laboratorio</div>
        <div>Firma del Administrador de Infraestructura</div>
      </div>

      <p class="pie">Laboratorio de Investigación de Ciberseguridad — Departamento de Ciencias de la Computación — ESPE</p>
      </body></html>`

    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  const handleSubirActa = async (e) => {
    e.preventDefault()
    if (!actaArchivo || !devolucionPrestamo) return
    setSubiendoActa(true)
    setError(null)
    try {
      await prestamosApi.subirActaDevolucion(devolucionPrestamo.id, actaArchivo)
      setDevolucionPrestamo(null)
      setActaArchivo(null)
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendoActa(false)
    }
  }

  const handleAprobarDevolucion = async (prestamo) => {
    setBusyId(`p-${prestamo.id}`)
    setError(null)
    try {
      await prestamosApi.aprobarDevolucion(prestamo.id)
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleRechazarDevolucion = async (e) => {
    e.preventDefault()
    if (!rechazoDevolucion) return
    setBusyId(`p-${rechazoDevolucion.id}`)
    setError(null)
    try {
      await prestamosApi.rechazarDevolucion(rechazoDevolucion.id, observacionRechazo)
      setRechazoDevolucion(null)
      setObservacionRechazo('')
      reloadTodo()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const generarReporteInventario = () => {
    // Mismas columnas que la matriz institucional de inventario (Ord se omite:
    // es solo la numeracion de fila de la hoja de Excel, no un dato del bien).
    const filas = bienesFiltrados.map((b) => `
      <tr>
        <td>${escapeHtml(b.nombre)}</td>
        <td>${escapeHtml(b.marca || '—')}</td>
        <td>${escapeHtml(b.descripcion || '—')}</td>
        <td>${escapeHtml(b.codigoIC || '—')}</td>
        <td>${escapeHtml(b.numeroSerie || '—')}</td>
        <td>${escapeHtml(b.codigoInventario || '—')}</td>
        <td>${escapeHtml(b.detallesTecnicos || '—')}</td>
        <td>${ESTADO_LABEL[b.estado] || b.estado}</td>
        <td>${escapeHtml(b.custodio || '—')}</td>
        <td>${escapeHtml(b.observaciones || '—')}</td>
      </tr>`).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Inventario</title>
      <style>
        ${estiloEncabezadoReporte()}
        @page{size:landscape}
        table{width:100%;border-collapse:collapse;font-size:10px}
        th,td{border:1px solid #ccc;padding:5px 6px;text-align:left;vertical-align:top}
        th{background:#0e6b3c;color:#fff}
      </style></head><body>
      ${htmlEncabezadoReporte('Reporte de Inventario', `Generado: ${new Date().toLocaleString()} — Total de bienes: ${bienesFiltrados.length}`)}
      <table>
        <thead><tr>
          <th>Nombre del Item</th><th>Marca</th><th>Descripción</th><th>Código de Bien ESPE</th>
          <th>Número de Serie</th><th>Código Laboratorio</th><th>Detalles técnicos</th>
          <th>Estado</th><th>Custodio</th><th>Observación</th>
        </tr></thead>
        <tbody>${filas || '<tr><td colspan="10">Sin registros</td></tr>'}</tbody>
      </table>
      ${htmlFirmasReporte(['Jefe de Laboratorio', 'Admin. Infraestructura'])}
      </body></html>`

    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  const handleVerActa = async (prestamo) => {
    try {
      const blob = await prestamosApi.verActa(prestamo.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Inventario"
        action={(
          <div className="flex items-center gap-2">
            <button
              onClick={generarReporteInventario}
              className="flex items-center gap-2 bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] text-xs font-semibold px-4 py-2 rounded transition-colors"
            >
              <FileDown className="w-4 h-4" /> Generar reporte
            </button>
            {canEditInventario && (
              <>
                <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportarFile} />
                <button
                  onClick={handleImportarClick}
                  disabled={importing}
                  className="flex items-center gap-2 bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] disabled:opacity-50 text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  <Upload className="w-4 h-4" /> {importing ? 'Importando...' : 'Importar matriz Excel'}
                </button>
                <button
                  onClick={handleEliminarTodoElInventario}
                  disabled={eliminandoTodo || bienes.length === 0}
                  title="Elimina todo el inventario, para reimportar la matriz desde cero"
                  className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-300 disabled:opacity-50 text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> {eliminandoTodo ? 'Eliminando...' : 'Eliminar todo'}
                </button>
                <PrimaryButton onClick={abrirNuevoBien}>
                  <Plus className="w-4 h-4" /> Nuevo bien
                </PrimaryButton>
              </>
            )}
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
            <td className="px-3 py-2 text-gray-600">{b.marca || '—'}</td>
            <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate" title={b.descripcion}>{b.descripcion || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.codigoIC || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.numeroSerie || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{b.codigoInventario || '—'}</td>
            <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate" title={b.detallesTecnicos}>{b.detallesTecnicos || '—'}</td>
            <td className="px-3 py-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[b.estado]}`}>
                {ESTADO_LABEL[b.estado] || b.estado}
              </span>
            </td>
            <td className="px-3 py-2 text-gray-600">{b.custodio || '—'}</td>
            <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate" title={b.observaciones}>{b.observaciones || '—'}</td>
            <td className="px-3 py-2">
              <button onClick={() => setDetalle(b)} className="text-gray-400 hover:text-[#0e6b3c]" title="Ver detalle">
                <Eye className="w-3.5 h-3.5" />
              </button>
            </td>
            {canEditInventario ? (
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => abrirSolicitud(b)}
                    disabled={b.estado !== 'DISPONIBLE'}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#052a18] disabled:text-gray-300 disabled:cursor-not-allowed hover:text-[#0e6b3c]"
                    title={b.estado !== 'DISPONIBLE' ? 'Este equipo no esta disponible' : 'Solicitar en prestamo'}
                  >
                    <HandHelping className="w-3.5 h-3.5" /> Solicitar
                  </button>
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
                  <button onClick={() => abrirEditarBien(b)} className="text-gray-400 hover:text-[#0e6b3c]" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
          ? ['Bien', 'Usuario', 'Proyecto', 'Periodo', 'Motivo', 'Estado', 'Devuelto', 'Actas / Observación', '']
          : ['Bien', 'Proyecto', 'Periodo', 'Motivo', 'Estado', 'Devuelto', 'Actas / Observación', '']}>
          {loadingPrestamos && <LoadingRow colSpan={canEditInventario ? 9 : 8} />}
          {!loadingPrestamos && prestamos.length === 0 && <EmptyRow colSpan={canEditInventario ? 9 : 8} />}
          {!loadingPrestamos && prestamos.map((p) => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{nombrePorBienId.get(p.bienId) || `#${p.bienId}`}</td>
              {canEditInventario && (
                <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(p.usuarioId) || `#${p.usuarioId}`}</td>
              )}
              <td className="px-3 py-2 text-gray-600">{p.proyectoId ? (nombrePorProyectoId.get(p.proyectoId) || `#${p.proyectoId}`) : '—'}</td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.fechaDesde || '—'} a {p.fechaHasta || '—'}</td>
              <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={p.motivo}>{p.motivo || '—'}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRESTAMO_ESTADO_BADGE[p.estado] || 'bg-gray-100 text-gray-600'}`}>
                  {PRESTAMO_ESTADO_LABEL[p.estado] || p.estado}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600">{p.fechaDevolucion ? new Date(p.fechaDevolucion).toLocaleString() : '—'}</td>
              <td className="px-3 py-2 text-gray-600 max-w-[200px]">
                <div className="flex flex-col gap-1">
                  {p.actaEntregaRuta && (
                    <button
                      onClick={() => handleVerActaEntrega(p)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18]"
                    >
                      <FileSignature className="w-3.5 h-3.5" /> Ver acta de entrega
                    </button>
                  )}
                  {p.actaRuta && (
                    <button
                      onClick={() => handleVerActa(p)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18]"
                    >
                      <FileSignature className="w-3.5 h-3.5" /> Ver acta de devolución
                    </button>
                  )}
                  {p.estado === 'DEVOLUCION_PENDIENTE' && (
                    <span className="text-[10px] text-gray-500">
                      Infraestructura: {p.devolucionFirmaInfraestructura ? '✓ firmado' : 'pendiente'} · Jefe de Laboratorio: {p.devolucionFirmaAdministrador ? '✓ firmado' : 'pendiente'}
                    </span>
                  )}
                  {p.observacionDevolucion && (
                    <span className="truncate" title={p.observacionDevolucion}>{p.observacionDevolucion}</span>
                  )}
                  {!p.actaEntregaRuta && !p.actaRuta && !p.observacionDevolucion && p.estado !== 'DEVOLUCION_PENDIENTE' && '—'}
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  {puedeAprobar(p) && (
                    <button
                      onClick={() => handleAprobar(p)}
                      disabled={busyId === `p-${p.id}`}
                      className="text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                      title={p.estado === 'APROBADO_INFRAESTRUCTURA' ? 'Autorizar el prestamo (Jefe de Laboratorio)' : 'Aprobar (pasa a espera de autorizacion del Jefe de Laboratorio)'}
                    >
                      {p.estado === 'APROBADO_INFRAESTRUCTURA' ? 'Autorizar' : 'Aprobar'}
                    </button>
                  )}
                  {puedeRechazarSolicitud(p) && (
                    <button
                      onClick={() => handleRechazar(p)}
                      disabled={busyId === `p-${p.id}`}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:text-gray-300"
                    >
                      Rechazar
                    </button>
                  )}
                  {puedeEntregar(p) && (
                    <button
                      onClick={() => abrirEntrega(p)}
                      disabled={busyId === `p-${p.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                      title="Registrar la entrega (Custodio del Bien) con el Acta de Entrega firmada"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" /> Registrar entrega
                    </button>
                  )}
                  {p.estado === 'ACTIVO' && p.usuarioId === usuario?.id && (
                    <button
                      onClick={() => abrirDevolucion(p)}
                      disabled={busyId === `p-${p.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#052a18] hover:text-[#0e6b3c] disabled:text-gray-300"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Devolver
                    </button>
                  )}
                  {puedeFirmarDevolucion(p) && (
                    <button
                      onClick={() => handleAprobarDevolucion(p)}
                      disabled={busyId === `p-${p.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                      title="Firmar la devolucion (se cierra cuando ambos, Jefe de Laboratorio e Infraestructura, hayan firmado)"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" /> Firmar devolución
                    </button>
                  )}
                  {puedeRechazarDevolucion(p) && (
                    <button
                      onClick={() => { setRechazoDevolucion(p); setObservacionRechazo('') }}
                      disabled={busyId === `p-${p.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:text-gray-300"
                    >
                      <FileX2 className="w-3.5 h-3.5" /> Rechazar acta
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-700">Mantenimientos Correctivos y Preventivos</h2>
          {canEditInventario && (
            <button
              onClick={() => abrirMantenimiento(null)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18]"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar mantenimiento
            </button>
          )}
        </div>
        <Table headers={['Bien', 'Tipo', 'Fecha', 'Descripción', 'Archivo', '', canEditInventario ? '' : undefined].filter(Boolean)}>
          {loadingMantenimientos && <LoadingRow colSpan={canEditInventario ? 7 : 6} />}
          {!loadingMantenimientos && mantenimientos.length === 0 && <EmptyRow colSpan={canEditInventario ? 7 : 6} message="Sin mantenimientos registrados todavía" />}
          {!loadingMantenimientos && mantenimientos.map((m) => (
            <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{nombrePorBienId.get(m.bienId) || `#${m.bienId}`}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.tipo === 'CORRECTIVO' ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700'}`}>
                  {m.tipo === 'CORRECTIVO' ? 'Correctivo' : 'Preventivo'}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{m.fecha || '—'}</td>
              <td className="px-3 py-2 text-gray-600 max-w-[280px] truncate" title={m.descripcion}>{m.descripcion || '—'}</td>
              <td className="px-3 py-2">
                {m.archivoRuta ? (
                  <button
                    onClick={() => handleVerMantenimientoArchivo(m)}
                    disabled={viewingMantenimientoId === m.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                    title={m.archivoNombreArchivo || 'Ver archivo'}
                  >
                    <Eye className="w-3.5 h-3.5" /> {viewingMantenimientoId === m.id ? 'Abriendo...' : 'Ver'}
                  </button>
                ) : (
                  <span className="text-gray-400 text-xs">Sin archivo</span>
                )}
              </td>
              <td className="px-3 py-2">
                <button onClick={() => abrirEditarMantenimiento(m)} className="text-gray-400 hover:text-[#0e6b3c]" title="Editar">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </td>
              {canEditInventario && (
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleDeleteMantenimiento(m.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </Table>
      </div>

      {showForm && (
        <Modal title={editandoId ? 'Editar bien de inventario' : 'Nuevo bien de inventario'} onClose={() => { setShowForm(false); setEditandoId(null) }}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Nombre del Item">
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca">
                <input className="input" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
              </Field>
              <Field label="Número de Serie">
                <input className="input" value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código de Bien ESPE">
                <input className="input" value={form.codigoIC} onChange={(e) => setForm({ ...form, codigoIC: e.target.value })} />
              </Field>
              <Field label="Código Laboratorio">
                <input className="input" value={form.codigoInventario} onChange={(e) => setForm({ ...form, codigoInventario: e.target.value })} />
              </Field>
            </div>
            <Field label="Descripción">
              <textarea rows={2} className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <Field label="Detalles técnicos">
              <textarea rows={3} className="input" value={form.detallesTecnicos} onChange={(e) => setForm({ ...form, detallesTecnicos: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad">
                <input type="number" className="input" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
              </Field>
              <Field label="Categoría">
                <input className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estado">
                <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map((s) => <option key={s} value={s} disabled={s === 'EN_USO'}>{ESTADO_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Ubicación">
                <input className="input" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
              </Field>
            </div>
            <Field label="Custodio">
              <input className="input" value={form.custodio} onChange={(e) => setForm({ ...form, custodio: e.target.value })} />
            </Field>
            <Field label="Observación">
              <textarea rows={2} className="input" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Registrar bien'}
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
            <Field label="Motivo">
              <textarea
                required rows={2} className="input"
                value={solicitudForm.motivo}
                onChange={(e) => setSolicitudForm({ ...solicitudForm, motivo: e.target.value })}
              />
            </Field>
            <Field label="Proyecto asociado (opcional)">
              <select
                className="input"
                value={solicitudForm.proyectoId}
                onChange={(e) => setSolicitudForm({ ...solicitudForm, proyectoId: e.target.value })}
              >
                <option value="">Sin proyecto asociado</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
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

      {entregaPrestamo && (
        <Modal title={`Registrar entrega: ${nombrePorBienId.get(entregaPrestamo.bienId) || ''}`} onClose={() => setEntregaPrestamo(null)}>
          <form onSubmit={handleSubirActaEntrega} className="space-y-3">
            <p className="text-xs text-gray-500">
              Genera el Acta de Entrega, fírmala junto al usuario responsable y súbela aquí para activar el préstamo (el bien pasará a "En uso").
            </p>
            <button
              type="button"
              onClick={() => generarActaEntrega(entregaPrestamo)}
              className="flex items-center gap-2 w-full justify-center bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] text-xs font-semibold px-4 py-2 rounded transition-colors"
            >
              <FileSignature className="w-4 h-4" /> Generar acta imprimible
            </button>
            <Field label="Acta de entrega firmada (PDF o imagen)">
              <input
                required type="file" accept=".pdf,.jpg,.jpeg,.png"
                className="input"
                onChange={(e) => setActaEntregaArchivo(e.target.files?.[0] || null)}
              />
            </Field>
            <PrimaryButton type="submit" disabled={subiendoActaEntrega || !actaEntregaArchivo} className="w-full justify-center">
              {subiendoActaEntrega ? 'Subiendo...' : 'Subir acta y activar préstamo'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {devolucionPrestamo && (
        <Modal title={`Devolver: ${nombrePorBienId.get(devolucionPrestamo.bienId) || ''}`} onClose={() => setDevolucionPrestamo(null)}>
          <form onSubmit={handleSubirActa} className="space-y-3">
            <p className="text-xs text-gray-500">
              Genera el acta de entrega/devolución, fírmala junto al Jefe de Laboratorio y súbela aquí para que Admin. Infraestructura y el Jefe de Laboratorio validen la devolución.
            </p>
            <button
              type="button"
              onClick={() => generarActa(devolucionPrestamo)}
              className="flex items-center gap-2 w-full justify-center bg-white hover:bg-[#f3faf6] text-[#0e6b3c] border border-[#0e6b3c] text-xs font-semibold px-4 py-2 rounded transition-colors"
            >
              <FileSignature className="w-4 h-4" /> Generar acta imprimible
            </button>
            <Field label="Acta firmada (PDF o imagen)">
              <input
                required type="file" accept=".pdf,.jpg,.jpeg,.png"
                className="input"
                onChange={(e) => setActaArchivo(e.target.files?.[0] || null)}
              />
            </Field>
            <PrimaryButton type="submit" disabled={subiendoActa || !actaArchivo} className="w-full justify-center">
              {subiendoActa ? 'Subiendo...' : 'Subir acta y registrar devolución'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {rechazoDevolucion && (
        <Modal title="Rechazar acta de devolución" onClose={() => setRechazoDevolucion(null)}>
          <form onSubmit={handleRechazarDevolucion} className="space-y-3">
            <Field label="Observación (p. ej. 'Archivo incorrecto')">
              <textarea
                rows={3} className="input"
                value={observacionRechazo}
                onChange={(e) => setObservacionRechazo(e.target.value)}
                placeholder="Archivo incorrecto"
              />
            </Field>
            <PrimaryButton type="submit" disabled={busyId === `p-${rechazoDevolucion.id}`} className="w-full justify-center">
              Rechazar acta
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {showMantenimientoForm && (
        <Modal
          title={editandoMantenimientoId ? 'Editar mantenimiento' : 'Registrar mantenimiento'}
          onClose={() => { setShowMantenimientoForm(false); setEditandoMantenimientoId(null) }}
        >
          <form onSubmit={handleSubmitMantenimiento} className="space-y-3">
            <Field label="Bien">
              <select
                required className="input"
                value={mantenimientoForm.bienId}
                onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, bienId: e.target.value })}
              >
                <option value="" disabled>Seleccionar bien...</option>
                {bienes.map((b) => <option key={b.id} value={b.id}>{b.nombre} {b.codigoIC ? `(${b.codigoIC})` : ''}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select
                  className="input"
                  value={mantenimientoForm.tipo}
                  onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, tipo: e.target.value })}
                >
                  <option value="PREVENTIVO">Preventivo</option>
                  <option value="CORRECTIVO">Correctivo</option>
                </select>
              </Field>
              <Field label="Fecha">
                <input
                  required type="date" className="input"
                  value={mantenimientoForm.fecha}
                  onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, fecha: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Descripción">
              <textarea
                required rows={3} className="input"
                value={mantenimientoForm.descripcion}
                onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, descripcion: e.target.value })}
              />
            </Field>
            {canEditInventario && (
              <Field label={editandoMantenimientoId ? 'Reemplazar documento de respaldo (opcional)' : 'Documento de respaldo (opcional)'}>
                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
                  <Upload className="w-4 h-4 flex-shrink-0" />
                  {mantenimientoArchivo ? mantenimientoArchivo.name : 'Subir informe, factura o bitácora'}
                  <input type="file" className="hidden" onChange={(e) => setMantenimientoArchivo(e.target.files?.[0] || null)} />
                </label>
              </Field>
            )}
            <PrimaryButton type="submit" disabled={savingMantenimiento} className="w-full justify-center">
              {savingMantenimiento ? 'Guardando...' : editandoMantenimientoId ? 'Guardar cambios' : 'Registrar mantenimiento'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {detalle && (
        <Modal title={detalle.nombre} onClose={() => setDetalle(null)}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <DetalleCampo label="Código de Bien ESPE" valor={detalle.codigoIC} />
              <DetalleCampo label="Código Laboratorio" valor={detalle.codigoInventario} />
              <DetalleCampo label="Marca" valor={detalle.marca} />
              <DetalleCampo label="Número de Serie" valor={detalle.numeroSerie} />
              <DetalleCampo label="Categoría" valor={detalle.categoria} />
              <DetalleCampo label="Cantidad" valor={detalle.cantidad} />
              <DetalleCampo label="Ubicación" valor={detalle.ubicacion} />
              <DetalleCampo label="Custodio" valor={detalle.custodio} />
            </div>
            <DetalleCampo label="Descripción" valor={detalle.descripcion} bloque />
            <DetalleCampo label="Detalles técnicos" valor={detalle.detallesTecnicos} bloque />
            <DetalleCampo label="Observación" valor={detalle.observaciones} bloque />
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3.5 flex items-center gap-3">
      <div className={`${color} text-white p-2.5 rounded-lg flex-shrink-0 shadow-sm`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black text-[#052a18] leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1 truncate">{label}</p>
      </div>
    </div>
  )
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
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
