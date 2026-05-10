from datetime import timedelta

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.usuarios.permissions import TieneAlgunoDe, TienePermiso

from .models import SegmentoCliente, Cliente, ComunicacionCliente, AlertaCliente
from .serializers import (
    SegmentoClienteSerializer,
    ClienteSerializer,
    ComunicacionClienteSerializer,
    AlertaClienteSerializer,
)
from .services_lealtad import ejecutar_prediccion_lealtad_todos


def _perm_cliente_staff():
    return [IsAuthenticated(), TieneAlgunoDe('crm.ver_clientes', 'crm.registro_cliente', 'crm.historial_mudanzas')]


def _perm_cliente_escritura():
    return [IsAuthenticated(), TieneAlgunoDe('crm.editar_clientes', 'crm.registro_cliente')]


class SegmentoClienteViewSet(viewsets.ModelViewSet):
    """W13 — Segmentación (solo administración CRM estratégica)."""
    queryset = SegmentoCliente.objects.all().order_by('nombre')
    serializer_class = SegmentoClienteSerializer

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.segmentacion')]


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.select_related('usuario').all().order_by('-creado_en')
    serializer_class = ClienteSerializer
    search_fields = ('usuario__nombre', 'usuario__apellido', 'usuario__email', 'nombre_empresa', 'nit')
    filterset_fields = ('tipo_cliente',)

    def get_permissions(self):
        if self.action == 'historial':
            return [IsAuthenticated(), TieneAlgunoDe('crm.historial_mudanzas', 'crm.ver_clientes', 'crm.registro_cliente')]
        if self.action == 'destroy':
            return [IsAuthenticated(), TienePermiso('crm.eliminar_cliente')]
        if self.action in ('list', 'retrieve'):
            return _perm_cliente_staff()
        return _perm_cliente_escritura()

    @extend_schema(
        summary='Historial comercial del cliente (cotizaciones, reservas)',
        tags=['CRM — Clientes'],
    )
    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request, pk=None):
        cliente = self.get_object()
        cotizaciones = []
        cot_qs = (
            cliente.cotizaciones.select_related(
                'tipo_servicio', 'zona_origen', 'zona_destino', 'reserva'
            )
            .order_by('-creado_en')[:120]
        )
        for c in cot_qs:
            precio_ref = c.precio_comercial_cliente
            try:
                res = c.reserva
                reserva_id = res.id
                reserva_codigo = res.codigo_confirmacion
                reserva_estado = res.estado
            except ObjectDoesNotExist:
                reserva_id = None
                reserva_codigo = None
                reserva_estado = None
            cotizaciones.append({
                'id': c.id,
                'tipo': 'cotizacion',
                'estado': c.estado,
                'precio_total_calculado': str(c.precio_total_calculado) if c.precio_total_calculado is not None else None,
                'rf_precio_predicho': str(c.rf_precio_predicho) if c.rf_precio_predicho is not None else None,
                'precio_referencia': str(precio_ref) if precio_ref is not None else None,
                'direccion_origen': (c.direccion_origen or '')[:240],
                'direccion_destino': (c.direccion_destino or '')[:240],
                'zona_origen_nombre': c.zona_origen.nombre if c.zona_origen_id else None,
                'zona_destino_nombre': c.zona_destino.nombre if c.zona_destino_id else None,
                'tipo_servicio': c.tipo_servicio.nombre if c.tipo_servicio_id else None,
                'fecha_deseada': str(c.fecha_deseada) if c.fecha_deseada else None,
                'franja_horaria': c.franja_horaria or '',
                'creado_en': c.creado_en.isoformat(),
                'fecha': c.creado_en.isoformat(),
                'actualizado_en': c.actualizado_en.isoformat(),
                'reserva_id': reserva_id,
                'reserva_codigo': reserva_codigo,
                'reserva_estado': reserva_estado,
            })
        reservas = []
        for r in cliente.reservas.select_related('cotizacion').all().order_by('-fecha_servicio')[:80]:
            srv = getattr(r, 'servicio', None)
            reservas.append({
                'id': r.id,
                'tipo': 'reserva',
                'codigo': r.codigo_confirmacion,
                'estado': r.estado,
                'fecha_servicio': str(r.fecha_servicio),
                'franja_horaria': r.franja_horaria,
                'mudanza_estado': srv.estado if srv else None,
                'creado_en': r.creado_en.isoformat(),
            })
        comunicaciones = list(
            cliente.comunicaciones.all().order_by('-creado_en')[:30].values(
                'id', 'canal', 'asunto', 'direccion', 'creado_en'
            )
        )
        return Response({
            'cliente_id': cliente.id,
            'usuario_nombre': cliente.usuario.nombre_completo,
            'cotizaciones': cotizaciones,
            'reservas': reservas,
            'comunicaciones_resumen': comunicaciones,
            'totales': {
                'cotizaciones': cliente.cotizaciones.count(),
                'reservas': cliente.reservas.count(),
                'mudanzas_completadas': cliente.reservas.filter(estado='completada').count(),
            },
        })


class ComunicacionClienteViewSet(viewsets.ModelViewSet):
    """W12 — Bitácora de comunicaciones."""
    queryset = ComunicacionCliente.objects.select_related('cliente', 'operador').all().order_by('-creado_en')
    serializer_class = ComunicacionClienteSerializer
    filterset_fields = ('cliente', 'canal', 'direccion')

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.log_comunicaciones')]

    def perform_create(self, serializer):
        serializer.save(operador=self.request.user)


class AlertaClienteViewSet(viewsets.ModelViewSet):
    """W14 — Alertas y seguimiento a leads/clientes."""
    queryset = AlertaCliente.objects.select_related('cliente', 'operador').all().order_by('fecha_programada')
    serializer_class = AlertaClienteSerializer
    filterset_fields = ('cliente', 'tipo', 'estado')

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.alertas_seguimiento')]

    def perform_create(self, serializer):
        serializer.save(operador=self.request.user)


