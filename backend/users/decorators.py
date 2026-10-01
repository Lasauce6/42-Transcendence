from functools import wraps

from django.core.exceptions import PermissionDenied


def has_role(*roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = request.user
            if not user.is_authenticated or user.role not in roles:
                raise PermissionDenied("Vous n'avez pas les droits requis.")
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator