import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('access_token')
    if (token) {
      api.get('/auth/perfil/')
        .then(({ data }) => setUser(data))
        .catch(() => sessionStorage.clear())
        .finally(() => setLoading(false))
    } else setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/token/', { email, password })
    sessionStorage.setItem('access_token', data.access)
    sessionStorage.setItem('refresh_token', data.refresh)
    const { data: perfil } = await api.get('/auth/perfil/')
    setUser(perfil)
    return perfil
  }

  const logout = () => {
    sessionStorage.clear()
    setUser(null)
  }

  const register = async (form) => {
    const { data } = await api.post('/auth/registro/', form)
    return login(form.email, form.password)
  }

  const updatePerfil = async (data) => {
    const { data: updated } = await api.patch('/auth/perfil/', data)
    setUser(updated)
    return updated
  }

  const hasRole = (...roles) =>
    user && user.rol_nombre && roles.some((r) => String(user.rol_nombre).toLowerCase() === String(r).toLowerCase())

  /** Staff de operaciones (incluye operador): menú CRM y pantallas operativas. */
  const isAdmin = () => user?.is_staff || hasRole('admin', 'administrador', 'operador')

  /** Solo administración del sistema: roles, permisos, bitácora completa, configuración (W4, W5, W8). */
  const isSystemAdmin = () => Boolean(user?.is_staff || hasRole('admin', 'administrador'))

  const hasPermission = (codigo) => {
    if (!user || !codigo) return false
    if (user.is_superuser) return true
    const list = user.permisos
    if (!Array.isArray(list)) return false
    return list.includes(codigo)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, register, updatePerfil, hasRole, isAdmin, isSystemAdmin, hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
