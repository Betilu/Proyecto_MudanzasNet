from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlanCargaViewSet, ItemPlanCargaViewSet

router = DefaultRouter()
router.register(r'items', ItemPlanCargaViewSet, basename='item-plan-carga')
router.register(r'', PlanCargaViewSet, basename='plan-carga')

urlpatterns = [
    path('', include(router.urls)),
]
