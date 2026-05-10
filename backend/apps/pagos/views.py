from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from apps.notificaciones.services import NotificacionService
from apps.usuarios.permissions import TieneAlgunoDe

from .models import MetodoPago, Pago, Factura, Reembolso
from .serializers import (
    MetodoPagoSerializer,
    PagoSerializer,
    PagoCreateSerializer,
    FacturaSerializer,
    ReembolsoSerializer,
)
from .services import PagoService


def _es_cliente_portal(user):
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return False
    rol = getattr(user, 'rol', None)
    return bool(rol and (rol.nombre or '').lower() == 'cliente')


class _DenyWriteCliente(BasePermission):
    """Cliente portal: solo lectura en listados de pagos/facturas del API web."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if _es_cliente_portal(request.user):
            return view.action in ('list', 'retrieve', 'pdf')
        return True


class MetodoPagoViewSet(viewsets.ModelViewSet):
    queryset = MetodoPago.objects.filter(es_activo=True)
    serializer_class = MetodoPagoSerializer
    permission_classes = [
        IsAuthenticated,
        TieneAlgunoDe('pagos.ver', 'pagos.procesar', 'pagos.gestionar'),
    ]


class PagoViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['post'])
    def registrar_saldo(self, request):
        """Registra el pago del saldo restante (Fase 8 del flujo)"""
        from apps.reservas.models import Reserva

        reserva_id = request.data.get('reserva_id')
        monto = request.data.get('monto')
        metodo_pago_id = request.data.get('metodo_pago_id')
        descuento = request.data.get('descuento', 0)

        if not all([reserva_id, monto, metodo_pago_id]):
            return Response(
                {'error': 'reserva_id, monto y metodo_pago_id son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reserva = Reserva.objects.get(pk=reserva_id)
            metodo = MetodoPago.objects.get(pk=metodo_pago_id)

            # Crear pago de saldo
            pago = Pago.objects.create(
                reserva=reserva,
                metodo_pago=metodo,
                tipo_pago='saldo',
                monto=monto,
                estado='completado',
                fecha_pago=timezone.now()
            )

            # Generar factura
            factura = PagoService.generar_factura(pago)

            # Notificar al cliente
            NotificacionService.notificar_pago_saldo_registrado(
                reserva.cliente, reserva, factura
            )

            return Response({
                'pago': PagoSerializer(pago).data,
                'factura': FacturaSerializer(factura).data
            }, status=status.HTTP_201_CREATED)

        except Reserva.DoesNotExist:
            return Response({'error': 'Reserva no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except MetodoPago.DoesNotExist:
            return Response({'error': 'Método de pago no encontrado'}, status=status.HTTP_404_NOT_FOUND)


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.select_related('reserva', 'metodo_pago', 'reserva__cliente').order_by('-creado_en')
    filterset_fields = ('reserva', 'estado', 'metodo_pago')

    def get_queryset(self):
        qs = Pago.objects.select_related('reserva', 'metodo_pago', 'reserva__cliente').order_by('-creado_en')
        if _es_cliente_portal(self.request.user):
            return qs.filter(reserva__cliente__usuario=self.request.user)
        return qs

    def get_permissions(self):
        if self.action == 'verificar':
            return [
                IsAuthenticated(),
                TieneAlgunoDe('pagos.procesar', 'pagos.verificar', 'pagos.gestionar'),
            ]
        if self.action == 'rechazar':
            return [
                IsAuthenticated(),
                TieneAlgunoDe('pagos.procesar', 'pagos.rechazar', 'pagos.gestionar'),
            ]
        u = self.request.user
        if _es_cliente_portal(u):
            if self.action in ('list', 'retrieve'):
                return [IsAuthenticated()]
            return [IsAuthenticated(), _DenyWriteCliente()]
        return [
            IsAuthenticated(),
            TieneAlgunoDe('pagos.ver', 'pagos.procesar', 'pagos.gestionar'),
        ]

    def get_serializer_class(self):
        if self.action == 'create':
            return PagoCreateSerializer
        return PagoSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, TieneAlgunoDe('pagos.procesar', 'pagos.verificar', 'pagos.gestionar')])
    def verificar(self, request, pk=None):
        """Verifica un pago pendiente (Fase 4). Body opcional: referencia_transaccion."""
        pago = self.get_object()
        if pago.estado != 'pendiente':
            return Response(
                {'error': 'Solo se pueden verificar pagos pendientes'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ref = request.data.get('referencia_transaccion') or request.data.get('referencia')
        pago_verificado = PagoService.verificar_pago(
            pago, request.user, referencia_banco=ref if ref else None
        )
        return Response(PagoSerializer(pago_verificado, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, TieneAlgunoDe('pagos.procesar', 'pagos.rechazar', 'pagos.gestionar')])
    def rechazar(self, request, pk=None):
        """Rechaza un pago pendiente; notifica al cliente."""
        pago = self.get_object()
        if pago.estado != 'pendiente':
            return Response(
                {'error': 'Solo se pueden rechazar pagos pendientes'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pago.estado = 'fallido'
        pago.save(update_fields=['estado'])
        NotificacionService.notificar_pago_rechazado(pago.reserva.cliente, pago)
        return Response(PagoSerializer(pago, context={'request': request}).data)


class FacturaViewSet(viewsets.ModelViewSet):
    queryset = Factura.objects.select_related('cliente', 'pago', 'pago__reserva').all()
    serializer_class = FacturaSerializer
    filterset_fields = ('cliente',)

    def get_queryset(self):
        qs = Factura.objects.select_related('cliente', 'pago', 'pago__reserva').all()
        if _es_cliente_portal(self.request.user):
            from apps.clientes.models import Cliente

            try:
                cli = Cliente.objects.get(usuario=self.request.user)
            except Cliente.DoesNotExist:
                return qs.none()
            return qs.filter(cliente=cli)
        return qs

    def get_permissions(self):
        u = self.request.user
        if _es_cliente_portal(u):
            if self.action in ('list', 'retrieve', 'pdf'):
                return [IsAuthenticated()]
            return [IsAuthenticated(), _DenyWriteCliente()]
        return [
            IsAuthenticated(),
            TieneAlgunoDe('pagos.ver', 'pagos.procesar', 'pagos.gestionar'),
        ]

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        factura = self.get_object()
        if not factura.pdf:
            return Response({'detail': 'PDF no disponible'}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(
            factura.pdf.open('rb'),
            as_attachment=True,
            filename=f'{factura.numero_factura}.pdf',
        )


class ReembolsoViewSet(viewsets.ModelViewSet):
    queryset = Reembolso.objects.select_related('pago').all().order_by('-creado_en')
    serializer_class = ReembolsoSerializer
    filterset_fields = ('pago', 'estado')

    def get_permissions(self):
        return [
            IsAuthenticated(),
            TieneAlgunoDe('pagos.ver', 'pagos.procesar', 'pagos.gestionar'),
        ]
