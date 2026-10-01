from rest_framework import permissions

class IsSelfOrAdmin(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj.id == request.user.id

class IsAdmin(permissions.BasePermission):

    def has_permission(self, request, view):
        if request.user.is_authenticated:
            if request.user.role == "ADMIN":
                return True
        return False


class IsModerator(permissions.BasePermission):

    def has_permission(self, request, view):
        if request.user.is_authenticated:
            if request.user.role == "ADMIN" or request.user.role == "MODERATOR":
                return True
        return False