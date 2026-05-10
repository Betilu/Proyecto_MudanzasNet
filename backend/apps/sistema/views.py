from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import StreamingHttpResponse
from drf_spectacular.utils import extend_schema

from apps.usuarios.audit import registrar_bitacora
from apps.usuarios.permissions import EsAdministrador

from .backup_service import BackupError, create_backup_zip_stream, restore_from_uploaded_file


class BackupDescargarView(APIView):
    """
    Genera y descarga un .zip con volcado SQL (PostgreSQL), media local y modelos ML en disco.
    Solo administración del sistema.
    """
    permission_classes = [IsAuthenticated, EsAdministrador]

    @extend_schema(summary='Descargar respaldo completo (.zip)')
    def get(self, request):
        # La descarga no usa BACKUP_RESTORE_ENABLED: solo administradores autenticados;
        # la restauración vía API sigue pudiendo desactivarse en producción.
        try:
            reader, _meta = create_backup_zip_stream()
        except BackupError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        filename = f'respaldo_crm_{timezone.now().strftime("%Y%m%d_%H%M%S")}.zip'

        registrar_bitacora(
            request.user,
            'backup_descargado',
            request=request,
            entidad_tipo='Sistema',
            detalles={'archivo': filename},
        )

        resp = StreamingHttpResponse(reader(), content_type='application/zip')
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp


class BackupRestaurarView(APIView):
    """
    Sube un .zip generado por este sistema y restaura BD + archivos.
    Operación destructiva: requiere frase de confirmación.
    """
    permission_classes = [IsAuthenticated, EsAdministrador]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(summary='Restaurar sistema desde archivo .zip')
    def post(self, request):
        if not getattr(settings, 'BACKUP_RESTORE_ENABLED', True):
            return Response(
                {'detail': 'Restauración deshabilitada en este entorno.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        confirm = (request.data.get('confirmar') or '').strip()
        if confirm != 'RESTAURAR':
            return Response(
                {
                    'detail': 'Debes enviar confirmar=RESTAURAR para ejecutar la restauración.',
                    'code': 'confirmacion_requerida',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'Falta el archivo .zip'}, status=status.HTTP_400_BAD_REQUEST)

        reemplazar_media = str(request.data.get('reemplazar_media', '')).lower() in ('1', 'true', 'yes', 'on')
        reemplazar_ml = str(request.data.get('reemplazar_ml', 'true')).lower() in ('1', 'true', 'yes', 'on')

        max_bytes = int(getattr(settings, 'BACKUP_MAX_UPLOAD_BYTES', 512 * 1024 * 1024))

        try:
            resumen = restore_from_uploaded_file(
                archivo,
                reemplazar_media=reemplazar_media,
                reemplazar_ml=reemplazar_ml,
                max_bytes=max_bytes,
            )
        except BackupError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        registrar_bitacora(
            request.user,
            'sistema_restaurado',
            request=request,
            entidad_tipo='Sistema',
            detalles={
                'nombre_archivo': getattr(archivo, 'name', ''),
                'reemplazar_media': reemplazar_media,
                'reemplazar_ml': reemplazar_ml,
                'includes': resumen.get('manifest', {}).get('includes'),
            },
        )

        return Response(
            {
                'ok': True,
                'mensaje': 'Restauración completada. Reinicia el servidor de aplicación si hay comportamiento inconsistente.',
                'resumen': resumen,
            },
            status=status.HTTP_200_OK,
        )
