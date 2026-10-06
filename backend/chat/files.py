import os
import uuid

from django.conf import settings
from django.core import signing
from django.core.files.storage import default_storage
from django.urls import reverse
from PIL import Image

ALLOWED_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

PREVIEW_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}

SIGNATURES = {
    ".pdf": b"%PDF",
    ".docx": b"PK\x03\x04",
    ".xlsx": b"PK\x03\x04",
}

URL_SALT = "chat.attachment"


class InvalidAttachment(Exception):
    pass


def validate_attachment(file):
    if file.size > settings.ATTACHMENT_MAX_SIZE:
        raise InvalidAttachment(
            f"Fichier trop volumineux. Maximum : {settings.ATTACHMENT_MAX_SIZE // (1024 * 1024)} Mo."
        )

    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_TYPES:
        raise InvalidAttachment(
            f"Extension non autorisée. Acceptées : {', '.join(sorted(ALLOWED_TYPES))}."
        )

    content_type = ALLOWED_TYPES[ext]

    if content_type.startswith("image/"):
        try:
            Image.open(file).verify()
        except Exception:
            raise InvalidAttachment("Image invalide.")
    elif ext in SIGNATURES:
        header = file.read(len(SIGNATURES[ext]))
        if header != SIGNATURES[ext]:
            raise InvalidAttachment("Le contenu du fichier ne correspond pas à son extension.")
    elif ext == ".txt":
        try:
            file.read(1024).decode("utf-8")
        except UnicodeDecodeError:
            raise InvalidAttachment("Le fichier texte doit être en UTF-8.")

    file.seek(0)
    return content_type


def attachment_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"attachments/{instance.message.channel_id}/{uuid.uuid4()}{ext}"


def make_attachment_url(attachment_id, user_id):
    token = signing.dumps({"a": str(attachment_id), "u": str(user_id)}, salt=URL_SALT)
    path = reverse("attachment_download", kwargs={"pk": attachment_id})
    return f"{path}?token={token}"


def read_attachment_token(token):
    return signing.loads(token, salt=URL_SALT, max_age=settings.ATTACHMENT_URL_MAX_AGE)


def attachment_data(attachment):
    return {
        "id": str(attachment.id),
        "name": attachment.original_name,
        "content_type": attachment.content_type,
        "size": attachment.size,
    }


def delete_attachment_file(name):
    if name and default_storage.exists(name):
        default_storage.delete(name)
