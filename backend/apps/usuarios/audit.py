"""Registro centralizado en bitácora (W8)."""
from .models import BitacoraAuditoria


def obtener_ip_cliente(request):
    if not request:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def registrar_bitacora(
    usuario,
    accion,
    *,
    request=None,
    entidad_tipo='',
    entidad_id=None,
    detalles=None,
):
    BitacoraAuditoria.objects.create(
        usuario=usuario,
        accion=accion,
        entidad_tipo=entidad_tipo or '',
        entidad_id=entidad_id,
        detalles=detalles if detalles is not None else {},
        direccion_ip=obtener_ip_cliente(request),
        user_agent=(request.META.get('HTTP_USER_AGENT', '')[:2000] if request else '') or '',
    )
