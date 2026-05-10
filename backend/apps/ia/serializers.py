from rest_framework import serializers
from .models import RFModelo, RFPrediccionDemanda, RFPrediccionDisponibilidad, RFRetroalimentacion


class RFModeloSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFModelo
        fields = '__all__'


class RFPrediccionDemandaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFPrediccionDemanda
        fields = '__all__'


class RFPrediccionDisponibilidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFPrediccionDisponibilidad
        fields = '__all__'


class RFRetroalimentacionSerializer(serializers.ModelSerializer):
    modelo_nombre = serializers.CharField(source='modelo.nombre_modelo', read_only=True)

    class Meta:
        model = RFRetroalimentacion
        fields = '__all__'
