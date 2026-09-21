import os

import hvac

_vault_secrets = None


def get_vault_client():
    token = os.environ.get("VAULT_ROOT_TOKEN") or os.environ.get(
        "VAULT_DEV_ROOT_TOKEN_ID"
    )
    return hvac.Client(
        url=os.environ["VAULT_ADDR"],
        token=token,
    )


def load_secrets_from_vault():
    global _vault_secrets
    if _vault_secrets is not None:
        return _vault_secrets

    client = get_vault_client()
    response = client.secrets.kv.v2.read_secret_version(
        path="transcendence",
        mount_point="secret",
    )
    _vault_secrets = response["data"]["data"]
    return _vault_secrets


def get_vault_secret(key, default=None):
    try:
        secrets = load_secrets_from_vault()
        return secrets.get(key, default)
    except Exception:
        return os.environ.get(key, default)
