#!/bin/sh
set -e

echo "Connexion a HashiCorp Vault ..."

echo "Attente du demarrage de Vault ..."
until curl -s ${VAULT_ADDR}/v1/sys/health > /dev/null 2>&1; do\
	sleep 2
done
echo "Vault lance !"

echo "Synchronisation des secrets avec le .env..."
SECRETS=$(python3 /app/vault_setup.py)

eval $SECRETS
echo "Secrets charges depuis Vault dans l'environnement !"

echo "Attente du demarrage de PostgreSQL..."
while ! nc -z postgres 5432; do
	sleep 0.1
done
echo "PostgreSQL lance !"

echo "Lancement des migrations..."
python manage.py migrate

echo "Démarrage du serveur Django..."
python manage.py runserver 0.0.0.0:8000
