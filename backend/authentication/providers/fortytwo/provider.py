from allauth.socialaccount.providers.base import ProviderAccount
from allauth.socialaccount.providers.oauth2.provider import OAuth2Provider


class FortyTwoAccount(ProviderAccount):
    pass


class FortyTwoProvider(OAuth2Provider):
    id = "fortytwo"
    name = "42"
    account_class = FortyTwoAccount
    callback_url = "/api/auth/oauth/42/callback/"

    def extract_uid(self, data):
        return str(data.get("id"))

    def extract_common_fields(self, data):
        return {
            "username": data.get("login"),
            "email": data.get("email"),
            "first_name": data.get("first_name"),
            "last_name": data.get("last_name"),
        }

    def get_default_scope(self):
        return ["public"]


provider_classes = [FortyTwoProvider]
