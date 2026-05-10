import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, roles, denyRoles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (denyRoles?.length) {
    const rol = String(user.rol_nombre || '').toLowerCase()
    const denied = denyRoles.map((r) => String(r).toLowerCase())
    if (!user.is_staff && denied.includes(rol)) {
      return <Navigate to="/" replace />
    }
  }

  if (roles) {
    const rol = String(user.rol_nombre || '').toLowerCase()
    const allowed = roles.map((r) => String(r).toLowerCase())
    if (!user.is_staff && !allowed.includes(rol)) {
      return <Navigate to="/" replace />
    }
  }

  return children
}
