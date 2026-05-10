import factory
from .models import Zona, TarifaDistancia


class ZonaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Zona
        django_get_or_create = ('nombre',)

    nombre = factory.Sequence(lambda n: f'Zona Santa Cruz {n}')
    distrito = factory.Iterator(['Centro', 'Norte', 'Sur', 'Este', 'Oeste'])
    latitud_centro = factory.Faker('latitude')
    longitud_centro = factory.Faker('longitude')
    es_activa = True


class TarifaDistanciaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TarifaDistancia

    distancia_km = factory.Faker('pydecimal', left_digits=2, right_digits=1, positive=True)
    tarifa_base = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
