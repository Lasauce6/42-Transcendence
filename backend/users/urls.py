from django.urls import path

from .auth_views import ClassicLoginView
from .totp_views import (
    TOTPDisableView,
    TOTPLoginVerifyView,
    TOTPSetupView,
    TOTPVerifySetupView,
)

urlpatterns = [
    # 2FA setup
    path("me/2fa/setup/", TOTPSetupView.as_view(), name="totp-setup"),
    path(
        "me/2fa/verify-setup/", TOTPVerifySetupView.as_view(), name="totp-verify-setup"
    ),
    path("me/2fa/disable/", TOTPDisableView.as_view(), name="totp-disable"),
    # Login classique + vérification 2FA
    path("auth/login/", ClassicLoginView.as_view(), name="classic-login"),
    path("auth/2fa/verify/", TOTPLoginVerifyView.as_view(), name="totp-login-verify"),
]
