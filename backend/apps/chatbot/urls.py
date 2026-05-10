from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FAQViewSet, ConversacionChatbotViewSet, MensajeChatbotViewSet

router = DefaultRouter()
router.register(r'faqs', FAQViewSet, basename='faq')
router.register(r'mensajes', MensajeChatbotViewSet, basename='mensaje-chatbot')
router.register(r'', ConversacionChatbotViewSet, basename='conversacion')

urlpatterns = [
    path('', include(router.urls)),
]
