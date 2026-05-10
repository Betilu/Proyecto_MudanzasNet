from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SegmentoClienteViewSet,
    ClienteViewSet,
    ComunicacionClienteViewSet,
    AlertaClienteViewSet,
    CrmPipelineView,
    CrmComportamientoView,
    PrediccionLealtadView,
)

router = DefaultRouter()
router.register(r'segmentos', SegmentoClienteViewSet, basename='segmento')
router.register(r'comunicaciones', ComunicacionClienteViewSet, basename='comunicacion')
router.register(r'alertas', AlertaClienteViewSet, basename='alerta')
router.register(r'', ClienteViewSet, basename='cliente')

urlpatterns = [
    path('crm/pipeline/', CrmPipelineView.as_view(), name='crm-pipeline'),
    path('crm/reportes-comportamiento/', CrmComportamientoView.as_view(), name='crm-reportes-comportamiento'),
    path('crm/prediccion-lealtad/', PrediccionLealtadView.as_view(), name='crm-prediccion-lealtad'),
    path('', include(router.urls)),
]
