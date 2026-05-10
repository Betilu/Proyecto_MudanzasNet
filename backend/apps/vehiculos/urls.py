from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TipoContenedorViewSet, VehiculoViewSet, MantenimientoVehiculoViewSet

router = DefaultRouter()
router.register(r'contenedores', TipoContenedorViewSet, basename='contenedor')
router.register(r'', VehiculoViewSet, basename='vehiculo')
router.register(r'mantenimientos', MantenimientoVehiculoViewSet, basename='mantenimiento')

urlpatterns = [
    path('', include(router.urls)),
]
