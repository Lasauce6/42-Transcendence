import uuid

from django.core.cache import cache

# Nombre de websockets ouverts par utilisateur (plusieurs onglets = plusieurs connexions).
# L'identifiant change à chaque démarrage du serveur : les compteurs laissés par un arrêt
# brutal sont ignorés au lieu de garder quelqu'un « en ligne » pour toujours.
BOOT_ID = uuid.uuid4().hex
TTL = 60 * 60 * 24


def _key(user_id):
    return f"presence:{BOOT_ID}:{user_id}"


def connect(user_id):
    """Compte une connexion de plus. Renvoie True si c'est la première."""
    key = _key(user_id)
    cache.add(key, 0, TTL)
    return cache.incr(key) == 1


def disconnect(user_id):
    """Compte une connexion de moins. Renvoie True si c'était la dernière."""
    key = _key(user_id)
    try:
        remaining = cache.decr(key)
    except ValueError:
        return True
    if remaining <= 0:
        cache.delete(key)
        return True
    return False


def connected_ids(user_ids):
    """Parmi ces utilisateurs, ceux qui ont encore un websocket ouvert."""
    keys = {_key(uid): uid for uid in user_ids}
    found = cache.get_many(list(keys))
    return {keys[k] for k, count in found.items() if count and count > 0}
