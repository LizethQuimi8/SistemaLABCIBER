import { AlertCircle, Loader2 } from 'lucide-react'

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-black text-[#0f172a] uppercase tracking-wide">{title}</h2>
        <div className="h-0.5 bg-[#1e293b] mt-1 w-48" />
        {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2 mb-3">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  )
}

export function LoadingRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-gray-400 text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        Cargando...
      </td>
    </tr>
  )
}

export function EmptyRow({ colSpan, message = 'Sin registros todavia' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-gray-400 text-xs">
        {message}
      </td>
    </tr>
  )
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`flex items-center gap-2 bg-[#1e293b] hover:bg-[#334155] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

export function Table({ headers, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#1e293b] text-white">
              {headers.map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}
