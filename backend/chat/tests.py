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
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url, {"username": self.username, "password": self.password}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    async def test_websocket_connect_success(self):
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)

        communicator = WebsocketCommunicator(
            application, f"ws/notifications/?token={access_token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_websocket_connect_rejects_invalid_token(self):
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


class PrivateChannelTests(APITestCase):
    def setUp(self):
        from users.models import Friendship

        self.alice = User.objects.create_user(
            username="alice", email="alice@example.test", password="password123"
        )
        self.bob = User.objects.create_user(
            username="bob", email="bob@example.test", password="password123"
        )
        self.carol = User.objects.create_user(
            username="carol", email="carol@example.test", password="password123"
        )
        self.friendship = Friendship.objects.create(
            requester=self.bob, addressee=self.alice
        )
        self.login(self.alice)

    def login(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def private_channels(self):
        from chat.models import Channel

        return Channel.objects.filter(type="PRIVATE")

    def test_accepter_un_ami_cree_une_conversation_privee(self):
        response = self.client.post(f"/api/friendships/{self.friendship.id}/accept/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        channel = self.private_channels().get()
        self.assertEqual(
            set(channel.members.values_list("user__username", flat=True)),
            {"alice", "bob"},
        )

    def test_conversation_privee_reutilisee(self):
        self.client.post(f"/api/friendships/{self.friendship.id}/accept/")
        first = self.private_channels().get()

        response = self.client.post(
            "/api/channels/private/", {"user_id": str(self.bob.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(first.id))
        self.assertEqual(self.private_channels().count(), 1)

    def test_conversation_privee_creee_si_absente(self):
        self.friendship.status = "ACCEPTED"
        self.friendship.save()

        response = self.client.post(
            "/api/channels/private/", {"user_id": str(self.bob.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["members"]), 2)

    def test_conversation_privee_refusee_sans_amitie(self):
        response = self.client.post(
            "/api/channels/private/", {"user_id": str(self.carol.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(self.private_channels().exists())

    def test_pas_d_ajout_de_membre_en_prive(self):
        self.client.post(f"/api/friendships/{self.friendship.id}/accept/")
        channel = self.private_channels().get()

        response = self.client.post(
            f"/api/channels/{channel.id}/add-member/",
            {"user_id": str(self.carol.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(channel.members.count(), 2)

    def test_channel_de_groupe_avec_nom_libre(self):
        response = self.client.post(
            "/api/channels/", {"name": "projet 42", "type": "GROUP"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "projet 42")

        response = self.client.post(
            f"/api/channels/{response.data['id']}/add-member/",
            {"user_id": str(self.carol.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ChatInputValidationTests(APITestCase):
    def setUp(self):
        from chat.models import Channel, ChannelMember

        self.alice = User.objects.create_user(
            username="alice", email="alice@example.test", password="password123"
        )
        self.bob = User.objects.create_user(
            username="bob", email="bob@example.test", password="password123"
        )
        self.channel = Channel.objects.create(
            name="test-channel", type="GROUP", created_by=self.alice
        )
        ChannelMember.objects.create(
            channel=self.channel, user=self.alice, role="ADMIN"
        )
        ChannelMember.objects.create(channel=self.channel, user=self.bob)
        token = RefreshToken.for_user(self.alice).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_message_trop_long(self):
        """Rejette les messages de plus de 5000 caractères."""
        response = self.client.post(
            f"/api/channels/{self.channel.id}/attachments/",
            {"content": "A" * 5001},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_message_avec_caracteres_nuls(self):
        """Rejette les messages contenant des caractères nuls."""
        response = self.client.post(
            f"/api/channels/{self.channel.id}/attachments/",
            {"content": "Hello\x00World"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_channel_name_trop_court(self):
        """Rejette les noms de channel de moins de 3 caractères."""
        response = self.client.post(
            "/api/channels/",
            {"name": "ab", "type": "GROUP"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_channel_name_trop_long(self):
        """Rejette les noms de channel de plus de 255 caractères."""
        response = self.client.post(
            "/api/channels/",
            {"name": "A" * 256, "type": "GROUP"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_channel_public_sans_nom(self):
        """Rejette la création d'un channel public sans nom."""
        response = self.client.post(
            "/api/channels/",
            {"name": "", "type": "PUBLIC"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_channel_xss_dans_nom(self):
        """Rejette les noms de channel contenant du XSS."""
        response = self.client.post(
            "/api/channels/",
            {"name": "<script>alert(1)</script>", "type": "GROUP"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_bannissement_auto_interdit(self):
        """Rejette le bannissement de soi-même."""
        response = self.client.post(
            f"/api/channels/{self.channel.id}/ban-member/",
            {"user_id": str(self.alice.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrait_auto_interdit(self):
        """Rejette le retrait de soi-même."""
        response = self.client.post(
            f"/api/channels/{self.channel.id}/remove-member/",
            {"user_id": str(self.alice.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fichier_trop_volumineux(self):
        """Rejette les fichiers de plus de 10 Mo."""
        from io import BytesIO
        gros_fichier = BytesIO(b"A" * (10 * 1024 * 1024 + 1))
        response = self.client.post(
            f"/api/channels/{self.channel.id}/attachments/",
            {"file": gros_fichier, "content": "test"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
