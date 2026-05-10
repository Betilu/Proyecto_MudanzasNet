from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardView,
    EjecutarReporteView,
    ExportarReporteView,
    FuentesReporteView,
    ReportePersonalizadoViewSet,
)

router = DefaultRouter()
router.register(r'personalizados', ReportePersonalizadoViewSet, basename='reporte-personalizado')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('fuentes/', FuentesReporteView.as_view(), name='reportes-fuentes'),
    path('ejecutar/', EjecutarReporteView.as_view(), name='reportes-ejecutar'),
    path('exportar/', ExportarReporteView.as_view(), name='reportes-exportar'),
    path('', include(router.urls)),
]
