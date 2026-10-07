from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import Friendship

User = get_user_model()


class FriendshipListTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", email="alice@example.test", password="password123")
        self.bob = User.objects.create_user(username="bob", email="bob@example.test", password="password123")
        Friendship.objects.create(
            requester=self.alice, addressee=self.bob, status=Friendship.Status.ACCEPTED
        )
        token = RefreshToken.for_user(self.alice).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_list_contient_les_infos_des_deux_utilisateurs(self):
        response = self.client.get("/api/friendships/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        friendship = response.data[0]
        self.assertEqual(friendship["requester"], self.alice.id)
        self.assertEqual(friendship["addressee"], self.bob.id)
        self.assertEqual(friendship["requester_user"]["username"], "alice")
        self.assertEqual(friendship["addressee_user"]["username"], "bob")
        for key in ("id", "username", "avatar", "is_online", "last_seen"):
            self.assertIn(key, friendship["addressee_user"])
