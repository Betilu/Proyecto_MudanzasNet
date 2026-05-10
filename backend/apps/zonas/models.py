from django.db import models


class Zona(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    distrito = models.CharField(max_length=50, blank=True)
    latitud_centro = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitud_centro = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    es_activa = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'zonas'
        verbose_name = 'Zona'
        verbose_name_plural = 'Zonas'

    def __str__(self):
        return self.nombre


class TarifaDistancia(models.Model):
    zona_origen = models.ForeignKey(Zona, on_delete=models.CASCADE, related_name='tarifas_origen')
    zona_destino = models.ForeignKey(Zona, on_delete=models.CASCADE, related_name='tarifas_destino')
    distancia_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    tarifa_base = models.DecimalField(max_digits=10, decimal_places=2)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tarifas_distancia'
        unique_together = ('zona_origen', 'zona_destino')

    def __str__(self):
        return f"{self.zona_origen} -> {self.zona_destino}: Bs {self.tarifa_base}"
