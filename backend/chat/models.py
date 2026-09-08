import uuid
from django.db import models
from django.conf import settings

class Channel(models.Model):
    class ChannelType(models.TextChoices):
        PRIVATE = 'PRIVATE', 'Private'
        GROUP = 'GROUP', 'Group'
        PUBLIC = 'PUBLIC', 'Public'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=10, choices=ChannelType.choices, default=ChannelType.PRIVATE)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_channels'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Channel {self.name or self.id} ({self.type})"


class ChannelMember(models.Model):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        MEMBER = 'MEMBER', 'Member'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    channel = models.ForeignKey(
        Channel, 
        on_delete=models.CASCADE, 
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='channels'
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Contrainte unique : un utilisateur ne peut être qu'une fois par channel
        unique_together = ('channel', 'user')
        indexes = [
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"{self.user.username} in {self.channel.id}"


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    channel = models.ForeignKey(
        Channel, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    
    content = models.TextField()
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['channel', 'created_at']),
            models.Index(fields=['sender']),
        ]
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.username} at {self.created_at}"
