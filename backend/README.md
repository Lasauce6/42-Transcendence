# Backend

API REST et temps reel

## Stack technique

| Composant | Technologie |
| --- | --- |
| Framework | Django 6.0.5 |
| API REST | Django REST Framework (DRF) >= 3.17 |
| Authentification | djangorestframework-simplejwt (JWT) |
| WebSockets | Django Channels 4.2 + Daphne (ASGI) |
| Channel Layer | channels-redis (Redis 7) |
| Base de donnees | PostgreSQL 15 |
| ORM | Django ORM |
| CORS | django-cors-headers >= 4.9 |
| Secrets | HashiCorp Vault (via urllib) |
| Filtres | django-filter >= 25.2 |
| Images | Pillow >= 11.0 |
| Python | 3.12 |

## Structure du projet

```
backend/
  manage.py                    # CLI Django
  Dockerfile                   # Image Python 3.12-slim
  entrypoint.sh                # Demarrage: Vault -> secrets -> Postgres -> migrations -> Daphne
  vault_setup.py               # Injection/recuperation des secrets depuis Vault
  requirements.txt             # Dependances Python
  core/                        # Configuration du projet Django
    settings.py                # Parametres principaux
    urls.py                    # Routes URL
    asgi.py                    # Point d'entree ASGI (HTTP + WebSocket)
    wsgi.py                    # Point d'entree WSGI (non utilise en prod)
  users/                       # App de gestion des utilisateurs
    models.py                  # Modele User personnalise
    views.py                   # RegisterView
    serializers.py             # RegisterSerializer
    admin.py                   # CustomUserAdmin
  chat/                        # App de chat en temps reel
    models.py                  # Channel, ChannelMember, Message
    views.py                   # ChannelViewSet, MessageViewSet
    serializers.py             # ChannelSerializer, MessageSerializer
    consumers.py               # ChatConsumer (WebSocket)
    routing.py                 # Routes WebSocket
    admin.py                   # ChannelAdmin, MessageAdmin
  api/                         # App placeholder (vide)
```

## Modeles de donnees

### User (users.User)

Modele utilisateur personnalise etendant `AbstractUser` avec cle UUID.

| Champ | Type | Description |
| --- | --- | --- |
| `id` | UUIDField (PK) | Identifiant unique |
| `username` | CharField | Nom d'utilisateur (unique, herite) |
| `email` | EmailField (unique) | Adresse email |
| `password` | CharField | Mot de passe (herite) |
| `avatar` | ImageField | Photo de profil (defaut: default.png) |
| `bio` | TextField (max 500) | Biographie |
| `role` | CharField (choices) | ADMIN / MODERATOR / USER (defaut: USER) |
| `is_online` | BooleanField | Statut en ligne |
| `last_seen` | DateTimeField (nullable) | Derniere connexion |
| `language` | CharField (choices) | FR / EN / ES (defaut: EN) |
| `two_fa_enabled` | BooleanField | 2FA activee (non implemente) |
| `otp_secret` | CharField (nullable) | Secret TOTP (non implemente) |
| `created_at` | DateTimeField | Date de creation |
| `updated_at` | DateTimeField | Date de mise a jour |

### Channel (chat.Channel)

| Champ | Type | Description |
| --- | --- | --- |
| `id` | UUIDField (PK) | Identifiant unique |
| `name` | CharField (nullable) | Nom du canal |
| `type` | CharField (choices) | PRIVATE / GROUP / PUBLIC |
| `created_by` | FK -> User | Createur du canal |
| `created_at` | DateTimeField | Date de creation |

### ChannelMember (chat.ChannelMember)

| Champ | Type | Description |
| --- | --- | --- |
| `id` | UUIDField (PK) | Identifiant unique |
| `channel` | FK -> Channel | Canal associe |
| `user` | FK -> User | Utilisateur associe |
| `role` | CharField (choices) | ADMIN / MEMBER |
| `joined_at` | DateTimeField | Date d'entree |

Contrainte: `unique_together = ('channel', 'user')`

### Message (chat.Message)

| Champ | Type | Description |
| --- | --- | --- |
| `id` | UUIDField (PK) | Identifiant unique |
| `channel` | FK -> Channel | Canal associe |
| `sender` | FK -> User | Expediteur |
| `content` | TextField | Contenu du message |
| `is_deleted` | BooleanField | Suppression logique (soft delete) |
| `created_at` | DateTimeField | Date de creation |
| `updated_at` | DateTimeField | Date de mise a jour |

Index composes: `(channel, created_at)`, `sender`. Tri par defaut: `created_at` ascendant.

### Diagramme des relations

```
User (1) --< created_channels >-- (N) Channel
User (1) --< channels >-- (N) ChannelMember >-- (N) Channel
User (1) --< sent_messages >-- (N) Message >-- (N) Channel
```

## Endpoints HTTP (REST)

