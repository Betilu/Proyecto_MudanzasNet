from django.db import models
from apps.zonas.models import Zona


class RFModelo(models.Model):
    TIPOS = [('clasificacion', 'Clasificación'), ('regresion', 'Regresión')]

    nombre_modelo = models.CharField(max_length=50)
    version = models.CharField(max_length=20)
    tipo = models.CharField(max_length=20, choices=TIPOS)
    accuracy = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    rmse = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    r2_score = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    features_usadas = models.JSONField()
    hiperparametros = models.JSONField(default=dict, blank=True)
    ruta_modelo = models.CharField(max_length=500, blank=True)
    es_activo = models.BooleanField(default=True)
    entrenado_en = models.DateTimeField(auto_now_add=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rf_modelos'

    def __str__(self):
        return f"{self.nombre_modelo} v{self.version} ({'activo' if self.es_activo else 'inactivo'})"


class RFPrediccionDemanda(models.Model):
    modelo = models.ForeignKey(RFModelo, on_delete=models.CASCADE, related_name='predicciones_demanda')
    zona = models.ForeignKey(Zona, on_delete=models.SET_NULL, null=True, blank=True)
    periodo_inicio = models.DateField()
    periodo_fin = models.DateField()
    demanda_predicha = models.IntegerField()
    confianza = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    demanda_real = models.IntegerField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rf_predicciones_demanda'


class RFPrediccionDisponibilidad(models.Model):
    modelo = models.ForeignKey(RFModelo, on_delete=models.CASCADE, related_name='predicciones_disponibilidad')
    fecha = models.DateField()
    zona = models.ForeignKey(Zona, on_delete=models.SET_NULL, null=True, blank=True)
    vehiculos_necesarios = models.IntegerField()
    personal_necesario = models.IntegerField()
    confianza = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rf_predicciones_disponibilidad'


class RFRetroalimentacion(models.Model):
    TIPOS = [
        ('precio', 'Predicción de Precio'),
        ('riesgo', 'Clasificación de Riesgo'),
        ('contenedor', 'Recomendación de Contenedor'),
        ('tiempo', 'Estimación de Tiempo'),
        ('viajes', 'Predicción de Viajes'),
        ('retencion', 'Probabilidad de Retención'),
        ('demanda', 'Predicción de Demanda'),
    ]

    modelo = models.ForeignKey(RFModelo, on_delete=models.CASCADE, related_name='retroalimentaciones')
    tipo_prediccion = models.CharField(max_length=20, choices=TIPOS)
    entidad_tipo = models.CharField(max_length=50)
    entidad_id = models.IntegerField()
    features_entrada = models.JSONField(default=dict)
    valor_predicho = models.JSONField()
    valor_real = models.JSONField(null=True, blank=True)
    confianza = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    error_absoluto = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    error_porcentual = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    fue_correcto = models.BooleanField(null=True, blank=True)
    notas = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rf_retroalimentaciones'
        ordering = ['-creado_en']
        indexes = [
            models.Index(fields=['tipo_prediccion', 'modelo']),
            models.Index(fields=['entidad_tipo', 'entidad_id']),
        ]

    def __str__(self):
        return f"{self.tipo_prediccion} - {self.entidad_tipo}#{self.entidad_id}"
