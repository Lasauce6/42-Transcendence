from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken


@login_required
def oauth_jwt_redirect(request):
    user = request.user

    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost")

    redirect_url = (
        f"{frontend_url}/auth/callback?access={access_token}&refresh={refresh_token}"
    )

    return redirect(redirect_url)
