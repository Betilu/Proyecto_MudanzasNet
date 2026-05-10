"""
Lógica de negocio para reservas.
"""
from .models import Reserva
from apps.cotizaciones.models import Cotizacion


def crear_reserva_desde_cotizacion(cotizacion_id: int, cliente_id: int, fecha_servicio, franja_horaria):
    """
    Crea reserva desde cotización aceptada. La cotización debe estar en estado 'aceptada'.
    """
    cotizacion = Cotizacion.objects.select_related('cliente').get(pk=cotizacion_id)
    if cotizacion.estado != 'aceptada':
        raise ValueError(f"La cotización debe estar aceptada. Estado actual: {cotizacion.estado}")
    if cotizacion.cliente_id != cliente_id:
        raise ValueError("El cliente no coincide con la cotización")
    if hasattr(cotizacion, 'reserva'):
        raise ValueError("Esta cotización ya tiene una reserva asociada")

    reserva = Reserva.objects.create(
        cotizacion=cotizacion,
        cliente=cotizacion.cliente,
        fecha_servicio=fecha_servicio,
        franja_horaria=franja_horaria,
    )
    return reserva
