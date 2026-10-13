from channels.testing import WebsocketCommunicator
from core.asgi import application
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class ChatTests(APITestCase):
    def setUp(self):
        self.username = "testuser"
        self.password = "password123"
        self.user = User.objects.create_user(
            username=self.username, password=self.password
        )

    def test_obtain_jwt_token(self):
        """Teste l'obtention du token JWT."""
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url, {"username": self.username, "password": self.password}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    async def test_websocket_connect_success(self):
        """Teste la connexion WebSocket avec un token JWT valide."""
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)

        communicator = WebsocketCommunicator(
            application, f"ws/notifications/?token={access_token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_websocket_connect_rejects_invalid_token(self):
        """Teste le refus de connexion avec un mauvais token."""
        communicator = WebsocketCommunicator(
            application, "ws/notifications/?token=token_invalide"
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()


class ChannelAvatarTests(APITestCase):
    def setUp(self):
        from chat.models import Channel, ChannelMember, Message

        self.alice = User.objects.create_user(
            username="alice", email="alice@example.test", password="password123"
        )
        self.bob = User.objects.create_user(
            username="bob", email="bob@example.test", password="password123"
        )
        self.channel = Channel.objects.create(type="PRIVATE", created_by=self.alice)
        ChannelMember.objects.create(channel=self.channel, user=self.alice)
        ChannelMember.objects.create(channel=self.channel, user=self.bob)
        Message.objects.create(channel=self.channel, sender=self.bob, content="salut")
        token = RefreshToken.for_user(self.alice).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_channels_contiennent_les_membres_avec_avatar(self):
        response = self.client.get("/api/channels/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        members = response.data[0]["members"]
        self.assertEqual({m["username"] for m in members}, {"alice", "bob"})
        self.assertIn("avatar", members[0])

    def test_messages_contiennent_l_avatar_de_l_auteur(self):
        response = self.client.get(f"/api/channels/{self.channel.id}/messages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["sender_username"], "bob")
        self.assertIn("sender_avatar", response.data[0])
