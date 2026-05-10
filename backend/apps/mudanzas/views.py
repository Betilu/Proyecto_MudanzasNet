from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
import base64
import binascii

from django.core.files.base import ContentFile
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Prefetch
from django.utils import timezone

from apps.inventario.access import es_cliente_portal
from apps.personal.models import Personal
from apps.usuarios.permissions import TieneAlgunoDe, TienePermiso
from apps.ia.services import RandomForestService
from apps.notificaciones.services import NotificacionService
from apps.carga.services import PlanCargaService
from apps.inventario.models import FotoObjeto, ObjetoMudanza

from .models import (
    ServicioMudanza,
    AsignacionPersonal,
    Incidencia,
    CalificacionServicio,
    HistorialEstadoServicio,
    ConfirmacionEntrega,
    FotoEntrega,
)
from .serializers import (
    ServicioMudanzaSerializer,
    ServicioMudanzaCreateSerializer,
    AsignacionPersonalSerializer,
    IncidenciaSerializer,
    CalificacionServicioSerializer,
    ConfirmacionEntregaSerializer,
)


class DenyAny(BasePermission):
    def has_permission(self, request, view):
        return False


class ServicioMudanzaViewSet(viewsets.ModelViewSet):
    queryset = ServicioMudanza.objects.select_related(
        'reserva', 'reserva__cliente__usuario', 'vehiculo', 'rf_tipo_contenedor_recomendado'
    ).prefetch_related('equipo__personal__usuario', 'confirmacion__fotos').all().order_by('-creado_en')
    filterset_fields = ('reserva', 'estado', 'vehiculo')

    def get_queryset(self):
        qs = ServicioMudanza.objects.select_related(
            'reserva',
            'reserva__cotizacion',
            'reserva__cotizacion__zona_origen',
            'reserva__cotizacion__zona_destino',
            'reserva__cliente__usuario',
            'vehiculo',
            'vehiculo__tipo_contenedor',
            'rf_tipo_contenedor_recomendado',
        ).prefetch_related(
            'equipo__personal__usuario',
            'confirmacion__fotos',
            Prefetch(
                'historial_estados',
                queryset=HistorialEstadoServicio.objects.select_related('cambiado_por').order_by(
                    'creado_en'
                ),
            ),
            Prefetch(
                'reserva__cotizacion__objetos',
                queryset=ObjetoMudanza.objects.prefetch_related(
                    Prefetch('fotos', queryset=FotoObjeto.objects.order_by('id'))
                ),
            ),
        ).order_by('-creado_en')
        u = self.request.user
        if u.is_superuser:
            return qs
        if es_cliente_portal(u):
            return qs.filter(reserva__cliente__usuario=u)
        # Conductor/cargador: solo servicios donde está en el equipo
        try:
            personal = Personal.objects.get(usuario=u)
            return qs.filter(equipo__personal=personal).distinct()
        except Personal.DoesNotExist:
            pass
        return qs

    def get_permissions(self):
        u = self.request.user
        if es_cliente_portal(u):
            if self.action in ('list', 'retrieve', 'confirmar_entrega', 'calificar', 'reportar_incidencia'):
                return [IsAuthenticated()]
            return [IsAuthenticated(), DenyAny()]
        # App conductor: personal asignado no suele tener reservas.gestionar
        es_personal = Personal.objects.filter(usuario=u).exists()
        acciones_conductor = (
            'mis_servicios',
            'cambiar_estado',
            'reportar_ubicacion',
            'marcar_item_carga',
            'plan_carga_detalle',
            'confirmar_entrega',
            'reportar_incidencia',
        )
        if self.action in acciones_conductor and es_personal:
            return [IsAuthenticated()]
        # Detalle por ID: el queryset ya limita a servicios del personal
        if self.action == 'retrieve' and es_personal:
            return [IsAuthenticated()]
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), TieneAlgunoDe('reservas.gestionar', 'reservas.ver', 'crm.pipeline_solicitudes')]
        if self.action == 'create':
            return [IsAuthenticated(), TieneAlgunoDe('reservas.gestionar')]
        return [IsAuthenticated(), TieneAlgunoDe('reservas.gestionar')]

    def get_serializer_class(self):
        if self.action == 'create':
            return ServicioMudanzaCreateSerializer
        return ServicioMudanzaSerializer

    def perform_create(self, serializer):
        """Crea el servicio y ejecuta predicciones de IA (Fase 5 del flujo)"""
        servicio = serializer.save()
        # Ejecutar predicciones de IA
        RandomForestService.recomendar_contenedor(servicio)
        return servicio

    @action(detail=True, methods=['post'])
    def asignar_vehiculo(self, request, pk=None):
        """Asigna vehículo al servicio (Fase 5 del flujo)"""
        from apps.vehiculos.models import Vehiculo
        servicio = self.get_object()
        vehiculo_id = request.data.get('vehiculo_id')

        if not vehiculo_id:
            return Response(
                {'error': 'vehiculo_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            vehiculo = Vehiculo.objects.get(pk=vehiculo_id)
        except Vehiculo.DoesNotExist:
            return Response(
                {'error': 'Vehículo no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar disponibilidad del vehículo
        if vehiculo.estado != 'disponible':
            return Response(
                {'error': f'Vehículo no disponible. Estado actual: {vehiculo.estado}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Asignar vehículo
        servicio.vehiculo = vehiculo
        servicio.save(update_fields=['vehiculo'])

        # Cambiar estado del vehículo a EN_SERVICIO
        # NOTA: En producción, esto debería controlarse por fecha
        # vehiculo.estado = 'en_servicio'
        # vehiculo.save(update_fields=['estado'])

        return Response(self.get_serializer(servicio).data)

    @action(detail=True, methods=['post'])
    def asignar_equipo(self, request, pk=None):
        """Asigna personal al servicio y notifica (Fase 5 del flujo)"""
        from apps.personal.models import Personal
        servicio = self.get_object()
        personal_id = request.data.get('personal')
        rol = request.data.get('rol_asignado')
        if not personal_id or not rol:
            return Response(
                {'error': 'personal y rol_asignado son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        asig, created = AsignacionPersonal.objects.get_or_create(
            servicio=servicio,
            personal_id=personal_id,
            defaults={'rol_asignado': rol}
        )
        if not created:
            asig.rol_asignado = rol
            asig.save()

        # Notificar al personal asignado
        personal = Personal.objects.get(pk=personal_id)
        NotificacionService.notificar_servicio_asignado(personal, servicio)

        return Response(AsignacionPersonalSerializer(asig).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def asignar_equipo_completo(self, request, pk=None):
        """
        Asigna múltiple personal al servicio de una sola vez (Fase 5 del flujo)
        Body: {
            conductor_id: int,
            cargadores_ids: [int, int, ...]
        }
        """
        from apps.personal.models import Personal
        servicio = self.get_object()
        conductor_id = request.data.get('conductor_id')
        cargadores_ids = request.data.get('cargadores_ids', [])

        if not conductor_id:
            return Response(
                {'error': 'conductor_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Asignar conductor
            conductor = Personal.objects.get(pk=conductor_id, tipo_personal='conductor')
            AsignacionPersonal.objects.get_or_create(
                servicio=servicio,
                personal=conductor,
                defaults={'rol_asignado': 'conductor'}
            )

            # Asignar cargadores
            for idx, cargador_id in enumerate(cargadores_ids):
                cargador = Personal.objects.get(pk=cargador_id, tipo_personal='cargador')
                rol = 'cargador_principal' if idx == 0 else 'cargador_apoyo'
                AsignacionPersonal.objects.get_or_create(
                    servicio=servicio,
                    personal=cargador,
                    defaults={'rol_asignado': rol}
                )

            # Actualizar estado del servicio a ASIGNADO si tiene vehículo
            if servicio.vehiculo:
                servicio.estado = 'asignado'
                servicio.save(update_fields=['estado'])

            # Notificar a todo el equipo
            NotificacionService.notificar_servicio_asignado(conductor, servicio)
            for cargador_id in cargadores_ids:
                cargador = Personal.objects.get(pk=cargador_id)
                NotificacionService.notificar_servicio_asignado(cargador, servicio)

            return Response(self.get_serializer(servicio).data)

        except Personal.DoesNotExist:
            return Response(
                {'error': 'Personal no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def generar_plan_carga(self, request, pk=None):
        """
        Genera el plan de carga con heurística de empaquetado (Fase 5 del flujo)
        Ordena los objetos según riesgo, peso y posición óptima
        """
        from apps.carga.serializers import PlanCargaSerializer
        servicio = self.get_object()

        # Verificar que el servicio tenga vehículo asignado
        if not servicio.vehiculo:
            return Response(
                {'error': 'El servicio debe tener un vehículo asignado antes de generar el plan de carga'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que no exista ya un plan de carga
        if servicio.planes_carga.exists():
            return Response(
                {'error': 'Ya existe un plan de carga para este servicio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            plan = PlanCargaService.generar_plan_carga(servicio)
            return Response(PlanCargaSerializer(plan).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def mis_servicios(self, request):
        """
        Servicios asignados al conductor/cargador (Fases 5–6).
        Incluye rango amplio de fechas y reservas sin fecha (operador aún no fija día),
        para que las asignaciones no desaparezcan en pruebas o mudanzas pasadas en curso.
        """
        usuario = request.user
        try:
            personal = Personal.objects.get(usuario=usuario)

            from django.db.models import Q
            from django.utils import timezone
            from datetime import timedelta

            hoy = timezone.now().date()
            # Ventana amplia: 45 días atrás (seguimiento / demoras) y 120 días adelante
            desde = hoy - timedelta(days=45)
            hasta = hoy + timedelta(days=120)

            try:
                dias_atras = int(request.query_params.get('dias_atras', '45'))
                dias_adelante = int(request.query_params.get('dias_adelante', '120'))
                desde = hoy - timedelta(days=max(0, min(dias_atras, 365)))
                hasta = hoy + timedelta(days=max(0, min(dias_adelante, 365)))
            except ValueError:
                pass

            incluir_completados = request.query_params.get('incluir_completados', '').lower() in (
                '1', 'true', 'yes', 'si',
            )

            filtro_fecha = Q(reserva__fecha_servicio__isnull=True) | Q(
                reserva__fecha_servicio__range=(desde, hasta)
            )

            servicios = ServicioMudanza.objects.filter(
                equipo__personal=personal,
            ).filter(filtro_fecha)

            if not incluir_completados:
                servicios = servicios.exclude(estado__in=['cancelado', 'completado'])

            servicios = servicios.distinct().select_related(
                'reserva',
                'reserva__cotizacion',
                'reserva__cotizacion__zona_origen',
                'reserva__cotizacion__zona_destino',
                'reserva__cliente__usuario',
                'vehiculo',
                'vehiculo__tipo_contenedor',
            ).prefetch_related(
                'equipo__personal__usuario',
                Prefetch(
                    'historial_estados',
                    queryset=HistorialEstadoServicio.objects.select_related('cambiado_por').order_by(
                        'creado_en'
                    ),
                ),
                Prefetch(
                    'reserva__cotizacion__objetos',
                    queryset=ObjetoMudanza.objects.prefetch_related(
                        Prefetch('fotos', queryset=FotoObjeto.objects.order_by('id'))
                    ),
                ),
            ).order_by('reserva__fecha_servicio')

            serializer = ServicioMudanzaSerializer(
                servicios, many=True, context={'request': request}
            )
            return Response(serializer.data)

        except Personal.DoesNotExist:
            return Response({'error': 'Usuario no es personal'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambia el estado del servicio y notifica al cliente (Fase 6 del flujo)"""
        servicio = self.get_object()
        estado_nuevo = request.data.get('estado_nuevo')
        if not estado_nuevo:
            return Response({'error': 'estado_nuevo es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        estado_anterior = servicio.estado
        servicio.estado = estado_nuevo
        if estado_nuevo == 'completado':
            servicio.fin_real = timezone.now()
            if servicio.inicio_real:
                delta = servicio.fin_real - servicio.inicio_real
                servicio.duracion_minutos = int(delta.total_seconds() / 60)
                # Retroalimentar modelo de tiempo
                RandomForestService.actualizar_retroalimentacion(
                    'tiempo', servicio.id, servicio.duracion_minutos
                )
        elif estado_nuevo in ('en_camino', 'en_origen', 'cargando') and not servicio.inicio_real:
            servicio.inicio_real = timezone.now()
        servicio.save()

        HistorialEstadoServicio.objects.create(
            servicio=servicio,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            cambiado_por=request.user,
            latitud=request.data.get('latitud'),
            longitud=request.data.get('longitud'),
            notas=request.data.get('notas', ''),
        )

        # Notificar al cliente sobre el cambio de estado
        NotificacionService.notificar_cambio_estado_servicio(
            servicio.reserva.cliente,
            servicio,
            estado_nuevo
        )

        servicio = self.get_queryset().get(pk=servicio.pk)
        return Response(self.get_serializer(servicio).data)

    @action(detail=True, methods=['post'])
    def reportar_ubicacion(self, request, pk=None):
        """
        Envío periódico de GPS desde la app conductor; el cliente ve el punto en vivo vía WebSocket
        sin duplicar filas en el historial de estados.
        """
        from django.core.cache import cache
        from django.utils import timezone

        from .realtime_broadcast import broadcast_ubicacion_conductor_reserva

        servicio = self.get_object()
        if servicio.estado in ('completado', 'cancelado'):
            return Response(
                {'detail': 'El servicio ya finalizó; no se reporta ubicación.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        lat = request.data.get('latitud')
        lon = request.data.get('longitud')
        if lat is None or lon is None:
            return Response(
                {'error': 'latitud y longitud son requeridos'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (TypeError, ValueError):
            return Response({'error': 'Coordenadas inválidas'}, status=status.HTTP_400_BAD_REQUEST)

        throttle_key = f'ubicacion_ws_throttle_{servicio.pk}'
        if cache.get(throttle_key):
            return Response({'ok': True, 'throttled': True})
        cache.set(throttle_key, 1, 4)

        fecha = timezone.now().isoformat()
        broadcast_ubicacion_conductor_reserva(
            servicio.reserva_id,
            servicio.estado,
            lat_f,
            lon_f,
            fecha,
        )
        return Response({'ok': True, 'fecha': fecha})

    @action(detail=True, methods=['post'])
    def marcar_item_carga(self, request, pk=None):
        """Marca un item del plan de carga como cargado/descargado (Fase 6)"""
        from apps.carga.models import ItemPlanCarga
        from apps.carga.serializers import ItemPlanCargaSerializer

        servicio = self.get_object()
        item_id = request.data.get('item_id')
        tipo = request.data.get('tipo')  # 'cargado' o 'descargado'

        if not item_id or not tipo:
            return Response(
                {'error': 'item_id y tipo son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if tipo not in ['cargado', 'descargado']:
            return Response(
                {'error': 'tipo debe ser "cargado" o "descargado"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            item = ItemPlanCarga.objects.get(
                id=item_id,
                plan_carga__servicio=servicio
            )

            if tipo == 'cargado':
                item.fue_cargado = True
            else:
                item.fue_descargado = True

            item.save()

            return Response(ItemPlanCargaSerializer(item).data)

        except ItemPlanCarga.DoesNotExist:
            return Response(
                {'error': 'Item no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def plan_carga_detalle(self, request, pk=None):
        """Obtiene el plan de carga con items para checklist (Fase 6)"""
        from apps.carga.models import PlanCarga
        from apps.carga.serializers import PlanCargaSerializer

        servicio = self.get_object()

        try:
            plan = PlanCarga.objects.prefetch_related(
                'items__objeto'
            ).get(servicio=servicio)

            serializer = PlanCargaSerializer(plan)
            return Response(serializer.data)

        except PlanCarga.DoesNotExist:
            return Response(
                {'error': 'No hay plan de carga para este servicio'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def reportar_incidencia(self, request, pk=None):
        """Reporta una incidencia y notifica al operador (Fase 7 del flujo)"""
        from apps.usuarios.models import Usuario
        servicio = self.get_object()
        dueno = es_cliente_portal(request.user) and servicio.reserva.cliente.usuario_id == request.user.id
        puede_staff = TieneAlgunoDe('inventario.incidencias_postentrega', 'inventario.editar').has_permission(
            request, self
        )
        es_personal_equipo = AsignacionPersonal.objects.filter(
            servicio=servicio,
            personal__usuario=request.user,
        ).exists()
        if not (dueno or puede_staff or es_personal_equipo):
            raise PermissionDenied()
        serializer = IncidenciaSerializer(
            data=request.data,
            context={'request': request, 'servicio': servicio},
        )
        if serializer.is_valid():
            inc = serializer.save(servicio=servicio, reportado_por=request.user)

            # Notificar a operadores con permiso de gestionar incidencias
            operadores = Usuario.objects.filter(
                rol__permisos_asignados__permiso__nombre__in=['incidencias_postentrega', 'editar'],
                es_activo=True
            ).distinct()[:5]  # Limitar a 5 operadores
            for operador in operadores:
                NotificacionService.notificar_incidencia_reportada(operador, inc)

            return Response(IncidenciaSerializer(inc).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def confirmar_entrega(self, request, pk=None):
        """Confirmación de entrega con firmas separadas (conductor + cliente) - Fases 6 y 7 del flujo"""
        servicio = self.get_object()
        reserva = servicio.reserva
        dueno = es_cliente_portal(request.user) and reserva.cliente.usuario_id == request.user.id
        staff = request.user.is_superuser
        perm = TienePermiso('inventario.confirmar_entrega').has_permission(request, self)
        es_personal_equipo = AsignacionPersonal.objects.filter(
            servicio=servicio,
            personal__usuario=request.user,
        ).exists()

        if not (dueno or staff or perm or es_personal_equipo):
            raise PermissionDenied()

        # Determinar qué firma se está recibiendo
        tipo_firma = request.data.get('tipo_firma', 'conductor')  # 'conductor' o 'cliente'
        conforme = request.data.get('cliente_conforme', '')

        # Crear o actualizar confirmación
        conf, _ = ConfirmacionEntrega.objects.get_or_create(servicio=servicio)

        # Actualizar campos
        if request.data.get('observaciones'):
            conf.observaciones = request.data.get('observaciones')

        if conforme in ['total', 'parcial', 'ninguna']:
            conf.cliente_conforme = conforme

        # Guardar firma según tipo (multipart o JSON base64 desde app móvil)
        firma = request.FILES.get('firma')
        if not firma:
            b64 = request.data.get('firma_base64')
            if b64:
                raw = b64.split(',')[-1] if isinstance(b64, str) and ',' in b64 else b64
                try:
                    firma = ContentFile(base64.b64decode(raw), name='firma_conductor.png')
                except (TypeError, ValueError, binascii.Error):
                    firma = None
        if firma:
            if tipo_firma == 'conductor':
                conf.firma_conductor = firma
            elif tipo_firma == 'cliente':
                conf.firma_cliente = firma

        conf.save()

        # Agregar fotos si las hay
        for f in request.FILES.getlist('fotos_entrega'):
            FotoEntrega.objects.create(confirmacion=conf, foto=f)

        return Response(ConfirmacionEntregaSerializer(conf).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def calificar(self, request, pk=None):
        """Cliente califica el servicio (Fase 7 del flujo)"""
        from decimal import Decimal
        servicio = self.get_object()
        reserva = servicio.reserva
        cliente = reserva.cliente

        calificacion, created = CalificacionServicio.objects.update_or_create(
            servicio=servicio,
            defaults={
                'cliente': cliente,
                'calificacion': request.data.get('calificacion'),
                'comentario': request.data.get('comentario', ''),
                'calificacion_puntualidad': request.data.get('calificacion_puntualidad'),
                'calificacion_cuidado': request.data.get('calificacion_cuidado'),
                'calificacion_atencion': request.data.get('calificacion_atencion'),
            }
        )

        # Actualizar métricas del personal asignado
        from django.db.models import Avg
        for asignacion in servicio.equipo.all():
            personal = asignacion.personal
            calificaciones = CalificacionServicio.objects.filter(
                servicio__equipo__personal=personal
            )
            promedio = calificaciones.aggregate(Avg('calificacion'))['calificacion__avg'] or 0
            personal.calificacion_promedio = Decimal(str(round(promedio, 2)))
            personal.servicios_completados += 1 if created else 0
            personal.save(update_fields=['calificacion_promedio', 'servicios_completados'])

        # Actualizar métricas del cliente
        cliente.cantidad_mudanzas += 1 if created else 0
        if created:
            cliente.monto_total_gastado += reserva.cotizacion.precio_comercial_cliente
        cliente.save(update_fields=['cantidad_mudanzas', 'monto_total_gastado'])

        return Response(self.get_serializer(servicio).data)


    @action(detail=False, methods=['get'])
    def mis_servicios_cliente(self, request):
        """Obtiene los servicios del cliente logueado (Fase 7)"""
        usuario = request.user
        try:
            from apps.clientes.models import Cliente
            cliente = Cliente.objects.get(usuario=usuario)

            # Obtener servicios del cliente
            servicios = ServicioMudanza.objects.filter(
                reserva__cliente=cliente
            ).select_related(
                'reserva',
                'reserva__cotizacion',
                'reserva__cotizacion__zona_origen',
                'reserva__cotizacion__zona_destino',
                'reserva__cliente__usuario',
                'vehiculo',
                'vehiculo__tipo_contenedor',
            ).prefetch_related(
                'equipo__personal__usuario',
                Prefetch(
                    'historial_estados',
                    queryset=HistorialEstadoServicio.objects.select_related('cambiado_por').order_by(
                        'creado_en'
                    ),
                ),
                Prefetch(
                    'reserva__cotizacion__objetos',
                    queryset=ObjetoMudanza.objects.prefetch_related(
                        Prefetch('fotos', queryset=FotoObjeto.objects.order_by('id'))
                    ),
                ),
            ).order_by('-creado_en')

            serializer = ServicioMudanzaSerializer(servicios, many=True, context={'request': request})
            return Response(serializer.data)

        except Cliente.DoesNotExist:
            return Response({'error': 'Usuario no es cliente'}, status=status.HTTP_403_FORBIDDEN)


class IncidenciaViewSet(viewsets.ModelViewSet):
    queryset = Incidencia.objects.select_related('servicio', 'servicio__reserva__cliente__usuario', 'objeto', 'reportado_por').all().order_by('-creado_en')
    serializer_class = IncidenciaSerializer
    filterset_fields = ('servicio', 'tipo', 'estado')

    @action(detail=True, methods=['post'])
    def resolver(self, request, pk=None):
        """Resuelve una incidencia (Fase 8 del flujo)"""
        incidencia = self.get_object()
        resolucion = request.data.get('resolucion')

        if not resolucion:
            return Response({'error': 'resolucion es requerida'}, status=status.HTTP_400_BAD_REQUEST)

        incidencia.estado = 'resuelta'
        incidencia.resolucion = resolucion
        incidencia.resuelta_en = timezone.now()
        incidencia.save()

        # Notificar al cliente que la incidencia fue resuelta
        if incidencia.servicio.reserva.cliente:
            from apps.notificaciones.services import NotificacionService
            NotificacionService.enviar_notificacion(
                usuario=incidencia.servicio.reserva.cliente.usuario,
                tipo='incidencia_resuelta',
                titulo='Incidencia Resuelta',
                mensaje=f'La incidencia en el servicio {incidencia.servicio.reserva.codigo_confirmacion} ha sido resuelta. Resolución: {resolucion}',
                datos_extra={
                    'incidencia_id': incidencia.id,
                    'reserva_id': incidencia.servicio.reserva_id,
                },
            )

        return Response(IncidenciaSerializer(incidencia).data)

    def get_queryset(self):
        qs = Incidencia.objects.select_related(
            'servicio', 'servicio__reserva__cliente__usuario', 'objeto', 'reportado_por'
        ).order_by('-creado_en')
        u = self.request.user
        if u.is_superuser:
            return qs
        if es_cliente_portal(u):
            return qs.filter(servicio__reserva__cliente__usuario=u)
        return qs

    def get_permissions(self):
        return [
            IsAuthenticated(),
            TieneAlgunoDe('inventario.incidencias_postentrega', 'inventario.editar'),
        ]

    def perform_create(self, serializer):
        serializer.save(reportado_por=self.request.user)
