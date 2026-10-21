import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, FileUp, Eye, Info, CalendarDays, BookOpen, Loader2, Users, FileCheck2 } from 'lucide-react'
import { investigadoresApi, usuariosApi, publicacionesApi } from '../api/services'
import { useList } from '../hooks/useList'
import { useAuth } from '../context/AuthContext'
import { PageHeader, ErrorBanner, PrimaryButton } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

const FORM_INICIAL = { nombreCompleto: '', tituloAcademico: '', areaInvestigacion: '', biografia: '', usuarioId: '' }

const AVATAR_COLORES = ['bg-emerald-500', 'bg-sky-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500']
function colorAvatar(id) {
  return AVATAR_COLORES[(id || 0) % AVATAR_COLORES.length]
}
function inicialesDe(nombreCompleto) {
  const partes = (nombreCompleto || '').trim().split(/\s+/)
  return `${partes[0]?.[0] || '?'}${partes[1]?.[0] || ''}`.toUpperCase()
}

export default function InvestigadoresPage() {
  const { isAdmin, usuario, isEstudiante } = useAuth()
  const fetcher = useCallback(() => investigadoresApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const publicacionesFetcher = useCallback(() => publicacionesApi.list(), [])
  const { data: publicaciones } = useList(publicacionesFetcher)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingInv, setEditingInv] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [curriculum, setCurriculum] = useState(null)
  const [horario, setHorario] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingId, setViewingId] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )
  const publicacionesDelDetalle = useMemo(
    () => (detalle ? publicaciones.filter((p) => p.investigadorId === detalle.id) : []),
    [publicaciones, detalle]
  )

  const openCreate = () => {
    setEditingId(null)
    setEditingInv(null)
    setForm(FORM_INICIAL)
    setCurriculum(null)
    setHorario(null)
    setShowForm(true)
  }

  const openEdit = (inv) => {
    setEditingId(inv.id)
    setEditingInv(inv)
    setForm({
      nombreCompleto: inv.nombreCompleto || '',
      tituloAcademico: inv.tituloAcademico || '',
      areaInvestigacion: inv.areaInvestigacion || '',
      biografia: inv.biografia || '',
      usuarioId: String(inv.usuarioId ?? ''),
    })
    setCurriculum(null)
    setHorario(null)
    setDetalle(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let id = editingId
      if (editingId) {
        await investigadoresApi.update(editingId, form)
      } else {
        const usuarioId = Number(form.usuarioId)
        const creado = await investigadoresApi.create({
          usuarioId,
          nombreCompleto: nombrePorUsuarioId.get(usuarioId) || '',
        })
        id = creado.id
      }
      if (curriculum) await investigadoresApi.subirCurriculum(id, curriculum)
      if (horario) await investigadoresApi.subirHorario(id, horario)
      setShowForm(false)
      setEditingId(null)
      setEditingInv(null)
      setForm(FORM_INICIAL)
      setCurriculum(null)
      setHorario(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este perfil de investigador?')) return
    try {
      await investigadoresApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVerArchivo = async (inv, tipo) => {
    const clave = `${tipo}-${inv.id}`
    setViewingId(clave)
    setError(null)
    try {
      const blob = tipo === 'curriculum' ? await investigadoresApi.verCurriculum(inv.id) : await investigadoresApi.verHorario(inv.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingId(null)
    }
  }

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Investigadores"
        action={!isEstudiante && (
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo perfil
          </PrimaryButton>
        )}
      />

      <ErrorBanner message={error} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <MiniStat icon={Users} label="Docentes registrados" value={data.length} color="from-[#0e6b3c] to-[#052a18]" />
        <MiniStat icon={FileCheck2} label="Con currículum" value={data.filter((i) => i.curriculumRuta).length} color="from-sky-500 to-sky-700" />
        <MiniStat icon={CalendarDays} label="Con horario" value={data.filter((i) => i.horarioRuta).length} color="from-purple-500 to-purple-700" />
      </div>

      {loading && (
        <div className="flex items-center justify-center text-gray-400 text-sm py-10">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      )}
      {!loading && data.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
          Sin perfiles de investigador todavía.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading && data.map((inv) => (
          <div key={inv.id} className="group relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
            {!isEstudiante && (isAdmin || inv.usuarioId === usuario?.id) && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => openEdit(inv)} className="bg-white/90 text-gray-600 hover:text-[#052a18] p-1.5 rounded-full shadow" title="Editar">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(inv.id)} className="bg-white/90 text-red-500 hover:text-red-700 p-1.5 rounded-full shadow" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="bg-gradient-to-br from-[#0e6b3c] via-[#0b5c33] to-[#052a18] p-5 flex items-center gap-3.5">
              <div className={`${colorAvatar(inv.id)} w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-black flex-shrink-0 ring-4 ring-white/15`}>
                {inicialesDe(inv.nombreCompleto)}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight truncate">{inv.nombreCompleto}</p>
                <p className="text-emerald-200 text-[11px] truncate mt-0.5">{inv.tituloAcademico || 'Docente Investigador'}</p>
              </div>
            </div>

            <div className="p-4">
              {inv.areaInvestigacion ? (
                <span className="inline-block px-2.5 py-1 rounded-full bg-[#f3faf6] text-[#0e6b3c] text-[10px] font-semibold mb-3">
                  {inv.areaInvestigacion}
                </span>
              ) : (
                <p className="text-[11px] text-gray-300 mb-3">Sin área de investigación registrada</p>
              )}

              <div className="flex items-center gap-4 mb-3">
                <ArchivoBoton
                  disponible={!!inv.curriculumRuta}
                  cargando={viewingId === `curriculum-${inv.id}`}
                  titulo={inv.curriculumNombreArchivo}
                  etiqueta="Currículum"
                  onClick={() => handleVerArchivo(inv, 'curriculum')}
                />
                <ArchivoBoton
                  disponible={!!inv.horarioRuta}
                  cargando={viewingId === `horario-${inv.id}`}
                  titulo={inv.horarioNombreArchivo}
                  icon={CalendarDays}
                  etiqueta="Horario"
                  onClick={() => handleVerArchivo(inv, 'horario')}
                />
              </div>

              <button
                onClick={() => setDetalle(inv)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0e6b3c] border-t border-gray-100 pt-3 transition-colors"
              >
                <Info className="w-3.5 h-3.5" /> Ver detalle completo
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title={editingId ? 'Editar perfil de investigador' : 'Nuevo perfil de investigador'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!editingId ? (
              <>
                <Field label="Usuario">
                  <select
                    required
                    className="input"
                    value={form.usuarioId}
                    onChange={(e) => setForm({ ...form, usuarioId: e.target.value })}
                  >
                    <option value="" disabled>Seleccionar usuario...</option>
                    {directorio.map((u) => (
                      <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                    ))}
                  </select>
                </Field>
                <ArchivoInput label="Curriculum" file={curriculum} onChange={setCurriculum} />
                <ArchivoInput label="Horario de clases" file={horario} onChange={setHorario} icon={CalendarDays} />
              </>
            ) : (
              <>
                <Field label="Nombre completo">
                  <input required className="input" value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} />
                </Field>
                <Field label="Titulo academico">
                  <input className="input" value={form.tituloAcademico} onChange={(e) => setForm({ ...form, tituloAcademico: e.target.value })} />
                </Field>
                <Field label="Area de investigacion">
                  <input className="input" value={form.areaInvestigacion} onChange={(e) => setForm({ ...form, areaInvestigacion: e.target.value })} />
                </Field>
                <Field label="Biografia">
                  <textarea className="input" rows={3} value={form.biografia} onChange={(e) => setForm({ ...form, biografia: e.target.value })} />
                </Field>
                <ArchivoInput
                  label={editingInv?.curriculumRuta ? 'Reemplazar curriculum' : 'Curriculum'}
                  file={curriculum}
                  onChange={setCurriculum}
                  placeholder={editingInv?.curriculumNombreArchivo}
                />
                <ArchivoInput
                  label={editingInv?.horarioRuta ? 'Reemplazar horario de clases' : 'Horario de clases'}
                  file={horario}
                  onChange={setHorario}
                  placeholder={editingInv?.horarioNombreArchivo}
                  icon={CalendarDays}
                />
              </>
            )}
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? ((curriculum || horario) ? 'Subiendo...' : 'Guardando...') : editingId ? 'Guardar cambios' : 'Crear perfil'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {detalle && (
        <Modal title={detalle.nombreCompleto} onClose={() => setDetalle(null)}>
          <div className="space-y-3 text-sm">
            <DetalleCampo label="Titulo academico" valor={detalle.tituloAcademico} />
            <DetalleCampo label="Area de investigacion" valor={detalle.areaInvestigacion} />
            <DetalleCampo label="Usuario" valor={nombrePorUsuarioId.get(detalle.usuarioId) || `#${detalle.usuarioId}`} />
            <DetalleCampo label="Biografia" valor={detalle.biografia} bloque />
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <ArchivoBoton
                disponible={!!detalle.curriculumRuta}
                cargando={viewingId === `curriculum-${detalle.id}`}
                titulo={detalle.curriculumNombreArchivo}
                etiqueta="Currículum"
                onClick={() => handleVerArchivo(detalle, 'curriculum')}
              />
              <ArchivoBoton
                disponible={!!detalle.horarioRuta}
                cargando={viewingId === `horario-${detalle.id}`}
                titulo={detalle.horarioNombreArchivo}
                etiqueta="Horario"
                icon={CalendarDays}
                onClick={() => handleVerArchivo(detalle, 'horario')}
              />
            </div>
            <div className="pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
                <BookOpen className="w-3.5 h-3.5" /> Sus publicaciones ({publicacionesDelDetalle.length})
              </span>
              {publicacionesDelDetalle.length === 0 ? (
                <p className="text-xs text-gray-400">Este docente aun no tiene publicaciones registradas.</p>
              ) : (
                <ul className="space-y-1.5">
                  {publicacionesDelDetalle.map((p) => (
                    <li key={p.id} className="text-xs text-gray-700">
                      <span className="font-semibold">{p.titulo}</span>
                      {p.revista && <span className="text-gray-500"> — {p.revista}</span>}
                      {p.anioPublicacion && <span className="text-gray-400"> ({p.anioPublicacion})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}

function ArchivoBoton({ disponible, cargando, titulo, onClick, icon: Icon = Eye, etiqueta = 'Ver' }) {
  if (!disponible) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-gray-300">
        <Icon className="w-3.5 h-3.5" /> {etiqueta}: sin subir
      </span>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
      title={titulo || etiqueta}
    >
      <Icon className="w-3.5 h-3.5" /> {cargando ? 'Abriendo...' : etiqueta}
    </button>
  )
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3.5 flex items-center gap-3">
      <div className={`bg-gradient-to-br ${color} text-white p-2.5 rounded-lg flex-shrink-0 shadow-sm`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black text-[#052a18] leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1.5 truncate">{label}</p>
      </div>
    </div>
  )
}

function ArchivoInput({ label, file, onChange, placeholder, icon: Icon = FileUp }) {
  return (
    <Field label={label}>
      <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-3 text-xs text-gray-500 cursor-pointer hover:border-[#0e6b3c] hover:text-[#0e6b3c]">
        <Icon className="w-4 h-4 flex-shrink-0" />
        {file ? file.name : (placeholder || 'Subir archivo (PDF, Word, etc.)')}
        <input type="file" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
    </Field>
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
