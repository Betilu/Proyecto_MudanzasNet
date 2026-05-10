from django.db import models


class TipoServicio(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    incluye_embalaje = models.BooleanField(default=False)
    incluye_montaje = models.BooleanField(default=False)
    incluye_desmontaje = models.BooleanField(default=False)
    factor_precio = models.DecimalField(max_digits=4, decimal_places=2)
    es_activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tipos_servicio'

    def __str__(self):
        return self.nombre


class ServicioAdicional(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    es_por_objeto = models.BooleanField(default=False)
    es_activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'servicios_adicionales'

    def __str__(self):
        return f"{self.nombre} - Bs {self.precio}"
