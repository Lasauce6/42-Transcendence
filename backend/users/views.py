from django.db.models import Q
from django.utils import timezone
from users.models import Friendship
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework import generics, viewsets, permissions, status
from .serializers import RegisterSerializer, UserSerializer, FriendshipSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Suppression réservée aux admins
        if self.action == 'destroy':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Un utilisateur non-admin ne voit pas les superusers
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(is_superuser=False)

    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class FriendshipViewSet(viewsets.ModelViewSet):
    serializer_class = FriendshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Friendship.objects.filter(
            Q(requester=user) | Q(addressee=user)
        )

    def perform_create(self, serializer):
        serializer.save(
            requester=self.request.user,
            status=Friendship.Status.PENDING
        )

    def perform_destroy(self, instance):
        if self.request.user not in (instance.requester, instance.addressee):
            raise permissions.PermissionDenied(
                "Vous n'êtes pas concerné par cette relation."
            )
        instance.delete()

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        friendship = self.get_object()
        if friendship.addressee != request.user:
            return Response(
                {"detail": "Seul le destinataire peut accepter cette demande."},
                status=403
            )
        if friendship.status != Friendship.Status.PENDING:
            return Response(
                {"detail": "Cette demande n'est plus en attente."},
                status=400
            )
        friendship.status = Friendship.Status.ACCEPTED
        friendship.save()
        return Response(FriendshipSerializer(friendship).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        friendship = self.get_object()
        if friendship.addressee != request.user:
            return Response(
                {"detail": "Seul le destinataire peut refuser cette demande."},
                status=403
            )
        if friendship.status != Friendship.Status.PENDING:
            return Response(
                {"detail": "Cette demande n'est plus en attente."},
                status=400
            )
        friendship.delete()
        return Response(status=204)

    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        friendship = self.get_object()
        if request.user not in (friendship.requester, friendship.addressee):
            return Response(
                {"detail": "Vous n'êtes pas concerné par cette relation."},
                status=403
            )
        friendship.status = Friendship.Status.BLOCKED
        friendship.save()
        return Response(FriendshipSerializer(friendship).data)

    @action(detail=False, methods=['get'])
    def friends(self, request):
        friendships = self.get_queryset().filter(status=Friendship.Status.ACCEPTED)
        serializer = self.get_serializer(friendships, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        friendships = self.get_queryset().filter(
            addressee=request.user,
            status=Friendship.Status.PENDING
        )
        serializer = self.get_serializer(friendships, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sent(self, request):
        friendships = self.get_queryset().filter(
            requester=request.user,
            status=Friendship.Status.PENDING
        )
        serializer = self.get_serializer(friendships, many=True)
        return Response(serializer.data)

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_online = False
        user.last_seen = timezone.now()
        user.save(update_fields=['is_online', 'last_seen'])
        return Response(status=status.HTTP_204_NO_CONTENT)
