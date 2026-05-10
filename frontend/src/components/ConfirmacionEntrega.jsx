import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import apiClient from '../api/client';
import { toastApiError, toastSuccess } from '../utils/apiToast';

const ConfirmacionEntrega = ({ servicioId, onConfirmado }) => {
  const [conformidad, setConformidad] = useState('total');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const sigCanvas = useRef(null);

  const limpiarFirma = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (sigCanvas.current?.isEmpty()) {
      toastApiError({ message: 'Por favor firma antes de confirmar' }, 'Validación');
      return;
    }

    setLoading(true);

    try {
      // Convertir firma a blob
      const canvas = sigCanvas.current.getTrimmedCanvas();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve));

      const formData = new FormData();
      formData.append('firma', blob, 'firma_cliente.png');
      formData.append('tipo_firma', 'cliente');
      formData.append('cliente_conforme', conformidad);
      formData.append('observaciones', observaciones);

      await apiClient.post(`/mudanzas/${servicioId}/confirmar_entrega/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onConfirmado?.();
      toastSuccess('¡Entrega confirmada exitosamente!');
    } catch (error) {
      console.error('Error al confirmar entrega:', error);
      toastApiError(error, 'Error al confirmar la entrega. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="confirmacion-entrega max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Confirmación de Entrega</h2>

      <form onSubmit={handleSubmit}>
        {/* Nivel de conformidad */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Estás conforme con la entrega? <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="conformidad"
                value="total"
                checked={conformidad === 'total'}
                onChange={(e) => setConformidad(e.target.value)}
                className="mr-2"
              />
              <span className="text-green-600 font-medium">✓ Conforme Total</span>
              <span className="ml-2 text-sm text-gray-500">
                Todo llegó en perfectas condiciones
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="conformidad"
                value="parcial"
                checked={conformidad === 'parcial'}
                onChange={(e) => setConformidad(e.target.value)}
                className="mr-2"
              />
              <span className="text-yellow-600 font-medium">⚠ Conforme Parcial</span>
              <span className="ml-2 text-sm text-gray-500">
                Hubo algún problema menor
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="conformidad"
                value="ninguna"
                checked={conformidad === 'ninguna'}
                onChange={(e) => setConformidad(e.target.value)}
                className="mr-2"
              />
              <span className="text-red-600 font-medium">✗ No Conforme</span>
              <span className="ml-2 text-sm text-gray-500">
                Hubo problemas significativos
              </span>
            </label>
          </div>
        </div>

        {/* Observaciones */}
        {conformidad !== 'total' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones <span className="text-red-500">*</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="4"
              placeholder="Describe brevemente el problema..."
              required
            />
          </div>
        )}

        {/* Firma digital */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Firma Digital <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'signature-canvas w-full h-48 bg-gray-50',
              }}
            />
          </div>
          <button
            type="button"
            onClick={limpiarFirma}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Limpiar firma
          </button>
        </div>

        {/* Botones */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Confirmando...' : 'Confirmar Entrega'}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p>
          ℹ️ Al confirmar la entrega, certificas que has recibido tus pertenencias. Si reportaste
          algún problema, nuestro equipo se pondrá en contacto contigo para resolverlo.
        </p>
      </div>
    </div>
  );
};

export default ConfirmacionEntrega;
