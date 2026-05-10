import factory
from .models import CategoriaObjeto, ObjetoMudanza


class CategoriaObjetoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CategoriaObjeto
        django_get_or_create = ('nombre',)

    nombre = factory.Sequence(lambda n: f'Categoría {n}')
    descripcion = factory.Faker('sentence', nb_words=6)
    fragilidad_default = factory.Iterator(['baja', 'media', 'alta'])
    icono = factory.Iterator(['box', 'couch', 'tv', 'archive', 'image'])


class ObjetoMudanzaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ObjetoMudanza

    nombre = factory.Sequence(lambda n: [
        'Sofá 3 plazas', 'Cama doble', 'Nevera', 'Lavadora', 'Mesa comedor',
        'Escritorio', 'Armario', 'Cajas empaquetadas', 'Televisor', 'Espejo'
    ][n % 10])
    descripcion = factory.Faker('sentence', nb_words=4)
    peso_kg = factory.LazyFunction(lambda: __import__('decimal').Decimal(str(round(__import__('random').uniform(5, 100), 1))))
    fragilidad = factory.Iterator(['baja', 'media', 'alta'])
    cantidad = factory.Faker('random_int', min=1, max=5)
    largo_cm = factory.Faker('random_int', min=50, max=250, step=5)
    ancho_cm = factory.Faker('random_int', min=40, max=150, step=5)
    alto_cm = factory.Faker('random_int', min=30, max=200, step=5)
