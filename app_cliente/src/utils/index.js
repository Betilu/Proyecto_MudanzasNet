// Funciones utilitarias
export * from './cotizacionDisplay';

export const formatDate = (date) => {
  // Implementar formato de fecha
};

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};
