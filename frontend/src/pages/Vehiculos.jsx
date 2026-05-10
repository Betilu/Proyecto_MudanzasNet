import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import { useAuth } from '../context/AuthContext'
import { toastApiError, toastSuccess } from '../utils/apiToast'

export default function Vehiculos() {
  const { isAdmin } = useAuth()
  const [vehiculos, setVehiculos] = useState([])
  const [contenedores, setContenedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, v: null })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/vehiculos/')
      .then(({ data }) => setVehiculos(data.results ?? data ?? []))
      .catch(() => setVehiculos([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
    if (isAdmin()) {
      api.get('/vehiculos/contenedores/').then(({ data }) => setContenedores(data.results ?? data ?? [])).catch(() => {})
    }
  }, [])

  const isEditing = !!modal.v?.id

  const openCreate = () => {
    setModal({ open: true, v: null })
    setForm({
      tipo_contenedor: '',
      placa: '',
      marca: '',
      modelo: '',
      anio: '',
      color: '',
      kilometraje_actual: 0,
      estado: 'disponible',
      foto_url: '',
    })
    setErrors({})
  }

  const openEdit = (v) => {
    setModal({ open: true, v })
    setForm({
      tipo_contenedor: v.tipo_contenedor,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio || '',
      color: v.color || '',
      kilometraje_actual: v.kilometraje_actual ?? 0,
      estado: v.estado || 'disponible',
      foto_url: v.foto_url || '',
    })
    setErrors({})
  }

  const closeModal = () => setModal({ open: false, v: null })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = {
      tipo_contenedor: parseInt(form.tipo_contenedor),
      placa: form.placa,
      marca: form.marca,
      modelo: form.modelo,
      anio: form.anio ? parseInt(form.anio) : null,
      color: form.color || '',
      kilometraje_actual: parseInt(form.kilometraje_actual) || 0,
      estado: form.estado,
      foto_url: form.foto_url || '',
    }
    const req = isEditing ? api.patch(`/vehiculos/${modal.v.id}/`, payload) : api.post('/vehiculos/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Vehículo actualizado' : 'Vehículo registrado')
        fetch()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleDelete = (v) => {
    if (!window.confirm(`¿Eliminar vehículo ${v.placa}?`)) return
    api
      .delete(`/vehiculos/${v.id}/`)
      .then(() => {
        toastSuccess('Vehículo eliminado')
        fetch()
      })
      .catch((e) => toastApiError(e, 'Error al eliminar'))
  }

  const columns = [
    { key: 'placa', label: 'Placa' },
    { key: 'marca', label: 'Marca' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'tipo_contenedor_nombre', label: 'Contenedor' },
    { key: 'estado', label: 'Estado' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehículos</h1>
        {isAdmin() && (
          <button onClick={openCreate} className="btn-primary">
            + Nuevo vehículo
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={vehiculos}
        loading={loading}
        onRowClick={isAdmin() ? openEdit : undefined}
        onEdit={isAdmin() ? openEdit : undefined}
        onDelete={isAdmin() ? handleDelete : undefined}
      />
      {isAdmin() && (
        <Modal open={modal.open} onClose={closeModal} title={isEditing ? 'Editar vehículo' : 'Nuevo vehículo'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormSelect
              label="Tipo contenedor"
              name="tipo_contenedor"
              value={form.tipo_contenedor}
              onChange={handleChange}
              required
              options={contenedores}
              labelKey="nombre"
              error={errors.tipo_contenedor}
            />
            <FormInput label="Placa" name="placa" value={form.placa} onChange={handleChange} required disabled={isEditing} error={errors.placa} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Marca" name="marca" value={form.marca} onChange={handleChange} required />
              <FormInput label="Modelo" name="modelo" value={form.modelo} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Año" name="anio" type="number" value={form.anio} onChange={handleChange} />
              <FormInput label="Color" name="color" value={form.color} onChange={handleChange} />
            </div>
            <FormInput label="Kilometraje" name="kilometraje_actual" type="number" value={form.kilometraje_actual} onChange={handleChange} />
            <FormSelect
              label="Estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              options={[
                { id: 'disponible', nombre: 'Disponible' },
                { id: 'en_servicio', nombre: 'En Servicio' },
                { id: 'en_mantenimiento', nombre: 'En Mantenimiento' },
                { id: 'inactivo', nombre: 'Inactivo' },
              ]}
            />
            <FormInput label="URL foto" name="foto_url" value={form.foto_url} onChange={handleChange} />
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
