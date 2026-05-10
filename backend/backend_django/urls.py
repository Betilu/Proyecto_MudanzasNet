from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.permissions import AllowAny
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from .views import api_root

urlpatterns = [
    # Raíz de la API - Info general
    path('', api_root, name='api-root'),

    path('admin/', admin.site.urls),

    # Documentación de la API (acceso público para explorar)
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[AllowAny]), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[AllowAny]), name='swagger'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema', permission_classes=[AllowAny]), name='redoc'),

    # Apps del sistema - Portal Web (cada una con su prefijo)
    path('api/auth/', include('apps.usuarios.urls')),
    path('api/clientes/', include('apps.clientes.urls')),
    path('api/zonas/', include('apps.zonas.urls')),
    path('api/inventario/', include('apps.inventario.urls')),
    path('api/servicios/', include('apps.servicios.urls')),
    path('api/cotizaciones/', include('apps.cotizaciones.urls')),
    path('api/reservas/', include('apps.reservas.urls')),
    path('api/vehiculos/', include('apps.vehiculos.urls')),
    path('api/personal/', include('apps.personal.urls')),
    path('api/mudanzas/', include('apps.mudanzas.urls')),
    path('api/carga/', include('apps.carga.urls')),
    path('api/chatbot/', include('apps.chatbot.urls')),
    path('api/pagos/', include('apps.pagos.urls')),
    path('api/notificaciones/', include('apps.notificaciones.urls')),
    path('api/reportes/', include('apps.reportes.urls')),
    path('api/sistema/', include('apps.sistema.urls')),
    path('api/ia/', include('apps.ia.urls')),

    # App móvil cliente (rutas distintas al portal web /api/...)
    path('api/app-cliente/', include('apps.app_cliente.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
