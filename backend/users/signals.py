from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .files import delete_avatar_file

User = get_user_model()


@receiver(pre_save, sender=User)
def sync_role_and_is_staff(sender, instance, **kwargs):
    if instance.is_superuser:
        instance.role = "ADMIN"
        instance.is_staff = True
        return

    if instance.role == "ADMIN":
        instance.is_staff = True
    elif instance.role == "USER":
        instance.is_staff = False


@receiver(pre_save, sender=User)
def remember_old_avatar(sender, instance, update_fields=None, **kwargs):
    instance._old_avatar = None
    if instance._state.adding:
        return
    if update_fields is not None and "avatar" not in update_fields:
        return
    instance._old_avatar = (
        User.objects.filter(pk=instance.pk).values_list("avatar", flat=True).first()
    )


@receiver(post_save, sender=User)
def delete_replaced_avatar(sender, instance, created, **kwargs):
    old = getattr(instance, "_old_avatar", None)
    if old and old != instance.avatar.name:
        transaction.on_commit(lambda: delete_avatar_file(old))


@receiver(post_delete, sender=User)
def delete_avatar_on_user_delete(sender, instance, **kwargs):
    name = instance.avatar.name
    transaction.on_commit(lambda: delete_avatar_file(name))
