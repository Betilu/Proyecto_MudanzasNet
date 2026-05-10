import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  GitBranch,
  Calendar,
  Truck,
  CreditCard,
  MapPin,
  Wrench,
  Package,
  Bus,
  HardHat,
  MessageCircle,
  BarChart3,
  LineChart,
  UserCircle,
  Shield,
  Settings,
  ScrollText,
  Home,
  FileText,
  Menu,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  User,
  AlertTriangle,
  Archive,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, perm: 'ui.menu.dashboard' },
  { path: '/clientes', label: 'Clientes', icon: Users, perm: 'ui.menu.clientes' },
  { path: '/cotizaciones', label: 'Cotizaciones', icon: ClipboardList, perm: 'ui.menu.cotizaciones' },
  { path: '/crm/pipeline', label: 'Pipeline CRM', icon: GitBranch, perm: 'ui.menu.crm_pipeline' },
  { path: '/reservas', label: 'Reservas', icon: Calendar, perm: 'ui.menu.reservas' },
  { path: '/mudanzas', label: 'Mudanzas', icon: Truck, perm: 'ui.menu.mudanzas' },
  { path: '/pagos', label: 'Pagos', icon: CreditCard, perm: 'ui.menu.pagos' },
  { path: '/zonas', label: 'Zonas', icon: MapPin, perm: 'ui.menu.zonas' },
  { path: '/servicios', label: 'Servicios', icon: Wrench, perm: 'ui.menu.servicios' },
  { path: '/inventario', label: 'Inventario', icon: Package, perm: 'ui.menu.inventario' },
  { path: '/vehiculos', label: 'Vehículos', icon: Bus, perm: 'ui.menu.vehiculos' },
  { path: '/personal', label: 'Personal', icon: HardHat, perm: 'ui.menu.personal' },
  { path: '/chatbot', label: 'Chatbot', icon: MessageCircle, perm: 'ui.menu.chatbot' },
  { path: '/reportes', label: 'Reportes', icon: BarChart3, perm: 'ui.menu.reportes' },
  { path: '/crm/informes', label: 'Informes CRM', icon: LineChart, perm: 'ui.menu.crm_informes' },
  { path: '/incidencias', label: 'Incidencias', icon: AlertTriangle, perm: 'ui.menu.incidencias' },
]

const operativoAdminItems = [{ path: '/usuarios', label: 'Usuarios', icon: UserCircle, perm: 'ui.menu.usuarios' }]

const systemAdminItems = [
  { path: '/roles', label: 'Roles y permisos', icon: Shield, perm: 'ui.menu.roles' },
  { path: '/configuracion', label: 'Configuración', icon: Settings, perm: 'ui.menu.configuracion' },
  { path: '/bitacora', label: 'Bitácora', icon: ScrollText, perm: 'ui.menu.bitacora' },
  { path: '/respaldos', label: 'Respaldos', icon: Archive, perm: 'ui.menu.respaldos' },
]

const clientMenuItems = [
  { path: '/', label: 'Inicio', icon: Home },
  { path: '/mis-cotizaciones', label: 'Mis Cotizaciones', icon: FileText },
  { path: '/mis-reservas', label: 'Mis Reservas', icon: Calendar },
  { path: '/inventario', label: 'Mi inventario', icon: Package },
  { path: '/mis-pagos', label: 'Mis Pagos', icon: CreditCard },
  { path: '/chatbot', label: 'Chat', icon: MessageCircle },
]

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout, isAdmin, isSystemAdmin, hasRole, hasPermission } = useAuth()
  const navigate = useNavigate()

  const isCliente = hasRole('cliente')
  const staffMenu = menuItems.filter((item) => !item.perm || hasPermission(item.perm))
  const adminMenuExtras = operativoAdminItems.filter((item) => !item.perm || hasPermission(item.perm))
  const systemMenuExtras = systemAdminItems.filter((item) => !item.perm || hasPermission(item.perm))
  const items = isCliente
    ? clientMenuItems
    : [...staffMenu, ...(isAdmin() ? adminMenuExtras : []), ...(isSystemAdmin() ? systemMenuExtras : [])]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const NavItems = ({ onNavigate, showLabels }) => (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      {items.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          onClick={() => onNavigate?.()}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 border',
              isActive
                ? 'border-primary-200 bg-gradient-to-r from-primary-100 to-primary-50 text-primary-900 shadow-sm shadow-primary-500/10'
                : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100/90 hover:text-slate-900',
              showLabels ? '' : 'justify-center px-2'
            )
          }
        >
          <Icon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={1.75} />
          {showLabels && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  )

  const SidebarHeader = ({ mobile }) => (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 px-3">
      <Link
        to="/"
        className={cn(
          'flex min-w-0 items-center gap-2 font-bold tracking-tight text-slate-900',
          mobile || sidebarOpen ? 'text-lg' : 'justify-center text-sm'
        )}
        onClick={() => setMobileOpen(false)}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-500/20">
          <Truck className="h-5 w-5 text-white" strokeWidth={2} />
        </span>
        {(mobile || sidebarOpen) && (
          <span className="truncate bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
            CRM Mudanzas
          </span>
        )}
      </Link>
      {!mobile && (
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
        >
          {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
        </button>
      )}
    </div>
  )

  const sidebarInnerMobile = (
    <>
      <SidebarHeader mobile />
      <NavItems onNavigate={() => setMobileOpen(false)} showLabels />
    </>
  )

  const sidebarInnerDesktop = (
    <>
      <SidebarHeader mobile={false} />
      <NavItems showLabels={sidebarOpen} />
    </>
  )

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="auth-blob -top-32 -right-24 h-80 w-80 bg-primary-300/40" />
        <div className="auth-blob -bottom-28 -left-20 h-96 w-96 bg-accent-400/20" />
      </div>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-sm lg:hidden transition-opacity',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          'glass-panel fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-slate-200/90 lg:hidden transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarInnerMobile}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'glass-panel relative z-10 hidden flex-col border-r border-slate-200/90 transition-all duration-200 lg:flex',
          sidebarOpen ? 'w-64' : 'w-[4.5rem]'
        )}
      >
        {sidebarInnerDesktop}
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200/90 bg-white/80 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-sm font-medium text-slate-800 sm:text-base">
              <span className="bg-gradient-to-r from-slate-800 to-primary-700 bg-clip-text text-transparent">Panel</span>
              <span className="hidden text-slate-400 sm:inline"> · </span>
              <span className="hidden font-normal text-slate-500 sm:inline">Gestión de mudanzas</span>
            </h1>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex max-w-[14rem] items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-2 py-1.5 shadow-sm transition hover:border-primary-300/60 hover:bg-white hover:shadow-md sm:px-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white">
                {user?.nombre?.[0] || '?'}
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-medium text-slate-800">
                  {user?.nombre} {user?.apellido}
                </p>
                <p className="truncate text-xs capitalize text-slate-500">{user?.rol_nombre}</p>
              </div>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-52 animate-slide-up rounded-xl border border-slate-200/90 bg-white/95 py-1 shadow-soft-lg backdrop-blur-md">
                  <Link
                    to="/perfil"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-primary-50 hover:text-primary-800"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4 text-primary-600" />
                    Mi perfil
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-error-600 transition hover:bg-error-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
