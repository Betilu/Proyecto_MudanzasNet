from django.contrib import admin
from .models import TipoContenedor, Vehiculo, MantenimientoVehiculo


@admin.register(TipoContenedor)
class TipoContenedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'volumen_capacidad_m3', 'peso_capacidad_kg')


@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('placa', 'marca', 'modelo', 'estado', 'tipo_contenedor')


@admin.register(MantenimientoVehiculo)
class MantenimientoVehiculoAdmin(admin.ModelAdmin):
    list_display = ('vehiculo', 'tipo_mantenimiento', 'fecha_programada', 'estado')
