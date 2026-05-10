from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.cotizaciones.models import Cotizacion
from apps.usuarios.permissions import TieneAlgunoDe, TienePermiso

from .access import cotizacion_accesible, es_cliente_portal, objeto_accesible
from .models import CategoriaObjeto, ObjetoMudanza, FotoObjeto
from .pdf_acta import generar_acta_pretraslado_pdf
from .serializers import CategoriaObjetoSerializer, ObjetoMudanzaSerializer, FotoObjetoSerializer
from .services_inventario import aplicar_clasificacion_y_riesgo


class CategoriaObjetoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaObjeto.objects.all().order_by('nombre')
    serializer_class = CategoriaObjetoSerializer
    search_fields = ('nombre',)

    def get_permissions(self):
        u = self.request.user
        # Cliente portal (app / web): catálogo de lectura sin permiso inventario.* asignado en rol
        if es_cliente_portal(u) and self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action in ('list', 'retrieve'):
            return [
                IsAuthenticated(),
                TieneAlgunoDe('inventario.ver', 'inventario.registrar_objetos', 'inventario.editar'),
            ]
        return [IsAuthenticated(), TienePermiso('inventario.admin_categorias')]


class ObjetoMudanzaViewSet(viewsets.ModelViewSet):
    queryset = ObjetoMudanza.objects.select_related('cotizacion', 'categoria').all()
    serializer_class = ObjetoMudanzaSerializer
    filterset_fields = ('cotizacion', 'categoria', 'fragilidad')

    def get_queryset(self):
        qs = ObjetoMudanza.objects.select_related('cotizacion__cliente__usuario', 'categoria').all()
        u = self.request.user
        if u.is_superuser:
            return qs
        if es_cliente_portal(u):
            return qs.filter(cotizacion__cliente__usuario=u)
        return qs

    def get_permissions(self):
        u = self.request.user
        if es_cliente_portal(u):
            # Solo ve/edita objetos de sus cotizaciones (get_queryset); mismo criterio que CotizacionViewSet.objetos
            return [IsAuthenticated()]
        if self.action in ('list', 'retrieve'):
            return [
                IsAuthenticated(),
                TieneAlgunoDe('inventario.ver', 'inventario.registrar_objetos', 'inventario.editar'),
            ]
        return [
            IsAuthenticated(),
            TieneAlgunoDe('inventario.registrar_objetos', 'inventario.editar'),
        ]

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def foto(self, request, pk=None):
        """Sube una foto asociada al objeto (alias esperado por la app móvil)."""
        obj = self.get_object()
        archivo = request.FILES.get('foto')
        if not archivo:
            return Response({'foto': ['Archivo requerido']}, status=status.HTTP_400_BAD_REQUEST)
        tipo = request.data.get('tipo_foto') or 'antes_traslado'
        FotoObjeto.objects.create(objeto=obj, foto=archivo, tipo_foto=tipo)
        return Response(ObjetoMudanzaSerializer(obj).data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        obj = serializer.save()
        aplicar_clasificacion_y_riesgo(obj)

    def perform_update(self, serializer):
        obj = serializer.save()
        aplicar_clasificacion_y_riesgo(obj)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if not objeto_accesible(request.user, obj) and not request.user.is_superuser:
            return Response(status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class FotoObjetoViewSet(viewsets.ModelViewSet):
    queryset = FotoObjeto.objects.select_related('objeto', 'objeto__cotizacion').all().order_by('-creado_en')
    serializer_class = FotoObjetoSerializer
    filterset_fields = ('objeto', 'tipo_foto')

    def get_queryset(self):
        qs = FotoObjeto.objects.select_related('objeto__cotizacion__cliente__usuario').order_by('-creado_en')
        u = self.request.user
        if u.is_superuser:
            return qs
        if es_cliente_portal(u):
            return qs.filter(objeto__cotizacion__cliente__usuario=u)
        return qs

    def get_permissions(self):
        return [IsAuthenticated(), TieneAlgunoDe('inventario.fotos_objeto', 'inventario.editar')]

    def perform_create(self, serializer):
        serializer.save()


class ActaPretrasladoPdfView(APIView):
    """W20 — Descarga PDF del acta pre-traslado por cotización."""

    def get_permissions(self):
        return [IsAuthenticated(), TieneAlgunoDe('inventario.acta_pretraslado', 'inventario.ver')]

    @extend_schema(summary='Acta digital pre-traslado (PDF)')
    def get(self, request, cotizacion_id):
        cot = get_object_or_404(
            Cotizacion.objects.select_related('cliente__usuario').prefetch_related(
                'objetos__categoria', 'objetos__fotos'
            ),
            pk=cotizacion_id,
        )
        if not cotizacion_accesible(request.user, cot):
            return Response(status=status.HTTP_403_FORBIDDEN)
        pdf_buf = generar_acta_pretraslado_pdf(cot)
        filename = f'acta_pretraslado_cot_{cot.pk}.pdf'
        return FileResponse(
            pdf_buf,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf',
        )
