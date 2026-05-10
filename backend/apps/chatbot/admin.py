from django.contrib import admin
from .models import FAQ, ConversacionChatbot, MensajeChatbot, EscalacionChatbot


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('pregunta', 'categoria', 'veces_consultada', 'es_activa')


@admin.register(ConversacionChatbot)
class ConversacionChatbotAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente', 'canal', 'estado', 'creado_en')


@admin.register(EscalacionChatbot)
class EscalacionChatbotAdmin(admin.ModelAdmin):
    list_display = ('conversacion', 'operador', 'estado', 'motivo')
