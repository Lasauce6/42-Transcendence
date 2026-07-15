# Infrastructure & Services

Architecture Docker, configuration reseau et services

## Vue d'ensemble de l'architecture

```
                    HOTE
                      |
                  port 80 (HTTP)
                      |
                 +----------+
                 |  nginx   |  nginx:alpine
                 |  :80     |
                 +----------+
                    |    |
     +--------------+    +------------------+
     | /api/, /admin/,                    | /
     | /ws/                               |
     v                                    v
+----------+                       +-----------+
| backend  |                       | frontend  |
| :8000    |                       | :4200     |
| (Daphne) |                       | (Angular  |
+----------+                       |  ng serve)
     |                              +-----------+
     |    +--------+    +--------+
     +----| postgres|    | redis  |
     |    | :5432   |    | :6379  |
     |    +--------+    +--------+
     |
     |  (HTTP via urllib)
     v
+----------+
|  vault   |  hashicorp/vault:2.0
| :8200    |  <-- aussi expose sur l'hote
+----------+
```

## Services

### 1. Nginx (Reverse Proxy)

| Propriete | Valeur |
| --- | --- |
| Image | `nginx:alpine` |
| Port expose | `80:80` |
| Config | `nginx/default.conf` |
| Dependances | backend, frontend |
| Restart | `always` |

**Routing:**

| Location | Upstream | Usage |
| --- | --- | --- |
| `/api/` | `http://backend:8000` | API REST Django |
| `/admin/` | `http://backend:8000` | Django Admin |
| `/ws/` | `http://backend:8000` | WebSocket (avec headers upgrade) |
| `/` (catch-all) | `http://frontend:4200` | Angular dev server |

**Details techniques:**
- Utilise le resolver DNS Docker (`127.0.0.11`) avec TTL 10s.
- Le proxy WebSocket (`/ws/`) definit correctement `Upgrade` et `Connection` headers avec `proxy_http_version 1.1`.
- Le proxy frontend inclut aussi les headers WebSocket (pour le HMR Angular).

### 2. Backend (Django + Daphne)

| Propriete | Valeur |
| --- | --- |
| Build | `./backend` |
| Dockerfile | `python:3.12-slim` |
| Port | 8000 (interne uniquement) |
| Serveur | Daphne (ASGI) |
| Restart | `always` |
| Env file | `.env` |
| Volumes | `./backend:/app` (hot-reload) |
| Dependances | postgres, redis, vault |

**Sequence de demarrage (`entrypoint.sh`):**
1. Attendre que Vault soit disponible (polling HTTP)
2. Injecter et recuperer les secrets depuis Vault (`vault_setup.py`)
3. Exporter les secrets dans l'environnement (`eval`)
4. Attendre que PostgreSQL accepte les connexions (`nc -z`)
5. Generer les migrations manquantes (`makemigrations --noinput`)
6. Appliquer les migrations (`migrate`)
7. Demarrer Daphne sur `0.0.0.0:8000`

### 3. Frontend (Angular)

| Propriete | Valeur |
| --- | --- |
| Build | `./frontend` |
| Dockerfile | `node:20-alpine` |
| Port | 4200 (interne uniquement) |
| Commande | `ng serve --host 0.0.0.0 --port 4200` |
| Restart | `always` |
| Volumes | `./frontend:/app` (hot-reload), `/app/node_modules` (anonymous) |

**Note:** Le volume anonymous `/app/node_modules` evite que le bind mount de l'hote ecrase les `node_modules` du container.

### 4. PostgreSQL (Base de donnees)

| Propriete | Valeur |
| --- | --- |
| Image | `postgres:15-alpine` |
| Port | 5432 (interne uniquement) |
| Volume | `postgres_data:/var/lib/postgresql/data` |
| Restart | `always` |
| Env file | `.env` |
| Base | `transcendence` |

**Credentials:** `user` / `password` (definis dans `.env`)

### 5. Redis (Channel Layer)

| Propriete | Valeur |
| --- | --- |
| Image | `redis:7-alpine` |
| Port | 6379 (interne uniquement) |
| Restart | `always` |
| Auth | Aucune |

**Usage:** Backend du channel layer pour Django Channels (messagerie WebSocket temps reel).

### 6. HashiCorp Vault (Secrets)

