# 42-Transcendence

## Vault (gestion des secrets)

Vault tourne en mode serveur (prod) : stockage fichier persistant sur `./vault/data`, TLS interne (mini-CA locale), authentification AppRole cote backend, audit actif.

### Fichiers sensibles (jamais committes, couverts par .gitignore)

- `vault/tls/*` : CA et certificat serveur
- `vault/keys/init.json` : cle d'unseal (+ token root, revoque apres init)
- `vault/keys/approle.env` : role_id / secret_id du backend
- `vault/data/`, `vault/logs/`

### Mise en route

```sh
cp .env.example .env   # puis renseigner vos valeurs (Postgres, OAuth, TOTP...)
make up                # genere les certificats TLS, demarre la stack,
                       # init Vault (unseal, AppRole, seed des secrets)
```

`make up` prepare automatiquement les artefacts Vault gitignores via la cible
`vault-prepare` (certificats TLS de `vault/tls/gen.sh`, fixation des
permissions via `fix-perms.sh`) : un clone frais avec un `.env` demarre tel quel.
L'init est idempotent : relancez `init.sh` apres un redemarrage pour unseal.

⚠️ Si vous avez deja lance `docker compose up` directement avant `make up`,
des dossiers peuvent etre crees par Docker en tant que root (empoisonnement).
`make up` auto-repare ce cas : les certificats TLS sont regeneres et les
permissions corrigees sans sudo.

### Au demarrage

Le backend (`vault_fetch.py`, appele par `entrypoint.sh`) se connecte en AppRole,
lit `secret/data/transcendence` et exporte les variables (DATABASE_URL,
DJANGO_SECRET_KEY, OAuth, TOTP) avant de lancer Django. Le `.env` n'est plus lu
au demarrage pour ces secrets.

### Rotation d'un secret

1. Mettre a jour la valeur dans le `.env` (source de la rotation).
2. Generer un token root temporaire :
   `docker compose exec vault vault operator generate-root ...` ou relancer
   `docker compose run --rm --entrypoint python3 -e VAULT_TOKEN=<token> backend /app/vault_seed.py`.
3. Redemarrer le backend : `docker compose restart backend`.
   Attention : changer `DJANGO_SECRET_KEY` invalide les sessions en cours.

### Backup / restore

- Backup : arreter Vault puis archiver `./vault/data` (chiffre) avec `vault/keys/init.json`.
- Restore : remettre `vault/data` en place, `docker compose up -d vault`, puis `sh vault/init.sh` pour unseal.
- Le log d'audit est dans `vault/logs/audit.log`.
