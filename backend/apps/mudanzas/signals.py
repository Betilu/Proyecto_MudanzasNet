"""
Emisión de eventos WebSocket cuando cambia el historial de estados del servicio (Fase 6).
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import HistorialEstadoServicio


@receiver(post_save, sender=HistorialEstadoServicio)
def broadcast_seguimiento_historial(sender, instance, created, **kwargs):
    if not created:
        return
    layer = get_channel_layer()
    if not layer:
        return
    servicio = instance.servicio
    reserva_id = servicio.reserva_id
    group = f'seguimiento_reserva_{reserva_id}'
    payload = {
        'estado_actual': servicio.estado,
        'evento': {
            'estado': instance.estado_nuevo,
            'descripcion': instance.notas or f'Estado: {instance.estado_nuevo}',
            'fecha': instance.creado_en.isoformat() if instance.creado_en else None,
            'latitud': str(instance.latitud) if instance.latitud is not None else None,
            'longitud': str(instance.longitud) if instance.longitud is not None else None,
        },
    }
    async_to_sync(layer.group_send)(
        group,
        {
            'type': 'seguimiento_event',
            'payload': payload,
        },
    )
