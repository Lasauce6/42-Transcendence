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


class InputValidationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_test", email="admin@test.com", password="Password123!"
        )
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="Password123!"
        )
        token = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_username_trop_court(self):
        """Rejette les usernames de moins de 3 caractères."""
        response = self.client.post("/api/auth/register/", {
            "username": "ab",
            "email": "new@test.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_username_trop_long(self):
        """Rejette les usernames de plus de 30 caractères."""
        response = self.client.post("/api/auth/register/", {
            "username": "a" * 31,
            "email": "new@test.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_username_caracteres_speciaux(self):
        """Rejette les usernames avec des caractères spéciaux (XSS attempt)."""
        response = self.client.post("/api/auth/register/", {
            "username": "user<script>alert(1)</script>",
            "email": "new@test.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_username_sql_injection(self):
        """Rejette les usernames contenant des tentatives d'injection SQL."""
        response = self.client.post("/api/auth/register/", {
            "username": "user'; DROP TABLE users; --",
            "email": "new@test.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_username_username_reserve(self):
        """Rejette les usernames réservés."""
        response = self.client.post("/api/auth/register/", {
            "username": "admin",
            "email": "new@test.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_username_caracteres_non_imprimables(self):
        """Rejette les usernames avec des caractères de contrôle."""
        response = self.client.post("/api/auth/register/", {
            "username": "user\x00\x01\x02",
            "email": "new@test.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_username_espaces_uniquement(self):
        """Rejette les usernames composés uniquement d'espaces."""
        response = self.client.post("/api/auth/register/", {
            "username": "   ",
            "email": "new@test.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_email_invalide(self):
        """Rejette les emails malformés."""
        response = self.client.post("/api/auth/register/", {
            "username": "validuser",
            "email": "not-an-email",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_email_xss(self):
        """Rejette les emails contenant du XSS."""
        response = self.client.post("/api/auth/register/", {
            "username": "validuser2",
            "email": "<script>alert(1)</script>@test.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_trop_faible(self):
        """Rejette les mots de passe faibles."""
        response = self.client.post("/api/auth/register/", {
            "username": "validuser3",
            "email": "valid3@test.com",
            "password": "123"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_password_commun(self):
        """Rejette les mots de passe communs."""
        response = self.client.post("/api/auth/register/", {
            "username": "validuser4",
            "email": "valid4@test.com",
            "password": "password"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_bio_trop_longue(self):
        """Rejette les bios de plus de 500 caractères."""
        response = self.client.patch(f"/api/users/{self.user.id}/", {
            "bio": "A" * 501
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bio", response.data)

    def test_bio_null_characters(self):
        """Rejette les bios avec des caractères nuls."""
        response = self.client.patch(f"/api/users/{self.user.id}/", {
            "bio": "Hello\x00World"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bio", response.data)

    def test_first_name_trop_long(self):
        """Rejette les prénoms de plus de 150 caractères."""
        response = self.client.patch(f"/api/users/{self.user.id}/", {
            "first_name": "A" * 151
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", response.data)

    def test_last_name_trop_long(self):
        """Rejette les noms de plus de 150 caractères."""
        response = self.client.patch(f"/api/users/{self.user.id}/", {
            "last_name": "A" * 151
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("last_name", response.data)

    def test_change_password_ancien_incorrect(self):
        """Rejette le changement de password avec ancien mot de passe incorrect."""
        response = self.client.post("/api/auth/change-password/", {
            "old_password": "wrongpassword",
            "new_password": "NewPassword123!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("old_password", response.data)

    def test_change_password_nouveau_faible(self):
        """Rejette le changement vers un mot de passe faible."""
        response = self.client.post("/api/auth/change-password/", {
            "old_password": "Password123!",
            "new_password": "123"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)

    def test_friendship_auto_ajout(self):
        """Rejette l'ajout de soi-même comme ami."""
        response = self.client.post("/api/friendships/", {
            "addressee": str(self.user.id)
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("addressee", str(response.data))

    def test_recherche_sql_injection(self):
        """Teste que la recherche d'utilisateurs résiste à l'injection SQL."""
        response = self.client.get("/api/users/?search='; DROP TABLE users; --")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_rate_limit_login(self):
        """Teste que le rate limiting fonctionne sur les tentatives de login."""
        for i in range(6):
            response = self.client.post("/api/auth/login/", {
                "username": self.user.username,
                "password": "wrongpassword"
            }, format="json")
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
