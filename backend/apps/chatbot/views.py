from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FAQ, ConversacionChatbot, MensajeChatbot, EscalacionChatbot
from .serializers import FAQSerializer, ConversacionChatbotSerializer, MensajeChatbotSerializer, EscalacionChatbotSerializer


class FAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.filter(es_activa=True).order_by('categoria', 'veces_consultada')
    serializer_class = FAQSerializer
    search_fields = ('pregunta', 'respuesta', 'palabras_clave')


class ConversacionChatbotViewSet(viewsets.ModelViewSet):
    queryset = ConversacionChatbot.objects.prefetch_related('mensajes').all().order_by('-creado_en')
    serializer_class = ConversacionChatbotSerializer
    filterset_fields = ('cliente', 'estado', 'canal')

    @action(detail=True, methods=['post'])
    def enviar_mensaje(self, request, pk=None):
        """Envía un mensaje en la conversación. Body: {contenido, tipo_emisor}"""
        conversacion = self.get_object()
        contenido = request.data.get('contenido')
        tipo_emisor = request.data.get('tipo_emisor', 'cliente')
        if not contenido:
            return Response({'error': 'contenido es requerido'}, status=400)
        msg = MensajeChatbot.objects.create(
            conversacion=conversacion,
            tipo_emisor=tipo_emisor,
            contenido=contenido,
            intencion_detectada=request.data.get('intencion_detectada', ''),
        )
        return Response(MensajeChatbotSerializer(msg).data, status=201)

    @action(detail=True, methods=['post'])
    def escalar(self, request, pk=None):
        """Escala la conversación a un operador. Body: {motivo}"""
        conversacion = self.get_object()
        motivo = request.data.get('motivo', 'Cliente solicita atención humana')
        conversacion.estado = 'escalada'
        conversacion.save()
        esc = EscalacionChatbot.objects.create(
            conversacion=conversacion,
            motivo=motivo,
            operador=request.data.get('operador') or None,
        )
        return Response(EscalacionChatbotSerializer(esc).data, status=201)


class MensajeChatbotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MensajeChatbot.objects.select_related('conversacion').all().order_by('creado_en')
    serializer_class = MensajeChatbotSerializer
    filterset_fields = ('conversacion', 'tipo_emisor')
