import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.
class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        MODERATOR = 'MODERATOR', 'Moderator'
        USER = 'USER', 'User'

    class Language(models.TextChoices):
        FRENCH = 'FR', 'Français'
        ENGLISH = 'EN', 'English'
        SPANISH = 'ES', 'Español'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.TextField(max_length=100, unique=True)
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', default='avatars/default.png')
    bio = models.TextField(max_length=500, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    language = models.CharField(max_length=2, choices=Language.choices, default=Language.ENGLISH)

    # 2FA
    two_fa_enabled = models.BooleanField(default=False)
    otp_secret = models.CharField(max_length=32, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Friendship(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        BLOCKED = 'BLOCKED', 'Blocked'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendship_request_sent')
    addressee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendship_request_received')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

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





