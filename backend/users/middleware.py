from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

User = get_user_model()


class LastSeenMiddleware:

    def __init__(self, get_response):
        self.jwt_auth = JWTAuthentication()
        self.get_response = get_response
        self._last_cleanup = None

    def __call__(self, request):
        user = self._resolve_user(request)
        if user:
            self._update_current_user(user)
            self._lazy_cleanup()
        return self.get_response(request)

    def _resolve_user(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            return request.user

        try:
            result = self.jwt_auth.authenticate(request)
            if result is not None:
                return result[0]
        except (InvalidToken, AuthenticationFailed):
            pass

        return None

    def _update_current_user(self, user):
        now = timezone.now()

        if user.last_seen and (now - user.last_seen) < timedelta(minutes=1):
            if not user.is_online:
                User.objects.filter(pk=user.pk).update(is_online=True)
            return

        User.objects.filter(pk=user.pk).update(
            last_seen=now,
            is_online=True,
        )

    def _lazy_cleanup(self):
        now = timezone.now()

        if self._last_cleanup and (now - self._last_cleanup).total_seconds() < 10:
            return
        self._last_cleanup = now

        User.objects.filter(
            is_online=True,
            last_seen__lt=now - timedelta(minutes=5),
        ).update(is_online=False)