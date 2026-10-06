import logging

audit_logger = logging.getLogger("audit")


def _get_client_ip(request):
    """Extrait l'IP réelle du client (gère les proxys)."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def log_action(request, action, target=None, details=None):
    """
    Écrit une ligne d'audit dans logs/audit.log.

    Args:
        request: la requête HTTP (pour l'IP et l'utilisateur)
        action (str): ex 'LOGIN', 'BAN', 'DELETE_MESSAGE'
        target: l'objet concerné (User, Channel, Message...) ou None
        details (dict): infos libres (reason, channel_name, etc.)
    """
    user = getattr(request, "user", None)
    username = user.username if user and user.is_authenticated else "anonymous"
    ip = _get_client_ip(request)

    target_repr = ""
    if target is not None:
        target_repr = f" | target={target.__class__.__name__}:{getattr(target, 'id', '?')}"

    details_repr = ""
    if details:
        details_repr = " | " + " ".join(f"{k}={v}" for k, v in details.items())

    audit_logger.info(
        f"user={username} ip={ip} action={action}{target_repr}{details_repr}"
    )