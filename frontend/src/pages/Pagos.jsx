import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import VerificarPago from '../components/VerificarPago'
import { useAuth } from '../context/AuthContext'
import { downloadFacturaPdf } from '../utils/downloadFacturaPdf'
import { toastApiError, toastMessage, toastSuccess } from '../utils/apiToast'

const estadoLabel = (e) =>
  ({ pendiente: 'Pendiente', completado: 'Completado', fallido: 'Rechazado' }[e] || e)

export default function Pagos() {
  const { isAdmin, hasPermission } = useAuth()
  const puedeOperarPagos =
    isAdmin() || hasPermission('pagos.procesar') || hasPermission('pagos.verificar')

  const [pagos, setPagos] = useState([])
  const [reservas, setReservas] = useState([])
  const [metodos, setMetodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendientes')
  const [modal, setModal] = useState({ open: false, pago: null })
  const [formModal, setFormModal] = useState({ open: false })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [dlBusy, setDlBusy] = useState(null)

  const fetch = () => {
    setLoading(true)
    api
      .get('/pagos/')
      .then(({ data }) => setPagos(data.results ?? data ?? []))
      .catch(() => setPagos([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
    if (isAdmin()) {
      api.get('/reservas/').then(({ data }) => setReservas(data.results ?? data ?? [])).catch(() => {})
      api.get('/pagos/metodos/').then(({ data }) => setMetodos(data.results ?? data ?? [])).catch(() => {})
    }
  }, [])

  const visibles = useMemo(() => {
    if (filtro === 'pendientes') return pagos.filter((p) => p.estado === 'pendiente')
    return pagos
  }, [pagos, filtro])

  const openCreate = () => {
    setFormModal({ open: true })
    setForm({
      reserva: '',
      metodo_pago: '',
      tipo_pago: 'deposito',
      monto: '',
      referencia_transaccion: '',
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
    api
      .post('/pagos/', {
        reserva: parseInt(form.reserva, 10),
        metodo_pago: parseInt(form.metodo_pago, 10),
        tipo_pago: form.tipo_pago,
        monto: parseFloat(form.monto) || 0,
        referencia_transaccion: form.referencia_transaccion || '',
      })
      .then(() => {
        toastSuccess('Pago registrado')
        fetch()
        setFormModal({ open: false })
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const descargarFactura = async (pago) => {
    if (!pago.factura_id) {
      toastMessage('Aún no hay factura para este pago.')
      return
    }
    setDlBusy(pago.id)
    try {
      await downloadFacturaPdf(pago.factura_id, `${pago.reserva_codigo || 'factura'}.pdf`)
      toastSuccess('Descarga iniciada')
    } catch (e) {
      toastApiError(e, e.message || 'Error al descargar')
    } finally {
      setDlBusy(null)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'reserva_codigo', label: 'Reserva' },
    { key: 'tipo_pago', label: 'Tipo', render: (r) => <span className="capitalize">{r.tipo_pago}</span> },
    { key: 'monto', label: 'Monto', render: (r) => `Bs ${r.monto}` },
    { key: 'estado', label: 'Estado', render: (r) => estadoLabel(r.estado) },
    { key: 'metodo_nombre', label: 'Método' },
    {
      key: 'creado_en',
      label: 'Registro',
      render: (r) => (r.creado_en ? new Date(r.creado_en).toLocaleString('es-BO') : '—'),
    },
  ]

  const cerrarModal = () => setModal({ open: false, pago: null })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Fase 4: revisa comprobantes pendientes, confirma o rechaza. Al confirmar un depósito, la reserva pasa
            a confirmada y se genera la factura PDF. Fase 8: registra pagos de saldo completados.
          </p>
        </div>
        {isAdmin() && (
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary shrink-0"
          >
            + Registrar pago
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFiltro('pendientes')}
          className={`tab-pill text-sm font-medium ${filtro === 'pendientes' ? 'tab-pill-active' : 'tab-pill-idle'}`}
        >
          Pendientes de verificación ({pagos.filter((p) => p.estado === 'pendiente').length})
        </button>
        <button
          type="button"
          onClick={() => setFiltro('todos')}
          className={`tab-pill text-sm font-medium ${filtro === 'todos' ? 'tab-pill-active' : 'tab-pill-idle'}`}
        >
          Todos
        </button>
      </div>

      <DataTable
        columns={columns}
        data={visibles}
        loading={loading}
        onRowClick={(p) => setModal({ open: true, pago: p })}
        extraActions={(row) => {
          const acts = []
          if (row.estado === 'completado' && row.factura_id) {
            acts.push({
              label: dlBusy === row.id ? '…' : 'PDF',
              onClick: () => descargarFactura(row),
              className: 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30',
            })
          }
          return acts
        }}
      />

      <Modal open={modal.open} onClose={cerrarModal} title={modal.pago ? `Pago #${modal.pago.id}` : ''} size="xl">
        {modal.pago && (
          <div className="space-y-6">
            {modal.pago.estado === 'pendiente' && puedeOperarPagos ? (
              <VerificarPago pago={modal.pago} onVerificado={() => { fetch(); cerrarModal() }} />
            ) : (
              <div className="space-y-3 text-slate-300">
                <p>
                  <span className="text-slate-500">Reserva:</span> {modal.pago.reserva_codigo}
                </p>
                <p>
                  <span className="text-slate-500">Estado:</span> {estadoLabel(modal.pago.estado)}
                </p>
                <p>
                  <span className="text-slate-500">Monto:</span> Bs {modal.pago.monto}
                </p>
                {modal.pago.comprobante_url && (
                  <a
                    href={modal.pago.comprobante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 text-sm hover:underline"
                  >
                    Ver comprobante
                  </a>
                )}
                {modal.pago.estado === 'completado' && modal.pago.factura_id && (
                  <button
                    type="button"
                    disabled={dlBusy === modal.pago.id}
                    onClick={() => descargarFactura(modal.pago)}
                    className="btn-primary w-full block"
                  >
                    Descargar factura PDF
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={formModal.open} onClose={() => setFormModal({ open: false })} title="Registrar pago (operador)">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Reserva"
            name="reserva"
            value={form.reserva}
            onChange={handleChange}
            required
            options={reservas}
            labelKey={(r) => `${r.codigo_confirmacion} — ${r.fecha_servicio} (${r.estado})`}
            error={errors.reserva}
          />
          <FormSelect
            label="Método de pago"
            name="metodo_pago"
            value={form.metodo_pago}
            onChange={handleChange}
            required
            options={metodos}
            labelKey="nombre"
            error={errors.metodo_pago}
          />
          <FormSelect
            label="Tipo"
            name="tipo_pago"
            value={form.tipo_pago}
            onChange={handleChange}
            options={[
              { id: 'deposito', nombre: 'Depósito' },
              { id: 'saldo', nombre: 'Saldo' },
            ]}
          />
          <FormInput
            label="Monto (Bs)"
            name="monto"
            type="number"
            step="0.01"
            value={form.monto}
            onChange={handleChange}
            required
            error={errors.monto}
          />
          <FormInput
            label="Referencia / Nº transacción"
            name="referencia_transaccion"
            value={form.referencia_transaccion}
            onChange={handleChange}
          />
          <p className="text-xs text-slate-500">
            Para comprobantes subidos por el cliente desde la app, use la bandeja &quot;Pendientes&quot; y
            verifique el archivo adjunto.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setFormModal({ open: false })}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
