"""
Desglose técnico del precio (tarifa × factor, extras, referencia IA).

Pensado para panel CRM / web operador. La app móvil cliente usa `precio_total_servicio`
(CotizacionClienteAppSerializer) sin este desglose.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from apps.servicios.models import ServicioAdicional
from apps.zonas.models import TarifaDistancia


def recargo_embalaje_opcional(cotizacion) -> Decimal:
    """Recargo por embalaje/refuerzo si el cliente lo marcó."""
    if not cotizacion.solicita_embalaje:
        return Decimal('0')
    n = max(1, int(cotizacion.cantidad_objetos or 0))
    try:
        sa = (
            ServicioAdicional.objects.filter(es_activo=True, es_por_objeto=True)
            .filter(nombre__icontains='embalaje')
            .order_by('id')
            .first()
        )
        if sa:
            return Decimal(str(sa.precio)) * n
    except Exception:
        pass
    return Decimal('50') * n


def _tarifa_y_distancia(cotizacion) -> Tuple[Optional[Decimal], Optional[Decimal], Optional[float]]:
    """Tarifa base en tabla (sin factor), distancia en km."""
    if not cotizacion.zona_origen or not cotizacion.zona_destino:
        return None, None, None
    try:
        tarifa = TarifaDistancia.objects.get(
            zona_origen=cotizacion.zona_origen,
            zona_destino=cotizacion.zona_destino,
        )
        dist = float(tarifa.distancia_km or 0) if tarifa.distancia_km is not None else None
        return Decimal(str(tarifa.tarifa_base)), tarifa.distancia_km, dist
    except TarifaDistancia.DoesNotExist:
        return None, None, None


def construir_desglose_cliente(cotizacion) -> Dict[str, Any]:
    """
    Estructura para API y app: qué quedó registrado, cómo se arma el total por fórmula y referencia IA.
    No duplica montos innecesarios: un bloque transporte, lista corta de extras, totales.
    """
    tarifa_tabla, distancia_decimal, distancia_float = _tarifa_y_distancia(cotizacion)
    factor = cotizacion.tipo_servicio.factor_precio if cotizacion.tipo_servicio else Decimal('1')
    tipo_nombre = cotizacion.tipo_servicio.nombre if cotizacion.tipo_servicio else '—'

    recargo_emb = recargo_embalaje_opcional(cotizacion)
    lineas_extras: List[Dict[str, Any]] = []
    for csa in cotizacion.servicios_adicionales_vinculados.all():
        nombre = getattr(csa.servicio_adicional, 'nombre', None) or 'Servicio adicional'
        lineas_extras.append(
            {
                'nombre': nombre,
                'cantidad': csa.cantidad,
                'monto': float(csa.precio_total),
            }
        )

    subtotal_transporte = Decimal('0')
    if tarifa_tabla is not None:
        subtotal_transporte = tarifa_tabla * factor

    # Texto único de transporte (evita listar 800, 1200 y otra vez 1200)
    zona_o = cotizacion.zona_origen.nombre if cotizacion.zona_origen else 'Origen'
    zona_d = cotizacion.zona_destino.nombre if cotizacion.zona_destino else 'Destino'
    dist_km = None
    if cotizacion.distancia_km is not None:
        dist_km = float(cotizacion.distancia_km)
    elif distancia_float is not None:
        dist_km = distancia_float

    resumen_transporte = None
    if tarifa_tabla is not None:
        partes = [
            f'Tarifa de ruta Bs {float(tarifa_tabla):,.2f} ({zona_o} → {zona_d})',
        ]
        if dist_km is not None:
            partes.append(f'{dist_km:g} km')
        partes.append(f'× {float(factor):g} ({tipo_nombre})')
        partes.append(f'= Bs {float(subtotal_transporte):,.2f}')
        resumen_transporte = ' · '.join(partes)

    if recargo_emb > 0:
        motivo_emb = 'Refuerzo/embalaje adicional (según catálogo o estimación por objeto)'
        lineas_extras.append(
            {
                'nombre': motivo_emb,
                'cantidad': max(1, int(cotizacion.cantidad_objetos or 0)),
                'monto': float(recargo_emb),
                'es_recargo_embalaje': True,
            }
        )

    total_formula = float(cotizacion.precio_total_calculado or 0)
    base_guardada = float(cotizacion.precio_base or 0)
    extras_guardados = float(cotizacion.precio_servicios_extra or 0)

    fecha = cotizacion.fecha_deseada
    dia_label = None
    if fecha:
        dias = (
            'lunes',
            'martes',
            'miércoles',
            'jueves',
            'viernes',
            'sábado',
            'domingo',
        )
        dia_label = dias[fecha.weekday()]

    insumos = {
        'peso_total_kg': float(cotizacion.peso_total_kg or 0),
        'volumen_total_m3': float(cotizacion.volumen_total_m3 or 0),
        'cantidad_objetos': int(cotizacion.cantidad_objetos or 0),
        'fecha_deseada': fecha.isoformat() if fecha else None,
        'dia_semana': dia_label,
        'franja_horaria': cotizacion.franja_horaria or None,
        'solicita_embalaje': bool(cotizacion.solicita_embalaje),
    }

    from apps.ia.services import RandomForestService

    payload: Dict[str, Any] = {
        'insumos_registrados': insumos,
        'transporte': {
            'tarifa_tabla_bs': float(tarifa_tabla) if tarifa_tabla is not None else None,
            'factor_servicio': float(factor),
            'tipo_servicio': tipo_nombre,
            'subtotal_bs': float(subtotal_transporte),
            'resumen_texto': resumen_transporte,
            'ruta_etiqueta': f'{zona_o} → {zona_d}',
            'distancia_km': dist_km,
        },
        'extras': lineas_extras,
        'totales': {
            'subtotal_transporte_bs': base_guardada,
            'extras_y_recargos_bs': extras_guardados,
            'total_formula_bs': total_formula,
        },
        'nota_metodo': (
            'El total por fórmula suma la tarifa de tu ruta con el tipo de servicio elegido '
            'más los extras y refuerzos que marcaste. La referencia de IA ajusta por demanda '
            'histórica (día de la semana, mes); el precio final lo confirma un operador.'
        ),
    }
    payload['referencia_ia'] = RandomForestService.desglose_prediccion_precio(cotizacion)
    return payload