| Methode | URL | View | Auth |
| --- | --- | --- | --- |
| POST | `/api/register/` | RegisterView | Non |
| POST | `/api/token/` | TokenObtainPairView (login) | Non |
| POST | `/api/token/refresh/` | TokenRefreshView | Non |
| POST | `/api/token/verify/` | TokenVerifyView | Non |
| GET/POST | `/api/channels/` | ChannelViewSet | Oui |
| GET/PUT/PATCH/DELETE | `/api/channels/{uuid}/` | ChannelViewSet | Oui |
| GET | `/api/channels/{uuid}/messages/` | ChannelViewSet.messages | Oui |
| GET/POST | `/api/messages/` | MessageViewSet | Oui |
| GET/PUT/PATCH/DELETE | `/api/messages/{uuid}/` | MessageViewSet | Oui |

## Endpoint WebSocket

| Protocole | URL | Consumer | Description |
| --- | --- | --- | --- |
| WebSocket | `ws/chat/{room_name}/` | ChatConsumer | Messagerie temps reel |

- Authentification assuree par `AuthMiddlewareStack` (session Django).
- Le consumer rejoint un groupe `chat_{room_name}` et diffuse les messages.

## Authentification (JWT)

**Flux:**
1. `POST /api/register/` - Creation du compte (`username`, `email`, `password`)
2. `POST /api/token/` - Login, retourne `access` et `refresh` tokens
3. `POST /api/token/refresh/` - Renouveler le token d'acces
4. `POST /api/token/verify/` - Verifier la validite d'un token

**Utilisation:** Header `Authorization: Bearer <access_token>` sur les routes protegees.

## WebSockets (Django Channels)

- **Serveur ASGI:** Daphne (port 8000)
- **Channel Layer:** Redis (`redis:6379`)
- **Routing:** `chat/routing.py` -> `ws/chat/{room_name}/`
- **ASGI config:** `core/asgi.py` avec `ProtocolTypeRouter` (HTTP + WebSocket)

## Demarrage local

Le backend se lance via `docker compose`. Sans Docker:

```bash
pip install -r backend/requirements.txt
export DATABASE_URL=postgres://user:password@localhost:5432/transcendence
export DJANGO_SECRET_KEY=your_secret_key
python backend/manage.py migrate
daphne -b 0.0.0.0 -p 8000 backend/core.asgi:application
```

## Consignes pour les implementations futures

### Structure des nouvelles apps

1. Creer l'app: `python manage.py startapp <nom_app>` dans `backend/`.
2. Ajouter dans `INSTALLED_APPS` dans `core/settings.py`.
3. Toujours utiliser des **UUID primary keys**: `models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
4. Creer un `migrations/__init__.py`.

### Modeles

- Utiliser `settings.AUTH_USER_MODEL` pour les FK vers l'utilisateur (jamais `User` directement).
- Ajouter des `related_name` explicites sur tous les ForeignKey.
- Utiliser des `indexes` dans `class Meta` pour les colonnes frequentement requetees.
- Timestamps: `auto_now_add=True` pour la creation, `auto_now=True` pour la mise a jour.

### Serializers

- Creer un fichier `serializers.py` dans chaque app.
- Utiliser `serializers.ModelSerializer` comme base.
- Utiliser `read_only_fields` et `write_only` quand necessaire.
- Champs derives: `serializers.CharField(source='...', read_only=True)`.

### Vues

- Preferer les **ViewSets** (ModelViewSet) pour les endpoints CRUD.
- Enregistrer avec `router = routers.DefaultRouter()` dans `core/urls.py`.
- Definir `permission_classes = [permissions.IsAuthenticated]` sur les vues protegees.
- Actions custom: decorateur `@action(detail=True/False, methods=[...])`.

### Routes

- Enregistrer les ViewSets dans `core/urls.py`: `router.register(r'nom', ViewSet)`.
- Prefixe `/api/` pour toutes les routes REST.

### Authentification

- `simplejwt` est configure globalement via `REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']`.
- Pas besoin d'ajouter la classe d'auth sur chaque vue individuellement.
- En cas de besoin de permissions specifiques, utiliser `permission_classes` ou des permissions custom.

### Tests

- Les fichiers `tests.py` sont vides pour le moment. Creer des tests unitaires et d'integration.
- Utiliser `APITestCase` de DRF pour les tests d'API.
- Utiliser `AsyncWebsocketConsumer` de Channels pour tester les consumers WebSocket.

### Points d'attention

- Le flag `is_deleted` sur Message n'est pas encore gere dans les vues (a implementer).
- `ChannelMember` n'a pas de serializer ni de ViewSet (a creer pour la gestion des membres).
- `hvac` est installe mais non utilise (`vault_setup.py` utilise `urllib`).
- `django-filter` est installe mais non utilise.
- L'app `api/` est vide et peut etre repurposee ou supprimee.
- Les champs `two_fa_enabled` et `otp_secret` sont presents mais non implementes.
