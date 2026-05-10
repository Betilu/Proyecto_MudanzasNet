"""
API dedicada a la app móvil del cliente (/api/app-cliente/).
No modifica rutas ni permisos del portal web (/api/...).
"""
from decimal import Decimal

from django.db.models import Q
from django.core.files.base import ContentFile
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clientes.models import Cliente
from apps.inventario.access import es_cliente_portal
from apps.mudanzas.models import CalificacionServicio, ConfirmacionEntrega, Incidencia, ServicioMudanza
from apps.mudanzas.serializers import ConfirmacionEntregaSerializer, IncidenciaSerializer
from apps.notificaciones.services import NotificacionService
from apps.pagos.models import Factura, MetodoPago, Pago
from apps.pagos.pdf_factura import generar_factura_pdf_buffer
from apps.pagos.serializers import PagoSerializer
from apps.reservas.models import Reserva
from apps.notificaciones.models import DispositivoPush
from apps.usuarios.models import Usuario

from .serializers import AppClienteReservaSerializer


def _cliente_app(request):
    """Perfil cliente vinculado al usuario JWT (app móvil)."""
    if not request.user.is_authenticated:
        return None
    if not es_cliente_portal(request.user):
        return None
    try:
        return Cliente.objects.select_related('usuario').get(usuario=request.user)
    except Cliente.DoesNotExist:
        return None


def _reservas_base_queryset(cliente):
    return (
        Reserva.objects.filter(cliente=cliente)
        .select_related('cotizacion', 'cotizacion__zona_origen', 'cotizacion__zona_destino', 'cliente')
        .select_related('servicio', 'servicio__confirmacion', 'servicio__calificacion')
        .order_by('-fecha_servicio')
    )


def _servicio_para_reserva(reserva: Reserva) -> ServicioMudanza:
    try:
        return reserva.servicio
    except ServicioMudanza.DoesNotExist as exc:
        raise ValidationError({'detail': 'Aún no hay servicio de mudanza asignado para esta reserva.'}) from exc


def _resolver_metodo_pago(slug: str) -> MetodoPago:
    if not slug:
        raise ValidationError({'metodo': 'Es requerido'})
    slug = (slug or '').strip().lower()
    mapping = {
        'efectivo': ['efectivo'],
        'qr': ['qr'],
        'transferencia_bcp': ['transferencia'],
        'transferencia_bnb': ['transferencia'],
        'transferencia_mercantil': ['transferencia'],
    }
    tipos = mapping.get(slug, ['transferencia'])
    mp = MetodoPago.objects.filter(es_activo=True, tipo__in=tipos).order_by('id').first()
    if mp:
        return mp
    return MetodoPago.objects.filter(es_activo=True).order_by('id').first()


def _punto_geo_app(lat, lon):
    """Coordenadas para mapa cliente (OSM); None si faltan o son inválidas."""
    if lat is None or lon is None:
        return None
    try:
        return {'lat': float(lat), 'lon': float(lon)}
    except (TypeError, ValueError):
        return None


def _trazado_gps_desde_eventos(eventos: list) -> list:
    puntos = []
    for ev in eventos or []:
        la, lo = ev.get('latitud'), ev.get('longitud')
        if la is None or lo is None or la == '' or lo == '':
            continue
        try:
            puntos.append(
                {
                    'lat': float(la),
                    'lon': float(lo),
                    'fecha': ev.get('fecha'),
                }
            )
        except (TypeError, ValueError):
            continue
    return puntos


def _geo_seguimiento_reserva(reserva, eventos: list) -> dict:
    cot = reserva.cotizacion
    trazado = _trazado_gps_desde_eventos(eventos)
    ultima = trazado[-1] if trazado else None
    return {
        'origen': _punto_geo_app(cot.latitud_origen, cot.longitud_origen),
        'destino': _punto_geo_app(cot.latitud_destino, cot.longitud_destino),
        'trazado_gps': trazado,
        'ultima_posicion_conductor': ultima,
    }


def _map_tipo_incidencia_app(tipo: str) -> str:
    t = (tipo or '').strip().lower()
    if t == 'falta':
        return 'faltante'
    return t


