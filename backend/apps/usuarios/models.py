from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Rol(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    es_activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.nombre


class Permiso(models.Model):
    MODULOS = [
        ('usuarios', 'Usuarios'),
        ('crm', 'CRM'),
        ('inventario', 'Inventario'),
        ('reservas', 'Reservas'),
        ('reportes', 'Reportes'),
        ('vehiculos', 'Vehículos'),
        ('pagos', 'Pagos'),
        ('chatbot', 'Chatbot'),
        ('servicios', 'Servicios'),
        ('ui', 'Interfaz (menú / componentes)'),
        ('sistema', 'Sistema / mantenimiento'),
    ]

    TIPO_COMPONENTE = [
        ('menu', 'Menú / navegación'),
        ('formulario', 'Formulario / pantalla'),
        ('boton', 'Botón / acción'),
        ('campo', 'Campo de formulario'),
        ('etiqueta', 'Texto / etiqueta'),
        ('otro', 'Otro'),
    ]

    nombre = models.CharField(max_length=100, unique=True)
    modulo = models.CharField(max_length=50, choices=MODULOS)
    descripcion = models.TextField(blank=True)
    tipo_componente = models.CharField(
        max_length=20,
        choices=TIPO_COMPONENTE,
        default='otro',
        help_text='Clasificación para el catálogo de privilegios de UI.',
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'permisos'
        verbose_name = 'Permiso'
        verbose_name_plural = 'Permisos'

    def __str__(self):
        return f"{self.modulo}:{self.nombre}"


class RolPermiso(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name='permisos_asignados')
    permiso = models.ForeignKey(Permiso, on_delete=models.CASCADE, related_name='roles_asignados')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rol_permisos'
        unique_together = ('rol', 'permiso')

    def __str__(self):
        return f"{self.rol.nombre} -> {self.permiso.nombre}"


class Grupo(models.Model):
    """
    Grupo de usuarios: conjunto flexible de privilegios que se suman a los del rol.
    El administrador puede crear tantos grupos como necesite y asignar usuarios a varios.
    """
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    es_activo = models.BooleanField(default=True)
    permisos = models.ManyToManyField(Permiso, blank=True, related_name='grupos')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'grupos_usuario'
        verbose_name = 'Grupo de usuarios'
        verbose_name_plural = 'Grupos de usuarios'

    def __str__(self):
        return self.nombre


class UsuarioManager(BaseUserManager):
    def create_user(self, email, nombre, apellido, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, nombre=nombre, apellido=apellido, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nombre, apellido, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, nombre, apellido, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, null=True, blank=True, related_name='usuarios')
    grupos = models.ManyToManyField(Grupo, blank=True, related_name='usuarios')
    email = models.EmailField(unique=True)
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    facebook_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True)
    avatar_url = models.URLField(blank=True)
    preferencias_comunicacion = models.JSONField(
        default=dict,
        blank=True,
        help_text='Preferencias: notificar_email, notificar_sms, notificar_whatsapp, idioma, etc.',
    )
    es_activo = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    ultimo_login = models.DateTimeField(null=True, blank=True)
    token_recuperacion = models.CharField(max_length=255, blank=True, null=True)
    token_expiracion = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre', 'apellido']

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.email})"

    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido}"


class BitacoraAuditoria(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='auditoria')
    accion = models.CharField(max_length=50)
    entidad_tipo = models.CharField(max_length=50, blank=True)
    entidad_id = models.IntegerField(null=True, blank=True)
    detalles = models.JSONField(default=dict, blank=True)
    direccion_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bitacora_auditoria'
        ordering = ['-creado_en']
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Bitácora de Auditoría'


class ConfiguracionSistema(models.Model):
    clave = models.CharField(max_length=100, unique=True)
    valor = models.TextField()
    tipo_dato = models.CharField(max_length=20, default='string')
    descripcion = models.TextField(blank=True)
    actualizado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='configuraciones_modificadas'
    )
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'configuracion_sistema'

    def __str__(self):
        return f"{self.clave} = {self.valor}"
