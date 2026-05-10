from django.contrib import admin
from .models import Cotizacion, CotizacionServicioAdicional


@admin.register(Cotizacion)
class CotizacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente', 'estado', 'precio_total_calculado', 'creado_en')


@admin.register(CotizacionServicioAdicional)
class CotizacionServicioAdicionalAdmin(admin.ModelAdmin):
    list_display = ('cotizacion', 'servicio_adicional', 'cantidad', 'precio_total')
