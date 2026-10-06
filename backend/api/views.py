from rest_framework import mixins, permissions, viewsets, status
from users.permissions import Is2FADone
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification, APIKey
from .serializers import NotificationSerializer, APIKeyCreateSerializer, APIKeySerializer


class NotificationViewSet(
    mixins.ListModelMixin,  # GET /api/notifications/
    mixins.RetrieveModelMixin,  # GET /api/notifications/{id}/
    mixins.UpdateModelMixin,  # PATCH /api/notifications/{id}/
    mixins.DestroyModelMixin,  # DELETE /api/notifications/{id}/
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, Is2FADone]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

class APIKeyViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):

    serializer_class = APIKeySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Un user ne voit QUE ses propres clés
        return APIKey.objects.filter(user=self.request.user)

    def create(self, request):
        """POST /api/api-keys/ — crée une clé et ne l'affiche qu'une fois."""
        serializer = APIKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Sécurité : limite le nombre de clés par user (ex. max 10)
        if APIKey.objects.filter(user=request.user).count() >= 10:
            return Response(
                {"error": "Limite de 10 clés API atteinte."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance, raw_key = APIKey.create_for_user(
            user=request.user,
            name=serializer.validated_data["name"],
        )

        return Response(
            {
                "id": str(instance.id),
                "name": instance.name,
                "key": raw_key,
                "key_prefix": instance.key_prefix,
                "created_at": instance.created_at,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        """Active/désactive une clé sans la supprimer."""
        api_key = self.get_object()
        api_key.is_active = not api_key.is_active
        api_key.save(update_fields=["is_active"])
        return Response(APIKeySerializer(api_key).data)
