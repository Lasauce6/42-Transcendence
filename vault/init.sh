#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

KEYS_DIR="vault/keys"
INIT_JSON="$KEYS_DIR/init.json"
APPROLE_ENV="$KEYS_DIR/approle.env"

vcli() {
	docker compose exec -T ${VAULT_TOKEN:+-e VAULT_TOKEN="$VAULT_TOKEN"} vault vault "$@"
}

json_field() {
	python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[sys.argv[2]][0] if sys.argv[2] == "unseal_keys_b64" else json.load(open(sys.argv[1]))[sys.argv[2]])' "$@"
}

echo "Attente du demarrage de Vault..."
tries=0
until vcli status > /dev/null 2>&1 || [ $? -eq 2 ]; do
	tries=$((tries + 1))
	[ "$tries" -ge 30 ] && { echo "Vault ne repond pas" >&2; exit 1; }
	sleep 2
done

mkdir -p "$KEYS_DIR"
chmod 700 "$KEYS_DIR"

FRESH_INIT=0
if vcli operator init -status 2>/dev/null | grep -qi "not initialized"; then
	echo "Initialisation de Vault..."
	vcli operator init -key-shares=1 -key-threshold=1 -format=json > "$INIT_JSON"
	chmod 600 "$INIT_JSON"
	echo "Cles stockees dans $INIT_JSON (ne pas committer)"
	FRESH_INIT=1
else
	[ -f "$INIT_JSON" ] || { echo "Vault deja initialise mais $INIT_JSON absent" >&2; exit 1; }
fi

UNSEAL_KEY=$(json_field "$INIT_JSON" unseal_keys_b64)
ROOT_TOKEN=$(json_field "$INIT_JSON" root_token)

if [ "$(vcli status -format=json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin).get("sealed", False))' 2>/dev/null)" = "True" ]; then
	echo "Unseal de Vault..."
	vcli operator unseal "$UNSEAL_KEY"
fi

if [ "$FRESH_INIT" -eq 0 ]; then
	echo "Vault deja configure, unseal effectue."
	exit 0
fi

export VAULT_TOKEN="$ROOT_TOKEN"

vcli secrets list -format=json | grep -q '"secret/"' || vcli secrets enable -path=secret kv-v2

vcli audit list -format=json | grep -q '"file/"' || vcli audit enable file file_path=/vault/logs/audit.log

vcli policy write transcendence-policy - <<'EOF'
path "secret/data/transcendence" {
  capabilities = ["read"]
}
EOF

vcli auth list -format=json | grep -q '"approle/"' || vcli auth enable approle
vcli write auth/approle/role/transcendence-backend \
	token_policies=transcendence-policy \
	token_ttl=1h token_max_ttl=4h secret_id_ttl=0

ROLE_ID=$(vcli read -field=role_id auth/approle/role/transcendence-backend/role-id)
SECRET_ID=$(vcli write -f -field=secret_id auth/approle/role/transcendence-backend/secret-id)

umask 077
printf 'VAULT_ROLE_ID=%s\nVAULT_SECRET_ID=%s\n' "$ROLE_ID" "$SECRET_ID" > "$APPROLE_ENV"

if ! grep -q '^VAULT_ROLE_ID=' .env 2>/dev/null; then
	printf '\nVAULT_ROLE_ID=%s\nVAULT_SECRET_ID=%s\n' "$ROLE_ID" "$SECRET_ID" >> .env
	echo "Identifiants AppRole ajoutes au .env"
else
	echo "Identifiants AppRole deja presents dans .env"
fi

echo "Injection initiale des secrets dans Vault..."
docker compose run --rm --no-deps \
	--entrypoint python3 \
	-e VAULT_TOKEN="$ROOT_TOKEN" \
	-e VAULT_CACERT=/etc/vault/ca.crt \
	backend /app/vault_seed.py

echo "Revocation du token root..."
vcli token revoke -self

echo "Initialisation terminee. Gardez $INIT_JSON et $APPROLE_ENV en lieu sur."
