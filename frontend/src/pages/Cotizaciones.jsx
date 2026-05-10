import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import MapPicker, { DEFAULT_MAP_CENTER } from '../components/maps/MapPicker'
import MapTwoPoints from '../components/maps/MapTwoPoints'
import { useAuth } from '../context/AuthContext'
import { toastApiError, toastMessage, toastSuccess } from '../utils/apiToast'
import { nominatimSearch, nominatimToLatLng } from '../utils/nominatim'
import { PAGE_SIZE, parsePagedResponse } from '../utils/paging'

export default function Cotizaciones() {
  const { hasRole, isAdmin } = useAuth()
  const isCliente = hasRole('cliente')
  const [searchParams, setSearchParams] = useSearchParams()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, cot: null })
  const [formModal, setFormModal] = useState({ open: false, cot: null })
  const [clientes, setClientes] = useState([])
  const [zonas, setZonas] = useState([])
  const [tiposServicio, setTiposServicio] = useState([])
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(null) // 'origen' | 'destino' | null
  const [origenLatLng, setOrigenLatLng] = useState(null)
  const [destinoLatLng, setDestinoLatLng] = useState(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [serviciosAdicionalesCatalogo, setServiciosAdicionalesCatalogo] = useState([])
  const [extraForm, setExtraForm] = useState({ servicioId: '', cantidad: 1 })

  const fetch = () => {
    setLoading(true)
    api
      .get('/cotizaciones/', { params: { page } })
      .then(({ data }) => {
        const { results, count } = parsePagedResponse(data)
        setCotizaciones(results)
        setTotalCount(count)
      })
      .catch(() => {
        setCotizaciones([])
        setTotalCount(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
  }, [page])

  /** Enlace desde CRM (ficha cliente): ?cotizacion=123 */
  useEffect(() => {
    if (isCliente) return
    const raw = searchParams.get('cotizacion')
    if (!raw) return
    const id = parseInt(raw, 10)
    if (Number.isNaN(id)) return
    let cancelled = false
    api
      .get(`/cotizaciones/${id}/`)
      .then(({ data }) => {
        if (cancelled || !data) return
        setModal({ open: true, cot: data })
        const next = new URLSearchParams(searchParams)
        next.delete('cotizacion')
        setSearchParams(next, { replace: true })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isCliente, searchParams, setSearchParams])

  useEffect(() => {
    if (!isCliente) {
      api.get('/clientes/').then(({ data }) => setClientes(data.results ?? data ?? [])).catch(() => {})
      api.get('/zonas/').then(({ data }) => setZonas(data.results ?? data ?? [])).catch(() => {})
      api.get('/servicios/tipos/').then(({ data }) => setTiposServicio(data.results ?? data ?? [])).catch(() => {})
    }
  }, [isCliente])

  useEffect(() => {
    api
      .get('/servicios/adicionales/')
      .then(({ data }) => setServiciosAdicionalesCatalogo(data.results ?? data ?? []))
      .catch(() => setServiciosAdicionalesCatalogo([]))
  }, [])

  const isEditing = !!formModal.cot?.id

  const openCreate = () => {
    setFormModal({ open: true, cot: null })
    setOrigenLatLng(null)
    setDestinoLatLng(null)
    setForm({
      cliente: '',
      direccion_origen: '',
      zona_origen: '',
      direccion_destino: '',
      zona_destino: '',
      tipo_servicio: '',
      fecha_deseada: '',
      franja_horaria: '',
    })
    setErrors({})
  }

  const openEdit = (c) => {
    if (c.estado !== 'borrador') return
    setFormModal({ open: true, cot: c })
    setOrigenLatLng(
      c.latitud_origen != null && c.longitud_origen != null
        ? { lat: Number(c.latitud_origen), lng: Number(c.longitud_origen) }
        : null
    )
    setDestinoLatLng(
      c.latitud_destino != null && c.longitud_destino != null
        ? { lat: Number(c.latitud_destino), lng: Number(c.longitud_destino) }
        : null
    )
    setForm({
      cliente: c.cliente,
      direccion_origen: c.direccion_origen || '',
      zona_origen: c.zona_origen || '',
      direccion_destino: c.direccion_destino || '',
      zona_destino: c.zona_destino || '',
      tipo_servicio: c.tipo_servicio || '',
      fecha_deseada: c.fecha_deseada ? c.fecha_deseada.slice(0, 10) : '',
      franja_horaria: c.franja_horaria || '',
    })
    setErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = {
      cliente: parseInt(form.cliente),
      direccion_origen: form.direccion_origen,
      zona_origen: form.zona_origen ? parseInt(form.zona_origen) : null,
      direccion_destino: form.direccion_destino,
      zona_destino: form.zona_destino ? parseInt(form.zona_destino) : null,
      tipo_servicio: parseInt(form.tipo_servicio),
      fecha_deseada: form.fecha_deseada || null,
      franja_horaria: form.franja_horaria || '',
      latitud_origen: origenLatLng?.lat ?? null,
      longitud_origen: origenLatLng?.lng ?? null,
      latitud_destino: destinoLatLng?.lat ?? null,
      longitud_destino: destinoLatLng?.lng ?? null,
    }
    const req = isEditing
      ? api.patch(`/cotizaciones/${formModal.cot.id}/`, payload)
      : api.post('/cotizaciones/', payload)
    req
      .then((res) => {
        const id = res.data?.id
        toastSuccess(isEditing ? 'Cotización actualizada' : 'Cotización creada')
        fetch()
        setFormModal({ open: false, cot: null })
        if (!isEditing && id) api.post(`/cotizaciones/${id}/calcular-precio/`).catch(() => {})
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const enviar = (id) => {
    // Según flujo Fase 3: operador envía cotización con precio final
    api
      .post(`/cotizaciones/${id}/enviar/`)
      .then(() => {
        toastSuccess('Cotización enviada al cliente')
        fetch()
      })
      .catch((err) => toastApiError(err, 'Error al enviar la cotización'))
  }

  const aceptar = (id) => {
    // Según flujo Fase 3: solo el CLIENTE acepta (genera reserva automáticamente)
    if (!isCliente) {
      toastMessage('Solo el cliente puede aceptar la cotización')
      return
    }
    api
      .post(`/cotizaciones/${id}/aceptar/`)
      .then(() => {
        toastSuccess('Cotización aceptada. Se generó tu reserva automáticamente.')
        fetch()
      })
      .catch((err) => toastApiError(err, 'No se pudo aceptar la cotización'))
  }

  const rechazar = (id) => {
    // Cliente rechaza cotización
    if (!isCliente) {
      toastMessage('Solo el cliente puede rechazar la cotización')
      return
    }
    api
      .post(`/cotizaciones/${id}/rechazar/`)
      .then(() => {
        toastSuccess('Cotización rechazada')
        fetch()
      })
      .catch((err) => toastApiError(err, 'No se pudo rechazar la cotización'))
  }

  const recalcular = (id) => {
    api
      .post(`/cotizaciones/${id}/calcular-precio/`)
      .then(() => {
        toastSuccess('Precio recalculado')
        fetch()
      })
      .catch((err) => toastApiError(err, 'Error al recalcular'))
  }

  const agregarServicioAdicionalCot = async () => {
    if (!modal.cot?.id) return
    const sid = extraForm.servicioId
    if (!sid) {
      toastMessage('Selecciona un servicio adicional del catálogo.')
      return
    }
    const cant = Math.max(1, parseInt(String(extraForm.cantidad), 10) || 1)
    try {
      await api.post(`/cotizaciones/${modal.cot.id}/agregar-servicio/`, {
        servicio_adicional: parseInt(sid, 10),
        cantidad: cant,
      })
      const { data } = await api.get(`/cotizaciones/${modal.cot.id}/`)
      setModal((m) => ({ ...m, cot: data }))
      setExtraForm({ servicioId: '', cantidad: 1 })
      toastSuccess('Servicio adicional agregado. Totales y referencia IA actualizados en servidor.')
      fetch()
    } catch (err) {
      toastApiError(err, 'No se pudo agregar el servicio adicional')
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'estado', label: 'Estado' },
    {
      key: 'precio_total_calculado',
      label: 'Total fórmula',
      render: (r) => `Bs ${r.precio_total_calculado ?? '—'}`,
    },
    {
      key: 'rf_precio_predicho',
      label: 'Ref. IA',
      render: (r) => (r.rf_precio_predicho != null ? `Bs ${r.rf_precio_predicho}` : '—'),
    },
    { key: 'creado_en', label: 'Fecha', render: (r) => new Date(r.creado_en).toLocaleDateString('es-BO') },
  ]

  const clientesOptions = isCliente ? [] : clientes

  const centerOrigen = useMemo(() => {
    const z = zonas.find((x) => String(x.id) === String(form.zona_origen))
    if (z?.latitud_centro != null && z?.longitud_centro != null) {
      return [Number(z.latitud_centro), Number(z.longitud_centro)]
    }
    return DEFAULT_MAP_CENTER
  }, [zonas, form.zona_origen])

  const centerDestino = useMemo(() => {
    const z = zonas.find((x) => String(x.id) === String(form.zona_destino))
    if (z?.latitud_centro != null && z?.longitud_centro != null) {
      return [Number(z.latitud_centro), Number(z.longitud_centro)]
    }
    return DEFAULT_MAP_CENTER
  }, [zonas, form.zona_destino])

  const geocodificar = async (cual) => {
    const q = cual === 'origen' ? form.direccion_origen : form.direccion_destino
    if (!String(q || '').trim()) {
      toastMessage(`Indica primero la dirección de ${cual === 'origen' ? 'origen' : 'destino'}`)
      return
    }
    setGeocoding(cual)
    try {
      const hits = await nominatimSearch(q, { limit: 3 })
      const first = nominatimToLatLng(hits[0])
      if (!first) {
        toastMessage('No se encontró la dirección en OpenStreetMap')
        return
      }
      if (cual === 'origen') setOrigenLatLng({ lat: first.lat, lng: first.lng })
      else setDestinoLatLng({ lat: first.lat, lng: first.lng })
      toastSuccess('Ubicación encontrada (Nominatim)')
    } catch (e) {
      toastApiError(e, 'Error al geocodificar')
    } finally {
      setGeocoding(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="page-subtitle max-w-2xl">Seguimiento de propuestas y estados hasta la reserva.</p>
        </div>
        {!isCliente && (
          <button type="button" onClick={openCreate} className="btn-primary shrink-0">
            + Nueva cotización
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={cotizaciones}
        loading={loading}
        onRowClick={(c) => setModal({ open: true, cot: c })}
        onEdit={!isCliente ? openEdit : undefined}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalCount,
          loading,
          onPageChange: setPage,
        }}
      />
      <Modal
        open={modal.open}
        onClose={() => {
          setExtraForm({ servicioId: '', cantidad: 1 })
          setModal({ open: false, cot: null })
        }}
        title={modal.cot ? `Cotización #${modal.cot.id}` : ''}
        size="xl"
      >
        {modal.cot && (
          <div className="space-y-4 text-slate-800">
            <p><span className="font-medium text-slate-600">Cliente:</span> {modal.cot.cliente_nombre}</p>
            <p><span className="font-medium text-slate-600">Estado:</span> {modal.cot.estado}</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-2">
              <p className="font-semibold text-slate-900">Precios (panel operador)</p>
              <p>
                <span className="text-slate-600">Total por fórmula (tarifa × servicio + extras):</span>{' '}
                <span className="font-medium text-slate-900">Bs {modal.cot.precio_total_calculado ?? '—'}</span>
              </p>
              <p>
                <span className="text-slate-600">Referencia IA / demanda (rf_precio_predicho):</span>{' '}
                <span className="font-medium text-slate-900">
                  {modal.cot.rf_precio_predicho != null ? `Bs ${modal.cot.rf_precio_predicho}` : '—'}
                </span>
              </p>
              <p className="text-slate-600 text-xs pt-1 leading-relaxed">
                El cliente en la app solo ve un monto unificado (prioriza referencia IA si existe). El
                depósito es un % de ese total, no el precio completo.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-3">
              <p className="font-semibold text-slate-900">Servicios adicionales (catálogo)</p>
              {(modal.cot.servicios_adicionales || []).length > 0 ? (
                <ul className="list-disc pl-5 text-slate-800 space-y-1">
                  {(modal.cot.servicios_adicionales || []).map((s) => (
                    <li key={s.id}>
                      <span className="font-medium text-slate-900">{s.servicio_nombre || 'Extra'}</span>
                      {' · '}
                      cant. {s.cantidad}
                      {s.precio_total != null ? ` · Bs ${s.precio_total}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 text-xs">Ningún servicio adicional vinculado aún.</p>
              )}
              {modal.cot.estado === 'borrador' && (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="flex-1 min-w-[220px]">
                    <label htmlFor="cot-extra-serv" className="block text-xs font-medium text-slate-700 mb-1">
                      Añadir desde catálogo
                    </label>
                    <select
                      id="cot-extra-serv"
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      value={extraForm.servicioId}
                      onChange={(e) => setExtraForm((f) => ({ ...f, servicioId: e.target.value }))}
                    >
                      <option value="">Seleccionar…</option>
                      {serviciosAdicionalesCatalogo.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} (Bs {s.precio}
                          {s.es_por_objeto ? ', por objeto' : ', monto fijo'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-24">
                    <label htmlFor="cot-extra-qty" className="block text-xs font-medium text-slate-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      id="cot-extra-qty"
                      type="number"
                      min={1}
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      value={extraForm.cantidad}
                      onChange={(e) => setExtraForm((f) => ({ ...f, cantidad: e.target.value }))}
                    />
                  </div>
                  <button type="button" onClick={agregarServicioAdicionalCot} className="btn-secondary btn-primary-sm w-full sm:w-auto">
                    Añadir a la cotización
                  </button>
                </div>
              )}
            </div>

            {/* <p><span className="font-medium text-slate-600">Dirección origen:</span> {modal.cot.direccion_origen}</p>
            <p><span className="font-medium text-slate-600">Dirección destino:</span> {modal.cot.direccion_destino}</p> */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Mapa (OpenStreetMap)</p>
              <MapTwoPoints
                origen={
                  modal.cot.latitud_origen != null && modal.cot.longitud_origen != null
                    ? { lat: modal.cot.latitud_origen, lng: modal.cot.longitud_origen }
                    : null
                }
                destino={
                  modal.cot.latitud_destino != null && modal.cot.longitud_destino != null
                    ? { lat: modal.cot.latitud_destino, lng: modal.cot.longitud_destino }
                    : null
                }
              />
              {(modal.cot.latitud_origen != null || modal.cot.latitud_destino != null) && (
                <p className="text-xs text-slate-600">
                  Origen:{' '}
                  {modal.cot.latitud_origen != null && modal.cot.longitud_origen != null
                    ? `${Number(modal.cot.latitud_origen).toFixed(6)}, ${Number(modal.cot.longitud_origen).toFixed(6)}`
                    : '—'}
                  {' · '}
                  Destino:{' '}
                  {modal.cot.latitud_destino != null && modal.cot.longitud_destino != null
                    ? `${Number(modal.cot.latitud_destino).toFixed(6)}, ${Number(modal.cot.longitud_destino).toFixed(6)}`
                    : '—'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-4">
              {modal.cot.estado === 'borrador' && !isCliente && (
                <>
                  <button type="button" onClick={() => recalcular(modal.cot.id)} className="btn-secondary btn-primary-sm">
                    Recalcular precio
                  </button>
                  <button type="button" onClick={() => enviar(modal.cot.id)} className="btn-primary btn-primary-sm">
                    Enviar al cliente
                  </button>
                </>
              )}
              {modal.cot.estado === 'enviada' && isCliente && (
                <>
                  <button type="button" onClick={() => aceptar(modal.cot.id)} className="btn-primary btn-primary-sm">
                    Aceptar cotización
                  </button>
                  <button type="button" onClick={() => rechazar(modal.cot.id)} className="btn-danger btn-primary-sm">
                    Rechazar
                  </button>
                </>
              )}
              {modal.cot.estado === 'aceptada' && (
                <p className="text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Cotización aceptada. La reserva fue generada automáticamente.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={formModal.open} onClose={() => setFormModal({ open: false, cot: null })} title={isEditing ? 'Editar cotización' : 'Nueva cotización'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect label="Cliente" name="cliente" value={form.cliente} onChange={handleChange} required options={clientesOptions} labelKey={(c) => `${c.usuario_nombre} (${c.usuario_email})`} error={errors.cliente} />
          <FormInput label="Dirección origen" name="direccion_origen" value={form.direccion_origen} onChange={handleChange} required />
          <FormSelect label="Zona origen" name="zona_origen" value={form.zona_origen} onChange={handleChange} options={zonas} labelKey="nombre" />
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">Ubicación origen (mapa)</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-primary-sm"
                  disabled={!!geocoding}
                  onClick={() => geocodificar('origen')}
                >
                  {geocoding === 'origen' ? 'Buscando…' : 'Buscar dirección (OSM)'}
                </button>
                {origenLatLng && (
                  <button type="button" className="btn-ghost btn-primary-sm" onClick={() => setOrigenLatLng(null)}>
                    Quitar punto
                  </button>
                )}
              </div>
            </div>
            <MapPicker
              key={`o-${formModal.cot?.id ?? 'n'}-${form.zona_origen}`}
              value={origenLatLng}
              onChange={setOrigenLatLng}
              center={centerOrigen}
              hint="Clic en el mapa o usa la búsqueda con la dirección de origen."
            />
          </div>
          <FormInput label="Dirección destino" name="direccion_destino" value={form.direccion_destino} onChange={handleChange} required />
          <FormSelect label="Zona destino" name="zona_destino" value={form.zona_destino} onChange={handleChange} options={zonas} labelKey="nombre" />
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">Ubicación destino (mapa)</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-primary-sm"
                  disabled={!!geocoding}
                  onClick={() => geocodificar('destino')}
                >
                  {geocoding === 'destino' ? 'Buscando…' : 'Buscar dirección (OSM)'}
                </button>
                {destinoLatLng && (
                  <button type="button" className="btn-ghost btn-primary-sm" onClick={() => setDestinoLatLng(null)}>
                    Quitar punto
                  </button>
                )}
              </div>
            </div>
            <MapPicker
              key={`d-${formModal.cot?.id ?? 'n'}-${form.zona_destino}`}
              value={destinoLatLng}
              onChange={setDestinoLatLng}
              center={centerDestino}
              hint="Clic en el mapa o usa la búsqueda con la dirección de destino."
            />
          </div>
          <FormSelect label="Tipo de servicio" name="tipo_servicio" value={form.tipo_servicio} onChange={handleChange} required options={tiposServicio} labelKey="nombre" error={errors.tipo_servicio} />
          <FormInput label="Fecha deseada" name="fecha_deseada" type="date" value={form.fecha_deseada} onChange={handleChange} />
          <FormInput label="Franja horaria" name="franja_horaria" value={form.franja_horaria} onChange={handleChange} placeholder="Ej: 08:00-12:00" />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setFormModal({ open: false, cot: null })} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
