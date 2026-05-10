from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MetodoPagoViewSet, PagoViewSet, FacturaViewSet, ReembolsoViewSet

router = DefaultRouter()
router.register(r'metodos', MetodoPagoViewSet, basename='metodo-pago')
router.register(r'', PagoViewSet, basename='pago')
router.register(r'facturas', FacturaViewSet, basename='factura')
router.register(r'reembolsos', ReembolsoViewSet, basename='reembolso')

urlpatterns = [
    path('', include(router.urls)),
]
