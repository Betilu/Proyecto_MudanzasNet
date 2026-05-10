"""Acceso a cotización / inventario por rol (cliente vs staff)."""


def es_cliente_portal(user):
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return False
    rol = getattr(user, 'rol', None)
    return bool(rol and rol.nombre.lower() == 'cliente')


def cotizacion_accesible(user, cotizacion):
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if es_cliente_portal(user):
        return cotizacion.cliente.usuario_id == user.id
    return True


def objeto_accesible(user, objeto):
    return cotizacion_accesible(user, objeto.cotizacion)
