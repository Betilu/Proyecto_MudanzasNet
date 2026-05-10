"""
ASGI: HTTP (Django) + WebSocket (Channels) para seguimiento en tiempo real.
Ejecutar con: daphne -b 0.0.0.0 -p 8000 backend_django.asgi:application
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_django.settings.development')

django_asgi_app = get_asgi_application()

from backend_django.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        'http': django_asgi_app,
        'websocket': URLRouter(websocket_urlpatterns),
    }
)
