import factory
from .models import TipoServicio, ServicioAdicional


class TipoServicioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TipoServicio
        django_get_or_create = ('nombre',)

    nombre = factory.Sequence(lambda n: f'Tipo Servicio {n}')
    descripcion = factory.Faker('sentence', nb_words=8)
    incluye_embalaje = factory.Faker('boolean')
    incluye_montaje = factory.Faker('boolean')
    incluye_desmontaje = factory.Faker('boolean')
    factor_precio = factory.Faker('pydecimal', left_digits=1, right_digits=2, positive=True, min_value=1.0, max_value=2.0)
    es_activo = True


class ServicioAdicionalFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ServicioAdicional
        django_get_or_create = ('nombre',)

    nombre = factory.Sequence(lambda n: f'Servicio Adicional {n}')
    descripcion = factory.Faker('sentence', nb_words=6)
    precio = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
    es_por_objeto = factory.Faker('boolean')
    es_activo = True
