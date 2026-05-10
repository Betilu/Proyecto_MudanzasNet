from django.db import models
from apps.clientes.models import Cliente
from apps.usuarios.models import Usuario


class FAQ(models.Model):
    pregunta = models.TextField()
    respuesta = models.TextField()
    categoria = models.CharField(max_length=50, blank=True)
    palabras_clave = models.JSONField(default=list, blank=True)
    veces_consultada = models.IntegerField(default=0)
    es_activa = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'faqs'
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'


class ConversacionChatbot(models.Model):
    CANALES = [('web', 'Web'), ('app', 'App Móvil')]
    ESTADOS = [('activa', 'Activa'), ('cerrada', 'Cerrada'), ('escalada', 'Escalada')]

    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True, related_name='conversaciones')
    canal = models.CharField(max_length=20, choices=CANALES)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='activa')
    contexto = models.JSONField(default=dict, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    cerrada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'conversaciones_chatbot'
        ordering = ['-creado_en']


class MensajeChatbot(models.Model):
    EMISORES = [('cliente', 'Cliente'), ('bot', 'Bot'), ('operador', 'Operador')]

    conversacion = models.ForeignKey(ConversacionChatbot, on_delete=models.CASCADE, related_name='mensajes')
    tipo_emisor = models.CharField(max_length=20, choices=EMISORES)
    contenido = models.TextField()
    intencion_detectada = models.CharField(max_length=50, blank=True)
    confianza_intencion = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    datos_extraidos = models.JSONField(default=dict, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mensajes_chatbot'
        ordering = ['creado_en']


class EscalacionChatbot(models.Model):
    ESTADOS = [('pendiente', 'Pendiente'), ('atendida', 'Atendida'), ('resuelta', 'Resuelta')]

    conversacion = models.ForeignKey(ConversacionChatbot, on_delete=models.CASCADE, related_name='escalaciones')
    operador = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    motivo = models.CharField(max_length=100)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    creado_en = models.DateTimeField(auto_now_add=True)
    atendida_en = models.DateTimeField(null=True, blank=True)
    resuelta_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'escalaciones_chatbot'
