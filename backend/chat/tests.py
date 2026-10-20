from channels.testing import WebsocketCommunicator
from core.asgi import application
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from django.test import TransactionTestCase
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


class PresenceTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(
            username="alice", email="alice@example.test", password="password123"
        )

    def test_plusieurs_onglets(self):
        from chat import presence

        self.assertTrue(presence.connect(self.alice.id))
        self.assertFalse(presence.connect(self.alice.id))
        self.assertFalse(presence.disconnect(self.alice.id))
        self.assertEqual(presence.connected_ids([self.alice.id]), {self.alice.id})
        self.assertTrue(presence.disconnect(self.alice.id))
        self.assertEqual(presence.connected_ids([self.alice.id]), set())

    def test_nettoyage_garde_les_websockets_ouverts(self):
        from datetime import timedelta

        from chat import presence
        from django.utils import timezone

        bob = User.objects.create_user(
            username="bob", email="bob@example.test", password="password123"
        )
        old = timezone.now() - timedelta(minutes=10)
        User.objects.filter(pk__in=[self.alice.pk, bob.pk]).update(
            is_online=True, last_seen=old
        )
        presence.connect(self.alice.id)

        token = RefreshToken.for_user(bob).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        User.objects.filter(pk=bob.pk).update(last_seen=old)
        carol = User.objects.create_user(
            username="carol", email="carol@example.test", password="password123"
        )
        User.objects.filter(pk=carol.pk).update(is_online=True, last_seen=old)
        self.client.get("/api/friendships/")

        self.alice.refresh_from_db()
        carol.refresh_from_db()
        self.assertTrue(self.alice.is_online)
        self.assertFalse(carol.is_online)
        presence.disconnect(self.alice.id)


class PresenceWebsocketTests(TransactionTestCase):
    def setUp(self):
        from users.models import Friendship

        self.alice = User.objects.create_user(
            username="alice", email="alice@example.test", password="password123"
        )
        self.bob = User.objects.create_user(
            username="bob", email="bob@example.test", password="password123"
        )
        Friendship.objects.create(
            requester=self.alice, addressee=self.bob, status="ACCEPTED"
        )

    def socket(self, user):
        token = RefreshToken.for_user(user).access_token
        return WebsocketCommunicator(application, f"ws/notifications/?token={token}")

    async def test_les_amis_voient_la_connexion_et_la_deconnexion(self):
        bob = self.socket(self.bob)
        self.assertTrue((await bob.connect())[0])
        alice = self.socket(self.alice)
        self.assertTrue((await alice.connect())[0])

        event = await bob.receive_json_from(timeout=3)
        self.assertEqual(event, {"type": "presence", "user_id": str(self.alice.id), "is_online": True})

        await alice.disconnect()
        event = await bob.receive_json_from(timeout=3)
        self.assertEqual(event["is_online"], False)
        await bob.disconnect()

        await self.alice.arefresh_from_db()
        self.assertFalse(self.alice.is_online)
