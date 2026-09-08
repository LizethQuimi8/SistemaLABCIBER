// Grafica de barras con datos reales agregados por el reporting-service.
import { Loader2 } from 'lucide-react'

const CHART_HEIGHT = 140 // px

export default function BarChart({ data = [], loading = false }) {
  const maxValue = Math.max(1, ...data.map((d) => d.value))
  const axisSteps = 5
  const axisValues = Array.from({ length: axisSteps + 1 }, (_, i) => Math.round((maxValue / axisSteps) * (axisSteps - i)))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
      <div className="flex items-center gap-3 mb-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
          <span className="text-gray-600">Conteo por modulo (datos reales)</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center text-gray-400 text-xs" style={{ height: CHART_HEIGHT }}>
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <>
          <div className="flex gap-1 items-end" style={{ height: CHART_HEIGHT }}>
            <div className="flex flex-col justify-between text-right pr-1 text-[9px] text-gray-400 select-none"
                 style={{ height: CHART_HEIGHT }}>
              {axisValues.map((v, i) => <span key={i}>{v}</span>)}
            </div>

            <div className="flex-1 flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
              {data.map(({ label, value, color }) => {
                const heightPct = (value / maxValue) * 100
                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                    <div
                      className={`w-full ${color} rounded-t-sm transition-all duration-500 hover:opacity-80 cursor-pointer`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                      title={`${label}: ${value}`}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-1.5 mt-1 pl-7">
            {data.map(({ label }) => (
              <div key={label} className="flex-1 text-center text-[8px] text-gray-500 truncate" style={{ maxWidth: 40 }}>
                {label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
