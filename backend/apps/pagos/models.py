from django.db import models
from apps.reservas.models import Reserva
from apps.clientes.models import Cliente
from apps.usuarios.models import Usuario


class MetodoPago(models.Model):
    TIPOS = [
        ('tarjeta', 'Tarjeta'), ('qr', 'Código QR'),
        ('transferencia', 'Transferencia'), ('billetera_electronica', 'Billetera'),
        ('efectivo', 'Efectivo'),
    ]

    nombre = models.CharField(max_length=50, unique=True)
    tipo = models.CharField(max_length=30, choices=TIPOS)
    proveedor = models.CharField(max_length=50, blank=True)
    es_activo = models.BooleanField(default=True)
    comision_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'metodos_pago'

    def __str__(self):
        return self.nombre


class Pago(models.Model):
    TIPOS = [
        ('deposito', 'Depósito'),
        ('saldo', 'Saldo'),
        ('total', 'Pago total'),
    ]
    ESTADOS = [
        ('pendiente', 'Pendiente'), ('completado', 'Completado'),
        ('fallido', 'Fallido'),
    ]

    reserva = models.ForeignKey(Reserva, on_delete=models.PROTECT, related_name='pagos')
    metodo_pago = models.ForeignKey(MetodoPago, on_delete=models.PROTECT, related_name='pagos')
    tipo_pago = models.CharField(max_length=20, choices=TIPOS)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    moneda = models.CharField(max_length=3, default='BOB')
    referencia_transaccion = models.CharField(max_length=100, blank=True)
    comprobante = models.FileField(upload_to='comprobantes/%Y/%m/', blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    fecha_pago = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pagos'
        ordering = ['-creado_en']

    def __str__(self):
        return f"PAG-{self.pk} | Bs {self.monto} | {self.estado}"


class Factura(models.Model):
    pago = models.OneToOneField(Pago, on_delete=models.PROTECT, related_name='factura')
    numero_factura = models.CharField(max_length=30, unique=True)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='facturas')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    impuesto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    nit_cliente = models.CharField(max_length=30, blank=True)
    razon_social = models.CharField(max_length=200, blank=True)
    pdf = models.FileField(upload_to='facturas/%Y/%m/', blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'facturas'

    def __str__(self):
        return self.numero_factura


class Reembolso(models.Model):
    ESTADOS = [
        ('solicitado', 'Solicitado'), ('aprobado', 'Aprobado'),
        ('procesado', 'Procesado'), ('rechazado', 'Rechazado'),
    ]

    pago = models.ForeignKey(Pago, on_delete=models.PROTECT, related_name='reembolsos')
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    motivo = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='solicitado')
    aprobado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    procesado_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reembolsos'
