import factory
from django.utils import timezone
from .models import Personal
from apps.usuarios.factories import UsuarioFactory


class PersonalFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Personal

    usuario = factory.SubFactory(
        UsuarioFactory,
        email=factory.Sequence(lambda n: f'personal{n}@mudanzas.com')
    )
    tipo_personal = factory.Iterator(['conductor', 'cargador'])
    numero_licencia = factory.Sequence(lambda n: f'LIC-{1000 + n}')
    tipo_licencia = factory.Iterator(['A', 'B', 'C', 'D'])
    fecha_ingreso = factory.LazyFunction(lambda: timezone.now().date() - timezone.timedelta(days=365))
    salario_mensual = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    esta_disponible = factory.Faker('boolean', chance_of_getting_true=80)
    servicios_completados = factory.Faker('random_int', min=0, max=200)
    calificacion_promedio = factory.Faker('pydecimal', left_digits=1, right_digits=2, positive=True, min_value=3.5, max_value=5.0)
