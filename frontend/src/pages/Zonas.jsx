import { useState, useEffect } from 'react'
import api from '../api/client'
import { toastApiError, toastSuccess } from '../utils/apiToast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import FormCheckbox from '../components/FormCheckbox'
import { cn } from '../lib/cn'

export default function Zonas() {
  const [zonas, setZonas] = useState([])
  const [tarifas, setTarifas] = useState([])
  const [tab, setTab] = useState('zonas')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, item: null, tipo: 'zona' })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchZonas = () => {
    api.get('/zonas/').then(({ data }) => setZonas(data.results ?? data ?? [])).catch(() => [])
  }

  const fetchTarifas = () => {
    api.get('/zonas/tarifas/').then(({ data }) => setTarifas(data.results ?? data ?? [])).catch(() => [])
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchZonas(), fetchTarifas()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'zonas') fetchZonas()
    else fetchTarifas()
  }, [tab, modal.open])

  const isEditing = !!modal.item?.id

  const openCreateZona = () => {
    setModal({ open: true, item: null, tipo: 'zona' })
    setForm({ nombre: '', distrito: '', es_activa: true })
    setErrors({})
  }

  const openEditZona = (z) => {
    setModal({ open: true, item: z, tipo: 'zona' })
    setForm({ nombre: z.nombre, distrito: z.distrito || '', es_activa: z.es_activa ?? true })
    setErrors({})
  }

  const openCreateTarifa = () => {
    setModal({ open: true, item: null, tipo: 'tarifa' })
    setForm({ zona_origen: '', zona_destino: '', distancia_km: '', tarifa_base: '' })
    setErrors({})
  }

  const openEditTarifa = (t) => {
    setModal({ open: true, item: t, tipo: 'tarifa' })
    setForm({
      zona_origen: t.zona_origen,
      zona_destino: t.zona_destino,
      distancia_km: t.distancia_km || '',
      tarifa_base: t.tarifa_base || '',
    })
    setErrors({})
  }

  const closeModal = () => setModal({ open: false, item: null, tipo: null })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmitZona = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = { nombre: form.nombre, distrito: form.distrito, es_activa: form.es_activa }
    const req = isEditing ? api.patch(`/zonas/${modal.item.id}/`, payload) : api.post('/zonas/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Zona actualizada' : 'Zona creada')
        fetchZonas()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleSubmitTarifa = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = {
      zona_origen: parseInt(form.zona_origen),
      zona_destino: parseInt(form.zona_destino),
      distancia_km: form.distancia_km ? parseFloat(form.distancia_km) : null,
      tarifa_base: parseFloat(form.tarifa_base),
    }
    const req = isEditing
      ? api.patch(`/zonas/tarifas/${modal.item.id}/`, payload)
      : api.post('/zonas/tarifas/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Tarifa actualizada' : 'Tarifa creada')
        fetchTarifas()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleDeleteZona = (z) => {
    if (!window.confirm(`¿Eliminar zona ${z.nombre}?`)) return
    api
      .delete(`/zonas/${z.id}/`)
      .then(() => {
        toastSuccess('Zona eliminada')
        fetchZonas()
      })
      .catch((e) => toastApiError(e, 'No se pudo eliminar la zona'))
  }

  const handleDeleteTarifa = (t) => {
    if (!window.confirm(`¿Eliminar tarifa ${t.zona_origen_nombre} → ${t.zona_destino_nombre}?`)) return
    api
      .delete(`/zonas/tarifas/${t.id}/`)
      .then(() => {
        toastSuccess('Tarifa eliminada')
        fetchTarifas()
      })
      .catch((e) => toastApiError(e, 'No se pudo eliminar la tarifa'))
  }

  const zonaCols = [
    { key: 'nombre', label: 'Zona' },
    { key: 'distrito', label: 'Distrito' },
    { key: 'es_activa', label: 'Activa', render: (r) => (r.es_activa ? 'Sí' : 'No') },
  ]
  const tarifaCols = [
    { key: 'zona_origen_nombre', label: 'Origen' },
    { key: 'zona_destino_nombre', label: 'Destino' },
    { key: 'distancia_km', label: 'Km' },
    { key: 'tarifa_base', label: 'Tarifa (Bs)', render: (r) => `Bs ${r.tarifa_base}` },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('zonas')}
            className={cn('tab-pill text-sm', tab === 'zonas' ? 'tab-pill-active' : 'tab-pill-idle')}
          >
            Zonas
          </button>
          <button
            onClick={() => setTab('tarifas')}
            className={cn('tab-pill text-sm', tab === 'tarifas' ? 'tab-pill-active' : 'tab-pill-idle')}
          >
            Tarifas
          </button>
        </div>
        <button
          onClick={tab === 'zonas' ? openCreateZona : openCreateTarifa}
          className="btn-primary"
        >
          + Nuevo
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">{tab === 'zonas' ? 'Zonas' : 'Tarifas entre zonas'}</h1>
      {tab === 'zonas' ? (
        <DataTable
          columns={zonaCols}
          data={zonas}
          loading={loading}
          onEdit={openEditZona}
          onDelete={handleDeleteZona}
        />
      ) : (
        <DataTable
          columns={tarifaCols}
          data={tarifas}
          loading={loading}
          onEdit={openEditTarifa}
          onDelete={handleDeleteTarifa}
        />
      )}

      <Modal
        open={modal.open && modal.tipo === 'zona'}
        onClose={closeModal}
        title={isEditing ? 'Editar zona' : 'Nueva zona'}
      >
        <form onSubmit={handleSubmitZona} className="space-y-4">
          <FormInput label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required error={errors.nombre} />
          <FormInput label="Distrito" name="distrito" value={form.distrito} onChange={handleChange} />
          <FormCheckbox label="Zona activa" name="es_activa" checked={form.es_activa} onChange={handleChange} />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modal.open && modal.tipo === 'tarifa'}
        onClose={closeModal}
        title={isEditing ? 'Editar tarifa' : 'Nueva tarifa'}
      >
        <form onSubmit={handleSubmitTarifa} className="space-y-4">
          <FormSelect
            label="Zona origen"
            name="zona_origen"
            value={form.zona_origen}
            onChange={handleChange}
            required
            options={zonas}
            labelKey="nombre"
            error={errors.zona_origen}
          />
          <FormSelect
            label="Zona destino"
            name="zona_destino"
            value={form.zona_destino}
            onChange={handleChange}
            required
            options={zonas}
            labelKey="nombre"
            error={errors.zona_destino}
          />
          <FormInput
            label="Distancia (km)"
            name="distancia_km"
            type="number"
            step="0.01"
            value={form.distancia_km}
            onChange={handleChange}
          />
          <FormInput
            label="Tarifa base (Bs)"
            name="tarifa_base"
            type="number"
            step="0.01"
            value={form.tarifa_base}
            onChange={handleChange}
            required
            error={errors.tarifa_base}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
