from django.contrib import admin

from .models import ReportePersonalizado


@admin.register(ReportePersonalizado)
class ReportePersonalizadoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'fuente', 'usuario', 'es_compartido', 'actualizado_en')
    list_filter = ('fuente', 'es_compartido')
    search_fields = ('nombre', 'usuario__email')
    raw_id_fields = ('usuario',)
