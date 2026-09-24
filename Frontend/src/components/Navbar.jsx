export default function Navbar() {
  return (
    <header className="bg-white text-[#052a18] w-full border-b border-gray-200 shadow-sm relative z-20">
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}espe-logo.png`}
            alt="Escudo ESPE"
            className="object-contain flex-shrink-0"
            style={{ width: '130px', height: '58px' }}
          />
          <div>
            <h1 className="text-xl font-black text-[#052a18] tracking-wide leading-tight">
              UNIVERSIDAD DE LAS FUERZAS ARMADAS ESPE
            </h1>
            <p className="text-[11px] text-gray-500 tracking-wider uppercase">
              SISTEMA DE GESTIÓN DOCUMENTAL — LABORATORIO DE INVESTIGACIÓN DE CIBERSEGURIDAD
            </p>
          </div>
        </div>

        <img
          src={`${import.meta.env.BASE_URL}lici-sello.jpg`}
          alt="Sello Laboratorio de Investigación de Ciberseguridad"
          className="object-contain rounded-full flex-shrink-0"
          style={{ width: '52px', height: '52px' }}
        />
      </div>
    </header>
  )
}
