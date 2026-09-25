from rest_framework import mixins, permissions, viewsets

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(
    mixins.ListModelMixin,  # GET /api/notifications/
    mixins.RetrieveModelMixin,  # GET /api/notifications/{id}/
    mixins.UpdateModelMixin,  # PATCH /api/notifications/{id}/
    mixins.DestroyModelMixin,  # DELETE /api/notifications/{id}/
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
