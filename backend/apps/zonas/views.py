from rest_framework import viewsets
from .models import Zona, TarifaDistancia
from .serializers import ZonaSerializer, TarifaDistanciaSerializer


class ZonaViewSet(viewsets.ModelViewSet):
    queryset = Zona.objects.all().order_by('nombre')
    serializer_class = ZonaSerializer
    search_fields = ('nombre', 'distrito')


class TarifaDistanciaViewSet(viewsets.ModelViewSet):
    queryset = TarifaDistancia.objects.select_related('zona_origen', 'zona_destino').all()
    serializer_class = TarifaDistanciaSerializer
    filterset_fields = ('zona_origen', 'zona_destino')
