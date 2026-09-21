from allauth.socialaccount.providers.github.views import (
    oauth2_callback as github_callback,
)
from allauth.socialaccount.providers.github.views import (
    oauth2_login as github_login,
)
from allauth.socialaccount.providers.google.views import (
    oauth2_callback as google_callback,
)
from allauth.socialaccount.providers.google.views import (
    oauth2_login as google_login,
)
from django.urls import path

from authentication.providers.fortytwo.views import (
    oauth2_callback as fortytwo_callback,
)
from authentication.providers.fortytwo.views import (
    oauth2_login as fortytwo_login,
)

urlpatterns = [
    path("42/login/", fortytwo_login, name="fortytwo_login"),
    path("42/callback/", fortytwo_callback, name="fortytwo_callback"),
    path("google/login/", google_login, name="google_login"),
    path("google/callback/", google_callback, name="google_callback"),
    path("github/login/", github_login, name="github_login"),
    path("github/callback/", github_callback, name="github_callback"),
]
