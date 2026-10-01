from django.db import transaction
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Channel, Message, ChannelMember, ChannelBan
from .serializers import ChannelSerializer, MessageSerializer


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
        messages = Message.objects.filter(channel=channel).order_by("created_at")
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

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
