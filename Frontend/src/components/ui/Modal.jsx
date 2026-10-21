import { X } from 'lucide-react'

export default function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#0e6b3c] to-[#052a18] rounded-t-xl">
          <h3 className="text-white text-sm font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
