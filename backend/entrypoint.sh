#!/bin/sh
set -e

echo "Connexion a HashiCorp Vault ..."

echo "Attente du demarrage de Vault ..."
tries=0
until curl -sf --cacert "${VAULT_CACERT:-/etc/vault/ca.crt}" ${VAULT_ADDR}/v1/sys/health > /dev/null 2>&1; do
	tries=$((tries + 1))
	if [ "$tries" -ge 60 ]; then
		echo "ECHEC: Vault injoignable apres 120s" >&2
		exit 1
	fi
	sleep 2
done
echo "Vault lance !"

echo "Chargement des secrets depuis Vault..."
SECRETS=$(python3 /app/vault_fetch.py) || {
	echo "ECHEC: recuperation des secrets impossible" >&2
	exit 1
}

set -a
eval "$SECRETS"
set +a
echo "Secrets charges depuis Vault dans l'environnement !"

echo "Attente du demarrage de PostgreSQL..."
while ! nc -z postgres 5432; do
	sleep 0.1
done
echo "PostgreSQL lance !"

echo "Génération des migrations..."
python manage.py makemigrations --noinput

echo "Lancement des migrations..."
python manage.py migrate

echo "Démarrage du serveur Django..."
daphne -b 0.0.0.0 -p 8000 core.asgi:application
