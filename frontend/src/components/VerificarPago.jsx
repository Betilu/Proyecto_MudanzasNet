import React, { useState } from 'react'
import api from '../api/client'
import FormInput from './FormInput'
import { toastApiError, toastSuccess } from '../utils/apiToast'

function formatoRegistro(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function VerificarPago({ pago, onVerificado }) {
  const [loading, setLoading] = useState(false)
  const [referenciaBanco, setReferenciaBanco] = useState(pago.referencia_transaccion || '')

  const imgSrc = pago.comprobante_url || pago.comprobante

  const handleVerificar = async () => {
    if (!window.confirm('¿Confirmar que el comprobante es válido? La reserva pasará a confirmada si es un depósito.')) return
    setLoading(true)
    try {
      await api.post(`/pagos/${pago.id}/verificar/`, {
        referencia_transaccion: referenciaBanco.trim() || undefined,
      })
      toastSuccess('Pago verificado. Se generó la factura en PDF y se notificó al cliente.')
      onVerificado?.()
    } catch (error) {
      console.error(error)
      toastApiError(error, 'Error al verificar el pago')
    } finally {
      setLoading(false)
    }
  }

  const handleRechazar = async () => {
    if (!window.confirm('¿Rechazar este pago? El cliente podrá subir un nuevo comprobante.')) return
    setLoading(true)
    try {
      await api.post(`/pagos/${pago.id}/rechazar/`)
      toastSuccess('Pago rechazado. Se notificó al cliente.')
      onVerificado?.()
    } catch (error) {
      console.error(error)
      toastApiError(error, 'Error al rechazar el pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 text-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <div>
          <span className="text-slate-500">Reserva</span>
          <p className="font-medium text-primary-400">{pago.reserva_codigo}</p>
        </div>
        <div>
          <span className="text-slate-500">Tipo</span>
          <p className="font-medium capitalize">{pago.tipo_pago}</p>
        </div>
        <div>
          <span className="text-slate-500">Método</span>
          <p className="font-medium">{pago.metodo_nombre}</p>
        </div>
        <div>
          <span className="text-slate-500">Monto</span>
          <p className="font-bold text-lg text-white">
            Bs {parseFloat(pago.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </p>
        </div>
        {pago.creado_en && (
          <div className="sm:col-span-2">
            <span className="text-slate-500">Registrado</span>
            <p className="font-medium">{formatoRegistro(pago.creado_en)}</p>
          </div>
        )}
      </div>

      {imgSrc ? (
        <div>
          <h3 className="font-semibold text-slate-300 mb-2">Comprobante</h3>
          <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
            <img
              src={imgSrc}
              alt="Comprobante"
              className="w-full max-h-[480px] object-contain"
            />
          </div>
          <a
            href={imgSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-400 hover:underline mt-2 inline-block"
          >
            Abrir imagen en nueva pestaña
          </a>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Sin archivo de comprobante adjunto.</p>
      )}

      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-200/90">
        <p className="font-medium text-yellow-400 mb-2">Checklist (operador)</p>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Monto coincide con el depósito / saldo esperado</li>
          <li>Fecha de transferencia reciente</li>
          <li>Referencia legible (si aplica)</li>
          <li>Cuenta de destino correcta</li>
        </ul>
      </div>

      {pago.tipo_pago === 'deposito' && (
        <p className="text-sm text-sky-300/90 bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
          Al verificar el depósito, la reserva pasa a <strong>confirmada</strong> y se emite factura con IVA.
        </p>
      )}

      <FormInput
        label="Referencia banco (opcional, actualiza el registro al verificar)"
        name="ref"
        value={referenciaBanco}
        onChange={(e) => setReferenciaBanco(e.target.value)}
        placeholder="Ej. número de operación del banco"
      />

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={handleVerificar}
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
        >
          {loading ? 'Procesando…' : 'Confirmar pago'}
        </button>
        <button
          type="button"
          onClick={handleRechazar}
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-lg font-medium bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    </div>
  )
}
