import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, UserCheck, FileUp, Eye, Info, CalendarDays } from 'lucide-react'
import { investigadoresApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { useAuth } from '../context/AuthContext'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

const FORM_INICIAL = { nombreCompleto: '', tituloAcademico: '', areaInvestigacion: '', biografia: '', usuarioId: '' }

export default function InvestigadoresPage() {
  const { isAdmin } = useAuth()
  const fetcher = useCallback(() => investigadoresApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
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
        action={
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nuevo perfil
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Docente', 'Curriculum', 'Horario de clases', 'Detalle', '']}>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && data.map((inv) => (
          <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-gray-400" /> {inv.nombreCompleto}
            </td>
            <td className="px-3 py-2">
              <ArchivoBoton
                disponible={!!inv.curriculumRuta}
                cargando={viewingId === `curriculum-${inv.id}`}
                titulo={inv.curriculumNombreArchivo}
                onClick={() => handleVerArchivo(inv, 'curriculum')}
              />
            </td>
            <td className="px-3 py-2">
              <ArchivoBoton
                disponible={!!inv.horarioRuta}
                cargando={viewingId === `horario-${inv.id}`}
                titulo={inv.horarioNombreArchivo}
                icon={CalendarDays}
                onClick={() => handleVerArchivo(inv, 'horario')}
              />
            </td>
            <td className="px-3 py-2">
              <button
                onClick={() => setDetalle(inv)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#0e6b3c]"
              >
                <Info className="w-3.5 h-3.5" /> Detalle
              </button>
            </td>
            <td className="px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => openEdit(inv)} className="text-gray-500 hover:text-[#052a18]" title="Editar">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

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
                <ArchivoInput label="Curriculum (opcional)" file={curriculum} onChange={setCurriculum} />
                <ArchivoInput label="Horario de clases (opcional)" file={horario} onChange={setHorario} icon={CalendarDays} />
                <p className="text-[11px] text-gray-400">
                  El titulo academico, area de investigacion y biografia se pueden completar despues editando el perfil.
                </p>
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
                  label={editingInv?.curriculumRuta ? 'Reemplazar curriculum (opcional)' : 'Curriculum (opcional)'}
                  file={curriculum}
                  onChange={setCurriculum}
                  placeholder={editingInv?.curriculumNombreArchivo}
                />
                <ArchivoInput
                  label={editingInv?.horarioRuta ? 'Reemplazar horario de clases (opcional)' : 'Horario de clases (opcional)'}
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
                etiqueta="Ver curriculum"
                onClick={() => handleVerArchivo(detalle, 'curriculum')}
              />
              <ArchivoBoton
                disponible={!!detalle.horarioRuta}
                cargando={viewingId === `horario-${detalle.id}`}
                titulo={detalle.horarioNombreArchivo}
                etiqueta="Ver horario"
                icon={CalendarDays}
                onClick={() => handleVerArchivo(detalle, 'horario')}
              />
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}

function ArchivoBoton({ disponible, cargando, titulo, onClick, icon: Icon = Eye, etiqueta = 'Ver' }) {
  if (!disponible) return <span className="text-gray-400 text-xs">Sin subir</span>
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
