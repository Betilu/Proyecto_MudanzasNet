import factory
from django.utils import timezone
from .models import Rol, Usuario, BitacoraAuditoria, ConfiguracionSistema


class RolFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Rol
        django_get_or_create = ('nombre',)

    nombre = factory.Sequence(lambda n: f'rol_{n}')
    descripcion = factory.Faker('sentence', nb_words=6)
    es_activo = True


class UsuarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Usuario
        django_get_or_create = ('email',)

    email = factory.Sequence(lambda n: f'user{n}@mudanzas.com')
    nombre = factory.Faker('first_name')
    apellido = factory.Faker('last_name')
    telefono = factory.Sequence(lambda n: f'7{40000000 + n % 9999999}')
    es_activo = True
    is_active = True

    @factory.post_generation
    def with_password(obj, create, extracted, **kwargs):
        if create and extracted is not False:
            obj.set_password(extracted or 'password123')
            obj.save(update_fields=['password'])

    @factory.post_generation
    def with_rol(obj, create, extracted, **kwargs):
        if create and extracted:
            obj.rol = extracted
            obj.save(update_fields=['rol'])


class BitacoraAuditoriaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BitacoraAuditoria

    accion = factory.Iterator(['crear', 'editar', 'eliminar', 'login', 'logout'])
    usuario = None
    entidad_tipo = factory.Iterator(['usuario', 'cliente', 'cotizacion', 'reserva'])
    entidad_id = factory.Faker('random_int', min=1, max=100)
    detalles = factory.LazyFunction(lambda: {})


class ConfiguracionSistemaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ConfiguracionSistema
        django_get_or_create = ('clave',)

    clave = factory.Sequence(lambda n: f'config_clave_{n}')
    valor = factory.Faker('word')
    tipo_dato = 'string'
    descripcion = factory.Faker('sentence', nb_words=4)
