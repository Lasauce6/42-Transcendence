from django.db import transaction
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Channel, Message
from .serializers import ChannelSerializer, MessageSerializer


class ChannelViewSet(viewsets.ModelViewSet):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Channel.objects.filter(members__user=self.request.user).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        channel = serializer.save(created_by=self.request.user)
        ChannelMember.objects.create(
            channel=channel, user=self.request.user, role=ChannelMember.Role.ADMIN
        )

    @action(detail=True, methods=["post"], url_path="add-member")
    def add_member(self, request, pk=None):
        channel = self.get_object()
        user_id = request.data.get("user_id")
        if not user_id:
            return Response(
                {"error": "user_id est requis"}, status=status.HTTP_400_BAD_REQUEST
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
        user_id = request.data.get("user_id")
        ChannelMember.objects.filter(channel=channel, user_id=user_id).delete()
        return Response(
            {"message": "Membre retiré avec succès"}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        channel = self.get_object()
        messages = Message.objects.filter(channel=channel).order_by("created_at")
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