class AppClienteReservaViewSet(viewsets.ReadOnlyModelViewSet):
    """Listado/detalle y acciones de flujo cliente (Fases 4–7 del flujo operativo)."""

    permission_classes = [IsAuthenticated]
    serializer_class = AppClienteReservaSerializer
    lookup_value_regex = r'[0-9]+'

    def get_queryset(self):
        cliente = _cliente_app(self.request)
        if not cliente:
            return Reserva.objects.none()
        qs = _reservas_base_queryset(cliente)
        if self.action != 'list':
            return qs
        p = self.request.query_params
        if p.get('activas') in ('1', 'true', 'True', 'yes'):
            qs = qs.exclude(estado__in=['cancelada', 'completada']).filter(
                Q(servicio__isnull=True) | ~Q(servicio__estado__in=['completado', 'cancelado'])
            )
        est = p.get('estado')
        if est:
            qs = qs.filter(estado=est)
        return qs

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not _cliente_app(request):
            self.permission_denied(request, message='Solo clientes pueden usar la API de la app móvil.')

    @action(detail=True, methods=['get'])
    def seguimiento(self, request, pk=None):
        reserva = self.get_object()
        try:
            servicio = reserva.servicio
        except ServicioMudanza.DoesNotExist:
            return Response(
                {
                    'estado_actual': reserva.estado,
                    'eventos': [],
                    'mensaje': 'El seguimiento en tiempo real estará disponible cuando se asigne el servicio de mudanza.',
                    'geo': None,
                    'codigo_reserva': reserva.codigo_confirmacion,
                }
            )
        historial = servicio.historial_estados.all()
        eventos = [
            {
                'estado': h.estado_nuevo,
                'descripcion': h.notas or f'Estado: {h.estado_nuevo}',
                'fecha': h.creado_en.isoformat() if h.creado_en else None,
                'latitud': str(h.latitud) if h.latitud is not None else None,
                'longitud': str(h.longitud) if h.longitud is not None else None,
            }
            for h in historial
        ]
        geo = _geo_seguimiento_reserva(reserva, eventos)
        return Response(
            {
                'estado_actual': servicio.estado,
                'eventos': eventos,
                'geo': geo,
                'codigo_reserva': reserva.codigo_confirmacion,
            }
        )

    @action(detail=True, methods=['post'], parser_classes=[JSONParser])
    def cancelar(self, request, pk=None):
        reserva = self.get_object()
        motivo = request.data.get('motivo_cancelacion') or request.data.get('motivo') or ''
        if reserva.estado in ('cancelada', 'completada'):
            return Response({'detail': 'Esta reserva no se puede cancelar.'}, status=status.HTTP_400_BAD_REQUEST)
        reserva.estado = 'cancelada'
        reserva.motivo_cancelacion = motivo
        reserva.cancelada_en = timezone.now()
        reserva.save(update_fields=['estado', 'motivo_cancelacion', 'cancelada_en', 'actualizado_en'])
        return Response(AppClienteReservaSerializer(reserva).data)

    @action(detail=True, methods=['get', 'post'], parser_classes=[JSONParser, MultiPartParser, FormParser])
    def pagos(self, request, pk=None):
        reserva = self.get_object()
        if request.method == 'GET':
            pagos = Pago.objects.filter(reserva=reserva).select_related('metodo_pago').order_by('-creado_en')
            return Response(PagoSerializer(pagos, many=True).data)
        # POST — registro de comprobante (Fase 4)
        metodo_slug = request.data.get('metodo')
        tipo_pago = request.data.get('tipo', 'total')
        monto = request.data.get('monto')
        if monto is None:
            raise ValidationError({'monto': 'Requerido'})
        try:
            monto_dec = Decimal(str(monto))
        except Exception as exc:
            raise ValidationError({'monto': 'Monto inválido'}) from exc
        mp = _resolver_metodo_pago(metodo_slug)
        if not mp:
            raise ValidationError({'metodo': 'No hay métodos de pago configurados'})
        pago = Pago(
            reserva=reserva,
            metodo_pago=mp,
            tipo_pago=tipo_pago,
            monto=monto_dec,
            referencia_transaccion=request.data.get('referencia', '') or '',
        )
        comprobante = request.FILES.get('comprobante')
        if comprobante:
            pago.comprobante = comprobante
        pago.save()
        operadores = (
            Usuario.objects.filter(
                rol__permisos_asignados__permiso__nombre__in=['pagos.procesar', 'pagos.ver'],
                es_activo=True,
            )
            .distinct()[:10]
        )
        for op in operadores:
            NotificacionService.notificar_pago_pendiente(op, pago)
        return Response(PagoSerializer(pago).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def incidencias(self, request, pk=None):
        reserva = self.get_object()
        servicio = _servicio_para_reserva(reserva)
        if request.method == 'GET':
            incs = Incidencia.objects.filter(servicio=servicio).select_related('objeto', 'reportado_por').order_by('-creado_en')
            return Response(IncidenciaSerializer(incs, many=True).data)
        data = request.data.copy()
        if data.get('objeto_id') and not data.get('objeto'):
            data['objeto'] = data.get('objeto_id')
        tipo = _map_tipo_incidencia_app(data.get('tipo', ''))
        data['tipo'] = tipo
        serializer = IncidenciaSerializer(data=data, context={'request': request, 'servicio': servicio})
        serializer.is_valid(raise_exception=True)
        inc = serializer.save(servicio=servicio, reportado_por=request.user)
        operadores = Usuario.objects.filter(
            rol__permisos_asignados__permiso__nombre__in=[
                'inventario.incidencias_postentrega',
                'inventario.editar',
            ],
            es_activo=True,
        ).distinct()[:5]
        for operador in operadores:
            NotificacionService.notificar_incidencia_reportada(operador, inc)
        return Response(IncidenciaSerializer(inc).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser],
        url_path='confirmar-entrega',
    )
    def confirmar_entrega(self, request, pk=None):
        reserva = self.get_object()
        servicio = _servicio_para_reserva(reserva)
        conformidad = (request.data.get('conformidad') or '').strip().lower()
        map_conf = {'total': 'total', 'parcial': 'parcial', 'no_conforme': 'ninguna'}
        cliente_conforme = map_conf.get(conformidad, '')
        conf, _ = ConfirmacionEntrega.objects.get_or_create(servicio=servicio)
        if request.data.get('observaciones'):
            conf.observaciones = request.data.get('observaciones')
        if cliente_conforme in ('total', 'parcial', 'ninguna'):
            conf.cliente_conforme = cliente_conforme
        firma = request.FILES.get('firma')
        if firma:
            conf.firma_cliente = firma
        conf.save()
        return Response(ConfirmacionEntregaSerializer(conf).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], parser_classes=[JSONParser])
    def calificar(self, request, pk=None):
        reserva = self.get_object()
        servicio = _servicio_para_reserva(reserva)
        cliente = reserva.cliente
        cal_general = request.data.get('calificacion_general')
        if cal_general is None:
            cal_general = request.data.get('calificacion')
        if cal_general is None:
            raise ValidationError({'calificacion_general': 'Requerido'})
        created = not CalificacionServicio.objects.filter(servicio=servicio).exists()
        _, _ = CalificacionServicio.objects.update_or_create(
            servicio=servicio,
            defaults={
                'cliente': cliente,
                'calificacion': cal_general,
                'comentario': request.data.get('comentario', ''),
                'calificacion_puntualidad': request.data.get('puntualidad'),
                'calificacion_cuidado': request.data.get('cuidado_objetos'),
                'calificacion_atencion': request.data.get('atencion_equipo'),
            },
        )
        from django.db.models import Avg

        for asignacion in servicio.equipo.all():
            personal = asignacion.personal
            promedio = (
                CalificacionServicio.objects.filter(servicio__equipo__personal=personal).aggregate(
                    Avg('calificacion')
                )['calificacion__avg']
                or 0
            )
            personal.calificacion_promedio = Decimal(str(round(promedio, 2)))
            if created:
                personal.servicios_completados += 1
            personal.save(update_fields=['calificacion_promedio', 'servicios_completados'])
        if created:
            cliente.cantidad_mudanzas += 1
            cliente.monto_total_gastado += reserva.cotizacion.precio_comercial_cliente
            cliente.save(update_fields=['cantidad_mudanzas', 'monto_total_gastado'])
        return Response(AppClienteReservaSerializer(reserva).data)


