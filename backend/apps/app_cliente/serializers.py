from decimal import Decimal

from rest_framework import serializers

from apps.mudanzas.models import CalificacionServicio, ConfirmacionEntrega, ServicioMudanza
from apps.pagos.services import PagoService
from apps.reservas.models import Reserva
from apps.usuarios.models import ConfiguracionSistema


class AppClienteReservaSerializer(serializers.ModelSerializer):
    """
    App cliente: un solo monto de servicio (`precio_total_servicio` = RF si existe, si no fórmula).
    `monto_deposito_sugerido` = anticipo (p. ej. 10 % de ese total), no el precio completo.
    """

    zona_origen = serializers.SerializerMethodField()
    zona_destino = serializers.SerializerMethodField()
    precio_total_servicio = serializers.SerializerMethodField()
    precio_total = serializers.SerializerMethodField()
    precio_final = serializers.SerializerMethodField()
    porcentaje_deposito = serializers.SerializerMethodField()
    estado_seguimiento = serializers.SerializerMethodField()
    monto_deposito_sugerido = serializers.SerializerMethodField()
    cliente_confirmo_entrega = serializers.SerializerMethodField()
    cliente_califico = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = (
            'id',
            'codigo_confirmacion',
            'cotizacion_id',
            'fecha_servicio',
            'franja_horaria',
            'estado',
            'estado_seguimiento',
            'zona_origen',
            'zona_destino',
            'precio_total_servicio',
            'precio_total',
            'precio_final',
            'porcentaje_deposito',
            'monto_deposito_sugerido',
            'cliente_confirmo_entrega',
            'cliente_califico',
            'confirmada_en',
            'creado_en',
        )
        read_only_fields = fields

    def _precio_servicio_unificado(self, obj):
        p = obj.cotizacion.precio_comercial_cliente
        return str(p) if p is not None else None

    def get_zona_origen(self, obj):
        z = obj.cotizacion.zona_origen
        return z.nombre if z else None

    def get_zona_destino(self, obj):
        z = obj.cotizacion.zona_destino
        return z.nombre if z else None

    def get_precio_total_servicio(self, obj):
        return self._precio_servicio_unificado(obj)

    def get_precio_total(self, obj):
        return self._precio_servicio_unificado(obj)

    def get_precio_final(self, obj):
        return self._precio_servicio_unificado(obj)

    def get_porcentaje_deposito(self, _obj):
        try:
            return str(ConfiguracionSistema.objects.get(clave='porcentaje_deposito').valor)
        except (ConfiguracionSistema.DoesNotExist, ValueError):
            return '10'

    def get_monto_deposito_sugerido(self, obj):
        """Anticipo sobre el total del servicio (mismo criterio que precio_total_servicio)."""
        base_s = self._precio_servicio_unificado(obj)
        if base_s is None:
            return None
        try:
            dep = PagoService.calcular_deposito(Decimal(str(base_s)))
            return str(dep)
        except Exception:
            return None

    def get_estado_seguimiento(self, obj):
        try:
            return obj.servicio.estado
        except ServicioMudanza.DoesNotExist:
            return None

    def get_cliente_confirmo_entrega(self, obj):
        """Hay firma u opinión de conformidad en `ConfirmacionEntrega` (DB)."""
        try:
            servicio = obj.servicio
        except ServicioMudanza.DoesNotExist:
            return False
        try:
            conf = servicio.confirmacion
        except ConfirmacionEntrega.DoesNotExist:
            return False
        if conf.firma_cliente:
            return True
        return conf.cliente_conforme in ('total', 'parcial', 'ninguna')

    def get_cliente_califico(self, obj):
        """Existe fila en `CalificacionServicio` para el servicio de esta reserva."""
        try:
            servicio = obj.servicio
        except ServicioMudanza.DoesNotExist:
            return False
        try:
            servicio.calificacion  # OneToOne; aprovecha select_related en el queryset
            return True
        except CalificacionServicio.DoesNotExist:
            return False
