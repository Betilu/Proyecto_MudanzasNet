from django.contrib import admin
from .models import SegmentoCliente, Cliente, ClienteSegmento, ComunicacionCliente, AlertaCliente


@admin.register(SegmentoCliente)
class SegmentoClienteAdmin(admin.ModelAdmin):
    list_display = ('nombre',)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'tipo_cliente', 'cantidad_mudanzas', 'monto_total_gastado')


@admin.register(ComunicacionCliente)
class ComunicacionClienteAdmin(admin.ModelAdmin):
    list_display = ('cliente', 'canal', 'direccion', 'creado_en')


@admin.register(AlertaCliente)
class AlertaClienteAdmin(admin.ModelAdmin):
    list_display = ('cliente', 'tipo', 'titulo', 'estado', 'fecha_programada')
