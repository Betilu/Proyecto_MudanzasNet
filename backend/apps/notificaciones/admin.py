from django.contrib import admin
from .models import DispositivoPush, Notificacion


@admin.register(DispositivoPush)
class DispositivoPushAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'aplicacion', 'plataforma', 'activo', 'actualizado_en')
    list_filter = ('aplicacion', 'plataforma', 'activo')
    search_fields = ('token', 'usuario__email')


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'tipo', 'titulo', 'es_leida', 'creado_en')
