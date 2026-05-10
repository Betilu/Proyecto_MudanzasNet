import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import FormTextarea from '../components/FormTextarea'
import { useAuth } from '../context/AuthContext'
import { toastApiError, toastSuccess } from '../utils/apiToast'
import { cn } from '../lib/cn'

const TIPOS_FOTO = [
  { id: 'antes_traslado', nombre: 'Antes del traslado (evidencia inicial)' },
  { id: 'despues_traslado', nombre: 'Después del traslado' },
  { id: 'incidencia', nombre: 'Incidencia' },
]

export default function Inventario() {
  const { hasPermission, hasRole } = useAuth()
  const esCliente = hasRole('cliente')
  const puedeCatAdmin = () => hasPermission('inventario.admin_categorias')
  const puedeVer = () => hasPermission('inventario.ver') || hasPermission('inventario.registrar_objetos')
  const puedeObjetos = () => hasPermission('inventario.registrar_objetos') || hasPermission('inventario.editar')
  const puedeFotos = () => hasPermission('inventario.fotos_objeto') || hasPermission('inventario.editar')
  const puedeActa = () => hasPermission('inventario.acta_pretraslado') || hasPermission('inventario.ver')

  const [categorias, setCategorias] = useState([])
  const [objetos, setObjetos] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [servicios, setServicios] = useState([])
  const [tab, setTab] = useState('objetos')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, item: null, tipo: 'categoria' })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [fotoForm, setFotoForm] = useState({ objeto: '', tipo_foto: 'antes_traslado', descripcion: '' })
  const [fotoFile, setFotoFile] = useState(null)

  const [entregaModal, setEntregaModal] = useState({ open: false, servicio: null })
  const [entregaObs, setEntregaObs] = useState('')
  const [entregaFirma, setEntregaFirma] = useState(null)
  const [entregaFotos, setEntregaFotos] = useState([])
  const [actaCotId, setActaCotId] = useState('')

  const fetchCategorias = () =>
    api.get('/inventario/categorias/').then(({ data }) => setCategorias(data.results ?? data ?? [])).catch(() => [])
  const fetchObjetos = () =>
    api.get('/inventario/objetos/').then(({ data }) => setObjetos(data.results ?? data ?? [])).catch(() => [])
  const fetchCotizaciones = () =>
    api.get('/cotizaciones/').then(({ data }) => setCotizaciones(data.results ?? data ?? [])).catch(() => [])
  const fetchServicios = () =>
    api.get('/mudanzas/').then(({ data }) => setServicios(data.results ?? data ?? [])).catch(() => [])

  useEffect(() => {
    if (!puedeVer()) return
    setLoading(true)
    Promise.all([fetchCategorias(), fetchObjetos(), fetchCotizaciones()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'entrega' && puedeVer()) fetchServicios()
  }, [tab])

  useEffect(() => {
    if (!modal.open) return
    if (modal.tipo === 'categorias') fetchCategorias()
    if (modal.tipo === 'objetos') fetchObjetos()
  }, [modal.open, modal.tipo])

  const isEditing = !!modal.item?.id

  const openCreateCategoria = () => {
    setModal({ open: true, item: null, tipo: 'categorias' })
    setForm({ nombre: '', descripcion: '', fragilidad_default: 'media', icono: '' })
    setErrors({})
  }
  const openEditCategoria = (c) => {
    setModal({ open: true, item: c, tipo: 'categorias' })
    setForm({
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      fragilidad_default: c.fragilidad_default || 'media',
      icono: c.icono || '',
    })
    setErrors({})
  }

  const openCreateObjeto = () => {
    setModal({ open: true, item: null, tipo: 'objetos' })
    setForm({
      cotizacion: '',
      categoria: '',
      nombre: '',
      descripcion: '',
      largo_cm: '',
      ancho_cm: '',
      alto_cm: '',
      peso_kg: '',
      fragilidad: 'media',
      cantidad: 1,
    })
    setErrors({})
  }
  const openEditObjeto = (o) => {
    setModal({ open: true, item: o, tipo: 'objetos' })
    setForm({
      cotizacion: o.cotizacion,
      categoria: o.categoria || '',
      nombre: o.nombre,
      descripcion: o.descripcion || '',
      largo_cm: o.largo_cm ?? '',
      ancho_cm: o.ancho_cm ?? '',
      alto_cm: o.alto_cm ?? '',
      peso_kg: o.peso_kg ?? '',
      fragilidad: o.fragilidad || 'media',
      cantidad: o.cantidad ?? 1,
    })
    setErrors({})
  }

  const closeModal = () => setModal({ open: false, item: null, tipo: null })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmitCategoria = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = { nombre: form.nombre, descripcion: form.descripcion, fragilidad_default: form.fragilidad_default, icono: form.icono }
    const req = isEditing
      ? api.patch(`/inventario/categorias/${modal.item.id}/`, payload)
      : api.post('/inventario/categorias/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Categoría actualizada' : 'Categoría creada')
        fetchCategorias()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleSubmitObjeto = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = {
      cotizacion: parseInt(form.cotizacion, 10),
      categoria: form.categoria ? parseInt(form.categoria, 10) : null,
      nombre: form.nombre,
      descripcion: form.descripcion,
      largo_cm: form.largo_cm === '' ? null : parseFloat(form.largo_cm),
      ancho_cm: form.ancho_cm === '' ? null : parseFloat(form.ancho_cm),
      alto_cm: form.alto_cm === '' ? null : parseFloat(form.alto_cm),
      peso_kg: parseFloat(form.peso_kg) || 0,
      fragilidad: form.fragilidad || 'media',
      cantidad: parseInt(form.cantidad, 10) || 1,
    }
    const req = isEditing
      ? api.patch(`/inventario/objetos/${modal.item.id}/`, payload)
      : api.post('/inventario/objetos/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Objeto actualizado' : 'Objeto registrado')
        fetchObjetos()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleDeleteCategoria = (c) => {
    if (!window.confirm(`¿Eliminar categoría ${c.nombre}?`)) return
    api
      .delete(`/inventario/categorias/${c.id}/`)
      .then(() => {
        toastSuccess('Categoría eliminada')
        fetchCategorias()
      })
      .catch((e) => toastApiError(e, 'No se pudo eliminar'))
  }
  const handleDeleteObjeto = (o) => {
    if (!window.confirm(`¿Eliminar objeto ${o.nombre}?`)) return
    api
      .delete(`/inventario/objetos/${o.id}/`)
      .then(() => {
        toastSuccess('Objeto eliminado')
        fetchObjetos()
      })
      .catch((e) => toastApiError(e, 'No se pudo eliminar'))
  }

  const descargarActa = (cotizacionId) => {
    api
      .get(`/inventario/cotizaciones/${cotizacionId}/acta-pretraslado/`, { responseType: 'blob' })
      .then(({ data }) => {
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = `acta_pretraslado_${cotizacionId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        toastSuccess('Acta descargada')
      })
      .catch((err) => toastApiError(err, 'No se pudo generar el acta'))
  }

  const subirFoto = (e) => {
    e.preventDefault()
    if (!fotoForm.objeto || !fotoFile) return
    const fd = new FormData()
    fd.append('objeto', fotoForm.objeto)
    fd.append('tipo_foto', fotoForm.tipo_foto)
    fd.append('descripcion', fotoForm.descripcion || '')
    fd.append('foto', fotoFile)
    api
      .post('/inventario/fotos/', fd)
      .then(() => {
        setFotoFile(null)
        setFotoForm({ objeto: '', tipo_foto: 'antes_traslado', descripcion: '' })
        toastSuccess('Foto registrada')
      })
      .catch((err) => toastApiError(err, 'Error al subir foto'))
  }

  const enviarConfirmacionEntrega = (e) => {
    e.preventDefault()
    if (!entregaModal.servicio) return
    const fd = new FormData()
    fd.append('observaciones', entregaObs)
    fd.append('cliente_conforme', 'true')
    if (entregaFirma) fd.append('firma_digital', entregaFirma)
    entregaFotos.forEach((f) => fd.append('fotos_entrega', f))
    api
      .post(`/mudanzas/${entregaModal.servicio.id}/confirmar_entrega/`, fd)
      .then(() => {
        setEntregaModal({ open: false, servicio: null })
        setEntregaObs('')
        setEntregaFirma(null)
        setEntregaFotos([])
        fetchServicios()
        toastSuccess('Entrega confirmada')
      })
      .catch((err) => toastApiError(err, 'Error al confirmar entrega'))
  }

  const catCols = [
    { key: 'nombre', label: 'Categoría' },
    { key: 'fragilidad_default', label: 'Fragilidad' },
  ]
  const objCols = [
    { key: 'nombre', label: 'Objeto' },
    { key: 'categoria_nombre', label: 'Categoría' },
    {
      key: 'dimensiones',
      label: 'Tamaño (cm)',
      render: (r) =>
        r.largo_cm && r.ancho_cm && r.alto_cm ? `${r.largo_cm}×${r.ancho_cm}×${r.alto_cm}` : '—',
    },
    { key: 'peso_kg', label: 'Peso (kg)' },
    { key: 'fragilidad', label: 'Fragilidad' },
    { key: 'cantidad', label: 'Cant.' },
    { key: 'rf_nivel_riesgo', label: 'Riesgo (RF)', render: (r) => r.rf_nivel_riesgo || '—' },
  ]

  const srvCols = [
    { key: 'id', label: 'Servicio' },
    { key: 'reserva_codigo', label: 'Reserva' },
    { key: 'estado', label: 'Estado' },
  ]

  if (!puedeVer()) {
    return <p className="text-slate-500">No tienes permiso para ver el inventario digital.</p>
  }

  const tabs = [{ id: 'objetos', label: 'Objetos' }]
  if (puedeCatAdmin()) tabs.unshift({ id: 'categorias', label: 'Categorías' })
  if (puedeFotos()) tabs.push({ id: 'fotos', label: 'Fotos' })
  if (puedeActa()) tabs.push({ id: 'acta', label: 'Acta PDF' })
  if (esCliente || hasPermission('inventario.confirmar_entrega')) tabs.push({ id: 'entrega', label: 'Confirmar entrega' })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Inventario digital de objetos</h1>
      <p className="text-slate-500 text-sm mb-6">
        Registro detallado, fotos, acta pre-traslado (PDF), riesgo RF y confirmación con firma.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn('tab-pill text-sm', tab === t.id ? 'tab-pill-active' : 'tab-pill-idle')}
          >
            {t.label}
          </button>
        ))}
        {puedeObjetos() && tab === 'objetos' && (
          <button
            type="button"
            onClick={openCreateObjeto}
            className="ml-auto btn-primary text-sm"
          >
            + Nuevo objeto
          </button>
        )}
        {puedeCatAdmin() && tab === 'categorias' && (
          <button
            type="button"
            onClick={openCreateCategoria}
            className="ml-auto btn-primary text-sm"
          >
            + Nueva categoría
          </button>
        )}
      </div>

      {tab === 'categorias' && puedeCatAdmin() && (
        <DataTable columns={catCols} data={categorias} loading={loading} onEdit={openEditCategoria} onDelete={handleDeleteCategoria} />
      )}

      {tab === 'objetos' && (
        <DataTable
          columns={objCols}
          data={objetos}
          loading={loading}
          onEdit={puedeObjetos() ? openEditObjeto : undefined}
          onDelete={puedeObjetos() ? handleDeleteObjeto : undefined}
        />
      )}

      {tab === 'fotos' && puedeFotos() && (
        <div className="max-w-lg space-y-4 border border-slate-800 rounded-xl p-4">
          <h2 className="font-semibold text-slate-200">Carga de fotos por objeto (W19)</h2>
          <form onSubmit={subirFoto} className="space-y-3">
            <FormSelect
              label="Objeto"
              value={fotoForm.objeto}
              onChange={(e) => setFotoForm({ ...fotoForm, objeto: e.target.value })}
              options={objetos}
              valueKey="id"
              labelKey={(o) => `${o.nombre} (#${o.id})`}
            />
            <FormSelect
              label="Tipo"
              value={fotoForm.tipo_foto}
              onChange={(e) => setFotoForm({ ...fotoForm, tipo_foto: e.target.value })}
              options={TIPOS_FOTO}
            />
            <FormTextarea
              label="Descripción"
              value={fotoForm.descripcion}
              onChange={(e) => setFotoForm({ ...fotoForm, descripcion: e.target.value })}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
              className="text-sm text-slate-400"
            />
            <button type="submit" className="btn-primary text-sm">
              Subir foto
            </button>
          </form>
        </div>
      )}

      {tab === 'acta' && puedeActa() && (
        <div className="max-w-lg space-y-4 border border-slate-800 rounded-xl p-4">
          <h2 className="font-semibold text-slate-200">Acta digital pre-traslado (W20)</h2>
          <p className="text-slate-500 text-sm">Genera un PDF con el inventario y referencia a fotos registradas.</p>
          <FormSelect
            label="Cotización"
            value={actaCotId}
            onChange={(e) => setActaCotId(e.target.value)}
            options={cotizaciones}
            valueKey="id"
            labelKey={(c) => `#${c.id} — ${c.cliente_nombre || ''}`}
          />
          <button
            type="button"
            onClick={() => actaCotId && descargarActa(actaCotId)}
            disabled={!actaCotId}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm disabled:opacity-40"
          >
            Descargar PDF
          </button>
        </div>
      )}

      {tab === 'entrega' && (
        <div>
          <p className="text-slate-500 text-sm mb-4">
            Firma digital (imagen PNG/JPG) y fotos del estado final (W22). También puedes reportar incidencias desde el detalle del servicio en Mudanzas.
          </p>
          <DataTable
            columns={srvCols}
            data={servicios.filter((s) => s.estado === 'completado')}
            loading={false}
            extraActions={[
              {
                label: 'Confirmar entrega',
                onClick: (row) => setEntregaModal({ open: true, servicio: row }),
              },
            ]}
          />
        </div>
      )}

      <Modal open={modal.open && modal.tipo === 'categorias'} onClose={closeModal} title={isEditing ? 'Editar categoría' : 'Nueva categoría'}>
        <form onSubmit={handleSubmitCategoria} className="space-y-4">
          <FormInput label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required error={errors.nombre} />
          <FormTextarea label="Descripción" name="descripcion" value={form.descripcion} onChange={handleChange} />
          <FormSelect
            label="Fragilidad por defecto"
            name="fragilidad_default"
            value={form.fragilidad_default}
            onChange={handleChange}
            options={[
              { id: 'baja', nombre: 'Baja' },
              { id: 'media', nombre: 'Media' },
              { id: 'alta', nombre: 'Alta' },
            ]}
          />
          <FormInput label="Icono" name="icono" value={form.icono} onChange={handleChange} />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeModal} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={modal.open && modal.tipo === 'objetos'} onClose={closeModal} title={isEditing ? 'Editar objeto' : 'Nuevo objeto'} size="lg">
        <form onSubmit={handleSubmitObjeto} className="space-y-4">
          <FormSelect
            label="Cotización"
            name="cotizacion"
            value={form.cotizacion}
            onChange={handleChange}
            required
            disabled={isEditing}
            options={cotizaciones}
            labelKey={(c) => `#${c.id} - ${c.cliente_nombre || 'Cliente'}`}
          />
          <FormSelect label="Categoría (opcional; el sistema puede sugerirla)" name="categoria" value={form.categoria} onChange={handleChange} options={categorias} labelKey="nombre" />
          <FormInput label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
          <FormTextarea label="Descripción" name="descripcion" value={form.descripcion} onChange={handleChange} />
          <div className="grid grid-cols-3 gap-2">
            <FormInput label="Largo (cm)" name="largo_cm" type="number" step="0.01" value={form.largo_cm} onChange={handleChange} />
            <FormInput label="Ancho (cm)" name="ancho_cm" type="number" step="0.01" value={form.ancho_cm} onChange={handleChange} />
            <FormInput label="Alto (cm)" name="alto_cm" type="number" step="0.01" value={form.alto_cm} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Peso (kg)" name="peso_kg" type="number" step="0.01" value={form.peso_kg} onChange={handleChange} required />
            <FormSelect
              label="Fragilidad"
              name="fragilidad"
              value={form.fragilidad}
              onChange={handleChange}
              options={[
                { id: 'baja', nombre: 'Baja' },
                { id: 'media', nombre: 'Media' },
                { id: 'alta', nombre: 'Alta' },
              ]}
            />
            <FormInput label="Cantidad" name="cantidad" type="number" min="1" value={form.cantidad} onChange={handleChange} />
          </div>
          <p className="text-slate-500 text-xs">Tras guardar se recalculan categoría sugerida (W18) y riesgo RF (W23).</p>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeModal} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={entregaModal.open}
        onClose={() => setEntregaModal({ open: false, servicio: null })}
        title={`Confirmar entrega — servicio #${entregaModal.servicio?.id || ''}`}
        size="lg"
      >
        <form onSubmit={enviarConfirmacionEntrega} className="space-y-4">
          <FormTextarea label="Observaciones" value={entregaObs} onChange={(e) => setEntregaObs(e.target.value)} />
          <div>
            <label className="block text-sm text-slate-400 mb-1">Firma digital (imagen)</label>
            <input type="file" accept="image/*" onChange={(e) => setEntregaFirma(e.target.files?.[0] || null)} className="text-sm" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Fotos estado final</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setEntregaFotos(Array.from(e.target.files || []))}
              className="text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium">
            Enviar confirmación
          </button>
        </form>
      </Modal>
    </div>
  )
}
