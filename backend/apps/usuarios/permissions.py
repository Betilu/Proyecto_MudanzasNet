"""
Sistema de permisos granulares basado en rol_permisos.
"""
from rest_framework.permissions import BasePermission


def _rol_slug(user):
    rol = getattr(user, 'rol', None)
    return (rol.nombre or '').lower() if rol else ''


class EsAdministrador(BasePermission):
    """Rol administrador del sistema (W4, W5, W8): admin, administrador o superuser."""

    def has_permission(self, request, view):
        u = request.user
        if not u.is_authenticated:
            return False
        if u.is_superuser:
            return True
        return _rol_slug(u) in ('admin', 'administrador')


class EsAdminOOperador(BasePermission):
    """Administrador u operativo (p. ej. gestión de usuarios sin tocar roles globales)."""

    def has_permission(self, request, view):
        u = request.user
        if not u.is_authenticated:
            return False
        if u.is_superuser:
            return True
        return _rol_slug(u) in ('admin', 'administrador', 'operador')


class TieneAlgunoDe(BasePermission):
    """True si el rol y/o grupos del usuario incluyen al menos uno de los permisos (superuser siempre)."""

    def __init__(self, *permisos):
        self.permisos = frozenset(permisos)

    def has_permission(self, request, view):
        u = request.user
        if not u.is_authenticated:
            return False
        if u.is_superuser:
            return True
        from .serializers import _permisos_nombres_usuario
        nombres = set(_permisos_nombres_usuario(u))
        return bool(nombres & self.permisos)


class TienePermiso(BasePermission):
    """
    Verifica privilegio efectivo (rol + grupos de usuario).
    """
    def __init__(self, permiso_requerido):
        self.permiso_requerido = permiso_requerido

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        u = request.user
        if u.is_superuser:
            return True
        from .serializers import _permisos_nombres_usuario
        return self.permiso_requerido in _permisos_nombres_usuario(u)


def requiere_permiso(nombre_permiso):
    """Decorator factory para usar en views."""
    class PermisoEspecifico(BasePermission):
        def has_permission(self, request, view):
            u = request.user
            if not u.is_authenticated:
                return False
            if u.is_superuser:
                return True
            from .serializers import _permisos_nombres_usuario
            return nombre_permiso in _permisos_nombres_usuario(u)
    return PermisoEspecifico
