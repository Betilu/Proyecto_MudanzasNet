import factory
from django.utils import timezone
from .models import TipoContenedor, Vehiculo, MantenimientoVehiculo


class TipoContenedorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TipoContenedor
        django_get_or_create = ('nombre',)

    nombre = factory.Sequence(lambda n: f'Contenedor Tipo {n}')
    volumen_capacidad_m3 = factory.Faker('pydecimal', left_digits=2, right_digits=1, positive=True)
    peso_capacidad_kg = factory.Faker('pydecimal', left_digits=4, right_digits=0, positive=True)
    largo_cm = factory.Faker('random_int', min=300, max=600)
    ancho_cm = factory.Faker('random_int', min=200, max=250)
    alto_cm = factory.Faker('random_int', min=200, max=350)
    descripcion = factory.Faker('sentence', nb_words=5)


class VehiculoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Vehiculo

    placa = factory.Sequence(lambda n: f'ABC-{n:04d}')
    marca = factory.Iterator(['Toyota', 'Hyundai', 'Ford', 'Chevrolet', 'Mercedes', 'Volvo', 'Scania', 'Mitsubishi', 'Isuzu', 'Hino'])
    modelo = factory.Iterator(['Dyna', 'H100', 'F-350', 'NPR', 'Sprinter', 'FH', 'Canter', 'FRR', 'Dutro'])
    anio = factory.Faker('random_int', min=2015, max=2024)
    color = factory.Iterator(['Blanco', 'Negro', 'Gris', 'Azul', 'Rojo'])
    kilometraje_actual = factory.Faker('random_int', min=5000, max=150000)
    estado = factory.Iterator(['disponible', 'en_servicio', 'en_mantenimiento', 'disponible'])
    foto_url = ''


class MantenimientoVehiculoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MantenimientoVehiculo

    tipo_mantenimiento = factory.Iterator(['Cambio de aceite', 'Revisión general', 'Frenos', 'Suspensión', 'Motor'])
    descripcion = factory.Faker('sentence', nb_words=6)
    fecha_programada = factory.LazyFunction(lambda: timezone.now().date() + timezone.timedelta(days=30))
    costo = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
    kilometraje_en = factory.Faker('random_int', min=10000, max=100000)
    estado = factory.Iterator(['programado', 'en_proceso', 'completado'])
