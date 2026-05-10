from rest_framework import serializers
from .models import Cotizacion, CotizacionServicioAdicional

_COTIZACION_FIELDS = [f.name for f in Cotizacion._meta.fields]

# Campos de cotización no expuestos en la app móvil (cliente): desglose técnico vía panel CRM.
_COTIZACION_APP_EXCLUDE = (
    'precio_base',
    'precio_servicios_extra',
    'precio_total_calculado',
    'rf_precio_predicho',
    'rf_confianza_precio',
)


class CotizacionServicioAdicionalSerializer(serializers.ModelSerializer):
    servicio_nombre = serializers.CharField(source='servicio_adicional.nombre', read_only=True)

    class Meta:
        model = CotizacionServicioAdicional
        fields = '__all__'


class CotizacionServicioAdicionalClienteSerializer(serializers.ModelSerializer):
    """App cliente: líneas de extras contratados (montos visibles para transparencia)."""

    servicio_nombre = serializers.CharField(source='servicio_adicional.nombre', read_only=True)

    class Meta:
        model = CotizacionServicioAdicional
        fields = ('id', 'servicio_adicional', 'servicio_nombre', 'cantidad', 'precio_unitario', 'precio_total')


class CotizacionSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.usuario.nombre_completo', read_only=True)
    zona_origen_nombre = serializers.CharField(source='zona_origen.nombre', read_only=True)
    zona_destino_nombre = serializers.CharField(source='zona_destino.nombre', read_only=True)
    tipo_servicio_nombre = serializers.CharField(source='tipo_servicio.nombre', read_only=True)
    servicios_adicionales = CotizacionServicioAdicionalSerializer(
        source='servicios_adicionales_vinculados', many=True, read_only=True
    )
    desglose_precio = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = _COTIZACION_FIELDS + [
            'cliente_nombre',
            'zona_origen_nombre',
            'zona_destino_nombre',
            'tipo_servicio_nombre',
            'servicios_adicionales',
            'desglose_precio',
        ]

    def get_desglose_precio(self, obj):
        view = self.context.get('view')
        if view and getattr(view, 'action', None) == 'list':
            return None
        from .precio_desglose import construir_desglose_cliente

        return construir_desglose_cliente(obj)


class CotizacionClienteAppSerializer(serializers.ModelSerializer):
    """
    Cotización para app cliente: un solo monto comercial (`precio_total_servicio`):
    RF si existe, si no total por fórmula. Sin desglose IA/fórmula (eso va al panel web).
    """

    cliente_nombre = serializers.CharField(source='cliente.usuario.nombre_completo', read_only=True)
    zona_origen_nombre = serializers.CharField(source='zona_origen.nombre', read_only=True)
    zona_destino_nombre = serializers.CharField(source='zona_destino.nombre', read_only=True)
    tipo_servicio_nombre = serializers.CharField(source='tipo_servicio.nombre', read_only=True)
    servicios_adicionales = CotizacionServicioAdicionalClienteSerializer(
        source='servicios_adicionales_vinculados', many=True, read_only=True
    )
    precio_total_servicio = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = (
            [f for f in _COTIZACION_FIELDS if f not in _COTIZACION_APP_EXCLUDE]
            + [
                'cliente_nombre',
                'zona_origen_nombre',
                'zona_destino_nombre',
                'tipo_servicio_nombre',
                'servicios_adicionales',
                'precio_total_servicio',
            ]
        )

    def get_precio_total_servicio(self, obj):
        p = obj.precio_comercial_cliente
        return str(p) if p is not None else None


class CotizacionCreateSerializer(serializers.ModelSerializer):
    """
    Creación desde portal o app móvil: el cliente autenticado con rol cliente
    no envía `cliente`; lo asigna CotizacionViewSet.perform_create.
    """

    class Meta:
        model = Cotizacion
        fields = (
            'id',
            'cliente', 'direccion_origen', 'latitud_origen', 'longitud_origen', 'zona_origen',
            'direccion_destino', 'latitud_destino', 'longitud_destino', 'zona_destino',
            'tipo_servicio', 'fecha_deseada', 'franja_horaria', 'descripcion',
        )
        read_only_fields = ('id',)
        extra_kwargs = {
            'cliente': {'required': False, 'allow_null': True},
            'direccion_origen': {'required': True},
            'direccion_destino': {'required': True},
            'tipo_servicio': {'required': True},
        }

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        # Aliases *_id desde la app (evitar "" que no es None y rompe el PK)
        pairs = (
            ('zona_origen_id', 'zona_origen'),
            ('zona_destino_id', 'zona_destino'),
            ('tipo_servicio_id', 'tipo_servicio'),
        )
        for src, dst in pairs:
            if dst in data:
                continue
            raw = data.get(src)
            if raw in (None, ''):
                continue
            data[dst] = raw
        return super().to_internal_value(data)


class CotizacionServicioAdicionalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionServicioAdicional
        fields = ('cotizacion', 'servicio_adicional', 'cantidad', 'precio_unitario', 'precio_total')
