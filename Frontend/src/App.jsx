import { useState } from 'react'
import Navbar    from './components/Navbar'
import SubNav    from './components/SubNav'
import Sidebar   from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Footer    from './components/Footer'
import LoginPage from './pages/LoginPage'
import ProyectosPage from './pages/ProyectosPage'
import InvestigadoresPage from './pages/InvestigadoresPage'
import PublicacionesPage from './pages/PublicacionesPage'
import DocumentosPage from './pages/DocumentosPage'
import NotificacionesPage from './pages/NotificacionesPage'
import InventarioPage from './pages/InventarioPage'
import ComprasPage from './pages/ComprasPage'
import UsuariosPage from './pages/UsuariosPage'
import ReportesPage from './pages/ReportesPage'
import { AuthProvider, useAuth } from './context/AuthContext'

const VIEWS = {
  dashboard: Dashboard,
  proyectos: ProyectosPage,
  investigadores: InvestigadoresPage,
  publicaciones: PublicacionesPage,
  documentos: DocumentosPage,
  notificaciones: NotificacionesPage,
  inventario: InventarioPage,
  compras: ComprasPage,
  usuarios: UsuariosPage,
  reportes: ReportesPage,
}

function AuthenticatedApp() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAdmin } = useAuth()

  // Si el rol pierde acceso a un modulo (p. ej. tras cambiar de usuario), volver al dashboard.
  const view = currentView === 'usuarios' && !isAdmin ? 'dashboard' : currentView
  const ActiveView = VIEWS[view] || Dashboard

  const navigate = (nextView) => {
    setCurrentView(nextView)
    setSidebarOpen(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f3faf6]">
      <Navbar onNavigate={navigate} />
      <SubNav currentView={view} onNavigate={navigate} onToggleMenu={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 min-w-0">
        <Sidebar currentView={view} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 min-w-0">
          <ActiveView onNavigate={navigate} />
        </div>
      </div>

      <Footer />
    </div>
  )
}

function Gate() {
  const { usuario } = useAuth()
  return usuario ? <AuthenticatedApp /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
