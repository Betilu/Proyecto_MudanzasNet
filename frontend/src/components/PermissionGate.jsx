import { useAuth } from '../context/AuthContext'

/**
 * Muestra children solo si el usuario tiene el permiso indicado (rol + grupos).
 * Sin `perm`, renderiza siempre children.
 */
export default function PermissionGate({ perm, children, fallback = null }) {
  const { hasPermission } = useAuth()
  if (!perm) return children
  if (hasPermission(perm)) return children
  return fallback
}
