import json

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from chat.models import Channel, ChannelMember
from core.asgi import application
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class ChatTests(TransactionTestCase):
    def setUp(self):
        self.username = "testuser"
        self.password = "password123"
        self.client = APIClient()

    def test_obtain_jwt_token(self):
        """Teste l'obtention du token JWT."""
        User.objects.create_user(
            username=self.username,
            password=self.password,
            email="testuser@example.com",
        )
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url, {"username": self.username, "password": self.password}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    async def test_websocket_connect_success(self):
        """Teste la connexion WebSocket avec un token JWT valide."""
        user = await database_sync_to_async(User.objects.create_user)(
            username=self.username,
            password=self.password,
            email="testuser@example.com",
        )
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        communicator = WebsocketCommunicator(
            application,
            f"ws/notifications/?token={access_token}",
            headers=[(b"origin", b"http://localhost")],
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_websocket_connect_rejects_invalid_token(self):
        """Teste le refus de connexion avec un mauvais token."""
        communicator = WebsocketCommunicator(
            application,
            "ws/notifications/?token=token_invalide",
            headers=[(b"origin", b"http://localhost")],
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def _create_member_and_channel(self):
        user = await database_sync_to_async(User.objects.create_user)(
            username=self.username,
            password=self.password,
            email="testuser@example.com",
        )
        channel = await database_sync_to_async(Channel.objects.create)(
            name="Test Channel", type=Channel.ChannelType.PUBLIC, created_by=user
        )
        await database_sync_to_async(ChannelMember.objects.create)(
            channel=channel, user=user
        )
        return user, channel

    async def _chat_communicator(self, user, channel_id):
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        return WebsocketCommunicator(
            application,
            f"ws/chat/{channel_id}/?token={access_token}",
            headers=[(b"origin", b"http://localhost")],
        )

    async def test_chat_rejects_non_member(self):
        """Un utilisateur non membre du canal est refusé avec le code 4003."""
        member, channel = await self._create_member_and_channel()
        other = await database_sync_to_async(User.objects.create_user)(
            username="other",
            password=self.password,
            email="other@example.com",
        )

        communicator = await self._chat_communicator(other, channel.id)
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4003)

    async def test_chat_rejects_invalid_json(self):
        """Un message mal formé renvoie une enveloppe d'erreur invalid_json."""
        user, channel = await self._create_member_and_channel()
        communicator = await self._chat_communicator(user, channel.id)
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.send_to(text_data="not json")
        response = await communicator.receive_from()
        payload = json.loads(response)
        self.assertEqual(payload["type"], "error")
        self.assertEqual(payload["code"], "invalid_json")
        await communicator.disconnect()

    async def test_chat_rejects_message_too_long(self):
        """Un message dépassant la limite renvoie une enveloppe d'erreur message_too_long."""
        user, channel = await self._create_member_and_channel()
        communicator = await self._chat_communicator(user, channel.id)
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        long_message = json.dumps({"message": "x" * 3000})
        await communicator.send_to(text_data=long_message)
        response = await communicator.receive_from()
        payload = json.loads(response)
        self.assertEqual(payload["type"], "error")
        self.assertEqual(payload["code"], "message_too_long")
        await communicator.disconnect()
