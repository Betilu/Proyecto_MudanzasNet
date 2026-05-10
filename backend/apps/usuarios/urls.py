from django.urls import path, include
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    RegistroView,
    PerfilView,
    PerfilHistorialView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    UsuarioViewSet,
    RolViewSet,
    GrupoViewSet,
    PermisoViewSet,
    ConfiguracionViewSet,
    BitacoraViewSet,
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'grupos', GrupoViewSet, basename='grupo')
router.register(r'permisos', PermisoViewSet, basename='permiso')
router.register(r'configuracion', ConfiguracionViewSet, basename='configuracion')
router.register(r'bitacora', BitacoraViewSet, basename='bitacora')

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='token_refresh'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('registro/', RegistroView.as_view(), name='registro'),
    path('perfil/historial/', PerfilHistorialView.as_view(), name='perfil-historial'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('', include(router.urls)),
]
