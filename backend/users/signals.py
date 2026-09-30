from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

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
