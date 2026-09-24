import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#052a18] px-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-white px-8 py-9 text-center border-b-4 border-[#0e6b3c]">
          <div className="flex items-center justify-center gap-6 mb-5">
            <img
              src={`${import.meta.env.BASE_URL}espe-logo.png`}
              alt="Escudo ESPE"
              className="object-contain"
              style={{ width: '205px', height: '93px' }}
            />
            <div className="w-px h-24 bg-gray-200" />
            <img
              src={`${import.meta.env.BASE_URL}lici-sello.jpg`}
              alt="Sello Laboratorio de Investigación de Ciberseguridad"
              className="object-contain rounded-full shadow-md"
              style={{ width: '112px', height: '112px' }}
            />
          </div>
          <h1 className="text-[#052a18] font-black text-base tracking-wide">
            SISTEMA DE GESTIÓN DOCUMENTAL
          </h1>
          <p className="text-[#0e6b3c] font-semibold text-[11px] tracking-wide mt-1.5">
            LABORATORIO DE INVESTIGACIÓN DE CIBERSEGURIDAD
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Correo institucional</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e6b3c]"
              placeholder="usuario@espe.edu.ec"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e6b3c]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#0e6b3c] hover:bg-[#16874c] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
