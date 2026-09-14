import { useCallback, useMemo, useState } from 'react'
import { Plus, Trash2, FileText, Eye, Upload } from 'lucide-react'
import { documentosApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, PrimaryButton, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

const TIPOS = ['MEMORANDO', 'OFICIO', 'INFORME', 'OTRO']
const ESTADOS = ['BORRADOR', 'PENDIENTE_FIRMA', 'FIRMADO', 'ARCHIVADO']
const FORM_INICIAL = { titulo: '', tipo: 'MEMORANDO', firmanteId: '', estado: 'BORRADOR' }

export default function DocumentosPage() {
  const fetcher = useCallback(() => documentosApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [archivo, setArchivo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingId, setViewingId] = useState(null)

  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const documento = await documentosApi.create({ ...form, firmanteId: form.firmanteId ? Number(form.firmanteId) : null })
      if (archivo) {
        await documentosApi.subirArchivo(documento.id, archivo)
      }
      setShowForm(false)
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
    if (!confirm('¿Eliminar este documento?')) return
    try {
      await documentosApi.remove(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVer = async (documento) => {
    setViewingId(documento.id)
    setError(null)
    try {
      const blob = await documentosApi.verArchivo(documento.id)
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
        title="Documentos y Correspondencia"
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nuevo documento
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Table headers={['Titulo', 'Tipo', 'Estado', 'Responsable', 'Propietario', 'Archivo', '']}>
        {loading && <LoadingRow colSpan={7} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={7} />}
        {!loading && data.map((d) => (
          <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> {d.titulo}
            </td>
            <td className="px-3 py-2 text-gray-600">{d.tipo}</td>
            <td className="px-3 py-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">{d.estado}</span>
            </td>
            <td className="px-3 py-2 text-gray-600">{d.firmanteId ? (nombrePorUsuarioId.get(d.firmanteId) || `#${d.firmanteId}`) : '—'}</td>
            <td className="px-3 py-2 text-gray-600">{nombrePorUsuarioId.get(d.usuarioId) || `#${d.usuarioId}`}</td>
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
            <td className="px-3 py-2 text-right">
              <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showForm && (
        <Modal title="Nuevo documento" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Titulo">
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Archivo">
              <input
                type="file"
                className="input"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
            </Field>
            <Field label="Responsable (opcional)">
              <select className="input" value={form.firmanteId} onChange={(e) => setForm({ ...form, firmanteId: e.target.value })}>
                <option value="">Sin asignar</option>
                {directorio.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                ))}
              </select>
            </Field>
            <PrimaryButton type="submit" disabled={saving} className="w-full justify-center">
              {saving ? (archivo ? 'Subiendo...' : 'Guardando...') : (
                <>
                  {archivo && <Upload className="w-4 h-4" />} Crear documento
                </>
              )}
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
