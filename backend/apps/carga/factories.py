import factory
from .models import PlanCarga, ItemPlanCarga


class PlanCargaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PlanCarga

    numero_viaje = factory.Faker('random_int', min=1, max=5)
    volumen_utilizado_m3 = factory.Faker('pydecimal', left_digits=1, right_digits=2, positive=True)
    peso_total_kg = factory.Faker('pydecimal', left_digits=3, right_digits=1, positive=True)
    porcentaje_ocupacion = factory.Faker('pydecimal', left_digits=2, right_digits=1, positive=True, min_value=50, max_value=95)
    instrucciones_generales = factory.Faker('sentence', nb_words=6)


class ItemPlanCargaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ItemPlanCarga

    orden_carga = factory.Sequence(lambda n: n)
    zona_posicion = factory.Iterator(['fondo', 'medio', 'delante', 'arriba'])
    requiere_proteccion = factory.Faker('boolean', chance_of_getting_true=30)
    instrucciones_especiales = factory.Faker('sentence', nb_words=4)
    fue_cargado = factory.Faker('boolean', chance_of_getting_true=60)
    fue_descargado = factory.Faker('boolean', chance_of_getting_true=40)
