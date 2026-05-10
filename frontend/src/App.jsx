import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'

import Login from './pages/auth/Login'
import Registro from './pages/auth/Registro'
import RecuperarContrasena from './pages/auth/RecuperarContrasena'
import RestablecerContrasena from './pages/auth/RestablecerContrasena'
import Dashboard from './pages/Dashboard'
import Perfil from './pages/Perfil'
import Clientes from './pages/Clientes'
import Cotizaciones from './pages/Cotizaciones'
import Reservas from './pages/Reservas'
import Mudanzas from './pages/Mudanzas'
import Pagos from './pages/Pagos'
import Zonas from './pages/Zonas'
import Servicios from './pages/Servicios'
import Inventario from './pages/Inventario'
import Vehiculos from './pages/Vehiculos'
import Personal from './pages/Personal'
import Chatbot from './pages/Chatbot'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'
import Roles from './pages/Roles'
import Configuracion from './pages/Configuracion'
import Bitacora from './pages/Bitacora'
import Respaldos from './pages/Respaldos'
import MisCotizaciones from './pages/MisCotizaciones'
import MisReservas from './pages/MisReservas'
import MisPagos from './pages/MisPagos'
import CrmPipeline from './pages/CrmPipeline'
import CrmInformes from './pages/CrmInformes'
import Incidencias from './pages/Incidencias'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/registro" element={user ? <Navigate to="/" replace /> : <Registro />} />
      <Route
        path="/recuperar-contrasena"
        element={user ? <Navigate to="/" replace /> : <RecuperarContrasena />}
      />
      <Route
        path="/restablecer-contrasena"
        element={user ? <Navigate to="/" replace /> : <RestablecerContrasena />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/clientes" element={<ProtectedRoute denyRoles={['cliente']}><Clientes /></ProtectedRoute>} />
                <Route path="/crm/pipeline" element={<ProtectedRoute denyRoles={['cliente']}><CrmPipeline /></ProtectedRoute>} />
                <Route path="/crm/informes" element={<ProtectedRoute denyRoles={['cliente']}><CrmInformes /></ProtectedRoute>} />
                <Route path="/cotizaciones" element={<ProtectedRoute denyRoles={['cliente']}><Cotizaciones /></ProtectedRoute>} />
                <Route path="/reservas" element={<ProtectedRoute denyRoles={['cliente']}><Reservas /></ProtectedRoute>} />
                <Route path="/mudanzas" element={<ProtectedRoute denyRoles={['cliente']}><Mudanzas /></ProtectedRoute>} />
                <Route path="/incidencias" element={<ProtectedRoute denyRoles={['cliente']}><Incidencias /></ProtectedRoute>} />
                <Route path="/pagos" element={<ProtectedRoute denyRoles={['cliente']}><Pagos /></ProtectedRoute>} />
                <Route path="/zonas" element={<ProtectedRoute denyRoles={['cliente']}><Zonas /></ProtectedRoute>} />
                <Route path="/servicios" element={<ProtectedRoute denyRoles={['cliente']}><Servicios /></ProtectedRoute>} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/vehiculos" element={<ProtectedRoute denyRoles={['cliente']}><Vehiculos /></ProtectedRoute>} />
                <Route path="/personal" element={<ProtectedRoute denyRoles={['cliente']}><Personal /></ProtectedRoute>} />
                <Route path="/chatbot" element={<Chatbot />} />
                <Route path="/reportes" element={<ProtectedRoute denyRoles={['cliente']}><Reportes /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute denyRoles={['cliente']} roles={['admin', 'administrador', 'operador']}><Usuarios /></ProtectedRoute>} />
                <Route path="/roles" element={<ProtectedRoute denyRoles={['cliente']} roles={['admin', 'administrador']}><Roles /></ProtectedRoute>} />
                <Route path="/configuracion" element={<ProtectedRoute denyRoles={['cliente']} roles={['admin', 'administrador']}><Configuracion /></ProtectedRoute>} />
                <Route path="/bitacora" element={<ProtectedRoute denyRoles={['cliente']} roles={['admin', 'administrador']}><Bitacora /></ProtectedRoute>} />
                <Route path="/respaldos" element={<ProtectedRoute denyRoles={['cliente']} roles={['admin', 'administrador']}><Respaldos /></ProtectedRoute>} />
                <Route path="/mis-cotizaciones" element={<MisCotizaciones />} />
                <Route path="/mis-reservas" element={<MisReservas />} />
                <Route path="/mis-pagos" element={<MisPagos />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

const toastOptions = {
  duration: 4500,
  style: {
    background: 'rgb(15 23 42 / 0.96)',
    color: '#f8fafc',
    border: '1px solid rgb(51 65 85 / 0.9)',
    maxWidth: '28rem',
  },
  success: {
    iconTheme: { primary: '#0ea5e9', secondary: '#0f172a' },
  },
  error: {
    iconTheme: { primary: '#f87171', secondary: '#0f172a' },
  },
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={toastOptions} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
