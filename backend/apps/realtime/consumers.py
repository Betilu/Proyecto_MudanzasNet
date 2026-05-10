import json
from urllib.parse import parse_qs

from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.clientes.models import Cliente
from apps.reservas.models import Reserva

User = get_user_model()


@database_sync_to_async
def _cliente_puede_ver_reserva(user, reserva_id: int) -> bool:
    if not user or not user.is_authenticated:
        return False
    try:
        cliente = Cliente.objects.get(usuario=user)
    except Cliente.DoesNotExist:
        return False
    return Reserva.objects.filter(pk=reserva_id, cliente=cliente).exists()


@database_sync_to_async
def _usuario_desde_token(token: str):
    try:
        validated = AccessToken(token)
        uid = validated.get('user_id')
        if uid is None:
            return None
        return User.objects.get(pk=uid)
    except (InvalidToken, TokenError, User.DoesNotExist, TypeError):
        return None


class SeguimientoReservaConsumer(AsyncWebsocketConsumer):
    """
    WebSocket: ws/seguimiento/<reserva_id>/?token=<JWT>
    Mismo criterio que GET .../seguimiento/ (solo el cliente dueño de la reserva).
    """

    async def connect(self):
        self.reserva_id = int(self.scope['url_route']['kwargs']['reserva_id'])
        query = self.scope.get('query_string', b'').decode()
        params = parse_qs(query)
        token = (params.get('token') or [None])[0]
        if not token:
            await self.close(code=4401)
            return
        user = await _usuario_desde_token(token)
        if not user:
            await self.close(code=4401)
            return
        if not await _cliente_puede_ver_reserva(user, self.reserva_id):
            await self.close(code=4403)
            return
        self.group_name = f'seguimiento_reserva_{self.reserva_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def seguimiento_event(self, event):
        await self.send(text_data=json.dumps(event['payload']))
