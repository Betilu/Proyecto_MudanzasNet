from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TipoServicioViewSet, ServicioAdicionalViewSet

router = DefaultRouter()
router.register(r'tipos', TipoServicioViewSet, basename='tipo-servicio')
router.register(r'adicionales', ServicioAdicionalViewSet, basename='servicio-adicional')

urlpatterns = [
    path('', include(router.urls)),
]
