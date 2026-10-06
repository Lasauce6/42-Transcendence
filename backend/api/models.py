import uuid
import hashlib
import secrets

from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        MESSAGE = "MESSAGE", "Message"
        FRIEND = "FRIEND", "Friend"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    type = models.CharField(max_length=10, choices=Type.choices)

    entity_type = models.CharField(max_length=50, blank=True, null=True)
    entity_id = models.UUIDField(blank=True, null=True)

    payload = models.JSONField(default=dict, blank=True)

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "created_at"]),
        ]

    def __str__(self):
        return f"{self.type} → {self.recipient.username} (read={self.is_read})"

class APIKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    name = models.CharField(max_length=100)

    # On stocke UNIQUEMENT le hash. La clé en clair n'est jamais persistée.
    key_hash = models.CharField(max_length=64, unique=True)

    # Les 8 premiers caractères de la clé (ex: "sk_a1b2c3d4") pour l'affichage.
    key_prefix = models.CharField(max_length=12, blank=True)

    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["key_hash"]),
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.user.username})"

    # --- Helpers statiques ---

    @staticmethod
    def generate_key():
        """Génère une clé API brute (ex: sk_<43 caractères>)."""
        return f"sk_{secrets.token_urlsafe(32)}"

    @staticmethod
    def hash_key(raw_key):
        """Hash SHA-256 d'une clé brute. Retourne une string hex de 64 caractères."""
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    @classmethod
    def create_for_user(cls, user, name):
        """
        Crée une nouvelle clé API.
        Retourne (instance, raw_key). raw_key n'est visible qu'UNE fois.
        """
        raw_key = cls.generate_key()
        instance = cls.objects.create(
            user=user,
            name=name,
            key_hash=cls.hash_key(raw_key),
            key_prefix=raw_key[:12],
        )
        return instance, raw_key

    @property
    def is_valid(self):
        """Vérifie si la clé est active et non expirée."""
        from django.utils import timezone
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True
