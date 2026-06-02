#!/bin/sh
set -e

echo "Attente du démarrage de PostgreSQL..."
while ! nc -z postgres 5432; do
  sleep 0.1
done
echo "PostgreSQL lancé !"

echo "Lancement des migrations..."
python manage.py migrate

echo "Démarrage du serveur Django..."
python manage.py runserver 0.0.0.0:8000
