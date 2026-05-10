import { useState, useEffect } from 'react'
import api from '../api/client'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormTextarea from '../components/FormTextarea'
import FormSelect from '../components/FormSelect'
import { useAuth } from '../context/AuthContext'

export default function Chatbot() {
  const { isAdmin } = useAuth()
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, item: null })
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')

  const fetch = () => {
    setLoading(true)
    api.get('/chatbot/faqs/')
      .then(({ data }) => setFaqs(data.results ?? data ?? []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => fetch(), [])

  const openCreate = () => {
    setModal({ open: true, item: null })
    setForm({ pregunta: '', respuesta: '', categoria: 'precios', palabras_clave: '', es_activa: true })
  }

  const openEdit = (faq) => {
    setModal({ open: true, item: faq })
    setForm({
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      categoria: faq.categoria,
      palabras_clave: Array.isArray(faq.palabras_clave) ? faq.palabras_clave.join(', ') : '',
      es_activa: faq.es_activa,
    })
  }

  const closeModal = () => setModal({ open: false, item: null })

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      pregunta: form.pregunta,
      respuesta: form.respuesta,
      categoria: form.categoria,
      palabras_clave: form.palabras_clave ? form.palabras_clave.split(',').map(p => p.trim()).filter(Boolean) : [],
      es_activa: form.es_activa,
    }

    const promise = modal.item
      ? api.patch(`/chatbot/faqs/${modal.item.id}/`, payload)
      : api.post('/chatbot/faqs/', payload)

    promise
      .then(() => { fetch(); closeModal() })
      .finally(() => setSaving(false))
  }

  const handleDelete = (id) => {
    if (!window.confirm('¿Eliminar esta FAQ?')) return
    api.delete(`/chatbot/faqs/${id}/`).then(() => fetch())
  }

  const categorias = ['todas', 'precios', 'zonas', 'servicios', 'políticas']
  const faqsFiltradas = categoriaFiltro === 'todas'
    ? faqs
    : faqs.filter(f => f.categoria === categoriaFiltro)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">FAQs del Chatbot</h1>
        {isAdmin() && (
          <button
            onClick={openCreate}
            className="btn-primary"
          >
            Nueva FAQ
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaFiltro(cat)}
            className={`tab-pill px-3 py-1.5 text-xs font-medium sm:text-sm ${
              categoriaFiltro === cat ? 'tab-pill-active' : 'tab-pill-idle'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : faqsFiltradas.length === 0 ? (
        <p className="text-slate-400">No hay FAQs disponibles</p>
      ) : (
        <div className="space-y-3">
          {faqsFiltradas.map((faq) => (
            <div
              key={faq.id}
              className="p-4 bg-slate-800 rounded-lg border border-slate-700"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-soft-primary">{faq.categoria}</span>
                    {!faq.es_activa && <span className="badge-soft-danger">Inactiva</span>}
                  </div>
                  <p className="font-medium text-slate-200">{faq.pregunta}</p>
                </div>
                {isAdmin() && (
                  <div className="flex gap-2 ml-4">
                    <button type="button" onClick={() => openEdit(faq)} className="btn-table-action py-1 text-xs">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(faq.id)} className="btn-table-danger py-1 text-xs">
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-sm mb-2">{faq.respuesta}</p>
              {faq.palabras_clave && faq.palabras_clave.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {faq.palabras_clave.map((palabra, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                      {palabra}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-slate-500 text-xs mt-2">
                Consultada {faq.veces_consultada} veces
              </p>
            </div>
          ))}
        </div>
      )}

      {isAdmin() && (
        <Modal
          open={modal.open}
          onClose={closeModal}
          title={modal.item ? 'Editar FAQ' : 'Nueva FAQ'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormSelect
              label="Categoría"
              required
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              options={[
                { id: 'precios', nombre: 'Precios' },
                { id: 'zonas', nombre: 'Zonas de cobertura' },
                { id: 'servicios', nombre: 'Tipos de servicio' },
                { id: 'políticas', nombre: 'Políticas de cancelación' },
              ]}
            />
            <FormTextarea
              label="Pregunta"
              required
              value={form.pregunta}
              onChange={(e) => setForm({ ...form, pregunta: e.target.value })}
              rows={2}
            />
            <FormTextarea
              label="Respuesta"
              required
              value={form.respuesta}
              onChange={(e) => setForm({ ...form, respuesta: e.target.value })}
              rows={4}
            />
            <FormInput
              label="Palabras clave (separadas por comas)"
              value={form.palabras_clave}
              onChange={(e) => setForm({ ...form, palabras_clave: e.target.value })}
              placeholder="precio, costo, tarifa"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.es_activa}
                onChange={(e) => setForm({ ...form, es_activa: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-slate-300">FAQ activa</label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
