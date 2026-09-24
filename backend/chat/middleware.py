from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def get_user_from_token(token_string):

    try:
        token = AccessToken(token_string)
        user_id = token['user_id']
        User = get_user_model()
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):

    async def __call__(self, scope, receive, send):
        # Si un cookie de session a déjà authentifié l'utilisateur, on ne fait rien
        if scope.get('user') and scope['user'].is_authenticated:
            return await super().__call__(scope, receive, send)

        # Cherche ?token=... dans la query string
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_list = params.get('token')

        if token_list:
            scope['user'] = await get_user_from_token(token_list[0])

        return await super().__call__(scope, receive, send)