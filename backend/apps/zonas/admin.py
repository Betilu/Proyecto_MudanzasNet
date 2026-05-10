from django.contrib import admin
from .models import Zona, TarifaDistancia


@admin.register(Zona)
class ZonaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'distrito', 'es_activa')


@admin.register(TarifaDistancia)
class TarifaDistanciaAdmin(admin.ModelAdmin):
    list_display = ('zona_origen', 'zona_destino', 'distancia_km', 'tarifa_base')
