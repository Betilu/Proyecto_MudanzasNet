import factory
from django.utils import timezone
from .models import Pago, Factura, Reembolso


class PagoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Pago

    tipo_pago = factory.Iterator(['deposito', 'saldo', 'total'])
    monto = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    referencia_transaccion = factory.Sequence(lambda n: f'TXN-{100000 + n}')
    estado = factory.Iterator(['pendiente', 'completado', 'completado', 'completado'])
    fecha_pago = factory.LazyFunction(lambda: timezone.now() if factory.Faker('boolean', chance_of_getting_true=70).evaluate(None, None, {}) else None)


class FacturaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Factura

    numero_factura = factory.Sequence(lambda n: f'FAC-2024-{1000 + n:05d}')
    subtotal = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    impuesto = factory.Faker('pydecimal', left_digits=2, right_digits=2, positive=True)
    total = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    nit_cliente = factory.Faker('random_int', min=1000000, max=9999999)
    razon_social = factory.Faker('company')


class ReembolsoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Reembolso

    monto = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
    motivo = factory.Faker('sentence', nb_words=10)
    estado = factory.Iterator(['solicitado', 'aprobado', 'procesado', 'rechazado'])
