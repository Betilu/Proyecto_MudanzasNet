from rest_framework import serializers
from .models import TipoServicio, ServicioAdicional


class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = '__all__'


class ServicioAdicionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioAdicional
        fields = '__all__'
