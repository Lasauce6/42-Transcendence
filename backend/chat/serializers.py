from rest_framework import serializers
from .files import attachment_data, make_attachment_url
from .models import Channel, Message

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ['id', 'name', 'type', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

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
