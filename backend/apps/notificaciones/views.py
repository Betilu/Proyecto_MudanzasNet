from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from apps.personal.models import Personal

from .models import DispositivoPush, Notificacion
from .serializers import NotificacionSerializer


class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    queryset = Notificacion.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Notificacion.objects.none()
        return Notificacion.objects.filter(usuario=self.request.user).order_by('-creado_en')

    @action(detail=False, methods=['get'])
    def no_leidas(self, request):
        """Lista notificaciones no leídas del usuario."""
        qs = self.get_queryset().filter(es_leida=False)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        """Marca la notificación como leída."""
        notif = self.get_object()
        notif.es_leida = True
        notif.leida_en = timezone.now()
        notif.save()
        return Response(NotificacionSerializer(notif).data)


class DispositivoPushRegistroView(APIView):
    """
    Registra el token Expo del dispositivo para la app conductor/cargador (Fase 5+ del flujo).
    Requiere JWT de un usuario vinculado a Personal.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = (request.data.get('token') or '').strip()
        if not token:
            raise ValidationError({'token': 'Requerido'})

        aplicacion = (request.data.get('aplicacion') or DispositivoPush.APP_CONDUCTOR).strip().lower()
        if aplicacion != DispositivoPush.APP_CONDUCTOR:
            raise ValidationError(
                {'aplicacion': 'En esta API solo se registra la app conductor (aplicacion=conductor).'}
            )

        if not Personal.objects.filter(usuario=request.user).exists():
            raise PermissionDenied('Solo el personal de campo (conductor/cargador) puede registrar este token.')

        plataforma = (request.data.get('platform') or request.data.get('plataforma') or '').strip().lower()
        plataforma_map = {
            'android': DispositivoPush.PLATAFORMA_ANDROID,
            'ios': DispositivoPush.PLATAFORMA_IOS,
            'web': DispositivoPush.PLATAFORMA_WEB,
        }
        plataforma = plataforma_map.get(plataforma, DispositivoPush.PLATAFORMA_ANDROID)

        DispositivoPush.objects.update_or_create(
            token=token,
            defaults={
                'usuario': request.user,
                'aplicacion': aplicacion,
                'plataforma': plataforma,
                'activo': True,
            },
        )
        return Response({'ok': True})
