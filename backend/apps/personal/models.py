from django.db import models
from apps.usuarios.models import Usuario


class Personal(models.Model):
    TIPOS = [('conductor', 'Conductor'), ('cargador', 'Cargador')]

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_personal')
    tipo_personal = models.CharField(max_length=20, choices=TIPOS)
    numero_licencia = models.CharField(max_length=30, blank=True)
    tipo_licencia = models.CharField(max_length=10, blank=True)
    fecha_ingreso = models.DateField()
    salario_mensual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    esta_disponible = models.BooleanField(default=True)
    servicios_completados = models.IntegerField(default=0)
    calificacion_promedio = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    incidencias_reportadas = models.IntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'personal'
        verbose_name_plural = 'Personal'

    def __str__(self):
        return f"{self.usuario.nombre_completo} ({self.tipo_personal})"
