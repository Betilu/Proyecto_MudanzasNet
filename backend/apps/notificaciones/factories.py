import factory
from django.utils import timezone
from .models import Notificacion


class NotificacionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Notificacion

    tipo = factory.Iterator(['reserva_confirmada', 'recordatorio', 'pago_recibido', 'estado_mudanza', 'promocion'])
    titulo = factory.Faker('sentence', nb_words=5)
    mensaje = factory.Faker('paragraph', nb_sentences=2)
    canal = factory.Iterator(['push', 'email', 'sms', 'sistema'])
    es_leida = factory.Faker('boolean', chance_of_getting_true=40)
    enviada_en = factory.LazyFunction(lambda: timezone.now())
    leida_en = factory.LazyAttribute(lambda o: timezone.now() if o.es_leida else None)
    datos_extra = factory.LazyFunction(lambda: {})
