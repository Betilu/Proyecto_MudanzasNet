from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.usuarios.permissions import TieneAlgunoDe

from .models import Reserva
from .serializers import ReservaSerializer, ReservaCreateSerializer
from .services import crear_reserva_desde_cotizacion


def _es_cliente_portal(user):
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return False
    rol = getattr(user, 'rol', None)
    return bool(rol and rol.nombre.lower() == 'cliente')


class ReservaViewSet(viewsets.ModelViewSet):
    queryset = (
        Reserva.objects.select_related(
            'cliente__usuario',
            'cotizacion',
            'cotizacion__zona_origen',
            'cotizacion__zona_destino',
        )
        .all()
        .order_by('-fecha_servicio')
    )
    filterset_fields = ('cliente', 'estado', 'fecha_servicio')

    def get_queryset(self):
        qs = Reserva.objects.select_related(
            'cliente__usuario',
            'cotizacion',
            'cotizacion__zona_origen',
            'cotizacion__zona_destino',
        ).order_by('-fecha_servicio')
        u = self.request.user
        if u.is_superuser:
            return qs
        if _es_cliente_portal(u):
            return qs.filter(cliente__usuario=u)
        return qs

    def get_permissions(self):
        u = self.request.user
        if _es_cliente_portal(u):
            if self.action in ('list', 'retrieve', 'create'):
                return [IsAuthenticated()]
            return [IsAuthenticated(), TieneAlgunoDe('reservas.crear', 'reservas.gestionar')]
        if self.action == 'cancelar':
            return [IsAuthenticated(), TieneAlgunoDe('crm.pipeline_solicitudes', 'reservas.gestionar')]
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), TieneAlgunoDe('reservas.ver', 'reservas.gestionar', 'crm.pipeline_solicitudes')]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), TieneAlgunoDe('reservas.crear', 'reservas.gestionar')]
        return [IsAuthenticated(), TieneAlgunoDe('reservas.ver', 'reservas.gestionar')]

    def get_serializer_class(self):
        if self.action == 'create':
            return ReservaCreateSerializer
        return ReservaSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if _es_cliente_portal(request.user):
            from apps.clientes.models import Cliente
            try:
                cli = Cliente.objects.get(usuario=request.user)
            except Cliente.DoesNotExist:
                return Response({'error': 'Usuario sin perfil de cliente.'}, status=status.HTTP_400_BAD_REQUEST)
            data['cliente'] = cli.id
        try:
            reserva = crear_reserva_desde_cotizacion(
                cotizacion_id=data['cotizacion'],
                cliente_id=data['cliente'],
                fecha_servicio=data['fecha_servicio'],
                franja_horaria=data['franja_horaria'],
            )
            return Response(ReservaSerializer(reserva).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela la reserva. Body: {motivo_cancelacion: str}"""
        reserva = self.get_object()
        motivo = request.data.get('motivo_cancelacion', '')
        from django.utils import timezone
        reserva.estado = 'cancelada'
        reserva.motivo_cancelacion = motivo
        reserva.cancelada_en = timezone.now()
        reserva.save()
        return Response(ReservaSerializer(reserva).data)

    @action(detail=False, methods=['get'])
    def sin_servicio(self, request):
        """Lista reservas confirmadas sin servicio asignado (Fase 5 del flujo)"""
        reservas = self.get_queryset().filter(
            estado='confirmada'
        ).exclude(
            servicio__isnull=False
        ).select_related('cliente__usuario', 'cotizacion', 'cotizacion__zona_origen', 'cotizacion__zona_destino')

        page = self.paginate_queryset(reservas)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(reservas, many=True)
        return Response(serializer.data)

