import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { downloadFacturaPdf } from '../utils/downloadFacturaPdf'
import { toastApiError, toastMessage, toastSuccess } from '../utils/apiToast'

const estadoLabel = (e) =>
  ({ pendiente: 'Pendiente de verificación', completado: 'Completado', fallido: 'Rechazado' }[e] || e)

export default function MisPagos() {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, pago: null })
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
  }, [])

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'reserva_codigo', label: 'Reserva' },
    { key: 'tipo_pago', label: 'Tipo', render: (r) => <span className="capitalize">{r.tipo_pago}</span> },
    { key: 'monto', label: 'Monto', render: (r) => `Bs ${r.monto}` },
    { key: 'estado', label: 'Estado', render: (r) => estadoLabel(r.estado) },
    { key: 'metodo_nombre', label: 'Método' },
  ]

  const descargar = async (pago) => {
    if (!pago.factura_id) {
      toastMessage('La factura PDF estará disponible cuando el operador verifique el pago.')
      return
    }
    setDlBusy(pago.id)
    try {
      await downloadFacturaPdf(pago.factura_id, `${pago.reserva_codigo || 'factura'}.pdf`)
      toastSuccess('Descarga iniciada')
    } catch (e) {
      toastApiError(e, e.message || 'No se pudo descargar el PDF')
    } finally {
      setDlBusy(null)
    }
  }

  return (
    <div>
      <h1 className="page-title mb-2">Mis pagos</h1>
      <p className="page-subtitle mb-6 max-w-2xl">
        Pagos registrados en tus reservas (depósito o saldo). Si un comprobante está pendiente, el operador lo
        revisará en el portal. Cuando esté verificado, podrás descargar la factura en PDF.
      </p>
      <DataTable
        columns={columns}
        data={pagos}
        loading={loading}
        onRowClick={(p) => setModal({ open: true, pago: p })}
        extraActions={() => [
          {
            label: 'Factura PDF',
            onClick: (p) => descargar(p),
            variant: 'primary',
          },
        ]}
      />
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, pago: null })}
        title={modal.pago ? `Pago #${modal.pago.id}` : ''}
      >
        {modal.pago && (
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
                Ver comprobante subido
              </a>
            )}
            <button
              type="button"
              disabled={dlBusy === modal.pago.id}
              onClick={() => descargar(modal.pago)}
              className="btn-primary mt-4 w-full"
            >
              {dlBusy === modal.pago.id ? 'Descargando…' : 'Descargar factura PDF'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
