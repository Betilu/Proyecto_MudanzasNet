from rest_framework import serializers
from .models import TipoContenedor, Vehiculo, MantenimientoVehiculo


class TipoContenedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoContenedor
        fields = '__all__'


class VehiculoSerializer(serializers.ModelSerializer):
    tipo_contenedor_nombre = serializers.CharField(source='tipo_contenedor.nombre', read_only=True)

    class Meta:
        model = Vehiculo
        fields = '__all__'


class MantenimientoVehiculoSerializer(serializers.ModelSerializer):
    vehiculo_placa = serializers.CharField(source='vehiculo.placa', read_only=True)

    class Meta:
        model = MantenimientoVehiculo
        fields = '__all__'
