from django.apps import AppConfig
from django.db.models.signals import post_migrate


def create_social_apps(sender, **kwargs):
    if sender.name != "authentication":
        return

    import os

    from allauth.socialaccount.models import SocialApp
    from django.contrib.sites.models import Site

    site, _ = Site.objects.get_or_create(
        pk=1, defaults={"domain": "localhost", "name": "localhost"}
    )

    providers = [
        ("fortytwo", "42", "OAUTH_42_CLIENT_ID", "OAUTH_42_CLIENT_SECRET"),
        ("google", "Google", "OAUTH_GOOGLE_CLIENT_ID", "OAUTH_GOOGLE_CLIENT_SECRET"),
        ("github", "GitHub", "OAUTH_GITHUB_CLIENT_ID", "OAUTH_GITHUB_CLIENT_SECRET"),
    ]

    for provider, name, id_env, secret_env in providers:
        client_id = os.environ.get(id_env)
        secret = os.environ.get(secret_env)
        if not client_id or not secret:
            continue

        app, _ = SocialApp.objects.get_or_create(
            provider=provider,
            name=name,
            defaults={"client_id": client_id, "secret": secret},
        )
        app.sites.add(site)


class AuthenticationConfig(AppConfig):
    name = "authentication"

    def ready(self):
        from allauth.socialaccount.providers import registry

        from authentication.providers.fortytwo.provider import FortyTwoProvider

        registry.register(FortyTwoProvider)
        post_migrate.connect(create_social_apps, sender=self)
