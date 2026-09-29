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
