import { useCallback, useMemo, useState } from 'react'
import { Bell, Check, Info } from 'lucide-react'
import { notificacionesApi, prestamosApi, inventarioApi, usuariosApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, Table } from '../components/ui/PageShell'
import Modal from '../components/ui/Modal'

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

export default function NotificacionesPage() {
  const fetcher = useCallback(() => notificacionesApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)
  const bienesFetcher = useCallback(() => inventarioApi.list(), [])
  const { data: bienes } = useList(bienesFetcher)
  const directorioFetcher = useCallback(() => usuariosApi.directorio(), [])
  const { data: directorio } = useList(directorioFetcher)

  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(null)

  const nombrePorBienId = useMemo(() => new Map(bienes.map((b) => [b.id, b.nombre])), [bienes])
  const nombrePorUsuarioId = useMemo(
    () => new Map(directorio.map((u) => [u.id, `${u.nombres} ${u.apellidos}`])),
    [directorio]
  )

  const marcarLeida = async (id) => {
    try {
      await notificacionesApi.marcarLeida(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const verDetalle = async (n) => {
    setCargandoDetalle(n.id)
    setError(null)
    try {
      const prestamo = await prestamosApi.obtener(n.referenciaId)
      setDetalle(prestamo)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoDetalle(null)
    }
  }

  return (
    <main className="flex-1 bg-[#f3faf6] p-5 overflow-y-auto">
      <PageHeader
        title="Notificaciones"
      />

      <ErrorBanner message={error} />

      <Table headers={['Mensaje', 'Tipo', 'Fecha', 'Estado', '']}>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={5} message="No tienes notificaciones" />}
        {!loading && data.map((n) => (
          <tr key={n.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!n.leida ? 'bg-green-50/40' : ''}`}>
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-gray-400" /> {n.mensaje}
            </td>
            <td className="px-3 py-2 text-gray-600">{n.tipo || '—'}</td>
            <td className="px-3 py-2 text-gray-500">{n.fecha ? new Date(n.fecha).toLocaleString() : '—'}</td>
            <td className="px-3 py-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${n.leida ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                {n.leida ? 'Leida' : 'Nueva'}
              </span>
            </td>
            <td className="px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-3">
                {n.referenciaId && (
                  <button
                    onClick={() => verDetalle(n)}
                    disabled={cargandoDetalle === n.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e6b3c] hover:text-[#052a18] disabled:text-gray-300"
                  >
                    <Info className="w-3.5 h-3.5" /> {cargandoDetalle === n.id ? 'Cargando...' : 'Detalle'}
                  </button>
                )}
                {!n.leida && (
                  <button onClick={() => marcarLeida(n.id)} className="text-[#0e6b3c] hover:text-[#052a18]" title="Marcar como leida">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {detalle && (
        <Modal title="Detalle de la solicitud de préstamo" onClose={() => setDetalle(null)}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <DetalleCampo label="Bien" valor={nombrePorBienId.get(detalle.bienId) || `#${detalle.bienId}`} />
              <DetalleCampo label="Solicitante" valor={nombrePorUsuarioId.get(detalle.usuarioId) || `#${detalle.usuarioId}`} />
              <DetalleCampo label="Desde" valor={detalle.fechaDesde} />
              <DetalleCampo label="Hasta" valor={detalle.fechaHasta} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 mb-0.5">Estado</span>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRESTAMO_ESTADO_BADGE[detalle.estado] || 'bg-gray-100 text-gray-600'}`}>
                {PRESTAMO_ESTADO_LABEL[detalle.estado] || detalle.estado}
              </span>
            </div>
            <DetalleCampo label="Motivo" valor={detalle.motivo} bloque />
            <DetalleCampo label="Observaciones" valor={detalle.observaciones} bloque />
            {detalle.fechaDevolucion && (
              <DetalleCampo label="Devuelto" valor={new Date(detalle.fechaDevolucion).toLocaleString()} />
            )}
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
