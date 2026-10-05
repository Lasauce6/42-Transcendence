from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .files import delete_attachment_file
from .models import Attachment


@receiver(post_delete, sender=Attachment)
def delete_file_on_attachment_delete(sender, instance, **kwargs):
    name = instance.file.name
    transaction.on_commit(lambda: delete_attachment_file(name))
