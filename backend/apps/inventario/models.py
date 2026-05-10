from django.db import models
from apps.cotizaciones.models import Cotizacion


class CategoriaObjeto(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    fragilidad_default = models.CharField(
        max_length=10,
        choices=[('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')],
        default='media'
    )
    icono = models.CharField(max_length=50, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categorias_objeto'

    def __str__(self):
        return self.nombre


class ObjetoMudanza(models.Model):
    FRAGILIDADES = [('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')]
    RIESGOS = [('bajo', 'Bajo'), ('medio', 'Medio'), ('alto', 'Alto')]

    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name='objetos')
    categoria = models.ForeignKey(CategoriaObjeto, on_delete=models.SET_NULL, null=True, related_name='objetos')
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    largo_cm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    ancho_cm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    alto_cm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    peso_kg = models.DecimalField(max_digits=8, decimal_places=2)
    fragilidad = models.CharField(max_length=10, choices=FRAGILIDADES)
    cantidad = models.IntegerField(default=1)

    rf_nivel_riesgo = models.CharField(max_length=10, choices=RIESGOS, blank=True)
    rf_probabilidad_dano = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    rf_proteccion_sugerida = models.CharField(max_length=50, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'objetos_mudanza'

    def __str__(self):
        return f"{self.nombre} ({self.peso_kg}kg)"

    @property
    def volumen_cm3(self):
        if self.largo_cm and self.ancho_cm and self.alto_cm:
            return self.largo_cm * self.ancho_cm * self.alto_cm
        return None


class FotoObjeto(models.Model):
    TIPOS = [('antes_traslado', 'Antes'), ('despues_traslado', 'Después'), ('incidencia', 'Incidencia')]

    objeto = models.ForeignKey(ObjetoMudanza, on_delete=models.CASCADE, related_name='fotos')
    foto = models.ImageField(upload_to='inventario/fotos/%Y/%m/')
    tipo_foto = models.CharField(max_length=20, choices=TIPOS)
    descripcion = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fotos_objeto'
