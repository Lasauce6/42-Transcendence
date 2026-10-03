from datetime import timedelta

from rest_framework_simplejwt.tokens import RefreshToken


def issue_tokens(user, two_fa_pending=False):
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    refresh["two_fa_pending"] = two_fa_pending
    access["two_fa_pending"] = two_fa_pending

    if two_fa_pending:
        access.set_exp(lifetime=timedelta(minutes=5))

    return {
        "refresh": str(refresh),
        "access": str(access),
        "two_fa_pending": two_fa_pending,
    }
