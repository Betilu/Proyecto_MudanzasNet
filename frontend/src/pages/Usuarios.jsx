import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import FormCheckbox from '../components/FormCheckbox'
import FormTextarea from '../components/FormTextarea'
import PermissionGate from '../components/PermissionGate'
import { useAuth } from '../context/AuthContext'
import { toastApiError, toastMessage, toastSuccess } from '../utils/apiToast'
import { cn } from '../lib/cn'

const MODULO_LABELS = {
  usuarios: 'Usuarios',
  crm: 'CRM',
  inventario: 'Inventario',
  reservas: 'Reservas',
  reportes: 'Reportes',
  vehiculos: 'Vehículos',
  pagos: 'Pagos',
  chatbot: 'Chatbot',
  servicios: 'Servicios',
  ui: 'Interfaz (menú / componentes)',
}

export default function Usuarios() {
  const { user, isSystemAdmin, hasPermission } = useAuth()
  const [tab, setTab] = useState('usuarios')
  const [usuarios, setUsuarios] = useState([])
  const [gruposCatalogo, setGruposCatalogo] = useState([])
  const [gruposAdmin, setGruposAdmin] = useState([])
  const [roles, setRoles] = useState([])
  const [permisosCatalogo, setPermisosCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingGrupos, setLoadingGrupos] = useState(false)

  const [modal, setModal] = useState({ open: false, usuario: null })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [grupoModal, setGrupoModal] = useState({ open: false, grupo: null })
  const [grupoForm, setGrupoForm] = useState({})
  const [grupoPermModal, setGrupoPermModal] = useState({ open: false, grupo: null })
  const [selectedGrupoPermisos, setSelectedGrupoPermisos] = useState([])

  const fetchUsuarios = () => {
    setLoading(true)
    api
      .get('/auth/usuarios/')
      .then(({ data }) => setUsuarios(data.results ?? data ?? []))
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false))
  }

  const fetchGruposCatalogo = () => {
    api
      .get('/auth/grupos/')
      .then(({ data }) => setGruposCatalogo(data.results ?? data ?? []))
      .catch(() => setGruposCatalogo([]))
  }

  const fetchGruposAdmin = () => {
    setLoadingGrupos(true)
    api
      .get('/auth/grupos/')
      .then(({ data }) => setGruposAdmin(data.results ?? data ?? []))
      .catch(() => setGruposAdmin([]))
      .finally(() => setLoadingGrupos(false))
  }

  const fetchRoles = () => {
    api
      .get('/auth/roles/')
      .then(({ data }) => setRoles(data.results ?? data ?? []))
      .catch(() => setRoles([]))
  }

  const fetchPermisosCatalogo = () => {
    api
      .get('/auth/permisos/')
      .then(({ data }) => setPermisosCatalogo(data.results ?? data ?? []))
      .catch(() => setPermisosCatalogo([]))
  }

  useEffect(() => {
    fetchUsuarios()
    fetchGruposCatalogo()
    fetchRoles()
  }, [])

  useEffect(() => {
    if (tab === 'grupos' && isSystemAdmin()) {
      fetchGruposAdmin()
      fetchPermisosCatalogo()
    }
  }, [tab, user])

  const isEditing = !!modal.usuario?.id
  const rolNombre = form.rol ? roles.find((r) => r.id === parseInt(form.rol, 10))?.nombre : ''
  const isClienteRol = rolNombre === 'cliente'
  const isPersonalRol = rolNombre === 'conductor' || rolNombre === 'cargador'

  const toggleGrupoId = (id) => {
    setForm((f) => {
      const cur = Array.isArray(f.grupo_ids) ? f.grupo_ids : []
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
      return { ...f, grupo_ids: next }
    })
  }

  const openCreate = () => {
    setModal({ open: true, usuario: null })
    setForm({
      email: '',
      nombre: '',
      apellido: '',
      telefono: '',
      password: '',
      rol: '',
      es_activo: true,
      grupo_ids: [],
      crear_cliente: false,
      crear_personal: false,
      tipo_cliente: 'residencial',
      tipo_personal: 'conductor',
      numero_licencia: '',
      tipo_licencia: '',
      fecha_ingreso: '',
      salario_mensual: '',
    })
    setErrors({})
  }

  const openEdit = (u) => {
    setModal({ open: true, usuario: u })
    setForm({
      email: u.email,
      nombre: u.nombre,
      apellido: u.apellido,
      telefono: u.telefono || '',
      password: '',
      rol: u.rol?.toString() || '',
      es_activo: u.es_activo ?? true,
      grupo_ids: Array.isArray(u.grupos) ? u.grupos.map((g) => g.id) : [],
    })
    setErrors({})
  }

  const closeModal = () => setModal({ open: false, usuario: null })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    const payload = {
      email: form.email,
      nombre: form.nombre,
      apellido: form.apellido,
      telefono: form.telefono || '',
      rol: form.rol ? parseInt(form.rol, 10) : null,
      es_activo: form.es_activo ?? true,
      grupo_ids: Array.isArray(form.grupo_ids) ? form.grupo_ids : [],
    }
    if (!isEditing) {
      if (!form.password) {
        setErrors({ password: 'La contraseña es obligatoria' })
        toastMessage('La contraseña es obligatoria')
        return
      }
      payload.password = form.password
      if (isClienteRol) {
        payload.crear_cliente = true
        payload.tipo_cliente = form.tipo_cliente || 'residencial'
      }
      if (isPersonalRol) {
        payload.crear_personal = true
        payload.tipo_personal = form.tipo_personal || 'conductor'
        payload.numero_licencia = form.numero_licencia || ''
        payload.tipo_licencia = form.tipo_licencia || ''
        payload.fecha_ingreso = form.fecha_ingreso || null
        payload.salario_mensual = form.salario_mensual ? parseFloat(form.salario_mensual) : null
      }
    } else if (form.password) {
      payload.password = form.password
    }

    setSaving(true)
    const req = isEditing
      ? api.patch(`/auth/usuarios/${modal.usuario.id}/`, payload)
      : api.post('/auth/usuarios/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Usuario actualizado' : 'Usuario creado')
        fetchUsuarios()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleDelete = (u) => {
    if (!hasPermission('usuarios.eliminar')) {
      toastMessage('No tienes permiso para eliminar usuarios')
      return
    }
    if (!window.confirm(`¿Eliminar usuario ${u.email}?`)) return
    api
      .delete(`/auth/usuarios/${u.id}/`)
      .then(() => {
        toastSuccess('Usuario eliminado')
        fetchUsuarios()
      })
      .catch((err) => toastApiError(err, 'Error al eliminar'))
  }

  /* ——— Grupos (solo administración del sistema) ——— */
  const isEditingGrupo = !!grupoModal.grupo?.id

  const openGrupoCreate = () => {
    setGrupoModal({ open: true, grupo: null })
    setGrupoForm({ nombre: '', descripcion: '', es_activo: true })
  }

  const openGrupoEdit = (g) => {
    setGrupoModal({ open: true, grupo: g })
    setGrupoForm({ nombre: g.nombre, descripcion: g.descripcion || '', es_activo: g.es_activo ?? true })
  }

  const closeGrupoModal = () => setGrupoModal({ open: false, grupo: null })

  const openGrupoPermisos = async (g) => {
    setGrupoPermModal({ open: true, grupo: g })
    const { data } = await api.get(`/auth/grupos/${g.id}/permisos/`)
    setSelectedGrupoPermisos(Array.isArray(data) ? data.map((p) => p.id) : [])
  }

  const closeGrupoPermModal = () => setGrupoPermModal({ open: false, grupo: null })

  const toggleGrupoPermiso = (id) => {
    setSelectedGrupoPermisos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const toggleGrupoModulo = (modulo) => {
    const ids = permisosCatalogo.filter((p) => p.modulo === modulo).map((p) => p.id)
    const allOn = ids.every((id) => selectedGrupoPermisos.includes(id))
    if (allOn) {
      setSelectedGrupoPermisos((prev) => prev.filter((id) => !ids.includes(id)))
    } else {
      setSelectedGrupoPermisos((prev) => [...new Set([...prev, ...ids])])
    }
  }

  const handleGrupoSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      nombre: grupoForm.nombre,
      descripcion: grupoForm.descripcion,
      es_activo: grupoForm.es_activo,
    }
    const req = isEditingGrupo
      ? api.patch(`/auth/grupos/${grupoModal.grupo.id}/`, payload)
      : api.post('/auth/grupos/', { ...payload, permiso_ids: [] })
    req
      .then(() => {
        toastSuccess(isEditingGrupo ? 'Grupo actualizado' : 'Grupo creado')
        fetchGruposAdmin()
        fetchGruposCatalogo()
        closeGrupoModal()
      })
      .catch((err) => toastApiError(err, 'No se pudo guardar el grupo'))
      .finally(() => setSaving(false))
  }

  const handleSaveGrupoPermisos = () => {
    if (!grupoPermModal.grupo) return
    setSaving(true)
    api
      .put(`/auth/grupos/${grupoPermModal.grupo.id}/permisos/`, { permiso_ids: selectedGrupoPermisos })
      .then(() => {
        toastSuccess('Permisos del grupo actualizados')
        closeGrupoPermModal()
        fetchGruposCatalogo()
      })
      .catch((err) => toastApiError(err, 'No se pudieron guardar los permisos'))
      .finally(() => setSaving(false))
  }

  const handleGrupoDelete = (g) => {
    if (!window.confirm(`¿Eliminar grupo ${g.nombre}?`)) return
    api
      .delete(`/auth/grupos/${g.id}/`)
      .then(() => {
        toastSuccess('Grupo eliminado')
        fetchGruposAdmin()
        fetchGruposCatalogo()
      })
      .catch((err) => toastApiError(err, 'Error al eliminar'))
  }

  const modulosGrupo = [...new Set(permisosCatalogo.map((p) => p.modulo))].sort()

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'rol_nombre', label: 'Rol' },
    {
      key: 'grupos',
      label: 'Grupos',
      render: (r) =>
        Array.isArray(r.grupos) && r.grupos.length
          ? r.grupos.map((g) => g.nombre).join(', ')
          : '—',
    },
    { key: 'es_activo', label: 'Activo', render: (r) => (r.es_activo ? 'Sí' : 'No') },
  ]

  const grupoColumns = [
    { key: 'nombre', label: 'Grupo' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'es_activo', label: 'Activo', render: (r) => (r.es_activo ? 'Sí' : 'No') },
  ]

  const gruposActivos = gruposCatalogo.filter((g) => g.es_activo)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuarios y acceso</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Los <strong>roles</strong> definen el perfil base; los <strong>grupos</strong> suman privilegios extra
            (menú, formularios, botones, etc.) según el catálogo en Roles y permisos. El efectivo es la unión de ambos.
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab('usuarios')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              tab === 'usuarios' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Usuarios
          </button>
          {isSystemAdmin() && (
            <button
              type="button"
              onClick={() => setTab('grupos')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition',
                tab === 'grupos' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              Grupos
            </button>
          )}
        </div>
      </div>

      {tab === 'usuarios' && (
        <>
          <div className="flex justify-end mb-4">
            <PermissionGate perm="usuarios.crear">
              <button type="button" onClick={openCreate} className="btn-primary">
                + Nuevo usuario
              </button>
            </PermissionGate>
          </div>
          <DataTable
            columns={columns}
            data={usuarios}
            loading={loading}
            onEdit={hasPermission('usuarios.editar') ? openEdit : undefined}
            onDelete={hasPermission('usuarios.eliminar') ? handleDelete : undefined}
          />
        </>
      )}

      {tab === 'grupos' && isSystemAdmin() && (
        <>
          <div className="flex justify-end mb-4">
            <button type="button" onClick={openGrupoCreate} className="btn-primary">
              + Nuevo grupo
            </button>
          </div>
          <DataTable
            columns={grupoColumns}
            data={gruposAdmin}
            loading={loadingGrupos}
            onEdit={openGrupoEdit}
            onDelete={handleGrupoDelete}
            extraActions={[{ label: 'Permisos', onClick: openGrupoPermisos }]}
          />
        </>
      )}

      <Modal open={modal.open} onClose={closeModal} title={isEditing ? 'Editar usuario' : 'Nuevo usuario'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              disabled={isEditing}
              error={errors.email}
            />
            <FormInput
              label={isEditing ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!isEditing}
              error={errors.password}
            />
            <FormInput
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              error={errors.nombre}
            />
            <FormInput
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              required
              error={errors.apellido}
            />
            <FormInput
              label="Teléfono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
            />
            <FormSelect
              label="Rol"
              name="rol"
              value={form.rol}
              onChange={handleChange}
              options={roles}
              labelKey="nombre"
              error={errors.rol}
            />
          </div>

          {gruposActivos.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
              <p className="text-sm font-medium text-slate-700">Grupos de acceso adicionales</p>
              <p className="text-xs text-slate-500">
                Los permisos del grupo se suman a los del rol (sin reemplazarlos). Gestiona grupos en la pestaña Grupos.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-2">
                {gruposActivos.map((g) => (
                  <FormCheckbox
                    key={g.id}
                    label={g.nombre}
                    name={`grupo_${g.id}`}
                    checked={Array.isArray(form.grupo_ids) && form.grupo_ids.includes(g.id)}
                    onChange={() => toggleGrupoId(g.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {!isEditing && (
            <>
              {isClienteRol && (
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-2">
                  <FormCheckbox
                    label="Crear perfil de cliente automáticamente"
                    name="crear_cliente"
                    checked={form.crear_cliente}
                    onChange={handleChange}
                  />
                  {form.crear_cliente && (
                    <FormSelect
                      label="Tipo de cliente"
                      name="tipo_cliente"
                      value={form.tipo_cliente}
                      onChange={handleChange}
                      options={[
                        { id: 'residencial', nombre: 'Residencial' },
                        { id: 'empresarial', nombre: 'Empresarial' },
                      ]}
                    />
                  )}
                </div>
              )}
              {isPersonalRol && (
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                  <FormCheckbox
                    label="Crear perfil de personal (conductor/cargador)"
                    name="crear_personal"
                    checked={form.crear_personal}
                    onChange={handleChange}
                  />
                  {form.crear_personal && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSelect
                        label="Tipo"
                        name="tipo_personal"
                        value={form.tipo_personal}
                        onChange={handleChange}
                        options={[
                          { id: 'conductor', nombre: 'Conductor' },
                          { id: 'cargador', nombre: 'Cargador' },
                        ]}
                      />
                      <FormInput
                        label="Fecha de ingreso"
                        name="fecha_ingreso"
                        type="date"
                        value={form.fecha_ingreso}
                        onChange={handleChange}
                        required
                      />
                      <FormInput
                        label="Nº Licencia"
                        name="numero_licencia"
                        value={form.numero_licencia}
                        onChange={handleChange}
                      />
                      <FormInput
                        label="Tipo licencia"
                        name="tipo_licencia"
                        value={form.tipo_licencia}
                        onChange={handleChange}
                      />
                      <FormInput
                        label="Salario mensual (Bs)"
                        name="salario_mensual"
                        type="number"
                        step="0.01"
                        value={form.salario_mensual}
                        onChange={handleChange}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {isEditing && (
            <FormCheckbox
              label="Usuario activo"
              name="es_activo"
              checked={form.es_activo}
              onChange={handleChange}
            />
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeModal} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={grupoModal.open} onClose={closeGrupoModal} title={isEditingGrupo ? 'Editar grupo' : 'Nuevo grupo'}>
        <form onSubmit={handleGrupoSubmit} className="space-y-4">
          <FormInput
            label="Nombre"
            name="nombre"
            value={grupoForm.nombre}
            onChange={(e) => setGrupoForm((f) => ({ ...f, nombre: e.target.value }))}
            required
          />
          <FormTextarea
            label="Descripción"
            name="descripcion"
            value={grupoForm.descripcion}
            onChange={(e) => setGrupoForm((f) => ({ ...f, descripcion: e.target.value }))}
          />
          <FormCheckbox
            label="Grupo activo"
            name="es_activo"
            checked={grupoForm.es_activo}
            onChange={(e) => setGrupoForm((f) => ({ ...f, es_activo: e.target.checked }))}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeGrupoModal} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : isEditingGrupo ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={grupoPermModal.open}
        onClose={closeGrupoPermModal}
        title={`Permisos del grupo: ${grupoPermModal.grupo?.nombre || ''}`}
        size="lg"
      >
        {grupoPermModal.grupo && (
          <div className="space-y-4">
            {modulosGrupo.map((mod) => {
              const modPermisos = permisosCatalogo.filter((p) => p.modulo === mod)
              const allSelected = modPermisos.every((p) => selectedGrupoPermisos.includes(p.id))
              return (
                <div key={mod} className="border border-slate-200 rounded-xl p-4 bg-white">
                  <FormCheckbox
                    label={MODULO_LABELS[mod] || mod}
                    checked={allSelected}
                    onChange={() => toggleGrupoModulo(mod)}
                  />
                  <div className="mt-2 pl-6 space-y-1">
                    {modPermisos.map((p) => (
                      <FormCheckbox
                        key={p.id}
                        label={`${p.nombre} — ${p.descripcion || p.tipo_componente || ''}`}
                        checked={selectedGrupoPermisos.includes(p.id)}
                        onChange={() => toggleGrupoPermiso(p.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={closeGrupoPermModal} className="btn-ghost">
                Cancelar
              </button>
              <button type="button" onClick={handleSaveGrupoPermisos} disabled={saving} className="btn-primary">
                {saving ? 'Guardando...' : 'Guardar permisos'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
