from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DispositivoPushRegistroView, NotificacionViewSet

router = DefaultRouter()
router.register(r'', NotificacionViewSet, basename='notificacion')

urlpatterns = [
    path('dispositivos-push/', DispositivoPushRegistroView.as_view(), name='dispositivo-push-registro'),
    path('', include(router.urls)),
]
