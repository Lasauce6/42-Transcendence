import json
import os
import sys
import urllib.error
import urllib.request

vault_addr = os.environ.get("VAULT_ADDR")
vault_token = os.environ.get("VAULT_DEV_ROOT_TOKEN_ID")
if not (vault_token):
    sys.exit(1)
db_user = os.environ.get("POSTGRES_USER")
db_pass = os.environ.get("POSTGRES_PASSWORD")
db_name = os.environ.get("POSTGRES_DB")
django_key = os.environ.get("DJANGO_SECRET_KEY")

# OAuth secrets depuis le .env
oauth42_client_id = os.environ.get("OAUTH42_CLIENT_ID")
oauth42_client_secret = os.environ.get("OAUTH42_CLIENT_SECRET")
oauth_google_client_id = os.environ.get("OAUTH_GOOGLE_CLIENT_ID")
oauth_google_client_secret = os.environ.get("OAUTH_GOOGLE_CLIENT_SECRET")
oauth_github_client_id = os.environ.get("OAUTH_GITHUB_CLIENT_ID")
oauth_github_client_secret = os.environ.get("OAUTH_GITHUB_CLIENT_SECRET")

# 2FA secrets depuis le .env
totp_encryption_key = os.environ.get("TOTP_ENCRYPTION_KEY")
totp_issuer_name = os.environ.get("TOTP_ISSUER_NAME")

required = [vault_addr, vault_token, db_user, db_pass, db_name, django_key,
            oauth42_client_id, oauth42_client_secret]
if not all(required):
    print("Erreur: Variables d'environnement manquantes.", file=sys.stderr)
    sys.exit(1)

db_url = f"postgres://{db_user}:{db_pass}@postgres:5432/{db_name}"
url = f"{vault_addr}/v1/secret/data/transcendence"

payload = json.dumps({
    "data": {
        "DJANGO_SECRET_KEY": django_key,
        "DATABASE_URL": db_url,
        "OAUTH42_CLIENT_ID": oauth42_client_id,
        "OAUTH42_CLIENT_SECRET": oauth42_client_secret,
        "OAUTH_GOOGLE_CLIENT_ID": oauth_google_client_id,
        "OAUTH_GOOGLE_CLIENT_SECRET": oauth_google_client_secret,
        "OAUTH_GITHUB_CLIENT_ID": oauth_github_client_id,
        "OAUTH_GITHUB_CLIENT_SECRET": oauth_github_client_secret,
        "TOTP_ENCRYPTION_KEY": totp_encryption_key,
        "TOTP_ISSUER_NAME": totp_issuer_name,
    }
}).encode("utf-8")

req_post = urllib.request.Request(
    url,
    data=payload,
    headers={"X-Vault-Token": vault_token, "Content-Type": "application/json"},
    method="POST",
)

try:
    urllib.request.urlopen(req_post)
except urllib.error.URLError as e:
    print(f"Erreur lors de l'injection dans Vault: {e}", file=sys.stderr)
    sys.exit(1)

# Récupération
req_get = urllib.request.Request(url, headers={"X-Vault-Token": vault_token})

try:
    with urllib.request.urlopen(req_get) as response:
        resp_data = json.loads(response.read().decode())
        if "data" in resp_data and "data" in resp_data["data"]:
            secrets = resp_data["data"]["data"]
            for k, v in secrets.items():
                print(f"export {k}={v}")
        else:
            print(f"Format inattendu: {resp_data}", file=sys.stderr)
            sys.exit(1)
except urllib.error.URLError as e:
    print(f"Erreur lors de la lecture depuis Vault: {e}", file=sys.stderr)
    sys.exit(1)
