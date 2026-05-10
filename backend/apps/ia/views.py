from rest_framework import viewsets
from .models import RFModelo, RFPrediccionDemanda, RFPrediccionDisponibilidad
from .serializers import RFModeloSerializer, RFPrediccionDemandaSerializer, RFPrediccionDisponibilidadSerializer


class RFModeloViewSet(viewsets.ModelViewSet):
    queryset = RFModelo.objects.all().order_by('-entrenado_en')
    serializer_class = RFModeloSerializer
    filterset_fields = ('tipo', 'es_activo')


class RFPrediccionDemandaViewSet(viewsets.ModelViewSet):
    queryset = RFPrediccionDemanda.objects.select_related('modelo', 'zona').all().order_by('-creado_en')
    serializer_class = RFPrediccionDemandaSerializer
    filterset_fields = ('modelo', 'zona')


class RFPrediccionDisponibilidadViewSet(viewsets.ModelViewSet):
    queryset = RFPrediccionDisponibilidad.objects.select_related('modelo', 'zona').all().order_by('-fecha')
    serializer_class = RFPrediccionDisponibilidadSerializer
    filterset_fields = ('modelo', 'zona', 'fecha')
