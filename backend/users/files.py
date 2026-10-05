from django.core.files.storage import default_storage

DEFAULT_AVATAR = "avatars/default.png"


def delete_avatar_file(name):
    if not name or name == DEFAULT_AVATAR:
        return
    if default_storage.exists(name):
        default_storage.delete(name)
