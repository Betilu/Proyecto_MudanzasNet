from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CotizacionViewSet, CotizacionServicioAdicionalViewSet

router = DefaultRouter()
router.register(r'servicios-vinculados', CotizacionServicioAdicionalViewSet, basename='cotizacion-servicio')
router.register(r'', CotizacionViewSet, basename='cotizacion')

urlpatterns = [
    path('', include(router.urls)),
]
