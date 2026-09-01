import { Bell, User, Globe, Shield } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="bg-white text-[#0f172a] w-full border-b border-gray-200 shadow-sm">
      {/* Altura fija del header — el logo sobresale con z-index */}
      <div className="flex items-center justify-between px-4 h-16 relative">

        {/* Logo + Título institucional */}
        <div className="flex items-center gap-3">
          {/* Escudo ESPE — ancho generoso, altura acotada al header */}
          <img
            src="/espe-logo.png"
            alt="Escudo ESPE"
            className="object-contain flex-shrink-0"
            style={{ width: '130px', height: '58px' }}
          />

          <div>
            <h1 className="text-xl font-black text-[#0f172a] tracking-wide leading-tight">
              UNIVERSIDAD DE LAS FUERZAS ARMADAS ESPE
            </h1>
            <p className="text-[11px] text-gray-500 tracking-wider uppercase">
              SISTEMA DE GESTIÓN DOCUMENTAL — LABORATORIO DE INVESTIGACIÓN DE CIBERSEGURIDAD (LICI)
            </p>
          </div>
        </div>

        {/* Controles derechos */}
        <div className="flex items-center gap-5 flex-shrink-0">

          {/* Sello ISO */}
          <div className="flex items-center gap-1 border border-gray-400 rounded px-2 py-1">
            <Shield className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="text-[10px] font-bold text-blue-600 leading-none">ISO</div>
              <div className="text-[10px] font-black text-[#0f172a] leading-none">27001</div>
            </div>
          </div>

          {/* Mi Cuenta */}
          <button className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#0f172a] transition-colors">
            <User className="w-5 h-5" />
            <span className="text-[10px]">Mi Cuenta</span>
          </button>

          {/* Notificaciones */}
          <button className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#0f172a] transition-colors">
            <div className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                1
              </span>
            </div>
            <span className="text-[10px]">Notificaciones</span>
          </button>

          {/* Selector idioma */}
          <button className="flex items-center gap-1 text-gray-600 hover:text-[#0f172a] transition-colors border border-gray-300 rounded px-2 py-1">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">ES</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
