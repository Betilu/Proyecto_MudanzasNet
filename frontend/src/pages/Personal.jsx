import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import FormCheckbox from '../components/FormCheckbox'
import { useAuth } from '../context/AuthContext'
import { formatApiErrorData, toastApiError, toastSuccess } from '../utils/apiToast'

export default function Personal() {
  const { isAdmin } = useAuth()
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, p: null })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/personal/')
      .then(({ data }) => setPersonal(data.results ?? data ?? []))
      .catch(() => setPersonal([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => fetch(), [])

  const openEdit = (p) => {
    setModal({ open: true, p })
    setForm({
      numero_licencia: p.numero_licencia || '',
      tipo_licencia: p.tipo_licencia || '',
      fecha_ingreso: p.fecha_ingreso ? p.fecha_ingreso.slice(0, 10) : '',
      salario_mensual: p.salario_mensual ?? '',
      esta_disponible: p.esta_disponible ?? true,
    })
    setErrors({})
  }

  const closeModal = () => setModal({ open: false, p: null })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = {
      numero_licencia: form.numero_licencia,
      tipo_licencia: form.tipo_licencia,
      fecha_ingreso: form.fecha_ingreso || null,
      salario_mensual: form.salario_mensual ? parseFloat(form.salario_mensual) : null,
      esta_disponible: form.esta_disponible ?? true,
    }
    api
      .patch(`/personal/${modal.p.id}/`, payload)
      .then(() => {
        toastSuccess('Datos de personal actualizados')
        fetch()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const columns = [
    { key: 'usuario_nombre', label: 'Nombre' },
    { key: 'tipo_personal', label: 'Tipo' },
    { key: 'numero_licencia', label: 'Licencia' },
    { key: 'esta_disponible', label: 'Disponible', render: (r) => (r.esta_disponible ? 'Sí' : 'No') },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Personal</h1>
      <p className="text-slate-400 text-sm mb-4">Para agregar personal, créalo como usuario con rol conductor/cargador en Usuarios.</p>
      <DataTable
        columns={columns}
        data={personal}
        loading={loading}
        onRowClick={isAdmin() ? openEdit : undefined}
        onEdit={isAdmin() ? openEdit : undefined}
      />
      {isAdmin() && (
        <Modal open={modal.open} onClose={closeModal} title={modal.p ? `Editar ${modal.p?.usuario_nombre}` : ''}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {Object.keys(errors).length > 0 && (
              <p className="text-red-400 text-sm whitespace-pre-wrap">{formatApiErrorData(errors)}</p>
            )}
            <FormInput label="Nº Licencia" name="numero_licencia" value={form.numero_licencia} onChange={handleChange} />
            <FormInput label="Tipo licencia" name="tipo_licencia" value={form.tipo_licencia} onChange={handleChange} />
            <FormInput label="Fecha ingreso" name="fecha_ingreso" type="date" value={form.fecha_ingreso} onChange={handleChange} />
            <FormInput label="Salario mensual (Bs)" name="salario_mensual" type="number" step="0.01" value={form.salario_mensual} onChange={handleChange} />
            <FormCheckbox label="Disponible" name="esta_disponible" checked={form.esta_disponible} onChange={handleChange} />
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
