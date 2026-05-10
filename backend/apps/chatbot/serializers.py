from rest_framework import serializers
from .models import FAQ, ConversacionChatbot, MensajeChatbot, EscalacionChatbot


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'


class MensajeChatbotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MensajeChatbot
        fields = '__all__'


class ConversacionChatbotSerializer(serializers.ModelSerializer):
    mensajes = MensajeChatbotSerializer(many=True, read_only=True)

    class Meta:
        model = ConversacionChatbot
        fields = '__all__'


class EscalacionChatbotSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalacionChatbot
        fields = '__all__'
