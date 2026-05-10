"""
Actualiza cotización cuando se agregan/eliminan objetos.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ObjetoMudanza


@receiver([post_save, post_delete], sender=ObjetoMudanza)
def actualizar_totales_cotizacion(sender, instance, **kwargs):
    """Recalcula volumen_total, peso_total, cantidad_objetos de la cotización."""
    cotizacion = instance.cotizacion
    objetos = cotizacion.objetos.all()
    from django.db.models import Sum
    from decimal import Decimal
    totales = objetos.aggregate(peso=Sum('peso_kg'))
    # Volumen aproximado en m³ (largo*ancho*alto en cm / 1e6)
    vol_m3 = sum(
        float(o.largo_cm or 0) * float(o.ancho_cm or 0) * float(o.alto_cm or 0) / 1_000_000 * (o.cantidad or 1)
        for o in objetos
    )
    cotizacion.volumen_total_m3 = Decimal(str(vol_m3))
    cotizacion.peso_total_kg = totales['peso'] or Decimal('0')
    cotizacion.cantidad_objetos = sum(o.cantidad for o in objetos)
    cotizacion.save(update_fields=['volumen_total_m3', 'peso_total_kg', 'cantidad_objetos'])
