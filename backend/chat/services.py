from django.db import transaction

from .models import Channel, ChannelMember


def find_private_channel(user_a, user_b):
    """Renvoie la conversation privée entre deux utilisateurs, ou None."""
    candidates = Channel.objects.filter(
        type=Channel.ChannelType.PRIVATE,
        members__user=user_a,
    ).filter(members__user=user_b)
    for channel in candidates:
        if channel.members.count() == 2:
            return channel
    return None


@transaction.atomic
def get_or_create_private_channel(user_a, user_b):
    """Une seule conversation privée par paire : on la réutilise si elle existe."""
    channel = find_private_channel(user_a, user_b)
    if channel:
        return channel, False
    channel = Channel.objects.create(
        type=Channel.ChannelType.PRIVATE, created_by=user_a
    )
    ChannelMember.objects.create(channel=channel, user=user_a)
    ChannelMember.objects.create(channel=channel, user=user_b)
    return channel, True
