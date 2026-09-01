export default function Footer() {
  return (
    <footer className="bg-[#0f172a] text-gray-400 text-xs border-t border-[#334155]">
      <div className="max-w-full px-6 py-3 space-y-1 text-center">
        <p>
          Contactos:{' '}
          <a href="mailto:contacto@espe.edu.ec" className="text-blue-400 hover:underline">
            contacto@espe.edu.ec
          </a>{' '}
          | Dirección: Universidad de las Fuerzas Armadas ESPE, Av. General Rumiñahui s/n,
          Sangolquí, Ecuador
        </p>
        <p className="flex items-center justify-center gap-3 flex-wrap">
          <a href="#" className="hover:text-white transition-colors">Noticias y Novedades legales</a>
          <span>|</span>
          <a href="#" className="hover:text-white transition-colors">Políticas y términos</a>
          <span>|</span>
          <a href="#" className="hover:text-white transition-colors">Juan-Raticos</a>
        </p>
        <p className="text-gray-500">
          Universidad de las Fuerzas Armadas ESPE — Todos los derechos reservados © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
