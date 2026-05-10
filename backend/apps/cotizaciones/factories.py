import factory
from decimal import Decimal
from random import uniform, randint
from django.utils import timezone
from .models import Cotizacion, CotizacionServicioAdicional


def _decimal(val):
    return Decimal(str(round(val, 2)))


class CotizacionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cotizacion

    direccion_origen = factory.Faker('address')
    direccion_destino = factory.Faker('address')
    fecha_deseada = factory.LazyFunction(lambda: timezone.now().date() + timezone.timedelta(days=14))
    franja_horaria = factory.Iterator(['08:00-12:00', '12:00-16:00', '14:00-18:00'])
    volumen_total_m3 = factory.LazyFunction(lambda: _decimal(uniform(5, 50)))
    peso_total_kg = factory.LazyFunction(lambda: _decimal(uniform(100, 800)))
    cantidad_objetos = factory.LazyFunction(lambda: randint(5, 50))
    distancia_km = factory.LazyFunction(lambda: _decimal(uniform(5, 50)))
    precio_base = factory.LazyFunction(lambda: _decimal(uniform(500, 3000)))
    precio_servicios_extra = factory.LazyFunction(lambda: _decimal(uniform(50, 300)))
    precio_total_calculado = factory.LazyFunction(lambda: _decimal(uniform(600, 3500)))
    estado = factory.Iterator(['borrador', 'enviada', 'aceptada', 'rechazada', 'enviada'])


class CotizacionServicioAdicionalFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CotizacionServicioAdicional

    cantidad = factory.Faker('random_int', min=1, max=5)
    precio_unitario = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
    precio_total = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
