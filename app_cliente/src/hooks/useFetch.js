import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para manejar peticiones HTTP
 * @param {Function} serviceFunction - Función del servicio a ejecutar
 * @param {boolean} autoFetch - Si debe ejecutarse automáticamente al montar
 */
export const useFetch = (serviceFunction, autoFetch = false) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await serviceFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Error en la petición');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [serviceFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      execute();
    }
  }, [autoFetch, execute]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

export default useFetch;
