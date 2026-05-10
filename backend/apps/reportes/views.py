import io
import re

from django.db.models import Q, Sum
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.usuarios.permissions import requiere_permiso

from .exports import export_html_string, export_pdf_bytes, export_xlsx_bytes, send_report_email
from .models import ReportePersonalizado
from .query import execute_report, headers_for_keys
from .registry import list_sources_meta
from .serializers import (
    EjecutarReporteSerializer,
    ExportarReporteSerializer,
    ReportePersonalizadoListSerializer,
    ReportePersonalizadoSerializer,
)


def _rol_slug(user):
    if not getattr(user, 'rol', None):
        return ''
    return (user.rol.nombre or '').lower()


class DashboardView(APIView):
    """Resumen por rol (W7): admin/operador, cliente, conductor/cargador."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None})
    def get(self, request):
        from apps.reservas.models import Reserva
        from apps.cotizaciones.models import Cotizacion
        from apps.clientes.models import Cliente
        from apps.pagos.models import Pago
        from apps.mudanzas.models import ServicioMudanza, AsignacionPersonal
        from apps.personal.models import Personal

        hoy = timezone.now().date()
        mes_inicio = hoy.replace(day=1)
        rol = _rol_slug(request.user)

        if rol == 'cliente':
            try:
                cli = Cliente.objects.get(usuario=request.user)
            except Cliente.DoesNotExist:
                return Response({
                    'vista': 'cliente',
                    'reservas_activas': 0,
                    'cotizaciones_pendientes': 0,
                    'pagos_pendientes': 0,
                    'proximas_mudanzas': 0,
                })
            reservas_activas = Reserva.objects.filter(
                cliente=cli,
                estado__in=['pendiente', 'confirmada', 'en_proceso'],
            ).count()
            cotizaciones_pendientes = Cotizacion.objects.filter(
                cliente=cli, estado='enviada'
            ).count()
            reservas_ids = Reserva.objects.filter(cliente=cli).values_list('id', flat=True)
            pagos_pendientes = Pago.objects.filter(
                reserva_id__in=reservas_ids, estado__in=['pendiente', 'procesando']
            ).count()
            proximas = Reserva.objects.filter(
                cliente=cli,
                fecha_servicio__gte=hoy,
                estado__in=['confirmada', 'en_proceso', 'pendiente'],
            ).count()
            return Response({
                'vista': 'cliente',
                'reservas_activas': reservas_activas,
                'cotizaciones_pendientes': cotizaciones_pendientes,
                'pagos_pendientes': pagos_pendientes,
                'proximas_mudanzas': proximas,
            })

        if rol in ('conductor', 'cargador'):
            try:
                per = Personal.objects.get(usuario=request.user)
            except Personal.DoesNotExist:
                return Response({
                    'vista': 'operativo',
                    'servicios_asignados': 0,
                    'servicios_en_curso': 0,
                    'servicios_completados_total': 0,
                })
            asignaciones = AsignacionPersonal.objects.filter(personal=per)
            serv_ids = asignaciones.values_list('servicio_id', flat=True).distinct()
            en_curso = ServicioMudanza.objects.filter(
                id__in=serv_ids,
                estado__in=[
                    'asignado', 'en_camino', 'en_origen', 'cargando',
                    'en_ruta', 'en_destino', 'descargando',
                ],
            ).count()
            asignados = ServicioMudanza.objects.filter(
                id__in=serv_ids,
                estado__in=['asignado', 'en_camino', 'en_origen', 'cargando', 'en_ruta', 'en_destino', 'descargando', 'completado'],
            ).count()
            return Response({
                'vista': 'operativo',
                'servicios_asignados': asignados,
                'servicios_en_curso': en_curso,
                'servicios_completados_total': per.servicios_completados,
            })

        reservas_hoy = Reserva.objects.filter(
            fecha_servicio=hoy, estado__in=['confirmada', 'en_proceso']
        ).count()
        cotizaciones_pendientes = Cotizacion.objects.filter(estado='enviada').count()
        clientes_total = Cliente.objects.count()
        ingresos_mes = Pago.objects.filter(
            estado='completado',
            creado_en__date__gte=mes_inicio
        ).aggregate(total=Sum('monto'))['total'] or 0
        servicios_completados = ServicioMudanza.objects.filter(estado='completado').count()

        if rol == 'operador':
            vista = 'operador'
        elif rol in ('admin', 'administrador'):
            vista = 'admin'
        else:
            vista = 'segmentado'

        payload = {
            'vista': vista,
            'reservas_hoy': reservas_hoy,
            'cotizaciones_pendientes': cotizaciones_pendientes,
            'clientes_total': clientes_total,
            'ingresos_mes': float(ingresos_mes),
            'servicios_completados': servicios_completados,
        }
        if rol == 'operador':
            payload['mudanzas_activas'] = ServicioMudanza.objects.exclude(
                estado__in=['completado', 'cancelado']
            ).count()
        return Response(payload)


class FuentesReporteView(APIView):
    permission_classes = [IsAuthenticated, requiere_permiso('reportes.ver')]

    @extend_schema(summary='Catálogo de fuentes y columnas para reportes personalizados')
    def get(self, request):
        return Response(list_sources_meta())


class EjecutarReporteView(APIView):
    permission_classes = [IsAuthenticated, requiere_permiso('reportes.ver')]

    @extend_schema(request=EjecutarReporteSerializer, summary='Ejecutar consulta de reporte (vista previa)')
    def post(self, request):
        ser = EjecutarReporteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        try:
            rows, total = execute_report(
                d['fuente'],
                d['columnas'],
                filters=d.get('filtros'),
                order=d.get('orden'),
                limit=d['limit'],
                offset=d['offset'],
            )
        except ValueError:
            return Response({'detail': 'Parámetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
        headers = headers_for_keys(d['fuente'], d['columnas'])
        return Response({
            'total': total,
            'limit': d['limit'],
            'offset': d['offset'],
            'columnas': [{'key': k, 'label': lab} for k, lab in headers],
            'filas': rows,
        })


class ExportarReporteView(APIView):
    permission_classes = [IsAuthenticated, requiere_permiso('reportes.ver')]

    @extend_schema(request=ExportarReporteSerializer, summary='Exportar reporte (Excel, HTML, PDF o email)')
    def post(self, request):
        ser = ExportarReporteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        try:
            rows, _total = execute_report(
                d['fuente'],
                d['columnas'],
                filters=d.get('filtros'),
                order=d.get('orden'),
                limit=d['limit'],
                offset=0,
                max_limit=5000,
            )
        except ValueError:
            return Response({'detail': 'Parámetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)

        headers = headers_for_keys(d['fuente'], d['columnas'])
        title = d.get('titulo') or 'Reporte'
        safe_fn = re.sub(r'[^\w\s-]', '', title, flags=re.UNICODE).strip().lower()
        safe_fn = re.sub(r'[-\s]+', '_', safe_fn, flags=re.UNICODE) or 'reporte'

        fmt = d['formato']
        if fmt == 'xlsx':
            data = export_xlsx_bytes(headers, rows)
            resp = HttpResponse(
                data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            resp['Content-Disposition'] = f'attachment; filename="{safe_fn}.xlsx"'
            return resp
        if fmt == 'html':
            html = export_html_string(title, headers, rows)
            resp = HttpResponse(html, content_type='text/html; charset=utf-8')
            resp['Content-Disposition'] = f'attachment; filename="{safe_fn}.html"'
            return resp
        if fmt == 'pdf':
            data = export_pdf_bytes(title, headers, rows)
            return FileResponse(
                io.BytesIO(data),
                as_attachment=True,
                filename=f'{safe_fn}.pdf',
                content_type='application/pdf',
            )
        if fmt == 'email':
            try:
                send_report_email(
                    d['email_destinatario'],
                    d['email_asunto'],
                    title,
                    headers,
                    rows,
                    attach_formats=d.get('email_adjuntos') or ['xlsx'],
                )
            except Exception as e:
                return Response(
                    {'detail': str(e), 'code': 'email_error'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            return Response({'ok': True, 'mensaje': f'Enviado a {d["email_destinatario"]}'})
        return Response({'detail': 'Formato no soportado'}, status=status.HTTP_400_BAD_REQUEST)


class ReportePersonalizadoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, requiere_permiso('reportes.ver')]

    def get_queryset(self):
        u = self.request.user
        return ReportePersonalizado.objects.filter(Q(usuario=u) | Q(es_compartido=True))

    def get_serializer_class(self):
        if self.action == 'list':
            return ReportePersonalizadoListSerializer
        return ReportePersonalizadoSerializer

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.usuario_id != self.request.user.id:
            raise PermissionDenied('Solo el autor puede modificar este reporte.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.usuario_id != self.request.user.id:
            raise PermissionDenied('Solo el autor puede eliminar este reporte.')
        instance.delete()
