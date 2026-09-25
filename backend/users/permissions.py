from rest_framework import permissions
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.tokens import AccessToken


class Is2FADone(BasePermission):
    def has_permission(self, request, view):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return False
        try:
            token = AccessToken(auth.split()[1])
        except Exception:
            return False
        return not token.get("two_fa_pending", False)


class IsSelfOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj.id == request.user.id
