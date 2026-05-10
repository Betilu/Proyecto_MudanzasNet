from rest_framework import serializers
from .models import Zona, TarifaDistancia


class ZonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zona
        fields = '__all__'


class TarifaDistanciaSerializer(serializers.ModelSerializer):
    zona_origen_nombre = serializers.CharField(source='zona_origen.nombre', read_only=True)
    zona_destino_nombre = serializers.CharField(source='zona_destino.nombre', read_only=True)

    class Meta:
        model = TarifaDistancia
        fields = '__all__'


class TarifaDistanciaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TarifaDistancia
        fields = ('zona_origen', 'zona_destino', 'distancia_km', 'tarifa_base')
