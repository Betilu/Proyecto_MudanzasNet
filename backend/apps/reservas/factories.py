import factory
from django.utils import timezone
from .models import Reserva


class ReservaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Reserva

    fecha_servicio = factory.LazyFunction(lambda: timezone.now().date() + timezone.timedelta(days=7))
    franja_horaria = factory.Iterator(['08:00-12:00', '12:00-16:00', '14:00-18:00'])
    estado = factory.Iterator(['pendiente', 'confirmada', 'completada', 'en_proceso', 'confirmada'])
