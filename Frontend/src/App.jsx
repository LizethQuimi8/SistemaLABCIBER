import Navbar    from './components/Navbar'
import SubNav    from './components/SubNav'
import Sidebar   from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Footer    from './components/Footer'

export default function App() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">

      {/* ── Barra superior institucional ── */}
      <Navbar />

      {/* ── Navegación secundaria ── */}
      <SubNav />

      {/* ── Cuerpo principal: sidebar + contenido ── */}
      <div className="flex flex-1">
        <Sidebar />
        <Dashboard />
      </div>

      {/* ── Pie de página — siempre al fondo ── */}
      <Footer />

    </div>
  )
}
