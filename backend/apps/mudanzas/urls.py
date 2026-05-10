from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServicioMudanzaViewSet, IncidenciaViewSet

router = DefaultRouter()
router.register(r'incidencias', IncidenciaViewSet, basename='incidencia')
router.register(r'', ServicioMudanzaViewSet, basename='servicio-mudanza')

urlpatterns = [
    path('', include(router.urls)),
]
