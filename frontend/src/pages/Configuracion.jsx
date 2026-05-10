import { useState, useEffect } from 'react'
import api from '../api/client'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import { useAuth } from '../context/AuthContext'

export default function Configuracion() {
  const { isAdmin } = useAuth()
  const [config, setConfig] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, item: null })
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/auth/configuracion/')
      .then(({ data }) => setConfig(data.results ?? data ?? []))
      .catch(() => setConfig([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => fetch(), [])

  const openEdit = (c) => {
    setModal({ open: true, item: c })
    setForm({ valor: c.valor })
  }

  const closeModal = () => setModal({ open: false, item: null })

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    api
      .patch(`/auth/configuracion/${modal.item.id}/`, { valor: form.valor })
      .then(() => { fetch(); closeModal() })
      .finally(() => setSaving(false))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configuración del sistema</h1>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : config.length === 0 ? (
        <p className="text-slate-400">No hay configuración disponible</p>
      ) : (
        <div className="space-y-2">
          {config.map((c) => (
            <div
              key={c.clave}
              className={`p-4 bg-slate-800 rounded-lg flex justify-between items-center ${isAdmin() ? 'cursor-pointer hover:bg-slate-750' : ''}`}
              onClick={() => isAdmin() && openEdit(c)}
            >
              <div>
                <span className="font-mono text-primary-400">{c.clave}</span>
                {c.descripcion && <p className="text-slate-500 text-sm mt-1">{c.descripcion}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-300">{c.valor}</span>
                {isAdmin() && <span className="text-slate-500 text-sm">Editar</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin() && (
        <Modal open={modal.open} onClose={closeModal} title={modal.item ? `Editar: ${modal.item?.clave}` : ''}>
          {modal.item && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Valor"
                name="valor"
                value={form.valor}
                onChange={(e) => setForm({ valor: e.target.value })}
              />
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
