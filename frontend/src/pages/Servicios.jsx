import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormTextarea from '../components/FormTextarea'
import FormCheckbox from '../components/FormCheckbox'
import { toastApiError, toastSuccess } from '../utils/apiToast'
import { cn } from '../lib/cn'

export default function Servicios() {
  const [tipos, setTipos] = useState([])
  const [adicionales, setAdicionales] = useState([])
  const [tab, setTab] = useState('tipos')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, item: null, tipo: 'tipo' })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchTipos = () => api.get('/servicios/tipos/').then(({ data }) => setTipos(data.results ?? data ?? [])).catch(() => [])
  const fetchAdicionales = () => api.get('/servicios/adicionales/').then(({ data }) => setAdicionales(data.results ?? data ?? [])).catch(() => [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTipos(), fetchAdicionales()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'tipos') fetchTipos()
    else fetchAdicionales()
  }, [tab, modal.open])

  const isEditing = !!modal.item?.id

  const openCreateTipo = () => {
    setModal({ open: true, item: null, tipo: 'tipo' })
    setForm({ nombre: '', descripcion: '', factor_precio: 1, incluye_embalaje: false, incluye_montaje: false, incluye_desmontaje: false, es_activo: true })
    setErrors({})
  }

  const openEditTipo = (t) => {
    setModal({ open: true, item: t, tipo: 'tipo' })
    setForm({
      nombre: t.nombre,
      descripcion: t.descripcion || '',
      factor_precio: t.factor_precio ?? 1,
      incluye_embalaje: t.incluye_embalaje ?? false,
      incluye_montaje: t.incluye_montaje ?? false,
      incluye_desmontaje: t.incluye_desmontaje ?? false,
      es_activo: t.es_activo ?? true,
    })
    setErrors({})
  }

  const openCreateAdicional = () => {
    setModal({ open: true, item: null, tipo: 'adicional' })
    setForm({ nombre: '', descripcion: '', precio: '', es_por_objeto: false, es_activo: true })
    setErrors({})
  }

  const openEditAdicional = (a) => {
    setModal({ open: true, item: a, tipo: 'adicional' })
    setForm({
      nombre: a.nombre,
      descripcion: a.descripcion || '',
      precio: a.precio ?? '',
      es_por_objeto: a.es_por_objeto ?? false,
      es_activo: a.es_activo ?? true,
    })
    setErrors({})
  }

  const closeModal = () => setModal({ open: false, item: null, tipo: null })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmitTipo = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      factor_precio: parseFloat(form.factor_precio) || 1,
      incluye_embalaje: form.incluye_embalaje,
      incluye_montaje: form.incluye_montaje,
      incluye_desmontaje: form.incluye_desmontaje,
      es_activo: form.es_activo,
    }
    const req = isEditing ? api.patch(`/servicios/tipos/${modal.item.id}/`, payload) : api.post('/servicios/tipos/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Tipo de servicio actualizado' : 'Tipo de servicio creado')
        fetchTipos()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleSubmitAdicional = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: parseFloat(form.precio) || 0,
      es_por_objeto: form.es_por_objeto,
      es_activo: form.es_activo,
    }
    const req = isEditing ? api.patch(`/servicios/adicionales/${modal.item.id}/`, payload) : api.post('/servicios/adicionales/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Servicio adicional actualizado' : 'Servicio adicional creado')
        fetchAdicionales()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleDeleteTipo = (t) => {
    if (!window.confirm(`¿Eliminar tipo ${t.nombre}?`)) return
    api
      .delete(`/servicios/tipos/${t.id}/`)
      .then(() => {
        toastSuccess('Tipo eliminado')
        fetchTipos()
      })
      .catch((e) => toastApiError(e, 'Error al eliminar'))
  }

  const handleDeleteAdicional = (a) => {
    if (!window.confirm(`¿Eliminar servicio ${a.nombre}?`)) return
    api
      .delete(`/servicios/adicionales/${a.id}/`)
      .then(() => {
        toastSuccess('Servicio adicional eliminado')
        fetchAdicionales()
      })
      .catch((e) => toastApiError(e, 'Error al eliminar'))
  }

  const tipoCols = [
    { key: 'nombre', label: 'Tipo' },
    { key: 'factor_precio', label: 'Factor' },
    { key: 'es_activo', label: 'Activo', render: (r) => (r.es_activo ? 'Sí' : 'No') },
  ]
  const adicCols = [
    { key: 'nombre', label: 'Servicio' },
    { key: 'precio', label: 'Precio (Bs)', render: (r) => `Bs ${r.precio}` },
    { key: 'es_por_objeto', label: 'Por objeto', render: (r) => (r.es_por_objeto ? 'Sí' : 'No') },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab('tipos')} className={cn('tab-pill text-sm', tab === 'tipos' ? 'tab-pill-active' : 'tab-pill-idle')}>
            Tipos de servicio
          </button>
          <button type="button" onClick={() => setTab('adicionales')} className={cn('tab-pill text-sm', tab === 'adicionales' ? 'tab-pill-active' : 'tab-pill-idle')}>
            Servicios adicionales
          </button>
        </div>
        <button onClick={tab === 'tipos' ? openCreateTipo : openCreateAdicional} className="btn-primary">+ Nuevo</button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Servicios</h1>
      {tab === 'tipos' ? (
        <DataTable columns={tipoCols} data={tipos} loading={loading} onEdit={openEditTipo} onDelete={handleDeleteTipo} />
      ) : (
        <DataTable columns={adicCols} data={adicionales} loading={loading} onEdit={openEditAdicional} onDelete={handleDeleteAdicional} />
      )}

      <Modal open={modal.open && modal.tipo === 'tipo'} onClose={closeModal} title={isEditing ? 'Editar tipo' : 'Nuevo tipo de servicio'}>
        <form onSubmit={handleSubmitTipo} className="space-y-4">
          <FormInput label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required error={errors.nombre} />
          <FormTextarea label="Descripción" name="descripcion" value={form.descripcion} onChange={handleChange} />
          <FormInput label="Factor precio" name="factor_precio" type="number" step="0.01" value={form.factor_precio} onChange={handleChange} required />
          <div className="flex gap-4">
            <FormCheckbox label="Incluye embalaje" name="incluye_embalaje" checked={form.incluye_embalaje} onChange={handleChange} />
            <FormCheckbox label="Incluye montaje" name="incluye_montaje" checked={form.incluye_montaje} onChange={handleChange} />
            <FormCheckbox label="Incluye desmontaje" name="incluye_desmontaje" checked={form.incluye_desmontaje} onChange={handleChange} />
            <FormCheckbox label="Activo" name="es_activo" checked={form.es_activo} onChange={handleChange} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal.open && modal.tipo === 'adicional'} onClose={closeModal} title={isEditing ? 'Editar servicio adicional' : 'Nuevo servicio adicional'}>
        <form onSubmit={handleSubmitAdicional} className="space-y-4">
          <FormInput label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required error={errors.nombre} />
          <FormTextarea label="Descripción" name="descripcion" value={form.descripcion} onChange={handleChange} />
          <FormInput label="Precio (Bs)" name="precio" type="number" step="0.01" value={form.precio} onChange={handleChange} required error={errors.precio} />
          <FormCheckbox label="Precio por objeto" name="es_por_objeto" checked={form.es_por_objeto} onChange={handleChange} />
          <FormCheckbox label="Activo" name="es_activo" checked={form.es_activo} onChange={handleChange} />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
