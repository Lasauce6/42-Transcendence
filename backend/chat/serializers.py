from rest_framework import serializers
from .files import attachment_data, make_attachment_url
from .models import Channel, Message

MAX_MESSAGE_LENGTH = 5000
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ['id', 'name', 'type', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def validate_name(self, value):
        if value is None:
            return value
        value = value.strip()
        if value == "":
            return None
        if len(value) < 3:
            raise serializers.ValidationError(
                "Le nom du channel doit contenir au moins 3 caractères."
            )
        if len(value) > 255:
            raise serializers.ValidationError(
                "Le nom du channel ne doit pas dépasser 255 caractères."
            )
        return value

    def validate(self, data):
        channel_type = data.get("type") or (self.instance.type if self.instance else None)
        name = data.get("name", self.instance.name if self.instance else None)

        if channel_type in ("PUBLIC", "GROUP"):
            if not name or not name.strip():
                raise serializers.ValidationError(
                    {"name": "Un channel PUBLIC ou GROUP doit avoir un nom."}
                )

        return data

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'channel', 'sender', 'sender_username',
            'content', 'attachments', 'is_deleted', 'created_at', 'updated_at'
        ]
        read_only_fields = ['sender', 'is_deleted', 'created_at', 'updated_at']

    def get_attachments(self, obj):
        request = self.context.get('request')
        if obj.is_deleted or request is None:
            return []
        return [
            {**attachment_data(a), 'url': make_attachment_url(a.id, request.user.id)}
            for a in obj.attachments.all()
        ]

class AttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    content = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_file(self, value):
        if value.size > MAX_ATTACHMENT_SIZE:
            raise serializers.ValidationError(
                f"Fichier trop volumineux. Maximum : "
                f"{MAX_ATTACHMENT_SIZE // (1024 * 1024)} Mo."
            )
        return value

    def validate_content(self, value):
        if value is None:
            return value
        value = value.strip()
        if len(value) > MAX_MESSAGE_LENGTH:
            raise serializers.ValidationError(
                f"Le contenu ne doit pas dépasser {MAX_MESSAGE_LENGTH} caractères."
            )
        return value
