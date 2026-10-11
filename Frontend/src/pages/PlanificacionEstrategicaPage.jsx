import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Target, Eye, Upload, Search, Compass, ArrowRight } from 'lucide-react'
import { planificacionEstrategicaApi, informacionLaboratorioApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const ANIO_INICIAL = 2026
const anioActual = new Date().getFullYear()
const FORM_INICIAL = { titulo: '', anio: String(Math.max(ANIO_INICIAL, anioActual)), descripcion: '' }
const INFO_INICIAL = { queEsElLaboratorio: '', ambitosActuacion: '', mision: '', vision: '', objetivos: '', indicadoresClave: '' }

export default function PlanificacionEstrategicaPage() {
  const { isAdmin } = useAuth()
  const fetcher = useCallback(() => planificacionEstrategicaApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingDocumento, setEditingDocumento] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [archivo, setArchivo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingId, setViewingId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [anioFiltro, setAnioFiltro] = useState('TODOS')

  const [info, setInfo] = useState(null)
  const [infoForm, setInfoForm] = useState(INFO_INICIAL)
  const [editingInfo, setEditingInfo] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)

  useEffect(() => {
    let cancelado = false
    informacionLaboratorioApi.obtener()
      .then((data) => { if (!cancelado) setInfo(data || {}) })
      .catch(() => { if (!cancelado) setInfo({}) })
    return () => { cancelado = true }
  }, [])

  const anios = useMemo(() => {
    const maxAnio = Math.max(ANIO_INICIAL, anioActual, ...data.map((d) => d.anio || 0))
    const lista = []
    for (let a = ANIO_INICIAL; a <= maxAnio; a++) lista.push(a)
    return lista.sort((a, b) => b - a)
  }, [data])

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return data.filter((d) => {
      if (anioFiltro !== 'TODOS' && String(d.anio) !== anioFiltro) return false
      if (!termino) return true
      return (d.titulo || '').toLowerCase().includes(termino) || (d.descripcion || '').toLowerCase().includes(termino)
    })
  }, [data, busqueda, anioFiltro])

  const openCreate = () => {
    setEditingId(null)
    setEditingDocumento(null)
    setForm({ ...FORM_INICIAL, anio: anioFiltro !== 'TODOS' ? anioFiltro : FORM_INICIAL.anio })
    setArchivo(null)
    setShowForm(true)
  }

  const openEdit = (d) => {
    setEditingId(d.id)
    setEditingDocumento(d)
    setForm({ titulo: d.titulo || '', anio: String(d.anio || anioActual), descripcion: d.descripcion || '' })
    setArchivo(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const anio = Number(form.anio) || anioActual
      if (editingId) {
        await planificacionEstrategicaApi.actualizar(editingId, form.titulo, anio, form.descripcion, archivo)
      } else {
        if (!archivo) {
          throw new Error('Selecciona el archivo PDF del documento')
        }
        await planificacionEstrategicaApi.crear(form.titulo, anio, form.descripcion, archivo)
      }
      setShowForm(false)
      setEditingId(null)
      setEditingDocumento(null)
      setForm(FORM_INICIAL)
      setArchivo(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento de planificación estratégica?')) return
    try {
      await planificacionEstrategicaApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVer = async (documento) => {
    setViewingId(documento.id)
    setError(null)
    try {
      const blob = await planificacionEstrategicaApi.verArchivo(documento.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingId(null)
    }
  }

  const abrirEditarInfo = () => {
    setInfoForm({
      queEsElLaboratorio: info?.queEsElLaboratorio || '',
      ambitosActuacion: info?.ambitosActuacion || '',
      mision: info?.mision || '',
      vision: info?.vision || '',
      objetivos: info?.objetivos || '',
      indicadoresClave: info?.indicadoresClave || '',
    })
    setEditingInfo(true)
  }

  const handleGuardarInfo = async (e) => {
    e.preventDefault()
    setSavingInfo(true)
    setError(null)
    try {
      const actualizado = await informacionLaboratorioApi.actualizar(infoForm)
      setInfo(actualizado)
      setEditingInfo(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingInfo(false)
    }
  }

  const infoVacia = info && !info.queEsElLaboratorio && !info.ambitosActuacion && !info.mision && !info.vision && !info.objetivos && !info.indicadoresClave

  const ambitos = (info?.ambitosActuacion || '').split('\n').map((l) => l.trim()).filter(Boolean).map((linea) => {
    const [titulo, ...resto] = linea.split('||')
    return { titulo: titulo.trim(), descripcion: resto.join('||').trim() }
  })

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Planificación Estratégica"
        action={isAdmin && (
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo documento
          </PrimaryButton>
        )}
      />

      <ErrorBanner message={error} />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="bg-[#0e6b3c] text-white p-2 rounded">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#052a18]">¿Qué es el Laboratorio?</h2>
          </div>
          {isAdmin && (
            <button onClick={abrirEditarInfo} className="text-xs font-semibold text-gray-500 hover:text-[#052a18] flex items-center gap-1">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          )}
        </div>

        {infoVacia ? (
          <p className="text-xs text-gray-400 px-5 pb-5 pt-3">
            {isAdmin ? 'Aún no se ha redactado esta sección. Usa "Editar" para completarla.' : 'Esta sección todavía no ha sido completada.'}
          </p>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-[#052a18] text-white rounded-xl p-5 space-y-5">
                {info?.queEsElLaboratorio && (
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide mb-1">Definición</p>
                    <p className="text-xs leading-relaxed text-gray-200 whitespace-pre-line">{info.queEsElLaboratorio}</p>
                  </div>
                )}
                {info?.mision && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-sm font-bold uppercase tracking-wide mb-1">Misión</p>
                    <p className="text-xs leading-relaxed text-gray-200 whitespace-pre-line">{info.mision}</p>
                  </div>
                )}
                {info?.vision && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-sm font-bold uppercase tracking-wide mb-1">Visión</p>
                    <p className="text-xs leading-relaxed text-gray-200 whitespace-pre-line">{info.vision}</p>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {ambitos.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-[#052a18] mb-2">Ámbitos de actuación</p>
                    <div className="space-y-3">
                      {ambitos.map((a, i) => (
                        <div key={i} className="flex gap-2">
                          <ArrowRight className="w-4 h-4 text-[#0e6b3c] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-[#052a18]">{a.titulo}</p>
                            {a.descripcion && <p className="text-xs text-gray-600 mt-0.5">{a.descripcion}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {info?.objetivos && (
                  <div className={ambitos.length > 0 ? 'pt-3 border-t border-gray-100' : ''}>
                    <p className="text-sm font-bold text-[#052a18] mb-1">Objetivos</p>
                    <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-line">{info.objetivos}</p>
                  </div>
                )}
              </div>
            </div>

            {info?.indicadoresClave && (
              <div className="pt-5 mt-5 border-t border-gray-100">
                <p className="text-sm font-bold text-[#052a18] mb-3">Indicadores Clave</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {info.indicadoresClave.split('\n').map((linea) => linea.trim()).filter(Boolean).map((linea, i) => {
                    const match = linea.match(/^(\S+)\s+(.*)$/)
                    return (
                      <div key={i} className="bg-[#f3faf6] rounded-lg p-3 text-center">
                        <p className="text-xl font-black text-[#052a18] leading-none">{match ? match[1] : linea}</p>
                        {match && <p className="text-[10px] text-gray-500 mt-1">{match[2]}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <FiltroChip active={anioFiltro === 'TODOS'} onClick={() => setAnioFiltro('TODOS')}>Todos los años</FiltroChip>
        {anios.map((a) => (
          <FiltroChip key={a} active={anioFiltro === String(a)} onClick={() => setAnioFiltro(String(a))}>{a}</FiltroChip>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o descripción..."
            className="input pl-8 text-xs py-1.5 w-full"
          />
        </div>
      </div>

      <Table headers={isAdmin ? ['Título', 'Año', 'Descripción', 'Archivo', ''] : ['Título', 'Año', 'Descripción', 'Archivo']}>
        {loading && <LoadingRow colSpan={isAdmin ? 5 : 4} />}
        {!loading && filtrados.length === 0 && (
          <EmptyRow colSpan={isAdmin ? 5 : 4} message={data.length === 0 ? 'No hay documentos de planificación estratégica cargados todavía' : 'Ningún documento coincide con los filtros aplicados'} />
        )}
        {!loading && filtrados.map((d) => (
          <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-gray-400" /> {d.titulo}
            </td>
            <td className="px-3 py-2 text-gray-600">{d.anio || '—'}</td>
            <td className="px-3 py-2 text-gray-600 max-w-[280px] truncate" title={d.descripcion}>{d.descripcion || '—'}</td>
            <td className="px-3 py-2">
              {d.rutaArchivo ? (
                <button
                  onClick={() => handleVer(d)}
                  disabled={viewingId === d.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                  title={d.nombreArchivo || 'Ver archivo'}
                >
                  <Eye className="w-3.5 h-3.5" /> {viewingId === d.id ? 'Abriendo...' : 'Ver'}
                </button>
              ) : (
                <span className="text-gray-400 text-xs">Sin archivo</span>
              )}
            </td>
            {isAdmin && (
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(d)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title={editingId ? 'Editar documento' : 'Nuevo documento de planificación estratégica'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Título">
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Plan Estratégico 2026-2030" />
            </Field>
            <Field label="Año">
              <input required type="number" min={ANIO_INICIAL} className="input" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
            <Field label={editingDocumento?.rutaArchivo ? 'Reemplazar archivo PDF (opcional)' : 'Archivo PDF'}>
              <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
                <Upload className="w-4 h-4 flex-shrink-0" />
                {archivo ? archivo.name : (editingDocumento?.nombreArchivo || 'Subir archivo PDF')}
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </label>
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear documento'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {editingInfo && (
        <Modal title="Editar: ¿Qué es el Laboratorio?" onClose={() => setEditingInfo(false)}>
          <form onSubmit={handleGuardarInfo} className="space-y-3">
            <Field label="Definición (¿qué es el laboratorio?)">
              <textarea className="input" rows={4} value={infoForm.queEsElLaboratorio} onChange={(e) => setInfoForm({ ...infoForm, queEsElLaboratorio: e.target.value })} />
            </Field>
            <Field label="Ámbitos de actuación (uno por línea, formato 'Título||Descripción')">
              <textarea
                className="input" rows={4}
                value={infoForm.ambitosActuacion}
                onChange={(e) => setInfoForm({ ...infoForm, ambitosActuacion: e.target.value })}
                placeholder="Investigación aplicada||Soluciones reales a problemas de seguridad digital..."
              />
            </Field>
            <Field label="Misión">
              <textarea className="input" rows={2} value={infoForm.mision} onChange={(e) => setInfoForm({ ...infoForm, mision: e.target.value })} />
            </Field>
            <Field label="Visión">
              <textarea className="input" rows={2} value={infoForm.vision} onChange={(e) => setInfoForm({ ...infoForm, vision: e.target.value })} />
            </Field>
            <Field label="Objetivos">
              <textarea className="input" rows={5} value={infoForm.objetivos} onChange={(e) => setInfoForm({ ...infoForm, objetivos: e.target.value })} />
            </Field>
            <Field label="Indicadores Clave (uno por línea, ej. '2+ Proyectos activos')">
              <textarea className="input" rows={4} value={infoForm.indicadoresClave} onChange={(e) => setInfoForm({ ...infoForm, indicadoresClave: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={savingInfo} className="w-full justify-center">
              {savingInfo ? 'Guardando...' : 'Guardar cambios'}
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

function FiltroChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${active ? 'bg-[#0e6b3c] text-white border-[#0e6b3c]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0e6b3c]'}`}
    >
      {children}
    </button>
  )
}
