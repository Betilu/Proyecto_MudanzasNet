import factory
from django.utils import timezone
from .models import RFModelo, RFPrediccionDemanda, RFPrediccionDisponibilidad


class RFModeloFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RFModelo

    nombre_modelo = factory.Sequence(lambda n: f'modelo_demanda_{n}')
    version = factory.Sequence(lambda n: f'1.{n}.0')
    tipo = factory.Iterator(['clasificacion', 'regresion'])
    accuracy = factory.Faker('pydecimal', left_digits=1, right_digits=4, positive=True, min_value=0.7, max_value=0.99)
    rmse = factory.Faker('pydecimal', left_digits=2, right_digits=4, positive=True)
    r2_score = factory.Faker('pydecimal', left_digits=1, right_digits=4, positive=True, min_value=0.5, max_value=0.95)
    features_usadas = factory.LazyFunction(lambda: ['zona', 'temporada', 'tipo_servicio', 'distancia'])
    hiperparametros = factory.LazyFunction(lambda: {'n_estimators': 100, 'max_depth': 10})
    es_activo = True


class RFPrediccionDemandaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RFPrediccionDemanda

    periodo_inicio = factory.LazyFunction(lambda: timezone.now().date())
    periodo_fin = factory.LazyFunction(lambda: timezone.now().date() + timezone.timedelta(days=30))
    demanda_predicha = factory.Faker('random_int', min=10, max=100)
    confianza = factory.Faker('pydecimal', left_digits=1, right_digits=4, positive=True, min_value=0.7, max_value=0.95)
    demanda_real = factory.Faker('random_int', min=8, max=105)


class RFPrediccionDisponibilidadFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RFPrediccionDisponibilidad

    fecha = factory.LazyFunction(lambda: timezone.now().date() + timezone.timedelta(days=7))
    vehiculos_necesarios = factory.Faker('random_int', min=2, max=15)
    personal_necesario = factory.Faker('random_int', min=4, max=30)
    confianza = factory.Faker('pydecimal', left_digits=1, right_digits=4, positive=True, min_value=0.75, max_value=0.98)
