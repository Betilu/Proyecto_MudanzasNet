"""Emisión WebSocket al grupo de seguimiento del cliente (sin crear filas en historial)."""

from __future__ import annotations

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_ubicacion_conductor_reserva(
    reserva_id: int,
    estado_servicio: str,
    lat: float,
    lon: float,
    fecha_iso: str,
) -> None:
    """
    Notifica al cliente en tiempo real la posición del equipo (app conductor).
    Mismo canal que `SeguimientoReservaConsumer`: payload con `ubicacion`, sin `evento`.
    """
    layer = get_channel_layer()
    if not layer:
        return
    group = f'seguimiento_reserva_{reserva_id}'
    payload = {
        'estado_actual': estado_servicio,
        'ubicacion': {
            'lat': lat,
            'lon': lon,
            'fecha': fecha_iso,
        },
    }
    try:
        async_to_sync(layer.group_send)(
            group,
            {
                'type': 'seguimiento_event',
                'payload': payload,
            },
        )
    except Exception:
        logger.exception('broadcast_ubicacion_conductor_reserva falló')
