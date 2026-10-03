import base64
import hashlib
import uuid

from cryptography.fernet import Fernet
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


# Create your models here.
class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MODERATOR = "MODERATOR", "Moderator"
        USER = "USER", "User"

    class Language(models.TextChoices):
        FRENCH = "FR", "Français"
        ENGLISH = "EN", "English"
        SPANISH = "ES", "Español"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.TextField(max_length=100, unique=True)
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to="avatars/", default="avatars/default.png")
    bio = models.TextField(max_length=500, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    language = models.CharField(
        max_length=2, choices=Language.choices, default=Language.ENGLISH
    )

    # 2FA
    two_fa_enabled = models.BooleanField(default=False)
    two_fa_verified = models.BooleanField(default=False)
    otp_secret = models.CharField(max_length=255, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def _fernet(self):
        key = settings.TOTP_ENCRYPTION_KEY
        if isinstance(key, str):
            key = key.encode()
        return Fernet(base64.urlsafe_b64encode(hashlib.sha256(key).digest()[:32]))

    def set_otp_secret(self, raw_secret: str):
        self.otp_secret_encrypted = self._fernet.encrypt(raw_secret.encode()).decode()

    def get_otp_secret(self) -> str | None:
        if not self.otp_secret_encrypted:
            return None
        return self._fernet.decrypt(self.otp_secret_encrypted.encode()).decode()

    def has_2fa(self) -> bool:
        return self.two_fa_enabled and self.two_fa_verified


class BackupCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="backup_codes")
    digest = models.CharField(max_length=64)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def generate_codes(cls, user, count=10):
        import secrets
        cls.objects.filter(user=user).delete()
        codes = []
        for _ in range(count):
            code = secrets.token_hex(4).upper()
            digest = hashlib.sha256(code.encode()).hexdigest()
            cls.objects.create(user=user, digest=digest)
            codes.append(code)
        return codes

    @classmethod
    def verify(cls, user, code: str) -> bool:
        digest = hashlib.sha256(code.encode()).hexdigest()
        obj = cls.objects.filter(user=user, digest=digest, used=False).first()
        if obj:
            obj.used = True
            obj.save()
            return True
        return False

class Friendship(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        BLOCKED = "BLOCKED", "Blocked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="friendship_request_sent"
    )
    addressee = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="friendship_request_received"
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["requester", "addressee"], name="unique_friendship"
            )
        ]


# mon_user = User.objects.get(username='test')
# demandes_envoyees = mon_user.friendship_requests_sent.all()
# demandes_recues = mon_user.friendship_requests_received.all()
