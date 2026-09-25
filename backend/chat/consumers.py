import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return

        self.room_name = self.scope['url_route']['kwargs']['room_name']

        self.room_group_name = f'chat_{self.room_name}'
        self.user_group_name = f'user_{self.user.username}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': self.user.username
            }
        )

        try:
            channel = await self._get_channel()
            if channel:
                notifications = await self._create_notifications(channel, message)
                for notification in notifications:
                    await self._push_notification(notification)
        except Exception as e:
            print(f"Notification error: {e}", flush=True)

    async def chat_message(self, event):
        message = event['message']
        sender = event['sender']

        await self.send(text_data=json.dumps({
            'message': message,
            'sender': sender
        }))

    async def notification_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification'],
        }))

    @database_sync_to_async
    def _get_channel(self):
        from chat.models import Channel
        try:
            return Channel.objects.get(name=self.room_name)
        except Channel.DoesNotExist:
            return None

    @database_sync_to_async
    def _create_notifications(self, channel, message_preview):
        from chat.models import ChannelMember
        from api.models import Notification

        members = ChannelMember.objects.filter(channel=channel).exclude(user=self.user)

        notifications = []
        for member in members:
            notification = Notification.objects.create(
                recipient=member.user,
                type=Notification.Type.MESSAGE,
                entity_type='Channel',
                entity_id=channel.id,
                payload={
                    'from_id': str(self.user.id),
                    'from_username': self.user.username,
                    'channel_id': str(channel.id),
                    'channel_name': channel.name or str(channel.id),
                    'preview': message_preview[:80],
                },
            )
            notifications.append(notification)
        return notifications

    async def _push_notification(self, notification):
        await self.channel_layer.group_send(
            f'user_{notification.recipient.username}',
            {
                'type': 'notification_message',
                'notification': {
                    'id': str(notification.id),
                    'type': notification.type,
                    'entity_type': notification.entity_type,
                    'entity_id': str(notification.entity_id) if notification.entity_id else None,
                    'payload': notification.payload,
                    'is_read': notification.is_read,
                    'created_at': notification.created_at.isoformat(),
                },
            }
        )