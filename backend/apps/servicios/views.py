from rest_framework import viewsets
from .models import TipoServicio, ServicioAdicional
from .serializers import TipoServicioSerializer, ServicioAdicionalSerializer


class TipoServicioViewSet(viewsets.ModelViewSet):
    queryset = TipoServicio.objects.filter(es_activo=True).order_by('nombre')
    serializer_class = TipoServicioSerializer
    search_fields = ('nombre',)


class ServicioAdicionalViewSet(viewsets.ModelViewSet):
    queryset = ServicioAdicional.objects.filter(es_activo=True).order_by('nombre')
    serializer_class = ServicioAdicionalSerializer
    search_fields = ('nombre',)
