from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from datetime import datetime

from .models import TipoContenedor, Vehiculo, MantenimientoVehiculo
from .serializers import TipoContenedorSerializer, VehiculoSerializer, MantenimientoVehiculoSerializer


class TipoContenedorViewSet(viewsets.ModelViewSet):
    queryset = TipoContenedor.objects.all().order_by('nombre')
    serializer_class = TipoContenedorSerializer


class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.select_related('tipo_contenedor').all().order_by('placa')
    serializer_class = VehiculoSerializer
    search_fields = ('placa', 'marca', 'modelo')
    filterset_fields = ('estado', 'tipo_contenedor')

    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """
        Obtiene vehículos disponibles para una fecha específica (Fase 5 del flujo)
        Query params:
        - fecha_servicio: fecha del servicio (formato YYYY-MM-DD)
        - contenedor_recomendado_id: ID del tipo de contenedor recomendado (opcional)
        - volumen_min: volumen mínimo requerido en m3 (opcional)
        """
        fecha_str = request.query_params.get('fecha_servicio')
        contenedor_id = request.query_params.get('contenedor_recomendado_id')
        volumen_min = request.query_params.get('volumen_min')

        if not fecha_str:
            return Response(
                {'error': 'fecha_servicio es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            fecha_servicio = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener vehículos disponibles
        vehiculos = Vehiculo.objects.select_related('tipo_contenedor').filter(
            estado='disponible'
        )

        # Excluir vehículos que ya tienen servicio para esa fecha
        from apps.mudanzas.models import ServicioMudanza
        servicios_fecha = ServicioMudanza.objects.filter(
            reserva__fecha_servicio=fecha_servicio
        ).exclude(
            estado__in=['cancelado', 'completado']
        ).values_list('vehiculo_id', flat=True)

        vehiculos = vehiculos.exclude(id__in=servicios_fecha)

        # Excluir vehículos en mantenimiento para esa fecha
        mantenimientos = MantenimientoVehiculo.objects.filter(
            fecha_programada=fecha_servicio,
            estado__in=['programado', 'en_proceso']
        ).values_list('vehiculo_id', flat=True)

        vehiculos = vehiculos.exclude(id__in=mantenimientos)

        # Filtrar por contenedor recomendado o mayor
        if contenedor_id:
            try:
                contenedor_rec = TipoContenedor.objects.get(pk=contenedor_id)
                vehiculos = vehiculos.filter(
                    tipo_contenedor__volumen_capacidad_m3__gte=contenedor_rec.volumen_capacidad_m3
                )
            except TipoContenedor.DoesNotExist:
                pass

        # Filtrar por volumen mínimo
        if volumen_min:
            try:
                vehiculos = vehiculos.filter(
                    tipo_contenedor__volumen_capacidad_m3__gte=float(volumen_min)
                )
            except ValueError:
                pass

        serializer = VehiculoSerializer(vehiculos, many=True)
        return Response(serializer.data)


class MantenimientoVehiculoViewSet(viewsets.ModelViewSet):
    queryset = MantenimientoVehiculo.objects.select_related('vehiculo').all().order_by('-fecha_programada')
    serializer_class = MantenimientoVehiculoSerializer
    filterset_fields = ('vehiculo', 'estado')
