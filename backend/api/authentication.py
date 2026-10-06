from django.utils import timezone
from rest_framework import authentication, exceptions

from .models import APIKey


class APIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authentifie une requête via le header `X-API-Key: sk_...`.
    Retourne (user, api_key) si la clé est valide, None sinon.
    """

    keyword = "X-API-Key"

    def authenticate(self, request):
        raw_key = request.headers.get(self.keyword)

        if not raw_key:
            return None  # Pas de clé → DRF essaiera les autres méthodes (JWT)

        key_hash = APIKey.hash_key(raw_key)

        try:
            api_key = APIKey.objects.select_related("user").get(key_hash=key_hash)
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed("Clé API invalide.")

        if not api_key.is_valid:
            raise exceptions.AuthenticationFailed("Clé API expirée ou désactivée.")

        # Met à jour last_used_at (une fois par heure max pour éviter le spam)
        now = timezone.now()
        if not api_key.last_used_at or (now - api_key.last_used_at).total_seconds() > 3600:
            APIKey.objects.filter(pk=api_key.pk).update(last_used_at=now)

        return (api_key.user, api_key)

    def authenticate_header(self, request):
        """
        Retourne le nom du header attendu.
        Utilisé par DRF pour renvoyer un 401 au lieu d'un 403
        quand l'authentification échoue.
        """
        return self.keyword