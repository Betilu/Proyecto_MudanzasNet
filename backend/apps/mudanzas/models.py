from django.db import models
from apps.reservas.models import Reserva
from apps.vehiculos.models import Vehiculo, TipoContenedor
from apps.personal.models import Personal
from apps.usuarios.models import Usuario


class ServicioMudanza(models.Model):
    ESTADOS = [
        ('asignado', 'Asignado'), ('en_camino', 'En Camino'), ('en_origen', 'En Origen'),
        ('cargando', 'Cargando'), ('en_ruta', 'En Ruta'), ('en_destino', 'En Destino'),
        ('descargando', 'Descargando'), ('completado', 'Completado'), ('cancelado', 'Cancelado'),
    ]

    reserva = models.OneToOneField(Reserva, on_delete=models.PROTECT, related_name='servicio')
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, related_name='servicios')
    rf_tipo_contenedor_recomendado = models.ForeignKey(
        TipoContenedor, on_delete=models.SET_NULL, null=True, blank=True
    )
    rf_viajes_predichos = models.IntegerField(null=True, blank=True)
    rf_tiempo_estimado_min = models.IntegerField(null=True, blank=True)
    viajes_reales = models.IntegerField(default=1)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='asignado')
    inicio_real = models.DateTimeField(null=True, blank=True)
    fin_real = models.DateTimeField(null=True, blank=True)
    duracion_minutos = models.IntegerField(null=True, blank=True)
    notas_operador = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'servicios_mudanza'

    def __str__(self):
        return f"SRV-{self.pk} | {self.reserva.codigo_confirmacion} | {self.estado}"


class AsignacionPersonal(models.Model):
    ROLES = [
        ('conductor', 'Conductor'), ('cargador_principal', 'Cargador Principal'),
        ('cargador_apoyo', 'Cargador de Apoyo'),
    ]

    servicio = models.ForeignKey(ServicioMudanza, on_delete=models.CASCADE, related_name='equipo')
    personal = models.ForeignKey(Personal, on_delete=models.PROTECT, related_name='asignaciones')
    rol_asignado = models.CharField(max_length=20, choices=ROLES)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'asignacion_personal'
        unique_together = ('servicio', 'personal')


class HistorialEstadoServicio(models.Model):
    servicio = models.ForeignKey(ServicioMudanza, on_delete=models.CASCADE, related_name='historial_estados')
    estado_anterior = models.CharField(max_length=20, blank=True)
    estado_nuevo = models.CharField(max_length=20)
    cambiado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True)
    latitud = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitud = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    notas = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'historial_estado_servicio'
        ordering = ['creado_en']


class ConfirmacionEntrega(models.Model):
    CONFORMIDADES = [
        ('total', 'Conforme Total'),
        ('parcial', 'Conforme Parcial'),
        ('ninguna', 'No Conforme'),
    ]

    servicio = models.OneToOneField(ServicioMudanza, on_delete=models.CASCADE, related_name='confirmacion')
    firma_conductor = models.ImageField(upload_to='firmas/conductor/%Y/%m/', blank=True, null=True)
    firma_cliente = models.ImageField(upload_to='firmas/cliente/%Y/%m/', blank=True, null=True)
    observaciones = models.TextField(blank=True)
    cliente_conforme = models.CharField(max_length=10, choices=CONFORMIDADES, blank=True, default='')
    confirmado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'confirmaciones_entrega'


class FotoEntrega(models.Model):
    confirmacion = models.ForeignKey(ConfirmacionEntrega, on_delete=models.CASCADE, related_name='fotos')
    foto = models.ImageField(upload_to='entregas/fotos/%Y/%m/')
    descripcion = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fotos_entrega'


class Incidencia(models.Model):
    TIPOS = [
        ('dano', 'Daño'), ('faltante', 'Faltante'), ('retraso', 'Retraso'),
        ('accidente', 'Accidente'), ('queja', 'Queja'), ('otro', 'Otro'),
    ]
    GRAVEDADES = [('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta'), ('critica', 'Crítica')]
    ESTADOS = [
        ('reportada', 'Reportada'), ('en_revision', 'En Revisión'),
        ('resuelta', 'Resuelta'), ('cerrada', 'Cerrada'),
    ]

    servicio = models.ForeignKey(ServicioMudanza, on_delete=models.CASCADE, related_name='incidencias')
    objeto = models.ForeignKey('inventario.ObjetoMudanza', on_delete=models.SET_NULL, null=True, blank=True)
    tipo = models.CharField(max_length=30, choices=TIPOS)
    descripcion = models.TextField()
    foto = models.ImageField(upload_to='incidencias/%Y/%m/', blank=True, null=True)
    gravedad = models.CharField(max_length=10, choices=GRAVEDADES, default='media')
    reportado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='reportada')
    resolucion = models.TextField(blank=True)
    resuelta_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'incidencias'
        ordering = ['-creado_en']


class CalificacionServicio(models.Model):
    servicio = models.OneToOneField(ServicioMudanza, on_delete=models.CASCADE, related_name='calificacion')
    cliente = models.ForeignKey('clientes.Cliente', on_delete=models.CASCADE, related_name='calificaciones')
    calificacion = models.IntegerField()
    comentario = models.TextField(blank=True)
    calificacion_puntualidad = models.IntegerField(null=True, blank=True)
    calificacion_cuidado = models.IntegerField(null=True, blank=True)
    calificacion_atencion = models.IntegerField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'calificaciones_servicio'
