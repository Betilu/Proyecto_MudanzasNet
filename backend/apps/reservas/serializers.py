from rest_framework import serializers
from .models import Reserva

_RESERVA_MODEL_FIELDS = tuple(f.name for f in Reserva._meta.fields)


class ReservaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.usuario.nombre_completo', read_only=True)
    cotizacion_id = serializers.IntegerField(source='cotizacion.id', read_only=True)
    ubicacion_cotizacion = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = _RESERVA_MODEL_FIELDS + ('cliente_nombre', 'cotizacion_id', 'ubicacion_cotizacion')

    def get_ubicacion_cotizacion(self, obj):
        c = obj.cotizacion
        return {
            'direccion_origen': c.direccion_origen,
            'direccion_destino': c.direccion_destino,
            'latitud_origen': c.latitud_origen,
            'longitud_origen': c.longitud_origen,
            'latitud_destino': c.latitud_destino,
            'longitud_destino': c.longitud_destino,
            'zona_origen_nombre': c.zona_origen.nombre if c.zona_origen_id else None,
            'zona_destino_nombre': c.zona_destino.nombre if c.zona_destino_id else None,
        }


class ReservaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = ('cotizacion', 'cliente', 'fecha_servicio', 'franja_horaria')
