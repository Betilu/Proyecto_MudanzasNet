from django.db import models


class TipoContenedor(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    volumen_capacidad_m3 = models.DecimalField(max_digits=8, decimal_places=2)
    peso_capacidad_kg = models.DecimalField(max_digits=8, decimal_places=2)
    largo_cm = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    ancho_cm = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    alto_cm = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    descripcion = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tipos_contenedor'

    def __str__(self):
        return f"{self.nombre} ({self.volumen_capacidad_m3} m³)"


class Vehiculo(models.Model):
    ESTADOS = [
        ('disponible', 'Disponible'),
        ('en_servicio', 'En Servicio'),
        ('en_mantenimiento', 'En Mantenimiento'),
        ('inactivo', 'Inactivo'),
    ]

    tipo_contenedor = models.ForeignKey(TipoContenedor, on_delete=models.PROTECT, related_name='vehiculos')
    placa = models.CharField(max_length=20, unique=True)
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    anio = models.IntegerField(null=True, blank=True)
    color = models.CharField(max_length=30, blank=True)
    kilometraje_actual = models.IntegerField(default=0)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='disponible')
    foto_url = models.URLField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vehiculos'

    def __str__(self):
        return f"{self.placa} - {self.marca} {self.modelo}"


class MantenimientoVehiculo(models.Model):
    ESTADOS = [
        ('programado', 'Programado'),
        ('en_proceso', 'En Proceso'),
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
    ]

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='mantenimientos')
    tipo_mantenimiento = models.CharField(max_length=50)
    descripcion = models.TextField()
    fecha_programada = models.DateField()
    fecha_completada = models.DateField(null=True, blank=True)
    costo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    kilometraje_en = models.IntegerField(null=True, blank=True)
    proximo_km = models.IntegerField(null=True, blank=True)
    proxima_fecha = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='programado')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mantenimiento_vehiculo'
        ordering = ['-fecha_programada']
