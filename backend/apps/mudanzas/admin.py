from django.contrib import admin
from .models import (
    ServicioMudanza, AsignacionPersonal, HistorialEstadoServicio,
    ConfirmacionEntrega, FotoEntrega, Incidencia, CalificacionServicio
)


@admin.register(ServicioMudanza)
class ServicioMudanzaAdmin(admin.ModelAdmin):
    list_display = ('id', 'reserva', 'vehiculo', 'estado')


@admin.register(AsignacionPersonal)
class AsignacionPersonalAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'personal', 'rol_asignado')


@admin.register(Incidencia)
class IncidenciaAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'tipo', 'gravedad', 'estado')


@admin.register(CalificacionServicio)
class CalificacionServicioAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'cliente', 'calificacion')
