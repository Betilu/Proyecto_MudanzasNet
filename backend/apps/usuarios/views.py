import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import extend_schema, OpenApiExample

from .audit import registrar_bitacora
from .models import Usuario, Rol, Permiso, RolPermiso, Grupo, ConfiguracionSistema, BitacoraAuditoria
from .password_reset_email import send_password_reset_email
from .permissions import EsAdministrador, EsAdminOOperador
from .serializers import (
    UsuarioTokenObtainPairSerializer,
    UsuarioRegistroSerializer,
    UsuarioPerfilSerializer,
    UsuarioAdminSerializer,
    RolSerializer,
    RolConPermisosSerializer,
    GrupoSerializer,
    GrupoConPermisosSerializer,
    PermisoSerializer,
    ConfiguracionSerializer,
    BitacoraSerializer,
    BitacoraAdminSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .throttles import PasswordResetConfirmThrottle, PasswordResetRequestThrottle

logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = UsuarioTokenObtainPairSerializer
    permission_classes = [AllowAny]


class PasswordResetRequestView(APIView):
    """Solicitud de recuperación: envía correo con enlace (token) a cualquier usuario activo con ese email."""
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRequestThrottle]

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={200: {'description': 'Mensaje genérico (no revela si el correo existe).'}},
        examples=[
            OpenApiExample('Solicitud', value={'email': 'usuario@ejemplo.com'}),
        ],
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()
        user = Usuario.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {'detail': 'El correo no está registrado como usuario.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not user.is_active or not user.es_activo:
            return Response(
                {'detail': 'El usuario está inactivo y no puede recuperar contraseña.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            send_password_reset_email(user)
        except Exception:
            logger.exception('Fallo al enviar correo de recuperación de contraseña')
            return Response(
                {
                    'detail': (
                        'No pudimos enviar el correo en este momento. Intenta más tarde o contacta al administrador.'
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        registrar_bitacora(
            user,
            'password_reset_solicitado',
            request=request,
            detalles={'email': user.email},
        )
        return Response(
            {'detail': 'Correo de recuperación enviado correctamente.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Confirma nueva contraseña con uid y token recibidos por correo."""
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetConfirmThrottle]

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={200: {'description': 'Contraseña actualizada.'}},
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        registrar_bitacora(
            user,
            'password_reset_completado',
            request=request,
            detalles={'email': user.email},
        )
        return Response(
            {'detail': 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.'},
            status=status.HTTP_200_OK,
        )


class RegistroView(APIView):
    """Registro de nuevos usuarios."""
    permission_classes = [AllowAny]

    @extend_schema(request=UsuarioRegistroSerializer, responses={201: UsuarioRegistroSerializer})
    def post(self, request):
        serializer = UsuarioRegistroSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            registrar_bitacora(
                user,
                'registro',
                request=request,
                detalles={'email': user.email},
            )
            return Response(
                {'id': user.id, 'email': user.email, 'nombre': user.nombre, 'apellido': user.apellido},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PerfilView(APIView):
    """Obtener y actualizar perfil del usuario autenticado."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UsuarioPerfilSerializer})
    def get(self, request):
        serializer = UsuarioPerfilSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(request=UsuarioPerfilSerializer, responses={200: UsuarioPerfilSerializer})
    def patch(self, request):
        serializer = UsuarioPerfilSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PerfilHistorialView(APIView):
    """Actividad reciente del usuario en bitácora (W6 historial operativo de cuenta)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Historial de actividad del perfil')
    def get(self, request):
        qs = BitacoraAuditoria.objects.filter(usuario=request.user).order_by('-creado_en')[:50]
        return Response(BitacoraSerializer(qs, many=True).data)


class UsuarioViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, EsAdminOOperador]
    queryset = Usuario.objects.select_related('rol').prefetch_related('grupos').all().order_by('-creado_en')
    search_fields = ('email', 'nombre', 'apellido')
    filterset_fields = ('rol', 'es_activo')

    def get_serializer_class(self):
        return UsuarioAdminSerializer

    def perform_create(self, serializer):
        u = serializer.save()
        registrar_bitacora(
            self.request.user,
            'usuario_creado',
            request=self.request,
            entidad_tipo='Usuario',
            entidad_id=u.pk,
            detalles={'email': u.email},
        )

    def perform_update(self, serializer):
        u = serializer.save()
        registrar_bitacora(
            self.request.user,
            'usuario_actualizado',
            request=self.request,
            entidad_tipo='Usuario',
            entidad_id=u.pk,
            detalles={'email': u.email},
        )

    def perform_destroy(self, instance):
        uid, email = instance.pk, instance.email
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'usuario_eliminado',
            request=self.request,
            entidad_tipo='Usuario',
            entidad_id=uid,
            detalles={'email': email},
        )


class RolViewSet(ModelViewSet):
    queryset = Rol.objects.all().order_by('nombre')
    filterset_fields = ('es_activo',)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), EsAdminOOperador()]
        return [IsAuthenticated(), EsAdministrador()]

    def get_serializer_class(self):
        if self.action in ('retrieve', 'permisos', 'update', 'partial_update'):
            return RolConPermisosSerializer
        return RolSerializer

    def perform_create(self, serializer):
        r = serializer.save()
        registrar_bitacora(
            self.request.user,
            'rol_creado',
            request=self.request,
            entidad_tipo='Rol',
            entidad_id=r.pk,
            detalles={'nombre': r.nombre},
        )

    def perform_update(self, serializer):
        r = serializer.save()
        registrar_bitacora(
            self.request.user,
            'rol_actualizado',
            request=self.request,
            entidad_tipo='Rol',
            entidad_id=r.pk,
            detalles={'nombre': r.nombre},
        )

    def perform_destroy(self, instance):
        rid, nombre = instance.pk, instance.nombre
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'rol_eliminado',
            request=self.request,
            entidad_tipo='Rol',
            entidad_id=rid,
            detalles={'nombre': nombre},
        )

    @action(detail=True, methods=['get', 'put'])
    def permisos(self, request, pk=None):
        rol = self.get_object()
        if request.method == 'GET':
            permisos = Permiso.objects.filter(roles_asignados__rol=rol).order_by('modulo', 'nombre')
            return Response(PermisoSerializer(permisos, many=True).data)
        permiso_ids = request.data.get('permiso_ids', [])
        RolPermiso.objects.filter(rol=rol).delete()
        for pid in permiso_ids:
            try:
                perm = Permiso.objects.get(pk=pid)
                RolPermiso.objects.create(rol=rol, permiso=perm)
            except Permiso.DoesNotExist:
                pass
        permisos = Permiso.objects.filter(roles_asignados__rol=rol).order_by('modulo', 'nombre')
        registrar_bitacora(
            request.user,
            'rol_permisos_actualizados',
            request=request,
            entidad_tipo='Rol',
            entidad_id=rol.pk,
            detalles={'nombre': rol.nombre, 'permiso_ids': permiso_ids},
        )
        return Response(PermisoSerializer(permisos, many=True).data)


class GrupoViewSet(ModelViewSet):
    queryset = Grupo.objects.prefetch_related('permisos').all().order_by('nombre')
    filterset_fields = ('es_activo',)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), EsAdminOOperador()]
        return [IsAuthenticated(), EsAdministrador()]

    def get_serializer_class(self):
        if self.action == 'list':
            return GrupoSerializer
        if self.action in ('create', 'retrieve', 'update', 'partial_update'):
            return GrupoConPermisosSerializer
        return GrupoSerializer

    def perform_create(self, serializer):
        g = serializer.save()
        registrar_bitacora(
            self.request.user,
            'grupo_creado',
            request=self.request,
            entidad_tipo='Grupo',
            entidad_id=g.pk,
            detalles={'nombre': g.nombre},
        )

    def perform_update(self, serializer):
        g = serializer.save()
        registrar_bitacora(
            self.request.user,
            'grupo_actualizado',
            request=self.request,
            entidad_tipo='Grupo',
            entidad_id=g.pk,
            detalles={'nombre': g.nombre},
        )

    def perform_destroy(self, instance):
        gid, nombre = instance.pk, instance.nombre
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'grupo_eliminado',
            request=self.request,
            entidad_tipo='Grupo',
            entidad_id=gid,
            detalles={'nombre': nombre},
        )

    @action(detail=True, methods=['get', 'put'])
    def permisos(self, request, pk=None):
        grupo = self.get_object()
        if request.method == 'GET':
            permisos = grupo.permisos.all().order_by('modulo', 'nombre')
            return Response(PermisoSerializer(permisos, many=True).data)
        permiso_ids = request.data.get('permiso_ids', [])
        grupo.permisos.set(Permiso.objects.filter(pk__in=permiso_ids))
        permisos = grupo.permisos.all().order_by('modulo', 'nombre')
        registrar_bitacora(
            request.user,
            'grupo_permisos_actualizados',
            request=request,
            entidad_tipo='Grupo',
            entidad_id=grupo.pk,
            detalles={'nombre': grupo.nombre, 'permiso_ids': permiso_ids},
        )
        return Response(PermisoSerializer(permisos, many=True).data)


class PermisoViewSet(ModelViewSet):
    queryset = Permiso.objects.all().order_by('modulo', 'nombre')
    serializer_class = PermisoSerializer
    filterset_fields = ('modulo',)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), EsAdminOOperador()]
        return [IsAuthenticated(), EsAdministrador()]

    def perform_create(self, serializer):
        p = serializer.save()
        registrar_bitacora(
            self.request.user,
            'permiso_creado',
            request=self.request,
            entidad_tipo='Permiso',
            entidad_id=p.pk,
            detalles={'nombre': p.nombre, 'modulo': p.modulo},
        )

    def perform_update(self, serializer):
        p = serializer.save()
        registrar_bitacora(
            self.request.user,
            'permiso_actualizado',
            request=self.request,
            entidad_tipo='Permiso',
            entidad_id=p.pk,
            detalles={'nombre': p.nombre},
        )

    def perform_destroy(self, instance):
        pid, nombre = instance.pk, instance.nombre
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'permiso_eliminado',
            request=self.request,
            entidad_tipo='Permiso',
            entidad_id=pid,
            detalles={'nombre': nombre},
        )


class ConfiguracionViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, EsAdministrador]
    queryset = ConfiguracionSistema.objects.all().order_by('clave')
    serializer_class = ConfiguracionSerializer

    def perform_create(self, serializer):
        c = serializer.save()
        registrar_bitacora(
            self.request.user,
            'config_creada',
            request=self.request,
            entidad_tipo='ConfiguracionSistema',
            entidad_id=c.pk,
            detalles={'clave': c.clave},
        )

    def perform_update(self, serializer):
        c = serializer.save()
        registrar_bitacora(
            self.request.user,
            'config_actualizada',
            request=self.request,
            entidad_tipo='ConfiguracionSistema',
            entidad_id=c.pk,
            detalles={'clave': c.clave},
        )

    def perform_destroy(self, instance):
        cid, clave = instance.pk, instance.clave
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'config_eliminada',
            request=self.request,
            entidad_tipo='ConfiguracionSistema',
            entidad_id=cid,
            detalles={'clave': clave},
        )


class BitacoraViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, EsAdministrador]
    queryset = BitacoraAuditoria.objects.select_related('usuario').all().order_by('-creado_en')
    serializer_class = BitacoraAdminSerializer
    filterset_fields = ('usuario', 'accion', 'entidad_tipo')
