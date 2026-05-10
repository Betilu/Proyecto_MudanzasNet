from django.contrib import admin
from .models import PlanCarga, ItemPlanCarga


@admin.register(PlanCarga)
class PlanCargaAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'numero_viaje', 'tipo_contenedor')


@admin.register(ItemPlanCarga)
class ItemPlanCargaAdmin(admin.ModelAdmin):
    list_display = ('plan_carga', 'objeto', 'orden_carga', 'fue_cargado')
