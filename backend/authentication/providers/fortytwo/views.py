import requests
from allauth.socialaccount.providers.oauth2.views import (
    OAuth2Adapter,
    OAuth2CallbackView,
    OAuth2LoginView,
)

from .provider import FortyTwoProvider


class FortyTwoOAuth2Adapter(OAuth2Adapter):
    provider_id = FortyTwoProvider.id
    access_token_url = "https://api.intra.42.fr/oauth/token"
    authorize_url = "https://api.intra.42.fr/oauth/authorize"
    profile_url = "https://api.intra.42.fr/v2/me"

    def complete_login(self, request, app, token, **kwargs):
        resp = requests.get(
            self.profile_url,
            headers={"Authorization": f"Bearer {token.token}"},
        )
        resp.raise_for_status()
        extra_data = resp.json()
        return self.get_provider().sociallogin_from_response(request, extra_data)


oauth2_login = OAuth2LoginView.adapter_view(FortyTwoOAuth2Adapter)
oauth2_callback = OAuth2CallbackView.adapter_view(FortyTwoOAuth2Adapter)
