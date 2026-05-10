from django.contrib import admin
from .models import CategoriaObjeto, ObjetoMudanza, FotoObjeto


@admin.register(CategoriaObjeto)
class CategoriaObjetoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'fragilidad_default')


@admin.register(ObjetoMudanza)
class ObjetoMudanzaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'cotizacion', 'peso_kg', 'fragilidad')


@admin.register(FotoObjeto)
class FotoObjetoAdmin(admin.ModelAdmin):
    list_display = ('objeto', 'tipo_foto', 'creado_en')
