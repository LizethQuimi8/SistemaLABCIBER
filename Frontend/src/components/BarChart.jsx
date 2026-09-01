// Gráfica de barras simulada con Tailwind CSS
// Representa "Proyectos de proyectos" del dashboard LICI

const chartData = [
  { label: 'Sumario',      value: 280, color: 'bg-green-500' },
  { label: 'Proyectos',    value: 310, color: 'bg-green-500' },
  { label: 'Documento',    value: 120, color: 'bg-green-500' },
  { label: 'Proyecto',     value: 260, color: 'bg-green-500' },
  { label: 'Facilitador',  value:  55, color: 'bg-red-500'   },
  { label: 'Consultor',    value:  40, color: 'bg-red-500'   },
  { label: 'Publicación',  value: 200, color: 'bg-blue-500'  },
]

const MAX_VALUE = 340
const CHART_HEIGHT = 140 // px

export default function BarChart() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
      {/* Leyenda */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
          <span className="text-gray-600">Proyectos de proyectos</span>
        </div>
      </div>

      {/* Área del gráfico */}
      <div className="flex gap-1 items-end" style={{ height: CHART_HEIGHT }}>
        {/* Eje Y */}
        <div className="flex flex-col justify-between text-right pr-1 text-[9px] text-gray-400 select-none"
             style={{ height: CHART_HEIGHT }}>
          {[300, 250, 200, 150, 100, 50, 0].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>

        {/* Barras */}
        <div className="flex-1 flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
          {chartData.map(({ label, value, color }) => {
            const heightPct = (value / MAX_VALUE) * 100
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                <div
                  className={`w-full ${color} rounded-t-sm transition-all duration-500 hover:opacity-80 cursor-pointer`}
                  style={{ height: `${heightPct}%` }}
                  title={`${label}: ${value}`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Eje X — etiquetas */}
      <div className="flex gap-1.5 mt-1 pl-7">
        {chartData.map(({ label }) => (
          <div key={label} className="flex-1 text-center text-[8px] text-gray-500 truncate"
               style={{ maxWidth: 40 }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
