from django.contrib import admin
from .models import MetodoPago, Pago, Factura, Reembolso


@admin.register(MetodoPago)
class MetodoPagoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'es_activo')


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('id', 'reserva', 'monto', 'estado', 'metodo_pago')


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    list_display = ('numero_factura', 'cliente', 'total')


@admin.register(Reembolso)
class ReembolsoAdmin(admin.ModelAdmin):
    list_display = ('pago', 'monto', 'estado')
