from rest_framework import serializers
from .models import Channel, Message

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ['id', 'name', 'type']

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'channel', 'sender', 'sender_username', 'content', 'created_at']
        read_only_fields = ['channel', 'sender']
