from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RFModeloViewSet, RFPrediccionDemandaViewSet, RFPrediccionDisponibilidadViewSet

router = DefaultRouter()
router.register(r'modelos', RFModeloViewSet, basename='rf-modelo')
router.register(r'predicciones-demanda', RFPrediccionDemandaViewSet, basename='rf-prediccion-demanda')
router.register(r'predicciones-disponibilidad', RFPrediccionDisponibilidadViewSet, basename='rf-prediccion-disp')

urlpatterns = [
    path('', include(router.urls)),
]
