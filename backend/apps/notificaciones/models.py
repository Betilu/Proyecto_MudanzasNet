from django.db import models
from apps.usuarios.models import Usuario


class DispositivoPush(models.Model):
    """Token Expo / FCM por usuario y aplicación móvil (cliente vs conductor)."""

    APP_CLIENTE = 'cliente'
    APP_CONDUCTOR = 'conductor'
    APP_CHOICES = [
        (APP_CLIENTE, 'App cliente'),
        (APP_CONDUCTOR, 'App conductor / cargador'),
    ]

    PLATAFORMA_ANDROID = 'android'
    PLATAFORMA_IOS = 'ios'
    PLATAFORMA_WEB = 'web'
    PLATAFORMA_CHOICES = [
        (PLATAFORMA_ANDROID, 'Android'),
        (PLATAFORMA_IOS, 'iOS'),
        (PLATAFORMA_WEB, 'Web'),
    ]

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='dispositivos_push')
    token = models.CharField(max_length=512, unique=True, db_index=True)
    aplicacion = models.CharField(max_length=20, choices=APP_CHOICES, db_index=True)
    plataforma = models.CharField(
        max_length=20, choices=PLATAFORMA_CHOICES, default=PLATAFORMA_ANDROID
    )
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notificaciones_dispositivos_push'
        indexes = [
            models.Index(fields=['usuario', 'aplicacion', 'activo']),
        ]

    def __str__(self):
        return f'{self.usuario.email} [{self.aplicacion}]'


class Notificacion(models.Model):
    CANALES = [('push', 'Push'), ('email', 'Email'), ('sms', 'SMS'), ('sistema', 'Sistema')]

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=30)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    canal = models.CharField(max_length=20, choices=CANALES)
    datos_extra = models.JSONField(default=dict, blank=True)
    es_leida = models.BooleanField(default=False)
    enviada_en = models.DateTimeField(null=True, blank=True)
    leida_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificaciones'
        ordering = ['-creado_en']
