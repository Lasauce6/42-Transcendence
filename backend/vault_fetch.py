import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request

vault_addr = os.environ.get("VAULT_ADDR")
ca_cert = os.environ.get("VAULT_CACERT")
role_id = os.environ.get("VAULT_ROLE_ID")
secret_id = os.environ.get("VAULT_SECRET_ID")

required = {
    "VAULT_ADDR": vault_addr,
    "VAULT_ROLE_ID": role_id,
    "VAULT_SECRET_ID": secret_id,
}
missing = [k for k, v in required.items() if not v]
if missing:
    print(f"Variables d'environnement manquantes: {missing}", file=sys.stderr)
    sys.exit(1)

context = ssl.create_default_context(cafile=ca_cert)
attempts = 30
delay = 2


def request(url, headers, data=None):
    req = urllib.request.Request(url, data=data, headers=headers, method=None)
    return urllib.request.urlopen(req, context=context)


token = None
last_error = None
for _ in range(attempts):
    try:
        login_payload = json.dumps({"role_id": role_id, "secret_id": secret_id}).encode("utf-8")
        with request(
            f"{vault_addr}/v1/auth/approle/login",
            {"Content-Type": "application/json"},
            login_payload,
        ) as response:
            token = json.loads(response.read().decode())["auth"]["client_token"]
        break
    except Exception as e:
        last_error = e
        time.sleep(delay)

if not token:
    print(f"Login AppRole impossible apres {attempts} tentatives: {last_error}", file=sys.stderr)
    sys.exit(1)

last_error = None
for _ in range(attempts):
    try:
        with request(
            f"{vault_addr}/v1/secret/data/transcendence",
            {"X-Vault-Token": token},
        ) as response:
            secrets = json.loads(response.read().decode())["data"]["data"]
        break
    except Exception as e:
        last_error = e
        time.sleep(delay)
else:
    print(f"Lecture des secrets impossible: {last_error}", file=sys.stderr)
    sys.exit(1)

for key, value in secrets.items():
    if value is None:
        continue
    print(f'export {key}="{value}"')
