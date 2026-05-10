"""
Lógica de negocio para cotizaciones.
"""
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from apps.zonas.models import TarifaDistancia
from apps.servicios.models import ServicioAdicional
from apps.ia.services import RandomForestService
from apps.notificaciones.services import NotificacionService
from .models import Cotizacion, CotizacionServicioAdicional
from .precio_desglose import construir_desglose_cliente, recargo_embalaje_opcional


def calcular_precio_cotizacion(cotizacion: Cotizacion, usar_ia: bool = True) -> dict:
    """
    Calcula precio_base según tarifa zona_origen->zona_destino y factor del tipo de servicio.
    Suma servicios adicionales.
    """
    precio_base = Decimal('0')
    tarifa_info = None

    if cotizacion.zona_origen and cotizacion.zona_destino:
        try:
            tarifa = TarifaDistancia.objects.get(
                zona_origen=cotizacion.zona_origen,
                zona_destino=cotizacion.zona_destino
            )
            precio_base = tarifa.tarifa_base
            tarifa_info = {'tarifa_base': float(tarifa.tarifa_base), 'distancia_km': float(tarifa.distancia_km or 0)}
        except TarifaDistancia.DoesNotExist:
            pass

    factor = cotizacion.tipo_servicio.factor_precio if cotizacion.tipo_servicio else Decimal('1')
    precio_base = precio_base * factor

    servicios_extra = Decimal('0')
    for csa in cotizacion.servicios_adicionales_vinculados.all():
        servicios_extra += csa.precio_total

    recargo_embalaje = recargo_embalaje_opcional(cotizacion)
    servicios_extra_total = servicios_extra + recargo_embalaje

    cotizacion.precio_base = precio_base
    cotizacion.precio_servicios_extra = servicios_extra_total
    cotizacion.precio_total_calculado = precio_base + servicios_extra_total

    update_fields = ['precio_base', 'precio_servicios_extra', 'precio_total_calculado']
    if tarifa_info and tarifa_info.get('distancia_km') is not None:
        cotizacion.distancia_km = Decimal(str(tarifa_info['distancia_km']))
        update_fields.append('distancia_km')
    cotizacion.save(update_fields=update_fields)

    # Predecir precio con IA si está habilitado
    prediccion_ia = None
    if usar_ia and cotizacion.zona_origen and cotizacion.zona_destino:
        prediccion_ia = RandomForestService.predecir_precio(cotizacion)

    desglose = construir_desglose_cliente(cotizacion)

    return {
        'precio_base': float(precio_base),
        'precio_servicios_extra': float(servicios_extra_total),
        'recargo_embalaje': float(recargo_embalaje),
        'solicita_embalaje': cotizacion.solicita_embalaje,
        'precio_total_calculado': float(cotizacion.precio_total_calculado),
        'precio_predicho_ia': prediccion_ia['precio_predicho'] if prediccion_ia else None,
        'confianza_ia': prediccion_ia['confianza'] if prediccion_ia else None,
        'tarifa_info': tarifa_info,
        'desglose': desglose,
    }


def agregar_servicio_adicional(cotizacion_id: int, servicio_adicional_id: int, cantidad: int = 1):
    """Vincula un servicio adicional a la cotización."""
    from apps.servicios.models import ServicioAdicional
    from .models import Cotizacion

    cotizacion = Cotizacion.objects.get(pk=cotizacion_id)
    servicio = ServicioAdicional.objects.get(pk=servicio_adicional_id)
    precio_unit = servicio.precio
    if servicio.es_por_objeto:
        precio_total = precio_unit * cantidad * cotizacion.cantidad_objetos
    else:
        precio_total = precio_unit * cantidad

    csa, _ = CotizacionServicioAdicional.objects.update_or_create(
        cotizacion=cotizacion,
        servicio_adicional=servicio,
        defaults={
            'cantidad': cantidad,
            'precio_unitario': precio_unit,
            'precio_total': precio_total,
        }
    )
    calcular_precio_cotizacion(cotizacion)
    return csa


def enviar_cotizacion(cotizacion: Cotizacion, precio_final: Decimal = None) -> Cotizacion:
    """
    Envía la cotización al cliente (Fase 3 del flujo)
    El operador puede decidir el precio final (usar el calculado o el predicho por IA)
    """
    from apps.usuarios.models import ConfiguracionSistema

    if precio_final:
        cotizacion.precio_total_calculado = precio_final

    cotizacion.estado = 'enviada'

    # Calcular fecha de vencimiento según configuración
    try:
        dias_vigencia = int(ConfiguracionSistema.objects.get(clave='dias_vigencia_cotizacion').valor)
    except (ConfiguracionSistema.DoesNotExist, ValueError):
        dias_vigencia = 7  # Default 7 días

    cotizacion.valida_hasta = timezone.now() + timedelta(days=dias_vigencia)
    cotizacion.save(update_fields=['estado', 'valida_hasta', 'precio_total_calculado'])

    # Notificar al cliente
    NotificacionService.notificar_cotizacion_enviada(cotizacion.cliente, cotizacion)

    return cotizacion


def aceptar_cotizacion(cotizacion: Cotizacion) -> 'Reserva':
    """
    Acepta la cotización y genera automáticamente una reserva (Fase 3 del flujo)
    """
    from apps.reservas.models import Reserva

    cotizacion.estado = 'aceptada'
    cotizacion.save(update_fields=['estado'])

    # Generar reserva automáticamente
    reserva = Reserva.objects.create(
        cotizacion=cotizacion,
        cliente=cotizacion.cliente,
        fecha_servicio=cotizacion.fecha_deseada or timezone.now().date(),
        franja_horaria=cotizacion.franja_horaria or 'mañana',
        estado='pendiente'  # Pendiente hasta pagar depósito
    )

    # Notificar al cliente y operador
    NotificacionService.enviar_notificacion(
        usuario=cotizacion.cliente.usuario,
        tipo='cotizacion_aceptada',
        titulo='Cotización aceptada',
        mensaje=f'Tu cotización fue aceptada. Código de reserva: {reserva.codigo_confirmacion}. '
                f'Para confirmar debes pagar el depósito del 10%.',
        datos_extra={'reserva_id': reserva.id}
    )

    return reserva
