from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaObjetoViewSet,
    ObjetoMudanzaViewSet,
    FotoObjetoViewSet,
    ActaPretrasladoPdfView,
)

router = DefaultRouter()
router.register(r'categorias', CategoriaObjetoViewSet, basename='categoria')
router.register(r'objetos', ObjetoMudanzaViewSet, basename='objeto')
router.register(r'fotos', FotoObjetoViewSet, basename='foto')

urlpatterns = [
    path(
        'cotizaciones/<int:cotizacion_id>/acta-pretraslado/',
        ActaPretrasladoPdfView.as_view(),
        name='inventario-acta-pretraslado',
    ),
    path('', include(router.urls)),
]
