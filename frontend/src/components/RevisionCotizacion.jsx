import React, { useState } from 'react';
import apiClient from '../api/client';
import { toastApiError, toastSuccess } from '../utils/apiToast';

const RevisionCotizacion = ({ cotizacion, onEnviado }) => {
  const [precioFinal, setPrecioFinal] = useState(
    cotizacion.rf_precio_predicho || cotizacion.precio_total_calculado
  );
  const [loading, setLoading] = useState(false);
  const [precioSeleccionado, setPrecioSeleccionado] = useState('ia');

  const handleEnviar = async () => {
    if (!window.confirm('¿Enviar esta cotización al cliente?')) return;

    setLoading(true);
    try {
      await apiClient.post(`/cotizaciones/${cotizacion.id}/enviar/`, {
        precio_final: parseFloat(precioFinal),
      });

      toastSuccess('Cotización enviada al cliente exitosamente');
      onEnviado?.();
    } catch (error) {
      console.error('Error al enviar cotización:', error);
      toastApiError(error, 'Error al enviar la cotización');
    } finally {
      setLoading(false);
    }
  };

  const usarPrecioCalculado = () => {
    setPrecioFinal(cotizacion.precio_total_calculado);
    setPrecioSeleccionado('calculado');
  };

  const usarPrecioIA = () => {
    setPrecioFinal(cotizacion.rf_precio_predicho);
    setPrecioSeleccionado('ia');
  };

  const diferenciaPorcentaje =
    cotizacion.precio_total_calculado && cotizacion.rf_precio_predicho
      ? (
          ((cotizacion.rf_precio_predicho - cotizacion.precio_total_calculado) /
            cotizacion.precio_total_calculado) *
          100
        ).toFixed(1)
      : 0;

  return (
    <div className="revision-cotizacion max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Revisión de Cotización #{cotizacion.id}</h2>

      {/* Información del cliente */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Detalles del Servicio</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Cliente:</span>{' '}
            <span className="font-medium">{cotizacion.cliente_nombre}</span>
          </div>
          <div>
            <span className="text-gray-600">Tipo:</span>{' '}
            <span className="font-medium">{cotizacion.tipo_servicio_nombre}</span>
          </div>
          <div>
            <span className="text-gray-600">Origen:</span>{' '}
            <span className="font-medium">{cotizacion.zona_origen_nombre}</span>
          </div>
          <div>
            <span className="text-gray-600">Destino:</span>{' '}
            <span className="font-medium">{cotizacion.zona_destino_nombre}</span>
          </div>
          <div>
            <span className="text-gray-600">Objetos:</span>{' '}
            <span className="font-medium">{cotizacion.cantidad_objetos}</span>
          </div>
          <div>
            <span className="text-gray-600">Volumen:</span>{' '}
            <span className="font-medium">{cotizacion.volumen_total_m3} m³</span>
          </div>
        </div>
      </div>

      {/* Comparación de precios */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Opciones de Precio</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Precio calculado por fórmula */}
          <div
            onClick={usarPrecioCalculado}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              precioSeleccionado === 'calculado'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Precio por Fórmula</span>
              {precioSeleccionado === 'calculado' && (
                <span className="text-blue-600">✓ Seleccionado</span>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900">
              Bs {parseFloat(cotizacion.precio_total_calculado).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Tarifa base × factor servicio + extras
            </p>
          </div>

          {/* Precio predicho por IA */}
          <div
            onClick={usarPrecioIA}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              precioSeleccionado === 'ia'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Precio Predicho por IA 🤖
              </span>
              {precioSeleccionado === 'ia' && (
                <span className="text-purple-600">✓ Seleccionado</span>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900">
              Bs {parseFloat(cotizacion.rf_precio_predicho).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Random Forest · Confianza: {(cotizacion.rf_confianza_precio * 100).toFixed(0)}%
            </p>
            {diferenciaPorcentaje !== 0 && (
              <p className={`text-xs mt-1 font-medium ${parseFloat(diferenciaPorcentaje) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {parseFloat(diferenciaPorcentaje) > 0 ? '+' : ''}{diferenciaPorcentaje}% vs fórmula
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Precio final editable */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Precio Final (editable) <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">Bs</span>
          <input
            type="number"
            step="0.01"
            value={precioFinal}
            onChange={(e) => setPrecioFinal(e.target.value)}
            className="flex-1 px-4 py-3 text-2xl font-bold border border-gray-300 rounded-lg"
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Puedes ajustar manualmente el precio según consideraciones especiales
        </p>
      </div>

      {/* Desglose */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm">
        <h4 className="font-semibold mb-2">Desglose</h4>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Tarifa base:</span>
            <span>Bs {parseFloat(cotizacion.precio_base).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Servicios adicionales:</span>
            <span>Bs {parseFloat(cotizacion.precio_servicios_extra).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4">
        <button
          onClick={handleEnviar}
          disabled={loading || !precioFinal}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Enviando...' : 'Enviar Cotización al Cliente'}
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p>
          ℹ️ El cliente recibirá una notificación con el precio final. La cotización será válida por
          7 días.
        </p>
      </div>
    </div>
  );
};

export default RevisionCotizacion;
