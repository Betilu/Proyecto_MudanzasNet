from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime

from .models import Personal
from .serializers import PersonalSerializer


class PersonalViewSet(viewsets.ModelViewSet):
    queryset = Personal.objects.select_related('usuario').all().order_by('-creado_en')
    serializer_class = PersonalSerializer
    search_fields = ('usuario__nombre', 'usuario__apellido', 'numero_licencia')
    filterset_fields = ('tipo_personal', 'esta_disponible')

    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """
        Obtiene personal disponible para una fecha específica (Fase 5 del flujo)
        Query params:
        - fecha_servicio: fecha del servicio (formato YYYY-MM-DD)
        - tipo_personal: conductor o cargador (opcional)
        """
        fecha_str = request.query_params.get('fecha_servicio')
        tipo_personal = request.query_params.get('tipo_personal')

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

        # Obtener personal que está disponible
        personal = Personal.objects.select_related('usuario').filter(
            esta_disponible=True
        )

        # Filtrar por tipo si se especifica
        if tipo_personal:
            personal = personal.filter(tipo_personal=tipo_personal)

        # Excluir personal que ya tiene servicio asignado para esa fecha
        from apps.mudanzas.models import AsignacionPersonal, ServicioMudanza
        asignaciones_fecha = AsignacionPersonal.objects.filter(
            servicio__reserva__fecha_servicio=fecha_servicio
        ).exclude(
            servicio__estado__in=['cancelado', 'completado']
        ).values_list('personal_id', flat=True)

        personal = personal.exclude(id__in=asignaciones_fecha)

        # Ordenar por calificación descendente
        personal = personal.order_by('-calificacion_promedio', '-servicios_completados')

        # Separar por tipo
        conductores = personal.filter(tipo_personal='conductor')
        cargadores = personal.filter(tipo_personal='cargador')

        data = {
            'conductores': PersonalSerializer(conductores, many=True).data,
            'cargadores': PersonalSerializer(cargadores, many=True).data,
        }

        return Response(data)
