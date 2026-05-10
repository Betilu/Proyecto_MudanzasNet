import factory
from .models import FAQ, ConversacionChatbot, MensajeChatbot, EscalacionChatbot


class FAQFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FAQ

    pregunta = factory.Faker('sentence', nb_words=8)
    respuesta = factory.Faker('paragraph', nb_sentences=3)
    categoria = factory.Iterator(['precios', 'horarios', 'servicios', 'general', 'reservas'])
    palabras_clave = factory.LazyFunction(lambda: ['mudanza', 'precio', 'reserva', 'transporte'])
    veces_consultada = factory.Faker('random_int', min=0, max=100)
    es_activa = True


class ConversacionChatbotFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ConversacionChatbot

    canal = factory.Iterator(['web', 'app'])
    estado = factory.Iterator(['activa', 'cerrada', 'escalada'])
    contexto = factory.LazyFunction(lambda: {})


class MensajeChatbotFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MensajeChatbot

    tipo_emisor = factory.Iterator(['cliente', 'bot', 'operador'])
    contenido = factory.Faker('sentence', nb_words=10)
    intencion_detectada = factory.Iterator(['cotizacion', 'reserva', 'consulta', 'saludo', ''])


class EscalacionChatbotFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EscalacionChatbot

    motivo = factory.Faker('sentence', nb_words=5)
    estado = factory.Iterator(['pendiente', 'atendida', 'resuelta'])
