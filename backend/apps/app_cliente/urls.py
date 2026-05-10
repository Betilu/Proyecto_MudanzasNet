"""
Toda la app móvil cliente bajo /api/app-cliente/.

Reutiliza los mismos ViewSets que el portal (lógica y permisos en apps.*);
las rutas /api/... del sitio web no se modifican.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.cotizaciones.views import CotizacionViewSet, CotizacionServicioAdicionalViewSet
from apps.inventario.views import CategoriaObjetoViewSet, ObjetoMudanzaViewSet
from apps.notificaciones.views import NotificacionViewSet
from apps.servicios.views import ServicioAdicionalViewSet, TipoServicioViewSet
from apps.zonas.views import ZonaViewSet

from .views import (
    AppClienteFacturaPdfView,
    AppClientePushTokenView,
    AppClienteReservaViewSet,
)

# --- Reservas (lógica específica app cliente) ---
router_reservas = DefaultRouter()
router_reservas.register(r'reservas', AppClienteReservaViewSet, basename='app-cliente-reserva')

# --- Cotizaciones (mismas vistas que /api/cotizaciones/) ---
router_cot = DefaultRouter()
router_cot.register(r'servicios-vinculados', CotizacionServicioAdicionalViewSet, basename='app-cot-servicio')
router_cot.register(r'', CotizacionViewSet, basename='app-cotizacion')

# --- Catálogos (lectura principalmente) ---
router_zonas = DefaultRouter()
router_zonas.register(r'', ZonaViewSet, basename='app-zona')

router_tipos = DefaultRouter()
router_tipos.register(r'', TipoServicioViewSet, basename='app-tipo-servicio')

router_adicionales = DefaultRouter()
router_adicionales.register(r'', ServicioAdicionalViewSet, basename='app-servicio-adicional')

router_categorias = DefaultRouter()
router_categorias.register(r'', CategoriaObjetoViewSet, basename='app-categoria-objeto')

router_objetos = DefaultRouter()
router_objetos.register(r'', ObjetoMudanzaViewSet, basename='app-objeto')

router_notif = DefaultRouter()
router_notif.register(r'', NotificacionViewSet, basename='app-notificacion')

urlpatterns = [
    path('facturas/<int:factura_id>/pdf/', AppClienteFacturaPdfView.as_view(), name='app-cliente-factura-pdf'),
    path('notificaciones/token/', AppClientePushTokenView.as_view(), name='app-cliente-push-token'),
    path('auth/', include('apps.usuarios.urls')),
    path('cotizaciones/', include(router_cot.urls)),
    path('zonas/', include(router_zonas.urls)),
    path('tipos-servicio/', include(router_tipos.urls)),
    path('servicios-adicionales/', include(router_adicionales.urls)),
    path('categorias-objeto/', include(router_categorias.urls)),
    path('objetos/', include(router_objetos.urls)),
    path('notificaciones/', include(router_notif.urls)),
    path('', include(router_reservas.urls)),
]