| Propriete | Valeur |
| --- | --- |
| Image | `hashicorp/vault:2.0` |
| Port | `8200:8200` (expose sur l'hote) |
| Mode | Dev (`VAULT_DEV_ROOT_TOKEN_ID=root`) |
| Env file | `.env` |

**Secrets stockes** (a `secret/data/transcendence`):
- `DJANGO_SECRET_KEY`
- `DATABASE_URL`

**Flux des secrets:**
```
.env -> vault_setup.py (POST) -> Vault -> vault_setup.py (GET) -> export -> env Django
```

## Variables d'environnement

Fichier `.env` a la racine du projet (copie de `.env.example`):

| Variable | Valeur | Utilise par |
| --- | --- | --- |
| `POSTGRES_DB` | `transcendence` | postgres, vault_setup.py |
| `POSTGRES_USER` | `user` | postgres, vault_setup.py |
| `POSTGRES_PASSWORD` | `password` | postgres, vault_setup.py |
| `DJANGO_SECRET_KEY` | `unetestkeypourdevelopper` | vault_setup.py |
| `VAULT_DEV_ROOT_TOKEN_ID` | `root` | vault, vault_setup.py |
| `VAULT_DEV_LISTEN_ADDRESS` | `0.0.0.0:8200` | vault |
| `VAULT_ADDR` | `http://vault:8200` | vault_setup.py |

> **Attention:** Le `.env` contient des credentials en clair. Il est dans `.gitignore`.
> Le `.env.example` devrait idalement contenir des valeurs placeholders.

## Reseau

- **Reseau unique:** `transcendence-network` (driver `bridge`)
- **6 services** connectes au meme reseau
- **Service discovery:** DNS Docker (les noms de services resolvent les IPs des containers)
- **Ports exposes sur l'hote:** Uniquement `nginx:80` et `vault:8200`

## Volumes

| Service | Host | Container | Type |
| --- | --- | --- | --- |
| postgres | `postgres_data` | `/var/lib/postgresql/data` | Named volume |
| backend | `./backend` | `/app` | Bind mount |
| frontend | `./frontend` | `/app` | Bind mount |
| frontend | (anonymous) | `/app/node_modules` | Anonymous volume |
| nginx | `./nginx/default.conf` | `/etc/nginx/conf.d/default.conf` | Bind mount |

## Makefile

Commandes depuis la racine du projet:

| Cible | Commande | Description |
| --- | --- | --- |
| `make` / `make up` | `docker compose up --build -d` | Build et demarrer tous les services (detache) |
| `make down` | `docker compose down` | Arreter les containers |
| `make debug` | `docker compose up --build` | Build et demarrer avec les logs |
| `make logs` | `docker compose logs -f` | Suivre les logs de tous les services |
| `make clean` | `docker compose down -v` | Arreter + supprimer les volumes |
| `make fclean` | `docker compose down -v --rmi all --remove-orphans` | Tout supprimer (containers, volumes, images, orphelins) |
| `make re` | `fclean` puis `up` | Reconstruction complete depuis zero |

## Demarrage rapide

```bash
# 1. Copier et configurer les variables d'environnement
cp .env.example .env

# 2. Build et demarrage
make up

# 3. Ou pour voir les logs
make debug

# 4. Acceder a l'application
# Frontend: http://localhost
# API:      http://localhost/api/
# Admin:    http://localhost/admin/
# Vault:    http://localhost:8200
```

## Consignes pour les implementations futures

### Ajout de nouveaux services

1. Creer un `Dockerfile` dans un dossier dedie.
2. Ajouter le service dans `docker-compose.yml`.
3. L'attacher au reseau `transcendence-network`.
4. Si le service a besoin de secrets, ajouter `env_file: .env`.
5. Configurer les routes Nginx dans `nginx/default.conf` si necessaire.
6. Ajouter les `depends_on` pour les services qui dependent de ce nouveau service.

### Modification de la config Nginx

- Editer `nginx/default.conf`.
- Appliquer: `docker compose restart nginx` (pas de rebuild necessaire, le fichier est monte en bind mount).
- Pour ajouter un nouveau location, suivre le pattern existant avec `set $xxx_upstream` et `proxy_pass`.

### Ajout de variables d'environnement

1. Ajouter dans `.env` ET `.env.example`.
2. Si le service n'a pas `env_file`, l'ajouter.
3. Si la variable doit passer par Vault: modifier `vault_setup.py` pour l'inclure.
4. Si c'est un parametre Django: lire avec `os.environ.get()` dans `settings.py`.

### Production vs Developpement

**En developpement (actuel):**
- Hot-reload via bind mounts
- `ng serve` pour le frontend (pas de build production)
- `DEBUG = True` et `CORS_ALLOW_ALL_ORIGINS = True`
- Vault en dev mode (token `root`)
- Pas de HTTPS

**Pour la production, il faudra:**
- Build production du frontend (`ng build` + serveur de fichiers statiques)
- `DEBUG = False` et CORS restrictif
- Vault en mode normal (unseal + policies)
- HTTPS via Let's Encrypt ou certificats auto-signes
- `SECRET_KEY` reel (pas le fallback de dev)
- Restrictions CORS sur les origines autorisees
- Health checks dans `docker-compose.yml`
- Logs centralises

### Secrets management

- Ne jamais commiter `.env` (deja dans `.gitignore`).
- Le `.env.example` devrait contenir des placeholders, pas les vraies valeurs.
- En prod, utiliser les secrets Docker ou un vault externe.
- Le token Vault dev (`root`) doit etre remplace par un token avec des policies limitees.

### Monitoring et debug

- Logs: `make logs` ou `docker compose logs -f <service>`
- Shell dans un container: `docker compose exec <service> sh`
- Django shell: `docker compose exec backend python manage.py shell`
- PostgreSQL shell: `docker compose exec postgres psql -U user -d transcendence`
- Redis CLI: `docker compose exec redis redis-cli`

### Points d'attention

- Le bind mount `./backend:/app` ecrase le WORKDIR copie au build. L'`entrypoint.sh` et `requirements.txt` sont disponibles car copiés pendant le build, mais le code source est remplace par celui de l'hote.
- Les `node_modules` du frontend ne sont pas partages entre l'hote et le container (volume anonymous).
- Vault demarre en dev mode sans aucun delay - le backend attend son availability dans `entrypoint.sh`.
- PostgreSQL n'a pas de health check Docker - le backend utilise `nc -z` pour verifier.
- Les dependances Python dans `requirements.txt` sont installees au build mais le code change via hot-reload (pas de `pip install` automatique en cas d'ajout de dep).
