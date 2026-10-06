import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from .files import make_attachment_url


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = AnonymousUser()
        self.is_authenticated = False
        self.auth_timeout_task = None
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.channel_id = self.scope["url_route"]["kwargs"].get(
            "channel_id"
        ) or self.scope["url_route"]["kwargs"].get("room_name")

        self.channel_obj = await self._get_channel_and_verify_member()
        if not self.channel_obj:
            await self.close(code=4003)
            return

        if await self._is_banned():
            await self.close(code=4004)
            return

        self.room_group_name = f"chat_{self.channel_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def receive(self, text_data):
        if text_data is None:
            return

        max_length = getattr(settings, "CHAT_MAX_MESSAGE_LENGTH", 2000)
        if len(text_data) > max_length:
            await self.send(
                json.dumps({"type": "error", "code": "message_too_long"})
            )
            return

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({"type": "error", "code": "invalid_json"}))
            return

        if not isinstance(payload, dict):
            await self.send(json.dumps({"type": "error", "code": "invalid_json"}))
            return

        content = str(payload.get("message") or payload.get("content", "")).strip()

        if not content:
            return

        saved_message = await self._save_message(content)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": str(saved_message.id),
                "message": saved_message.content,
                "sender": self.user.username,
                "sender_id": str(self.user.id),
                "created_at": saved_message.created_at.isoformat(),
            },
        )

        try:
            notifications = await self._create_notifications(saved_message.content)
            for notification in notifications:
                await self._push_notification(notification)
        except Exception as e:
            print(f"Notification error: {e}", flush=True)

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_message",
                    "payload": {
                        "id": event["id"],
                        "message": event["message"],
                        "sender": event["sender"],
                        "sender_id": event["sender_id"],
                        "created_at": event["created_at"],
                        "attachments": [
                            {**a, "url": make_attachment_url(a["id"], self.user.id)}
                            for a in event.get("attachments", [])
                        ],
                    },
                }
            )
        )

    @database_sync_to_async
    def _get_channel_and_verify_member(self):
        from chat.models import Channel, ChannelMember

        try:
            channel = Channel.objects.get(id=self.channel_id)
        except (Channel.DoesNotExist, ValueError):
            return None

        is_member = ChannelMember.objects.filter(
            channel=channel, user=self.user
        ).exists()
        return channel if is_member else None

    @database_sync_to_async
    def _is_banned(self):
        from chat.models import ChannelBan

        return ChannelBan.objects.filter(
            channel=self.channel_obj, user=self.user
        ).exists()

    @database_sync_to_async
    def _save_message(self, content):
        from chat.models import Message

        return Message.objects.create(
            channel=self.channel_obj,
            sender=self.user,
            content=content,
        )

    @database_sync_to_async
    def _create_notifications(self, message_preview):
        from api.models import Notification

        from chat.models import ChannelMember

        members = ChannelMember.objects.filter(channel=self.channel_obj).exclude(
            user=self.user
        )

        notifications = []
        for member in members:
            notification = Notification.objects.create(
                recipient=member.user,
                type=Notification.Type.MESSAGE,
                entity_type="Channel",
                entity_id=self.channel_obj.id,
                payload={
                    "from_id": str(self.user.id),
                    "from_username": self.user.username,
                    "channel_id": str(self.channel_obj.id),
                    "channel_name": self.channel_obj.name or str(self.channel_obj.id),
                    "preview": message_preview[:80],
                },
            )
            notifications.append(notification)
        return notifications

    async def _push_notification(self, notification):
        await self.channel_layer.group_send(
            f"user_{notification.recipient.username}",
            {
                "type": "notification_message",
                "notification": {
                    "id": str(notification.id),
                    "type": notification.type,
                    "entity_type": notification.entity_type,
                    "entity_id": str(notification.entity_id)
                    if notification.entity_id
                    else None,
                    "payload": notification.payload,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                },
            },
        )


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        self.user_group_name = f"user_{self.user.username}"
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(
                self.user_group_name, self.channel_name
            )

    async def notification_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "notification": event["notification"],
                }
            )
        )
