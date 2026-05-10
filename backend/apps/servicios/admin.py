from django.contrib import admin
from .models import TipoServicio, ServicioAdicional


@admin.register(TipoServicio)
class TipoServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'factor_precio', 'es_activo')


@admin.register(ServicioAdicional)
class ServicioAdicionalAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'es_por_objeto', 'es_activo')