class CrmPipelineView(APIView):
    """W11 — Conteos por estado (cotizaciones + reservas) para tablero tipo pipeline."""

    def get_permissions(self):
        return [
            IsAuthenticated(),
            TieneAlgunoDe('crm.pipeline_solicitudes', 'reservas.gestionar', 'crm.ver_clientes'),
        ]

    @extend_schema(summary='Pipeline CRM: embudo y actividad reciente', tags=['CRM — Clientes'])
    def get(self, request):
        from apps.cotizaciones.models import Cotizacion
        from apps.reservas.models import Reserva

        cot_counts = dict(
            Cotizacion.objects.values('estado').annotate(n=Count('id')).values_list('estado', 'n')
        )
        res_counts = dict(
            Reserva.objects.values('estado').annotate(n=Count('id')).values_list('estado', 'n')
        )
        ultimas_cot = []
        for c in (
            Cotizacion.objects.select_related('cliente__usuario', 'tipo_servicio', 'reserva')
            .order_by('-creado_en')[:30]
        ):
            precio_ref = c.precio_comercial_cliente
            try:
                rc = c.reserva.codigo_confirmacion
                rid = c.reserva.id
            except ObjectDoesNotExist:
                rc = None
                rid = None
            ultimas_cot.append({
                'id': c.id,
                'cliente_id': c.cliente_id,
                'cliente_nombre': c.cliente.usuario.nombre_completo,
                'estado': c.estado,
                'tipo_servicio': c.tipo_servicio.nombre if c.tipo_servicio_id else None,
                'creado_en': c.creado_en.isoformat(),
                'precio_referencia': str(precio_ref) if precio_ref is not None else None,
                'reserva_id': rid,
                'reserva_codigo': rc,
            })

        return Response({
            'cotizaciones_por_estado': cot_counts,
            'reservas_por_estado': res_counts,
            'etapas_reserva_sugeridas': ['pendiente', 'confirmada', 'completada'],
            'ultimas_cotizaciones': ultimas_cot,
            'cotizaciones_activas_leads': Cotizacion.objects.filter(estado__in=('borrador', 'enviada')).count(),
        })


class CrmComportamientoView(APIView):
    """W16 — Datos agregados para gráficos de comportamiento y retención."""

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.reportes_comportamiento')]

    @extend_schema(summary='Métricas CRM: cartera, embudo 90d y segmentación', tags=['CRM — Clientes'])
    def get(self, request):
        hoy = timezone.now().date()
        desde = hoy - timedelta(days=180)

        por_segmento_rf = dict(
            Cliente.objects.exclude(rf_segmento_predicho='').values('rf_segmento_predicho').annotate(
                n=Count('id')
            ).values_list('rf_segmento_predicho', 'n')
        )
        por_tipo = dict(
            Cliente.objects.values('tipo_cliente').annotate(n=Count('id')).values_list('tipo_cliente', 'n')
        )

        # "Churn" aproximado: tenían actividad y sin reserva reciente
        con_historial = Cliente.objects.filter(cantidad_mudanzas__gt=0)
        inactivos = 0
        for c in con_historial.iterator(chunk_size=100):
            ult = c.reservas.order_by('-fecha_servicio').values_list('fecha_servicio', flat=True).first()
            if ult and ult < desde:
                inactivos += 1

        activos_recientes = Cliente.objects.filter(
            reservas__fecha_servicio__gte=desde
        ).distinct().count()

        from apps.cotizaciones.models import Cotizacion

        desde_90_dt = timezone.now() - timedelta(days=90)
        cot_qs_90 = Cotizacion.objects.filter(creado_en__gte=desde_90_dt)
        cot_creadas_90 = cot_qs_90.count()
        cot_aceptadas_90 = cot_qs_90.filter(estado='aceptada').count()
        cot_enviadas_90 = cot_qs_90.filter(estado='enviada').count()
        cot_rechazadas_90 = cot_qs_90.filter(estado='rechazada').count()

        cerradas_90 = cot_aceptadas_90 + cot_rechazadas_90
        tasa_cierre = round((cot_aceptadas_90 / cerradas_90) * 100, 1) if cerradas_90 else None

        cot_por_estado_90 = dict(
            cot_qs_90.values('estado').annotate(n=Count('id')).values_list('estado', 'n')
        )

        return Response({
            'clientes_por_segmento_predicho': por_segmento_rf,
            'clientes_por_tipo': por_tipo,
            'clientes_activos_ultimos_180d': activos_recientes,
            'clientes_posible_churn_180d': inactivos,
            'total_clientes': Cliente.objects.count(),
            'cotizaciones_creadas_ultimos_90d': cot_creadas_90,
            'cotizaciones_aceptadas_ultimos_90d': cot_aceptadas_90,
            'cotizaciones_enviadas_ultimos_90d': cot_enviadas_90,
            'cotizaciones_rechazadas_ultimos_90d': cot_rechazadas_90,
            'cotizaciones_por_estado_ultimos_90d': cot_por_estado_90,
            'tasa_aceptacion_sobre_cerradas_90d_pct': tasa_cierre,
        })


class PrediccionLealtadView(APIView):
    """W15 — Ejecuta modelo RF (o heurística) sobre todos los clientes."""

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.rf_prediccion_lealtad')]

    @extend_schema(summary='Ejecutar predicción de lealtad (Random Forest)', tags=['CRM — Clientes'])
    def post(self, request):
        resultado = ejecutar_prediccion_lealtad_todos()
        return Response(resultado, status=status.HTTP_200_OK)
