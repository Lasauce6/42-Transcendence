from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'entity_type', 'entity_id',
            'payload', 'is_read', 'created_at',
        ]
        read_only_fields = [
            'id', 'type', 'entity_type', 'entity_id',
            'payload', 'created_at',
        ]
