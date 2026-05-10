from django.urls import re_path

from apps.realtime.consumers import SeguimientoReservaConsumer

websocket_urlpatterns = [
    re_path(r'ws/seguimiento/(?P<reserva_id>[0-9]+)/$', SeguimientoReservaConsumer.as_asgi()),
]
