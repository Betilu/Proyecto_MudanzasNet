import factory
from .models import ServicioMudanza, AsignacionPersonal, Incidencia, CalificacionServicio


class ServicioMudanzaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ServicioMudanza

    viajes_reales = factory.Faker('random_int', min=1, max=3)
    estado = factory.Iterator(['asignado', 'en_camino', 'en_origen', 'cargando', 'en_ruta', 'en_destino', 'descargando', 'completado', 'asignado', 'completado'])
    notas_operador = factory.Faker('sentence', nb_words=5)


class AsignacionPersonalFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = AsignacionPersonal

    rol_asignado = factory.Iterator(['conductor', 'cargador_principal', 'cargador_apoyo'])


class IncidenciaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Incidencia

    tipo = factory.Iterator(['dano', 'faltante', 'retraso', 'accidente', 'queja', 'otro'])
    descripcion = factory.Faker('paragraph', nb_sentences=2)
    gravedad = factory.Iterator(['baja', 'media', 'alta'])
    estado = factory.Iterator(['reportada', 'en_revision', 'resuelta', 'cerrada'])
    resolucion = factory.Faker('sentence', nb_words=5)


class CalificacionServicioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CalificacionServicio

    calificacion = factory.Faker('random_int', min=3, max=5)
    comentario = factory.Faker('sentence', nb_words=8)
    calificacion_puntualidad = factory.Faker('random_int', min=3, max=5)
    calificacion_cuidado = factory.Faker('random_int', min=3, max=5)
    calificacion_atencion = factory.Faker('random_int', min=3, max=5)
