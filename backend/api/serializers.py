from rest_framework import serializers
from .models import Notification, APIKey

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

class APIKeySerializer(serializers.ModelSerializer):
    """Serializer pour lister/consulter une clé (sans la valeur en clair)."""

    class Meta:
        model = APIKey
        fields = [
            "id",
            "name",
            "key_prefix",
            "is_active",
            "expires_at",
            "last_used_at",
            "created_at",
        ]
        read_only_fields = fields  # tout en lecture seule


class APIKeyCreateSerializer(serializers.Serializer):
    """Serializer pour créer une clé. Le nom est le seul champ fourni."""

    name = serializers.CharField(max_length=100, required=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom ne peut pas être vide.")
        if len(value) < 3:
            raise serializers.ValidationError("Le nom doit faire au moins 3 caractères.")
        return value
