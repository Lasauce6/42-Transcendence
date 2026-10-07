import json
import os
import ssl
import sys
import urllib.error
import urllib.request

vault_addr = os.environ.get("VAULT_ADDR")
vault_token = os.environ.get("VAULT_TOKEN")
ca_cert = os.environ.get("VAULT_CACERT")

db_user = os.environ.get("POSTGRES_USER")
db_pass = os.environ.get("POSTGRES_PASSWORD")
db_name = os.environ.get("POSTGRES_DB")
django_key = os.environ.get("DJANGO_SECRET_KEY")

oauth_42_client_id = os.environ.get("OAUTH_42_CLIENT_ID")
oauth_42_client_secret = os.environ.get("OAUTH_42_CLIENT_SECRET")
oauth_google_client_id = os.environ.get("OAUTH_GOOGLE_CLIENT_ID")
oauth_google_client_secret = os.environ.get("OAUTH_GOOGLE_CLIENT_SECRET")
oauth_github_client_id = os.environ.get("OAUTH_GITHUB_CLIENT_ID")
oauth_github_client_secret = os.environ.get("OAUTH_GITHUB_CLIENT_SECRET")

totp_encryption_key = os.environ.get("TOTP_ENCRYPTION_KEY")
totp_issuer_name = os.environ.get("TOTP_ISSUER_NAME")

required = {
    "VAULT_ADDR": vault_addr,
    "VAULT_TOKEN": vault_token,
    "POSTGRES_USER": db_user,
    "POSTGRES_PASSWORD": db_pass,
    "POSTGRES_DB": db_name,
    "DJANGO_SECRET_KEY": django_key,
    "OAUTH_42_CLIENT_ID": oauth_42_client_id,
    "OAUTH_42_CLIENT_SECRET": oauth_42_client_secret,
}
missing = [k for k, v in required.items() if not v]
if missing:
    print(f"Variables d'environnement manquantes: {missing}", file=sys.stderr)
    sys.exit(1)

context = ssl.create_default_context(cafile=ca_cert)
db_url = f"postgres://{db_user}:{db_pass}@postgres:5432/{db_name}"
url = f"{vault_addr}/v1/secret/data/transcendence"

payload = json.dumps({
    "data": {
        "DJANGO_SECRET_KEY": django_key,
        "DATABASE_URL": db_url,
        "OAUTH_42_CLIENT_ID": oauth_42_client_id,
        "OAUTH_42_CLIENT_SECRET": oauth_42_client_secret,
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
    with urllib.request.urlopen(req_post, context=context) as response:
        if response.status not in (200, 204):
            print(f"Echec ecriture Vault: HTTP {response.status}", file=sys.stderr)
            sys.exit(1)
except urllib.error.URLError as e:
    print(f"Erreur lors de l'injection dans Vault: {e}", file=sys.stderr)
    sys.exit(1)

req_get = urllib.request.Request(url, headers={"X-Vault-Token": vault_token})

try:
    with urllib.request.urlopen(req_get, context=context) as response:
        resp_data = json.loads(response.read().decode())
        secrets = resp_data["data"]["data"]
        written = sorted(k for k, v in secrets.items() if v)
        print(f"Secrets injectes et verifies: {written}")
except (urllib.error.URLError, KeyError, json.JSONDecodeError) as e:
    print(f"Erreur lors de la verification depuis Vault: {e}", file=sys.stderr)
    sys.exit(1)
