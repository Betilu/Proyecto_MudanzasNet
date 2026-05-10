from django.db import models
from apps.clientes.models import Cliente
from apps.zonas.models import Zona
from apps.servicios.models import TipoServicio, ServicioAdicional


class Cotizacion(models.Model):
    ESTADOS = [
        ('borrador', 'Borrador'), ('enviada', 'Enviada'), ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'), ('expirada', 'Expirada'),
    ]

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='cotizaciones')
    direccion_origen = models.TextField()
    latitud_origen = models.FloatField(null=True, blank=True, help_text='Coordenada GPS origen')
    longitud_origen = models.FloatField(null=True, blank=True, help_text='Coordenada GPS origen')
    zona_origen = models.ForeignKey(Zona, on_delete=models.SET_NULL, null=True, related_name='cotizaciones_origen')
    direccion_destino = models.TextField()
    latitud_destino = models.FloatField(null=True, blank=True, help_text='Coordenada GPS destino')
    longitud_destino = models.FloatField(null=True, blank=True, help_text='Coordenada GPS destino')
    zona_destino = models.ForeignKey(Zona, on_delete=models.SET_NULL, null=True, related_name='cotizaciones_destino')
    tipo_servicio = models.ForeignKey(TipoServicio, on_delete=models.PROTECT, related_name='cotizaciones')
    fecha_deseada = models.DateField(null=True, blank=True)
    franja_horaria = models.CharField(max_length=20, blank=True)
    descripcion = models.TextField(blank=True, help_text='Descripción de lo que se desea trasladar')
    solicita_embalaje = models.BooleanField(
        default=False,
        help_text='Cliente solicita embalaje/refuerzo; se suma al precio y la IA lo considera',
    )

    volumen_total_m3 = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    peso_total_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cantidad_objetos = models.IntegerField(default=0)
    distancia_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    precio_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    precio_servicios_extra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    precio_total_calculado = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    rf_precio_predicho = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rf_confianza_precio = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)

    estado = models.CharField(max_length=20, choices=ESTADOS, default='borrador')
    valida_hasta = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cotizaciones'
        ordering = ['-creado_en']

    def __str__(self):
        return f"COT-{self.pk} | {self.cliente} | {self.estado}"

    @property
    def precio_comercial_cliente(self):
        """
        Monto único que ve el cliente en app y notificaciones: referencia IA si existe,
        si no el total por fórmula (tarifa × servicio + extras). Misma regla que
        CotizacionClienteAppSerializer.precio_total_servicio.
        """
        if self.rf_precio_predicho is not None:
            return self.rf_precio_predicho
        return self.precio_total_calculado


class CotizacionServicioAdicional(models.Model):
    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name='servicios_adicionales_vinculados')
    servicio_adicional = models.ForeignKey(ServicioAdicional, on_delete=models.PROTECT)
    cantidad = models.IntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    precio_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'cotizacion_servicios_adicionales'
        unique_together = ('cotizacion', 'servicio_adicional')
