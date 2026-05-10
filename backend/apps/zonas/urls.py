from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ZonaViewSet, TarifaDistanciaViewSet

router = DefaultRouter()
# Registrar rutas específicas antes que '' para que /tarifas/ no coincida con <pk> de zona.
router.register(r'tarifas', TarifaDistanciaViewSet, basename='tarifa')
router.register(r'', ZonaViewSet, basename='zona')

urlpatterns = [
    path('', include(router.urls)),
]
