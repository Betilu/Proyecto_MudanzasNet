from rest_framework import serializers

from apps.clientes.models import Cliente
from apps.cotizaciones.models import Cotizacion
from apps.inventario.access import es_cliente_portal
from apps.inventario.models import ObjetoMudanza
from apps.reservas.models import Reserva
from apps.zonas.models import Zona

from .models import (
    ServicioMudanza,
    AsignacionPersonal,
    ConfirmacionEntrega,
    FotoEntrega,
    Incidencia,
    CalificacionServicio,
    HistorialEstadoServicio,
)


class ZonaNombreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zona
        fields = ('id', 'nombre')


class ClienteLiteSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    telefono = serializers.CharField(source='usuario.telefono', read_only=True)
    email = serializers.EmailField(source='usuario.email', read_only=True)

    class Meta:
        model = Cliente
        fields = ('id', 'nombre_completo', 'telefono', 'email', 'tipo_cliente')


class ObjetoListadoSerializer(serializers.ModelSerializer):
    """Inventario para app conductor (Fase 6): riesgo + fotos con URL absoluta."""

    fotos = serializers.SerializerMethodField()

    class Meta:
        model = ObjetoMudanza
        fields = (
            'id',
            'nombre',
            'descripcion',
            'peso_kg',
            'fragilidad',
            'rf_nivel_riesgo',
            'rf_proteccion_sugerida',
            'fotos',
        )

    def get_fotos(self, obj):
        request = self.context.get('request')
        out = []
        for f in obj.fotos.all()[:8]:
            if not f.foto:
                continue
            url = f.foto.url
            if request:
                url = request.build_absolute_uri(url)
            out.append({'id': f.id, 'tipo_foto': f.tipo_foto, 'url': url})
        return out


class CotizacionAnidadaSerializer(serializers.ModelSerializer):
    zona_origen = ZonaNombreSerializer(read_only=True)
    zona_destino = ZonaNombreSerializer(read_only=True)
    objetos = ObjetoListadoSerializer(many=True, read_only=True)

    class Meta:
        model = Cotizacion
        fields = (
            'id',
            'direccion_origen',
            'direccion_destino',
            'latitud_origen',
            'longitud_origen',
            'latitud_destino',
            'longitud_destino',
            'cantidad_objetos',
            'volumen_total_m3',
            'peso_total_kg',
            'zona_origen',
            'zona_destino',
            'objetos',
        )


class ReservaAnidadaSerializer(serializers.ModelSerializer):
    cotizacion = CotizacionAnidadaSerializer(read_only=True)
    cliente = ClienteLiteSerializer(read_only=True)

    class Meta:
        model = Reserva
        fields = (
            'id',
            'codigo_confirmacion',
            'fecha_servicio',
            'franja_horaria',
            'estado',
            'cliente',
            'cotizacion',
        )


class HistorialEstadoSerializer(serializers.ModelSerializer):
    cambiado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = HistorialEstadoServicio
        fields = (
            'id',
            'estado_anterior',
            'estado_nuevo',
            'latitud',
            'longitud',
            'notas',
            'creado_en',
            'cambiado_por_nombre',
        )

    def get_cambiado_por_nombre(self, obj):
        u = obj.cambiado_por
        return u.nombre_completo if u else None


class AsignacionPersonalSerializer(serializers.ModelSerializer):
    personal_nombre = serializers.CharField(source='personal.usuario.nombre_completo', read_only=True)

    class Meta:
        model = AsignacionPersonal
        fields = '__all__'


class ServicioMudanzaSerializer(serializers.ModelSerializer):
    reserva_codigo = serializers.CharField(source='reserva.codigo_confirmacion', read_only=True)
    vehiculo_placa = serializers.CharField(source='vehiculo.placa', read_only=True)
    equipo = AsignacionPersonalSerializer(many=True, read_only=True)
    reserva = ReservaAnidadaSerializer(read_only=True)
    historial_estados = HistorialEstadoSerializer(many=True, read_only=True)
    vehiculo_resumen = serializers.SerializerMethodField()

    class Meta:
        model = ServicioMudanza
        fields = '__all__'

    def get_vehiculo_resumen(self, obj):
        v = obj.vehiculo
        if not v:
            return None
        tc = v.tipo_contenedor
        return {
            'placa': v.placa,
            'marca': v.marca,
            'modelo': v.modelo,
            'color': v.color or '',
            'tipo_contenedor': tc.nombre if tc else None,
            'volumen_m3': str(tc.volumen_capacidad_m3) if tc else None,
        }


class ServicioMudanzaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioMudanza
        fields = ('reserva', 'vehiculo', 'notas_operador')


class FotoEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoEntrega
        fields = '__all__'


class ConfirmacionEntregaSerializer(serializers.ModelSerializer):
    fotos = FotoEntregaSerializer(many=True, read_only=True)

    class Meta:
        model = ConfirmacionEntrega
        fields = '__all__'


class IncidenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incidencia
        fields = '__all__'
        # `servicio` lo inyecta la vista (app cliente / operador); no debe venir en el POST
        read_only_fields = (
            'reportado_por',
            'servicio',
            'creado_en',
            'estado',
            'resolucion',
            'resuelta_en',
        )

    def validate(self, attrs):
        request = self.context.get('request')
        servicio = self.context.get('servicio') or attrs.get('servicio')
        if self.instance:
            servicio = servicio or self.instance.servicio
        if servicio and request and es_cliente_portal(request.user):
            if servicio.reserva.cliente.usuario_id != request.user.id:
                raise serializers.ValidationError('No autorizado para este servicio.')
        objeto = attrs.get('objeto')
        if objeto and servicio and servicio.reserva.cotizacion_id != objeto.cotizacion_id:
            raise serializers.ValidationError({'objeto': 'El objeto no pertenece a la cotización de esta reserva.'})
        return attrs


class CalificacionServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalificacionServicio
        fields = '__all__'
