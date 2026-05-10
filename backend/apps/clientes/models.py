from django.db import models
from apps.usuarios.models import Usuario
from apps.servicios.models import TipoServicio


class SegmentoCliente(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    criterios = models.JSONField(default=dict, blank=True)
    descripcion = models.TextField(blank=True)
    color = models.CharField(max_length=7, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'segmentos_cliente'

    def __str__(self):
        return self.nombre


class Cliente(models.Model):
    TIPOS = [('residencial', 'Residencial'), ('empresarial', 'Empresarial')]
    PREFERENCIAS = [
        ('email', 'Email'), ('sms', 'SMS'), ('telefono', 'Teléfono'),
    ]

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='cliente')
    tipo_cliente = models.CharField(max_length=20, choices=TIPOS, default='residencial')
    nombre_empresa = models.CharField(max_length=200, blank=True)
    nit = models.CharField(max_length=30, blank=True)
    preferencia_comunicacion = models.CharField(max_length=20, choices=PREFERENCIAS, default='email')

    rf_probabilidad_retencion = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    rf_segmento_predicho = models.CharField(max_length=30, blank=True)
    rf_ultima_prediccion = models.DateTimeField(null=True, blank=True)

    cantidad_mudanzas = models.IntegerField(default=0)
    monto_total_gastado = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    segmentos = models.ManyToManyField(SegmentoCliente, through='ClienteSegmento', blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clientes'

    def __str__(self):
        return f"{self.usuario.nombre_completo} ({self.tipo_cliente})"


class ClienteSegmento(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    segmento = models.ForeignKey(SegmentoCliente, on_delete=models.CASCADE)
    asignado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cliente_segmentos'
        unique_together = ('cliente', 'segmento')


class ComunicacionCliente(models.Model):
    CANALES = [
        ('llamada', 'Llamada'), ('email', 'Email'), ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp'), ('mensaje', 'Mensaje / chat'), ('sistema', 'Sistema'),
    ]
    DIRECCIONES = [('entrante', 'Entrante'), ('saliente', 'Saliente')]

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='comunicaciones')
    operador = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    canal = models.CharField(max_length=20, choices=CANALES)
    asunto = models.CharField(max_length=200, blank=True)
    contenido = models.TextField()
    direccion = models.CharField(max_length=10, choices=DIRECCIONES, default='saliente')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comunicaciones_cliente'
        ordering = ['-creado_en']


class AlertaCliente(models.Model):
    TIPOS = [
        ('seguimiento', 'Seguimiento'), ('reactivacion', 'Reactivación'),
        ('promocion', 'Promoción'), ('recordatorio', 'Recordatorio'),
    ]
    ESTADOS = [
        ('pendiente', 'Pendiente'), ('completada', 'Completada'), ('cancelada', 'Cancelada'),
    ]

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='alertas')
    operador = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    tipo = models.CharField(max_length=30, choices=TIPOS)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    fecha_programada = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    completada_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'alertas_cliente'
        ordering = ['fecha_programada']
