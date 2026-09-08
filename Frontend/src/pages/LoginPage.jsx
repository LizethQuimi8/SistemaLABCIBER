import { useState } from 'react'
import { Shield, LogIn } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-[#1e293b] px-6 py-6 text-center">
          <img
            src="/espe-logo.png"
            alt="Escudo ESPE"
            className="object-contain mx-auto mb-2"
            style={{ width: '110px', height: '50px' }}
          />
          <h1 className="text-white font-black text-sm tracking-wide">
            SISTEMA DE GESTIÓN DOCUMENTAL — LICI
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Correo institucional</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e293b]"
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
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e293b]"
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
            className="w-full flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#334155] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 pt-2">
            <Shield className="w-3.5 h-3.5" />
            Autenticación OAuth2 / JWT — ISO/IEC 27001:2013
          </div>
        </form>
      </div>
    </div>
  )
}
