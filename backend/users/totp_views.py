import base64
import io

import pyotp
import qrcode
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .jwt_utils import issue_tokens
from .models import BackupCode, User


class Is2FAVerified(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.has_2fa()


class TOTPSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.has_2fa():
            return Response({"detail": "2FA already enabled"}, status=400)

        secret = pyotp.random_base32()
        user.set_otp_secret(secret)
        user.two_fa_enabled = True
        user.two_fa_verified = False
        user.save()

        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(
            name=user.email, issuer_name=settings.TOTP_ISSUER_NAME
        )

        qr = qrcode.make(uri)
        buffer = io.BytesIO()
        qr.save(buffer, format="PNG")
        qr_b64 = base64.b64encode(buffer.getvalue()).decode()

        return Response(
            {
                "secret": secret,
                "qr_code": f"data:image/png;base64,{qr_b64}",
                "uri": uri,
            }
        )


class TOTPVerifySetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get("code")
        user = request.user
        secret = user.get_otp_secret()

        if not secret or not user.two_fa_enabled:
            return Response({"detail": "Setup required"}, status=400)

        if pyotp.TOTP(secret).verify(code, valid_window=1):
            user.two_fa_verified = True
            user.save()
            codes = BackupCode.generate_codes(user)
            return Response({"backup_codes": codes})
        return Response({"detail": "Invalid code"}, status=400)


class TOTPDisableView(APIView):
    permission_classes = [Is2FAVerified]

    def post(self, request):
        code = request.data.get("code")
        user = request.user
        secret = user.get_otp_secret()

        if not secret:
            return Response({"detail": "No secret"}, status=400)

        if pyotp.TOTP(secret).verify(code, valid_window=1):
            user.two_fa_enabled = False
            user.two_fa_verified = False
            user.otp_secret_encrypted = None
            user.save()
            user.backup_codes.all().delete()
            return Response({"detail": "2FA disabled"})
        return Response({"detail": "Invalid code"}, status=400)


class TOTPLoginVerifyView(APIView):
    permission_classes = []  # token temporaire suffit

    def post(self, request):
        temp_token = request.data.get("temp_token")
        code = request.data.get("code")

        try:
            token = RefreshToken(temp_token)
        except Exception:
            return Response({"detail": "Invalid token"}, status=400)

        if not token.get("two_fa_pending"):
            return Response({"detail": "Not pending 2FA"}, status=400)

        user_id = token.get("user_id")
        user = User.objects.filter(pk=user_id).first()
        if not user:
            return Response({"detail": "User not found"}, status=404)

        secret = user.get_otp_secret()
        valid = (
            pyotp.TOTP(secret).verify(code, valid_window=1) if secret else False
        ) or BackupCode.verify(user, code)

        if valid:
            return Response(issue_tokens(user, two_fa_pending=False))
        return Response({"detail": "Invalid code"}, status=400)
