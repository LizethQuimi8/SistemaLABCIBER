export default function Navbar() {
  return (
    <header className="bg-white text-[#052a18] w-full border-b border-gray-200 shadow-sm relative z-20">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:h-16 sm:py-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}espe-logo.png`}
            alt="Escudo ESPE"
            className="object-contain flex-shrink-0 w-16 h-7 sm:w-[130px] sm:h-[58px]"
          />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-xl font-black text-[#052a18] tracking-wide leading-tight truncate sm:whitespace-normal">
              UNIVERSIDAD DE LAS FUERZAS ARMADAS ESPE
            </h1>
            <p className="hidden sm:block text-[11px] text-gray-500 tracking-wider uppercase">
              SISTEMA DE GESTIÓN DOCUMENTAL — LABORATORIO DE INVESTIGACIÓN DE CIBERSEGURIDAD
            </p>
          </div>
        </div>

        <img
          src={`${import.meta.env.BASE_URL}lici-sello.jpg`}
          alt="Sello Laboratorio de Investigación de Ciberseguridad"
          className="object-contain rounded-full flex-shrink-0 w-8 h-8 sm:w-[52px] sm:h-[52px]"
        />
      </div>
    </header>
  )
}
