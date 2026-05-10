import factory
from django.utils import timezone
from .models import SegmentoCliente, Cliente, ClienteSegmento, ComunicacionCliente, AlertaCliente
from apps.usuarios.factories import UsuarioFactory


class SegmentoClienteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SegmentoCliente
        django_get_or_create = ('nombre',)

    nombre = factory.Sequence(lambda n: f'Segmento {n}')
    descripcion = factory.Faker('sentence', nb_words=8)
    color = factory.Iterator(['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'])
    criterios = factory.LazyFunction(lambda: {})


class ClienteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cliente

    usuario = factory.SubFactory(
        UsuarioFactory,
        email=factory.Sequence(lambda n: f'cliente.seed{n}@ejemplo.com')
    )
    tipo_cliente = factory.Iterator(['residencial', 'empresarial'])
    nombre_empresa = factory.LazyAttribute(lambda o: f'Empresa {o.usuario.nombre}' if o.tipo_cliente == 'empresarial' else '')
    nit = factory.LazyAttribute(lambda o: str(__import__('random').randint(1000000, 9999999)) if o.tipo_cliente == 'empresarial' else '')
    direccion_predeterminada = factory.Faker('address')
    preferencia_comunicacion = factory.Iterator(['email', 'sms', 'telefono'])
    cantidad_mudanzas = factory.Faker('random_int', min=0, max=15)
    monto_total_gastado = factory.Faker('pydecimal', left_digits=5, right_digits=2, positive=True)


class ComunicacionClienteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ComunicacionCliente

    canal = factory.Iterator(['llamada', 'email', 'sms', 'sistema'])
    asunto = factory.Faker('sentence', nb_words=4)
    contenido = factory.Faker('paragraph', nb_sentences=3)
    direccion = factory.Iterator(['entrante', 'saliente'])


class AlertaClienteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = AlertaCliente

    tipo = factory.Iterator(['seguimiento', 'reactivacion', 'promocion', 'recordatorio'])
    titulo = factory.Faker('sentence', nb_words=5)
    descripcion = factory.Faker('paragraph', nb_sentences=2)
    fecha_programada = factory.LazyFunction(lambda: timezone.now() + timezone.timedelta(days=7))
    estado = factory.Iterator(['pendiente', 'completada', 'cancelada'])