class AppClienteFacturaPdfView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, factura_id):
        cliente = _cliente_app(request)
        if not cliente:
            raise PermissionDenied('Solo clientes pueden descargar esta factura.')
        factura = get_object_or_404(Factura, pk=factura_id, cliente=cliente)
        if not factura.pdf:
            buf = generar_factura_pdf_buffer(factura)
            factura.pdf.save(
                f'{factura.numero_factura}.pdf',
                ContentFile(buf.read()),
                save=True,
            )
        return FileResponse(factura.pdf.open('rb'), as_attachment=True, filename=f'{factura.numero_factura}.pdf')


class AppClientePushTokenView(APIView):
    """Registra token de push (Expo) en preferencias del usuario; no expone rutas web nuevas."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not es_cliente_portal(request.user):
            raise PermissionDenied('Solo para la app cliente.')
        token = request.data.get('token')
        if not token:
            raise ValidationError({'token': 'Requerido'})
        prefs = dict(request.user.preferencias_comunicacion or {})
        prefs['expo_push_token'] = token
        if request.data.get('device_type'):
            prefs['device_type'] = request.data.get('device_type')
        if request.data.get('device_model'):
            prefs['device_model'] = request.data.get('device_model')
        request.user.preferencias_comunicacion = prefs
        request.user.save(update_fields=['preferencias_comunicacion', 'actualizado_en'])

        dt = (request.data.get('device_type') or '').lower()
        plataforma = DispositivoPush.PLATAFORMA_IOS if dt == 'ios' else DispositivoPush.PLATAFORMA_ANDROID
        DispositivoPush.objects.update_or_create(
            token=token,
            defaults={
                'usuario': request.user,
                'aplicacion': DispositivoPush.APP_CLIENTE,
                'plataforma': plataforma,
                'activo': True,
            },
        )
        return Response({'ok': True}, status=status.HTTP_200_OK)
