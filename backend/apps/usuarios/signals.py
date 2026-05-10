"""Bitácora automática para reservas y pagos (W8 trazabilidad de transacciones)."""
from django.db.models.signals import post_save

from .models import BitacoraAuditoria


def bitacora_reserva(sender, instance, created, **kwargs):
    accion = 'reserva_creada' if created else 'reserva_actualizada'
    BitacoraAuditoria.objects.create(
        usuario=None,
        accion=accion,
        entidad_tipo='Reserva',
        entidad_id=instance.pk,
        detalles={
            'codigo': instance.codigo_confirmacion,
            'estado': instance.estado,
            'cliente_id': instance.cliente_id,
        },
    )


def bitacora_pago(sender, instance, created, **kwargs):
    accion = 'pago_registrado' if created else 'pago_actualizado'
    BitacoraAuditoria.objects.create(
        usuario=None,
        accion=accion,
        entidad_tipo='Pago',
        entidad_id=instance.pk,
        detalles={
            'monto': str(instance.monto),
            'estado': instance.estado,
            'reserva_id': instance.reserva_id,
        },
    )


def connect_audit_signals():
    from apps.reservas.models import Reserva
    from apps.pagos.models import Pago

    post_save.connect(bitacora_reserva, sender=Reserva, dispatch_uid='usuarios_bitacora_reserva')
    post_save.connect(bitacora_pago, sender=Pago, dispatch_uid='usuarios_bitacora_pago')
