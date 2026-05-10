from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.usuarios.permissions import TieneAlgunoDe

from .models import Cotizacion, CotizacionServicioAdicional
from .serializers import (
    CotizacionSerializer,
    CotizacionClienteAppSerializer,
    CotizacionCreateSerializer,
    CotizacionServicioAdicionalSerializer,
)
from .services import calcular_precio_cotizacion, agregar_servicio_adicional, enviar_cotizacion, aceptar_cotizacion


def _parse_solicita_embalaje_desde_request(data):
    if not data:
        return None
    for key in ('solicita_embalaje', 'solicitaEmbalaje'):
        if key not in data:
            continue
        v = data.get(key)
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.strip().lower() in ('1', 'true', 'yes', 'si', 'sí', 'on')
        return bool(v)
    return None


def _es_cliente_portal(user):
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return False
    rol = getattr(user, 'rol', None)
    return bool(rol and rol.nombre.lower() == 'cliente')


@extend_schema_view(
    list=extend_schema(summary='Listar cotizaciones (CRM y portal cliente)', tags=['CRM — Cotizaciones']),
    retrieve=extend_schema(summary='Detalle de cotización', tags=['CRM — Cotizaciones']),
    create=extend_schema(summary='Crear cotización', tags=['CRM — Cotizaciones']),
    partial_update=extend_schema(summary='Actualizar cotización', tags=['CRM — Cotizaciones']),
)
class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.select_related(
        'cliente__usuario', 'zona_origen', 'zona_destino', 'tipo_servicio'
    ).prefetch_related('objetos', 'servicios_adicionales_vinculados__servicio_adicional').all().order_by('-creado_en')
    filterset_fields = ('cliente', 'estado', 'zona_origen', 'zona_destino')

    def get_queryset(self):
        qs = Cotizacion.objects.select_related(
            'cliente__usuario', 'zona_origen', 'zona_destino', 'tipo_servicio'
        ).prefetch_related('objetos', 'servicios_adicionales_vinculados__servicio_adicional').order_by('-creado_en')
        u = self.request.user
        if u.is_superuser:
            return qs
        if _es_cliente_portal(u):
            from apps.clientes.models import Cliente
            try:
                cli = Cliente.objects.get(usuario=u)
                return qs.filter(cliente=cli)
            except Cliente.DoesNotExist:
                return qs.none()
        return qs

    def get_permissions(self):
        u = self.request.user
        if _es_cliente_portal(u):
            acciones_cliente = (
                'list',
                'retrieve',
                'create',
                'update',
                'partial_update',
                'destroy',
                'aceptar',
                'rechazar',
                'calcular_precio',
                'agregar_servicio',
                'objetos',
            )
            if self.action in acciones_cliente:
                return [IsAuthenticated()]
            return [IsAuthenticated(), TieneAlgunoDe('crm.editar_clientes', 'crm.registro_cliente')]
        if self.action in ('aceptar', 'rechazar'):
            return [IsAuthenticated(), TieneAlgunoDe('crm.pipeline_solicitudes', 'reservas.gestionar')]
        if self.action in ('list', 'retrieve'):
            return [
                IsAuthenticated(),
                TieneAlgunoDe('crm.ver_clientes', 'crm.registro_cliente', 'crm.pipeline_solicitudes'),
            ]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), TieneAlgunoDe('crm.editar_clientes', 'crm.registro_cliente')]
        if self.action in ('calcular_precio', 'agregar_servicio'):
            return [IsAuthenticated(), TieneAlgunoDe('crm.editar_clientes', 'crm.registro_cliente')]
        return [IsAuthenticated(), TieneAlgunoDe('crm.ver_clientes', 'crm.registro_cliente')]

    def _request_es_app_cliente(self):
        return 'app-cliente' in (self.request.path or '')

    def _serializer_cotizacion_salida(self):
        return CotizacionClienteAppSerializer if self._request_es_app_cliente() else CotizacionSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return CotizacionCreateSerializer
        if self._request_es_app_cliente():
            return CotizacionClienteAppSerializer
        return CotizacionSerializer

    def destroy(self, request, *args, **kwargs):
        if _es_cliente_portal(request.user):
            cotizacion = self.get_object()
            if cotizacion.estado != 'borrador':
                return Response(
                    {'detail': 'Solo puedes eliminar cotizaciones en estado borrador.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        if _es_cliente_portal(self.request.user):
            from apps.clientes.models import Cliente
            try:
                cli = Cliente.objects.get(usuario=self.request.user)
            except Cliente.DoesNotExist:
                raise ValidationError({'cliente': 'Usuario sin perfil de cliente.'})
            cotizacion = serializer.save(cliente=cli)
        else:
            cotizacion = serializer.save()
        calcular_precio_cotizacion(cotizacion)

    @action(
        detail=True,
        methods=['post'],
        url_path='calcular-precio',
        parser_classes=[JSONParser, FormParser, MultiPartParser],
    )
    def calcular_precio(self, request, pk=None):
        """Recalcula el precio. POST .../calcular-precio/ — Body JSON opcional: {\"solicita_embalaje\": true}."""
        cotizacion = self.get_object()
        flag = _parse_solicita_embalaje_desde_request(request.data)
        if flag is not None:
            cotizacion.solicita_embalaje = flag
            cotizacion.save(update_fields=['solicita_embalaje'])
        resultado = calcular_precio_cotizacion(cotizacion)
        if self._request_es_app_cliente():
            # App cliente: sin desglose técnico ni metadatos de IA (solo panel web / CRM).
            resultado = {
                k: v
                for k, v in resultado.items()
                if k not in ('desglose', 'tarifa_info', 'precio_predicho_ia', 'confianza_ia')
            }
            p = cotizacion.precio_comercial_cliente
            resultado['precio_total_servicio'] = float(p) if p is not None else None
        return Response(resultado)

    @action(
        detail=True,
        methods=['get', 'post'],
        url_path='objetos',
        parser_classes=[JSONParser, MultiPartParser, FormParser],
    )
    def objetos(self, request, pk=None):
        """Lista o crea objetos de inventario bajo la cotización (app cliente / flujo operativo)."""
        from apps.inventario.models import FotoObjeto, ObjetoMudanza
        from apps.inventario.serializers import ObjetoMudanzaSerializer
        from apps.inventario.services_inventario import aplicar_clasificacion_y_riesgo

        cotizacion = self.get_object()
        if request.method == 'GET':
            objs = ObjetoMudanza.objects.filter(cotizacion=cotizacion).select_related('categoria')
            return Response(ObjetoMudanzaSerializer(objs, many=True).data)
        # La app envía solo el objeto; la cotización viene de la URL. Sin esto, is_valid() exige `cotizacion` en el body.
        data = request.data.copy()
        if hasattr(data, '_mutable'):
            data._mutable = True
        data['cotizacion'] = cotizacion.pk
        serializer = ObjetoMudanzaSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        foto = request.FILES.get('foto')
        if foto:
            FotoObjeto.objects.create(objeto=obj, foto=foto, tipo_foto='antes_traslado')
        aplicar_clasificacion_y_riesgo(obj)
        return Response(ObjetoMudanzaSerializer(obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def enviar(self, request, pk=None):
        """Envía la cotización al cliente (Fase 3). El operador puede especificar el precio final."""
        from decimal import Decimal
        cotizacion = self.get_object()
        precio_final = request.data.get('precio_final')
        if precio_final:
            precio_final = Decimal(str(precio_final))
        cotizacion_actualizada = enviar_cotizacion(cotizacion, precio_final)
        return Response(self._serializer_cotizacion_salida()(cotizacion_actualizada).data)

    @action(detail=True, methods=['post'])
    def aceptar(self, request, pk=None):
        """Cliente acepta la cotización y genera reserva automáticamente (Fase 3)."""
        from apps.reservas.serializers import ReservaSerializer
        cotizacion = self.get_object()
        reserva = aceptar_cotizacion(cotizacion)
        return Response({
            'cotizacion': self._serializer_cotizacion_salida()(cotizacion).data,
            'reserva': ReservaSerializer(reserva).data
        })

    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Marca la cotización como rechazada."""
        cotizacion = self.get_object()
        u = request.user
        es_solo_cliente = (
            u.is_authenticated
            and not u.is_superuser
            and not u.is_staff
            and getattr(u, 'rol', None)
            and u.rol.nombre.lower() == 'cliente'
        )
        if es_solo_cliente and cotizacion.estado != 'enviada':
            return Response(
                {
                    'detail': 'Solo puedes rechazar una cotización que el operador te haya enviado (estado enviada).',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        cotizacion.estado = 'rechazada'
        cotizacion.save(update_fields=['estado'])
        return Response(self._serializer_cotizacion_salida()(cotizacion).data)

    @action(detail=True, methods=['post'], url_path='agregar-servicio')
    def agregar_servicio(self, request, pk=None):
        """Agrega un servicio adicional a la cotización. Body: {servicio_adicional: id, cantidad: 1}"""
        cotizacion = self.get_object()
        if cotizacion.estado != 'borrador':
            return Response(
                {'detail': 'Solo se pueden añadir servicios adicionales mientras la cotización está en borrador.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        servicio_id = request.data.get('servicio_adicional')
        if not servicio_id:
            return Response({'error': 'servicio_adicional es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        cantidad = int(request.data.get('cantidad', 1))
        if cantidad < 1:
            return Response({'error': 'cantidad debe ser al menos 1'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            csa = agregar_servicio_adicional(int(pk), int(servicio_id), cantidad)
            return Response(CotizacionServicioAdicionalSerializer(csa).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CotizacionServicioAdicionalViewSet(viewsets.ModelViewSet):
    queryset = CotizacionServicioAdicional.objects.select_related('cotizacion', 'servicio_adicional').all()
    serializer_class = CotizacionServicioAdicionalSerializer
    filterset_fields = ('cotizacion',)
