from rest_framework import viewsets
from .models import PlanCarga, ItemPlanCarga
from .serializers import PlanCargaSerializer, ItemPlanCargaSerializer


class PlanCargaViewSet(viewsets.ModelViewSet):
    queryset = PlanCarga.objects.select_related('servicio', 'tipo_contenedor').prefetch_related('items__objeto').all()
    serializer_class = PlanCargaSerializer
    filterset_fields = ('servicio', 'numero_viaje')


class ItemPlanCargaViewSet(viewsets.ModelViewSet):
    queryset = ItemPlanCarga.objects.select_related('plan_carga', 'objeto').all().order_by('orden_carga')
    serializer_class = ItemPlanCargaSerializer
    filterset_fields = ('plan_carga',)
