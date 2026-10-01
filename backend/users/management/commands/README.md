# Seed data

Cette commande permet de générer des données de test pour le projet Django.

Elle crée notamment :

- des utilisateurs
- des relations d'amitié
- des channels
- des membres de channels
- des messages
- des notifications

Les UUID sont générés automatiquement par Django.

Les mots de passe sont hashés avec `set_password()`.

## Lancer le seed

Depuis la racine du projet :

```bash
docker compose exec backend python manage.py seed_data