from django.db import models
from apps.mudanzas.models import ServicioMudanza
from apps.vehiculos.models import TipoContenedor
from apps.inventario.models import ObjetoMudanza


class PlanCarga(models.Model):
    servicio = models.ForeignKey(ServicioMudanza, on_delete=models.CASCADE, related_name='planes_carga')
    tipo_contenedor = models.ForeignKey(TipoContenedor, on_delete=models.PROTECT)
    numero_viaje = models.IntegerField(default=1)
    volumen_utilizado_m3 = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    peso_total_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    porcentaje_ocupacion = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    rf_modelo_version = models.CharField(max_length=20, blank=True)
    rf_datos_entrada = models.JSONField(default=dict, blank=True)
    rf_resultado = models.JSONField(default=dict, blank=True)
    instrucciones_generales = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'planes_carga'

    def __str__(self):
        return f"Plan Carga SRV-{self.servicio.pk} Viaje {self.numero_viaje}"


class ItemPlanCarga(models.Model):
    plan_carga = models.ForeignKey(PlanCarga, on_delete=models.CASCADE, related_name='items')
    objeto = models.ForeignKey(ObjetoMudanza, on_delete=models.PROTECT, related_name='items_carga')
    orden_carga = models.IntegerField()
    zona_posicion = models.CharField(max_length=30, blank=True)
    requiere_proteccion = models.BooleanField(default=False)
    instrucciones_especiales = models.TextField(blank=True)
    fue_cargado = models.BooleanField(default=False)
    fue_descargado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'items_plan_carga'
        ordering = ['orden_carga']
