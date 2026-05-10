from django.contrib import admin
from .models import RFModelo, RFPrediccionDemanda, RFPrediccionDisponibilidad


@admin.register(RFModelo)
class RFModeloAdmin(admin.ModelAdmin):
    list_display = ('nombre_modelo', 'version', 'tipo', 'es_activo')


@admin.register(RFPrediccionDemanda)
class RFPrediccionDemandaAdmin(admin.ModelAdmin):
    list_display = ('modelo', 'zona', 'periodo_inicio', 'demanda_predicha')


@admin.register(RFPrediccionDisponibilidad)
class RFPrediccionDisponibilidadAdmin(admin.ModelAdmin):
    list_display = ('modelo', 'fecha', 'vehiculos_necesarios', 'personal_necesario')
