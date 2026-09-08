import { useCallback } from 'react'
import { Bell, Check } from 'lucide-react'
import { notificacionesApi } from '../api/services'
import { useList } from '../hooks/useList'
import { PageHeader, ErrorBanner, LoadingRow, EmptyRow, Table } from '../components/ui/PageShell'

export default function NotificacionesPage() {
  const fetcher = useCallback(() => notificacionesApi.list(), [])
  const { data, loading, error, reload, setError } = useList(fetcher)

  const marcarLeida = async (id) => {
    try {
      await notificacionesApi.marcarLeida(id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex-1 bg-[#f8fafc] p-5 overflow-y-auto">
      <PageHeader
        title="Notificaciones"
        subtitle="document-workflow-service — cada usuario ve unicamente sus propias notificaciones."
      />

      <ErrorBanner message={error} />

      <Table headers={['Mensaje', 'Tipo', 'Fecha', 'Estado', '']}>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && data.length === 0 && <EmptyRow colSpan={5} message="No tienes notificaciones" />}
        {!loading && data.map((n) => (
          <tr key={n.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!n.leida ? 'bg-blue-50/40' : ''}`}>
            <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-gray-400" /> {n.mensaje}
            </td>
            <td className="px-3 py-2 text-gray-600">{n.tipo || '—'}</td>
            <td className="px-3 py-2 text-gray-500">{n.fecha ? new Date(n.fecha).toLocaleString() : '—'}</td>
            <td className="px-3 py-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${n.leida ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                {n.leida ? 'Leida' : 'Nueva'}
              </span>
            </td>
            <td className="px-3 py-2 text-right">
              {!n.leida && (
                <button onClick={() => marcarLeida(n.id)} className="text-blue-600 hover:text-blue-800" title="Marcar como leida">
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </main>
  )
}
