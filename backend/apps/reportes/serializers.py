from rest_framework import serializers

from .models import ReportePersonalizado
from .registry import DATA_SOURCES, columns_by_key


class FiltroReporteSerializer(serializers.Serializer):
    field = serializers.CharField()
    op = serializers.CharField()
    value = serializers.JSONField(required=False, allow_null=True)


class OrdenReporteSerializer(serializers.Serializer):
    field = serializers.CharField()
    desc = serializers.BooleanField(required=False, default=False)


def _validar_fuente_columnas(fuente: str, columnas: list) -> None:
    if fuente not in DATA_SOURCES:
        raise serializers.ValidationError({'fuente': 'Fuente de datos no válida'})
    cmap = columns_by_key(fuente)
    if not columnas:
        raise serializers.ValidationError({'columnas': 'Indica al menos una columna'})
    for k in columnas:
        if k not in cmap:
            raise serializers.ValidationError({'columnas': f'Columna no permitida: {k}'})


def _validar_filtros_orden(fuente: str, filtros: list, orden: list) -> None:
    cmap = columns_by_key(fuente)
    for f in filtros or []:
        key = f.get('field')
        op = f.get('op')
        if key not in cmap:
            raise serializers.ValidationError({'filtros': f'Campo de filtro no permitido: {key}'})
        if op not in (cmap[key].get('filter_ops') or []):
            raise serializers.ValidationError({'filtros': f'Operador no permitido para {key}: {op}'})
    for o in orden or []:
        key = o.get('field')
        if key not in cmap:
            raise serializers.ValidationError({'orden': f'Campo de orden no permitido: {key}'})


class EjecutarReporteSerializer(serializers.Serializer):
    fuente = serializers.CharField()
    columnas = serializers.ListField(child=serializers.CharField(), min_length=1)
    filtros = FiltroReporteSerializer(many=True, required=False, default=list)
    orden = OrdenReporteSerializer(many=True, required=False, default=list)
    limit = serializers.IntegerField(default=200, min_value=1, max_value=2000)
    offset = serializers.IntegerField(default=0, min_value=0)

    def validate(self, attrs):
        _validar_fuente_columnas(attrs['fuente'], attrs['columnas'])
        _validar_filtros_orden(attrs['fuente'], attrs.get('filtros') or [], attrs.get('orden') or [])
        return attrs


class ExportarReporteSerializer(serializers.Serializer):
    fuente = serializers.CharField()
    columnas = serializers.ListField(child=serializers.CharField(), min_length=1)
    filtros = FiltroReporteSerializer(many=True, required=False, default=list)
    orden = OrdenReporteSerializer(many=True, required=False, default=list)
    limit = serializers.IntegerField(default=2000, min_value=1, max_value=5000)
    formato = serializers.ChoiceField(choices=['xlsx', 'html', 'pdf', 'email'])
    titulo = serializers.CharField(max_length=200, required=False, default='Reporte')
    email_destinatario = serializers.EmailField(required=False, allow_blank=True)
    email_asunto = serializers.CharField(max_length=200, required=False, default='Reporte exportado')
    email_adjuntos = serializers.ListField(
        child=serializers.ChoiceField(choices=['xlsx', 'pdf']),
        required=False,
        default=list,
    )

    def validate(self, attrs):
        _validar_fuente_columnas(attrs['fuente'], attrs['columnas'])
        _validar_filtros_orden(attrs['fuente'], attrs.get('filtros') or [], attrs.get('orden') or [])
        if attrs['formato'] == 'email':
            if not attrs.get('email_destinatario'):
                raise serializers.ValidationError({'email_destinatario': 'Requerido para envío por email'})
            if not attrs.get('email_adjuntos'):
                attrs['email_adjuntos'] = ['xlsx']
        return attrs


class ReportePersonalizadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportePersonalizado
        fields = (
            'id', 'nombre', 'descripcion', 'fuente', 'columnas', 'filtros', 'orden',
            'es_compartido', 'creado_en', 'actualizado_en',
        )
        read_only_fields = ('creado_en', 'actualizado_en')

    def validate(self, attrs):
        inst = self.instance
        if inst:
            fuente = attrs.get('fuente', inst.fuente)
            columnas = attrs.get('columnas', inst.columnas)
            filtros = attrs.get('filtros', inst.filtros)
            orden = attrs.get('orden', inst.orden)
        else:
            fuente = attrs['fuente']
            columnas = attrs['columnas']
            filtros = attrs.get('filtros', [])
            orden = attrs.get('orden', [])
        _validar_fuente_columnas(fuente, columnas)
        _validar_filtros_orden(fuente, filtros or [], orden or [])
        return attrs


class ReportePersonalizadoListSerializer(serializers.ModelSerializer):
    es_mio = serializers.SerializerMethodField()

    class Meta:
        model = ReportePersonalizado
        fields = ('id', 'nombre', 'fuente', 'es_compartido', 'actualizado_en', 'es_mio')

    def get_es_mio(self, obj):
        req = self.context.get('request')
        if not req or not req.user.is_authenticated:
            return False
        return obj.usuario_id == req.user.id
