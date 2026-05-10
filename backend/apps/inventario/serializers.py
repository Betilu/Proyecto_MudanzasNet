from rest_framework import serializers

from .access import es_cliente_portal, objeto_accesible
from .models import CategoriaObjeto, ObjetoMudanza, FotoObjeto


class CategoriaObjetoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaObjeto
        fields = '__all__'


class ObjetoMudanzaSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)

    class Meta:
        model = ObjetoMudanza
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if data.get('categoria_id') is not None and 'categoria' not in data:
            data['categoria'] = data['categoria_id']
        for app_key, model_key in (
            ('largo', 'largo_cm'),
            ('ancho', 'ancho_cm'),
            ('alto', 'alto_cm'),
            ('peso', 'peso_kg'),
        ):
            if app_key in data and model_key not in data:
                data[model_key] = data[app_key]
        return super().to_internal_value(data)

    def validate(self, attrs):
        request = self.context.get('request')
        cot = attrs.get('cotizacion')
        if cot is None and self.instance:
            cot = self.instance.cotizacion
        if request and cot and es_cliente_portal(request.user):
            if cot.cliente.usuario_id != request.user.id:
                raise serializers.ValidationError({'cotizacion': 'No puede usar esta cotización.'})
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['largo'] = data.get('largo_cm')
        data['ancho'] = data.get('ancho_cm')
        data['alto'] = data.get('alto_cm')
        data['peso'] = data.get('peso_kg')
        request = self.context.get('request')
        foto = instance.fotos.filter(tipo_foto='antes_traslado').first()
        if not foto:
            foto = instance.fotos.first()
        if foto and foto.foto:
            url = foto.foto.url
            data['foto_url'] = request.build_absolute_uri(url) if request else url
        else:
            data['foto_url'] = None
        return data


class FotoObjetoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoObjeto
        fields = '__all__'

    def validate_objeto(self, obj):
        request = self.context.get('request')
        if request and not request.user.is_superuser:
            if not objeto_accesible(request.user, obj):
                raise serializers.ValidationError('No autorizado para este objeto.')
        return obj
