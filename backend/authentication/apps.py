from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    name = "authentication"

    def ready(self):
        from allauth.socialaccount.providers import registry

        from authentication.providers.fortytwo.provider import FortyTwoProvider

        registry.register(FortyTwoProvider)
