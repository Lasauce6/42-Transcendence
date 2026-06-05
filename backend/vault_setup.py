import os
import sys
import json
import urllib.request
import urllib.error

vault_addr = os.environ.get("VAULT_ADDR")
vault_token = os.environ.get("VAULT_DEV_ROOT_TOKEN_ID")
db_user = os.environ.get("POSTGRES_USER")
db_pass = os.environ.get("POSTGRES_PASSWORD")
db_name = os.environ.get("POSTGRES_DB")
django_key = os.environ.get("DJANGO_SECRET_KEY")

if not all([vault_addr, vault_token, db_user, db_pass, db_name, django_key]):
    print("Erreur: Variables d'environnement manquantes pour Vault.", file=sys.stderr)
    sys.exit(1)

db_url = f"postgres://{db_user}:{db_pass}@postgres:5432/{db_name}"
url = f"{vault_addr}/v1/secret/data/transcendence"

payload = json.dumps({
    "data": {
        "DJANGO_SECRET_KEY": django_key,
        "DATABASE_URL": db_url
    }
}).encode("utf-8")

req_post = urllib.request.Request(url, data=payload, headers={
    "X-Vault-Token": vault_token,
    "Content-Type": "application/json"
}, method="POST")

try:
    with urllib.request.urlopen(req_post) as response:
        pass
except urllib.error.URLError as e:
    print(f"Erreur lors de l'injection dans Vault: {e}", file=sys.stderr)
    sys.exit(1)

# 2. Récupérer les secrets depuis Vault
req_get = urllib.request.Request(url, headers={
    "X-Vault-Token": vault_token
})

try:
    with urllib.request.urlopen(req_get) as response:
        resp_data = json.loads(response.read().decode())
        if "data" in resp_data and "data" in resp_data["data"]:
            secrets = resp_data["data"]["data"]
            # Afficher les exports pour que le script Bash puisse les évaluer
            for k, v in secrets.items():
                print(f"export {k}={v}")
        else:
            print(f"Format de reponse Vault inattendu: {resp_data}", file=sys.stderr)
            sys.exit(1)
except urllib.error.URLError as e:
    print(f"Erreur lors de la lecture depuis Vault: {e}", file=sys.stderr)
    sys.exit(1)
