from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core import signing
from django.db import transaction
from django.http import HttpResponse
from django.utils.http import content_disposition_header
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Notification
from users.permissions import Is2FADone

from .files import (
    PREVIEW_TYPES,
    InvalidAttachment,
    attachment_data,
    read_attachment_token,
    validate_attachment,
)
from .models import Attachment, Channel, Message, ChannelMember, ChannelBan
from .serializers import AttachmentUploadSerializer, ChannelSerializer, MessageSerializer


class ChannelViewSet(viewsets.ModelViewSet):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated, Is2FADone]

    def get_queryset(self):
        return Channel.objects.filter(members__user=self.request.user).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        channel = serializer.save(created_by=self.request.user)
        ChannelMember.objects.create(
            channel=channel, user=self.request.user, role=ChannelMember.Role.ADMIN
        )

    def _can_moderate(self, channel, user):
        if user.role in ("ADMIN", "MODERATOR"):
            return True
        return ChannelMember.objects.filter(
            channel=channel, user=user, role=ChannelMember.Role.ADMIN
        ).exists()

    def _can_ban(self, channel, user):
        if user.role == "ADMIN":
            return True
        return ChannelMember.objects.filter(
            channel=channel, user=user, role=ChannelMember.Role.ADMIN
        ).exists()

    @action(detail=True, methods=["post"], url_path="add-member")
    def add_member(self, request, pk=None):
        channel = self.get_object()
        user_id = request.data.get("user_id")
        if not user_id:
            return Response(
                {"error": "user_id est requis"}, status=status.HTTP_400_BAD_REQUEST
            )
        if ChannelBan.objects.filter(channel=channel, user_id=user_id).exists():
            return Response(
                {"error": "Cet utilisateur est banni de ce channel."},
                status=status.HTTP_403_FORBIDDEN,
            )
        member, created = ChannelMember.objects.get_or_create(
            channel=channel, user_id=user_id
        )
        if not created:
            return Response(
                {"message": "Cet utilisateur est déjà membre"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"message": "Membre ajouté avec succès"},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="remove-member")
    def remove_member(self, request, pk=None):
        channel = self.get_object()

        if not self._can_moderate(channel, request.user):
            return Response(
                {"error": "Vous n'avez pas les droits pour retirer un membre."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        if not user_id:
            return Response(
                {"error": "user_id est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(request.user.id) == str(user_id):
            return Response(
                {"error": "Vous ne pouvez pas vous retirer vous-même."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = ChannelMember.objects.filter(
            channel=channel, user_id=user_id
        ).delete()

        if not deleted:
            return Response(
                {"error": "Cet utilisateur n'est pas membre."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"message": "Membre retiré avec succès"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        channel = self.get_object()
        messages = (
            Message.objects.filter(channel=channel)
            .prefetch_related("attachments")
            .order_by("created_at")
        )
        serializer = MessageSerializer(
            messages, many=True, context=self.get_serializer_context()
        )
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
    )
    def attachments(self, request, pk=None):
        channel = self.get_object()

        if ChannelBan.objects.filter(channel=channel, user=request.user).exists():
            return Response(
                {"error": "Vous êtes banni de ce channel."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file = serializer.validated_data["file"]
        content = serializer.validated_data["content"].strip()

        try:
            content_type = validate_attachment(file)
        except InvalidAttachment as e:
            return Response({"file": [str(e)]}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            message = Message.objects.create(
                channel=channel, sender=request.user, content=content
            )
            Attachment.objects.create(
                message=message,
                file=file,
                original_name=file.name[:255],
                content_type=content_type,
                size=file.size,
            )

        transaction.on_commit(lambda: self._broadcast_message(message))

        data = MessageSerializer(message, context=self.get_serializer_context()).data
        return Response(data, status=status.HTTP_201_CREATED)

    def _broadcast_message(self, message):
        channel_layer = get_channel_layer()
        sender = message.sender
        attachments = [attachment_data(a) for a in message.attachments.all()]

        async_to_sync(channel_layer.group_send)(
            f"chat_{message.channel_id}",
            {
                "type": "chat_message",
                "id": str(message.id),
                "message": message.content,
                "sender": sender.username,
                "sender_id": str(sender.id),
                "created_at": message.created_at.isoformat(),
                "attachments": attachments,
            },
        )

        preview = message.content or f"📎 {attachments[0]['name']}"
        channel = message.channel
        members = ChannelMember.objects.filter(channel=channel).exclude(user=sender)
        for member in members.select_related("user"):
            notification = Notification.objects.create(
                recipient=member.user,
                type=Notification.Type.MESSAGE,
                entity_type="Channel",
                entity_id=channel.id,
                payload={
                    "from_id": str(sender.id),
                    "from_username": sender.username,
                    "channel_id": str(channel.id),
                    "channel_name": channel.name or str(channel.id),
                    "preview": preview[:80],
                },
            )
            async_to_sync(channel_layer.group_send)(
                f"user_{member.user.username}",
                {
                    "type": "notification_message",
                    "notification": {
                        "id": str(notification.id),
                        "type": notification.type,
                        "entity_type": notification.entity_type,
                        "entity_id": str(notification.entity_id),
                        "payload": notification.payload,
                        "is_read": notification.is_read,
                        "created_at": notification.created_at.isoformat(),
                    },
                },
            )

    @action(
        detail=True,
        methods=["delete"],
        url_path="messages/(?P<message_id>[^/.]+)",
    )
    def delete_message(self, request, pk=None, message_id=None):
        channel = self.get_object()

        try:
            message = Message.objects.get(id=message_id, channel=channel)
        except Message.DoesNotExist:
            return Response(
                {"error": "Message introuvable"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if message.sender != request.user and request.user.role not in (
            "ADMIN",
            "MODERATOR",
        ):
            return Response(
                {"error": "Vous n'avez pas les droits pour supprimer ce message."},
                status=status.HTTP_403_FORBIDDEN,
            )

        message.is_deleted = True
        message.save(update_fields=["is_deleted"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="ban-member")
    def ban_member(self, request, pk=None):
        channel = self.get_object()

        if not self._can_ban(channel, request.user):
            return Response(
                {"error": "Vous n'avez pas les droits pour bannir."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        reason = request.data.get("reason", "")

        if not user_id:
            return Response(
                {"error": "user_id est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(request.user.id) == str(user_id):
            return Response(
                {"error": "Vous ne pouvez pas vous bannir vous-même."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ChannelMember.objects.filter(channel=channel, user_id=user_id).delete()

        ban, created = ChannelBan.objects.update_or_create(
            channel=channel,
            user_id=user_id,
            defaults={"banned_by": request.user, "reason": reason},
        )

        return Response(
            {
                "message": "Utilisateur banni",
                "ban_id": str(ban.id),
                "reason": ban.reason,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="unban-member")
    def unban_member(self, request, pk=None):
        channel = self.get_object()

        if not self._can_ban(channel, request.user):
            return Response(
                {"error": "Vous n'avez pas les droits pour débannir."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        if not user_id:
            return Response(
                {"error": "user_id est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = ChannelBan.objects.filter(
            channel=channel, user_id=user_id
        ).delete()

        if not deleted:
            return Response(
                {"error": "Cet utilisateur n'est pas banni."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"message": "Utilisateur débanni"},
            status=status.HTTP_200_OK,
        )


class AttachmentDownloadView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            data = read_attachment_token(request.query_params.get("token", ""))
        except signing.SignatureExpired:
            return Response({"error": "Lien expiré."}, status=status.HTTP_403_FORBIDDEN)
        except signing.BadSignature:
            return Response({"error": "Lien invalide."}, status=status.HTTP_403_FORBIDDEN)

        if data.get("a") != str(pk):
            return Response({"error": "Lien invalide."}, status=status.HTTP_403_FORBIDDEN)

        try:
            attachment = Attachment.objects.select_related("message").get(
                id=pk, message__is_deleted=False
            )
        except Attachment.DoesNotExist:
            return Response(
                {"error": "Fichier introuvable."}, status=status.HTTP_404_NOT_FOUND
            )

        channel_id = attachment.message.channel_id
        user_id = data.get("u")
        is_member = ChannelMember.objects.filter(
            channel_id=channel_id, user_id=user_id
        ).exists()
        is_banned = ChannelBan.objects.filter(
            channel_id=channel_id, user_id=user_id
        ).exists()
        if not is_member or is_banned:
            return Response(
                {"error": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN
            )

        response = HttpResponse(content_type=attachment.content_type)
        response["X-Accel-Redirect"] = f"/protected/{attachment.file.name}"
        response["Content-Disposition"] = content_disposition_header(
            attachment.content_type not in PREVIEW_TYPES, attachment.original_name
        )
        response["Cache-Control"] = "private, no-store"
        return response
