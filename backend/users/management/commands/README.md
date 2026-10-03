# Seed data

Cette commande permet de générer des données de test pour le projet Django.

Elle crée :

- 6 utilisateurs
- 5 relations d'amitié
- 4 channels
- 13 membres de channels
- 17 messages
- 6 notifications

Les UUID sont générés automatiquement par Django.

Les mots de passe sont hashés avec `set_password()`.

On utilise une commande plutôt que des fixtures JSON pour ne pas avoir à mettre les UUID et les mots de passe hashés en dur.

## Lancer le seed

Depuis la racine du projet :

```bash
docker compose exec backend python manage.py seed_data
```

Si le seed est déjà en base, la commande ne recrée rien.

Pour supprimer les données du seed et les recréer :

```bash
docker compose exec backend python manage.py seed_data --reset
```

`--reset` supprime seulement les users du seed et ce qui leur est lié (amitiés, channels, messages, notifications).

## Comptes

Mot de passe pour tous les comptes : `Transcendence42!`

| Username | Rôle      | Langue |
|----------|-----------|--------|
| alice    | USER      | FR     |
| bob      | USER      | EN     |
| charlie  | MODERATOR | EN     |
| diana    | USER      | ES     |
| emma     | USER      | FR     |
| admin42  | ADMIN     | EN     |

admin42 a aussi accès à l'admin Django.

Pour récupérer un token :

```bash
curl -X POST http://localhost/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "Transcendence42!"}'
```

## Données

- alice et bob sont amis
- charlie a envoyé une demande d'ami à alice (en attente)
- diana a bloqué bob
- emma et alice sont amies
- admin42 et charlie sont amis

Channels : `general` (public), `tournament-prep` (groupe), un channel privé entre alice et bob, `espanol` (public).

A ne pas lancer en production.
