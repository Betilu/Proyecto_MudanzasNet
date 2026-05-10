import { ESTADOS_COTIZACION } from '../constants/api';

const FRANJA_LABELS = {
  manana: 'Mañana (8–12h)',
  tarde: 'Tarde (12–18h)',
  noche: 'Noche (18–21h)',
};

export function formatBs(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatFechaCotizacion(isoOrDate) {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-BO');
}

export function formatFechaHora(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}

export function labelFranjaHoraria(franja) {
  if (!franja) return '';
  const k = String(franja).toLowerCase();
  return FRANJA_LABELS[k] || franja;
}

export function getEstadoCotizacionMeta(estado) {
  const map = {
    [ESTADOS_COTIZACION.BORRADOR]: { variant: 'default', label: 'Borrador' },
    [ESTADOS_COTIZACION.ENVIADA]: { variant: 'info', label: 'Enviada' },
    [ESTADOS_COTIZACION.ACEPTADA]: { variant: 'success', label: 'Aceptada' },
    [ESTADOS_COTIZACION.RECHAZADA]: { variant: 'danger', label: 'Rechazada' },
    [ESTADOS_COTIZACION.VENCIDA]: { variant: 'warning', label: 'Vencida' },
    expirada: { variant: 'warning', label: 'Expirada' },
  };
  return map[estado] || { variant: 'default', label: estado ? String(estado) : '—' };
}

export function textoRutaCotizacion(item) {
  const origen = item.zona_origen_nombre || truncate(item.direccion_origen, 48) || '—';
  const destino = item.zona_destino_nombre || truncate(item.direccion_destino, 48) || '—';
  return `${origen} → ${destino}`;
}

function truncate(s, max) {
  if (!s || typeof s !== 'string') return '';
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function precioMostradoCotizacion(item) {
  const v = item.precio_total_calculado ?? item.precio_total;
  return formatBs(v);
}
