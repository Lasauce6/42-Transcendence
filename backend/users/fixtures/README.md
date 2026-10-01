# Realistic development fixture

This fixture seeds the current Django models with a small coherent dataset for manual development and UI testing.

It contains:

- 6 users (USER, MODERATOR and ADMIN roles; FR/EN/ES languages)
- friendships in ACCEPTED, PENDING and BLOCKED states
- PUBLIC, GROUP and PRIVATE channels
- channel memberships with ADMIN and MEMBER roles
- messages in every channel
- FRIEND and MESSAGE notifications, both read and unread

## Load the fixture

From the repository root while the Docker stack is running:

```bash
docker compose exec backend python manage.py loaddata realistic_test_data
```

Django discovers the file because it lives in an installed app's `fixtures/` directory.

For a predictable result, load it into a clean development database. Loading it again is safe when the rows still have the same fixture primary keys, but manually-created users with the same username/email can cause uniqueness conflicts.

## Demo accounts

All fixture users share the same development-only password:

```text
Transcendence42!
```

Available usernames:

```text
alice
bob
charlie
diana
emma
admin42
```

The password hashes are stored in Django's `pbkdf2_sha256` format; the plaintext password is documented here only because this is development/test data.

## Quick checks

```bash
docker compose exec backend python manage.py shell -c "from users.models import User, Friendship; from chat.models import Channel, ChannelMember, Message; from api.models import Notification; print('users=', User.objects.count(), 'friendships=', Friendship.objects.count(), 'channels=', Channel.objects.count(), 'members=', ChannelMember.objects.count(), 'messages=', Message.objects.count(), 'notifications=', Notification.objects.count())"
```

Expected counts when loading into an otherwise empty application database:

```text
users=6 friendships=5 channels=4 members=13 messages=17 notifications=8
```