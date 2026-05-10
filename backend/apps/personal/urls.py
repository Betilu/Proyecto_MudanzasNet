from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PersonalViewSet

router = DefaultRouter()
router.register(r'', PersonalViewSet, basename='personal')

urlpatterns = [
    path('', include(router.urls)),
]
