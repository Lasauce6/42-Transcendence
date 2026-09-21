import uuid

from django.db import models
from django.conf import settings

class Notification(models.Model):
    class Type(models.TextChoices):
        MESSAGE = 'MESSAGE', 'Message'
        FRIEND = 'FRIEND', 'Friend'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )

    type = models.CharField(max_length=10, choices=Type.choices)

    entity_type = models.CharField(max_length=50, blank=True, null=True)
    entity_id = models.UUIDField(blank=True, null=True)

    payload = models.JSONField(default=dict, blank=True)

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', 'created_at']),
        ]

    def __str__(self):
        return f"{self.type} → {self.recipient.username} (read={self.is_read})"
