from django.conf import settings
from django.db import models


class ReportePersonalizado(models.Model):
    """Definición guardada de reporte (columnas, filtros y orden por defecto)."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reportes_personalizados',
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    fuente = models.CharField(max_length=80, db_index=True)
    columnas = models.JSONField(default=list, help_text='Lista de keys de columnas según catálogo de la fuente')
    filtros = models.JSONField(default=list, help_text='Filtros sugeridos al abrir el reporte')
    orden = models.JSONField(default=list, help_text='Lista de {field, desc} para ordenar')
    es_compartido = models.BooleanField(
        default=False,
        help_text='Si es True, otros usuarios con permiso de reportes pueden ver y usar la plantilla',
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reportes_personalizados'
        ordering = ['-actualizado_en']
        verbose_name = 'Reporte personalizado'
        verbose_name_plural = 'Reportes personalizados'

    def __str__(self):
        return f'{self.nombre} ({self.fuente})'
