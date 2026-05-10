import uuid
from django.db import models
from apps.cotizaciones.models import Cotizacion
from apps.clientes.models import Cliente


class Reserva(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
    ]

    cotizacion = models.OneToOneField(Cotizacion, on_delete=models.PROTECT, related_name='reserva')
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='reservas')
    codigo_confirmacion = models.CharField(max_length=20, unique=True, editable=False)
    fecha_servicio = models.DateField()
    franja_horaria = models.CharField(max_length=20)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    motivo_cancelacion = models.TextField(blank=True)
    confirmada_en = models.DateTimeField(null=True, blank=True)
    cancelada_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reservas'
        ordering = ['-fecha_servicio']

    def __str__(self):
        return f"{self.codigo_confirmacion} | {self.fecha_servicio} | {self.estado}"

    def save(self, *args, **kwargs):
        if not self.codigo_confirmacion:
            self.codigo_confirmacion = f"MUD-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)
