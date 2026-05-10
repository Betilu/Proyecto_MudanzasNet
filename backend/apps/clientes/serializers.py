from rest_framework import serializers
from .models import SegmentoCliente, Cliente, ComunicacionCliente, AlertaCliente
from apps.usuarios.serializers import UsuarioPerfilSerializer


class SegmentoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SegmentoCliente
        fields = '__all__'


class ClienteSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = (
            'rf_probabilidad_retencion',
            'rf_segmento_predicho',
            'rf_ultima_prediccion',
            'cantidad_mudanzas',
            'monto_total_gastado',
            'creado_en',
            'actualizado_en',
        )


class ClienteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ('usuario', 'tipo_cliente', 'nombre_empresa', 'nit', 'preferencia_comunicacion')


class ComunicacionClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComunicacionCliente
        fields = '__all__'


class AlertaClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertaCliente
        fields = '__all__'
