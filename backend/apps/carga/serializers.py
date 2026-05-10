from rest_framework import serializers
from apps.inventario.models import ObjetoMudanza
from .models import PlanCarga, ItemPlanCarga


class ObjetoMudanzaNestedSerializer(serializers.ModelSerializer):
    """Objeto anidado para app conductor / checklist (nombre, peso, riesgo IA)."""

    class Meta:
        model = ObjetoMudanza
        fields = ('id', 'nombre', 'peso_kg', 'rf_nivel_riesgo')


class ItemPlanCargaSerializer(serializers.ModelSerializer):
    objeto = ObjetoMudanzaNestedSerializer(read_only=True)
    objeto_nombre = serializers.CharField(source='objeto.nombre', read_only=True)

    class Meta:
        model = ItemPlanCarga
        fields = '__all__'


class PlanCargaSerializer(serializers.ModelSerializer):
    items = ItemPlanCargaSerializer(many=True, read_only=True)
    tipo_contenedor_nombre = serializers.CharField(source='tipo_contenedor.nombre', read_only=True)

    class Meta:
        model = PlanCarga
        fields = '__all__'
