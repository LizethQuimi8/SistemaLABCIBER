export default function Footer() {
  return (
    <footer className="bg-[#052a18] text-gray-400 text-xs border-t border-[#16874c]">
      <div className="max-w-full px-6 py-3 space-y-1 text-center">
        <p>
          Contactos:{' '}
          <a href="mailto:contacto@espe.edu.ec" className="text-brand-gold hover:underline">
            contacto@espe.edu.ec
          </a>{' '}
          | Dirección: Universidad de las Fuerzas Armadas ESPE, Av. General Rumiñahui s/n,
          Sangolquí, Ecuador
        </p>
        <p className="text-gray-500">
          Universidad de las Fuerzas Armadas ESPE — Todos los derechos reservados © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
