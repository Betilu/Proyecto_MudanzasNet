from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Rol, Permiso, RolPermiso, Grupo, Usuario, BitacoraAuditoria, ConfiguracionSistema


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'es_activo', 'creado_en')


@admin.register(Permiso)
class PermisoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'modulo', 'creado_en')
    list_filter = ('modulo',)


@admin.register(RolPermiso)
class RolPermisoAdmin(admin.ModelAdmin):
    list_display = ('rol', 'permiso', 'creado_en')


@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'es_activo', 'creado_en')
    list_filter = ('es_activo',)
    filter_horizontal = ('permisos',)
    search_fields = ('nombre',)


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    list_display = ('email', 'nombre', 'apellido', 'rol', 'es_activo', 'is_staff')
    list_filter = ('es_activo', 'is_staff', 'rol')
    search_fields = ('email', 'nombre', 'apellido')
    ordering = ('email',)
    filter_horizontal = ('grupos',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Información personal', {'fields': ('nombre', 'apellido', 'telefono', 'avatar_url')}),
        ('Permisos', {'fields': ('rol', 'grupos', 'es_activo', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'nombre', 'apellido', 'password1', 'password2')}),
    )


@admin.register(BitacoraAuditoria)
class BitacoraAuditoriaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'accion', 'entidad_tipo', 'creado_en')
    list_filter = ('accion',)
    readonly_fields = ('usuario', 'accion', 'entidad_tipo', 'entidad_id', 'detalles', 'creado_en')


@admin.register(ConfiguracionSistema)
class ConfiguracionSistemaAdmin(admin.ModelAdmin):
    list_display = ('clave', 'valor', 'tipo_dato', 'actualizado_en')
