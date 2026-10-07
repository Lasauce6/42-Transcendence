import os
from datetime import timedelta

from api.models import Notification
from chat.models import Channel, ChannelMember, Message
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from users.models import Friendship, User

PASSWORD = os.environ.get("SEED_PASSWORD", "Transcendence42!")

USERS_DATA = [
    ("alice", "Alice", "Martin", "alice@example.test", "USER", "FR"),
    ("bob", "Bob", "Durand", "bob@example.test", "USER", "EN"),
    ("charlie", "Charlie", "Bernard", "charlie@example.test", "MODERATOR", "EN"),
    ("diana", "Diana", "Lopez", "diana@example.test", "USER", "ES"),
    ("emma", "Emma", "Petit", "emma@example.test", "USER", "FR"),
    ("admin42", "Admin", "FortyTwo", "admin42@example.test", "ADMIN", "EN"),
]

SEED_USERNAMES = [data[0] for data in USERS_DATA]


class Command(BaseCommand):
    help = (
        "Peuple la DB avec des données de test réalistes "
        "(users, amitiés, channels, messages, notifications). "
        f"Mot de passe commun : {PASSWORD}"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime les données du seed existantes avant de les recréer.",
        )

    def handle(self, *args, **options):
        existing = User.objects.filter(username__in=SEED_USERNAMES)

        if existing.exists() and not options["reset"]:
            self.stdout.write(
                self.style.WARNING(
                    "Le seed est déjà présent en base. Utilise --reset pour le recréer."
                )
            )
            return

        with transaction.atomic():
            if options["reset"]:
                deleted, _ = existing.delete()
                self.stdout.write(f"Reset : {deleted} objets supprimés.")

            self._seed()

        self.stdout.write(self.style.SUCCESS("Seed terminé."))
        self.stdout.write(f"Users: {User.objects.count()}")
        self.stdout.write(f"Friendships: {Friendship.objects.count()}")
        self.stdout.write(f"Channels: {Channel.objects.count()}")
        self.stdout.write(f"Channel members: {ChannelMember.objects.count()}")
        self.stdout.write(f"Messages: {Message.objects.count()}")
        self.stdout.write(f"Notifications: {Notification.objects.count()}")
        self.stdout.write(
            f"Comptes : {', '.join(SEED_USERNAMES)} / mot de passe : {PASSWORD}"
        )

    def _seed(self):
        now = timezone.now()

        users = {}

        for username, first_name, last_name, email, role, language in USERS_DATA:
            user = User(
                username=username,
                first_name=first_name,
                last_name=last_name,
                email=email,
                role=role,
                language=language,
                is_active=True,
                is_online=False,
                last_seen=now - timedelta(hours=len(users) + 1),
                is_staff=(role == "ADMIN"),
                is_superuser=(role == "ADMIN"),
            )
            user.set_password(PASSWORD)
            user.save()

            users[username] = user

        friendships_data = [
            ("alice", "bob", "ACCEPTED"),
            ("charlie", "alice", "PENDING"),
            ("diana", "bob", "BLOCKED"),
            ("emma", "alice", "ACCEPTED"),
            ("admin42", "charlie", "ACCEPTED"),
        ]

        friendships = {}

        for requester, addressee, status in friendships_data:
            friendships[(requester, addressee)] = Friendship.objects.create(
                requester=users[requester],
                addressee=users[addressee],
                status=status,
            )

        channels_data = [
            ("general", "PUBLIC", "alice"),
            ("tournament-prep", "GROUP", "charlie"),
            (None, "PRIVATE", "alice"),
            ("espanol", "PUBLIC", "diana"),
        ]

        channels = {}

        for name, channel_type, creator in channels_data:
            channel = Channel.objects.create(
                name=name,
                type=channel_type,
                created_by=users[creator],
            )

            key = name if name is not None else "private"
            channels[key] = channel

        members_data = [
            ("general", "alice", "ADMIN"),
            ("general", "bob", "MEMBER"),
            ("general", "charlie", "MEMBER"),
            ("general", "emma", "MEMBER"),
            ("general", "admin42", "MEMBER"),
            ("tournament-prep", "charlie", "ADMIN"),
            ("tournament-prep", "alice", "MEMBER"),
            ("tournament-prep", "bob", "MEMBER"),
            ("private", "alice", "ADMIN"),
            ("private", "bob", "MEMBER"),
            ("espanol", "diana", "ADMIN"),
            ("espanol", "emma", "MEMBER"),
            ("espanol", "admin42", "MEMBER"),
        ]

        for channel, username, role in members_data:
            ChannelMember.objects.create(
                channel=channels[channel],
                user=users[username],
                role=role,
            )

        messages_data = [
            ("general", "alice", "Salut tout le monde 👋"),
            ("general", "bob", "Hello Alice ! Prêt pour une partie ce soir ?"),
            (
                "general",
                "charlie",
                "Je prépare aussi un petit tournoi pour ce week-end.",
            ),
            ("general", "emma", "Bonne idée, je suis partante."),
            (
                "general",
                "admin42",
                "Pensez à signaler les bugs trouvés pendant les tests.",
            ),
            (
                "general",
                "alice",
                "Je vais tester le chat et les notifications aujourd’hui.",
            ),
            (
                "tournament-prep",
                "charlie",
                "On utilise ce channel pour préparer le tournoi.",
            ),
            ("tournament-prep", "alice", "Je peux m’occuper du planning des matchs."),
            ("tournament-prep", "bob", "Je teste le matchmaking de mon côté."),
            ("tournament-prep", "charlie", "Parfait. On fait un point demain matin."),
            ("private", "alice", "Tu as vu le nouveau système de notifications ?"),
            ("private", "bob", "Oui, je viens de le tester."),
            ("private", "alice", "Super, dis-moi si tu vois un comportement bizarre."),
            ("private", "bob", "Pour le moment tout fonctionne 👍"),
            ("espanol", "diana", "¡Hola! Este canal es para hablar en español."),
            ("espanol", "emma", "¡Hola Diana! Estoy aprendiendo español."),
            ("espanol", "admin42", "Bienvenidos al canal."),
        ]

        start = now - timedelta(minutes=3 * len(messages_data))

        for i, (channel, sender, content) in enumerate(messages_data):
            message = Message.objects.create(
                channel=channels[channel],
                sender=users[sender],
                content=content,
                is_deleted=False,
            )
            Message.objects.filter(pk=message.pk).update(
                created_at=start + timedelta(minutes=3 * i),
                updated_at=start + timedelta(minutes=3 * i),
            )

        def friend_notification(recipient, friendship, from_username, action, is_read):
            Notification.objects.create(
                recipient=users[recipient],
                type="FRIEND",
                entity_type="Friendship",
                entity_id=friendship.id,
                payload={
                    "from_username": from_username,
                    "action": action,
                },
                is_read=is_read,
            )

        def message_notification(
            recipient, channel_key, from_username, preview, is_read
        ):
            channel = channels[channel_key]
            sender = users[from_username]
            Notification.objects.create(
                recipient=users[recipient],
                type="MESSAGE",
                entity_type="Channel",
                entity_id=channel.id,
                payload={
                    "from_id": str(sender.id),
                    "from_username": sender.username,
                    "channel_id": str(channel.id),
                    "channel_name": channel.name or str(channel.id),
                    "preview": preview[:80],
                },
                is_read=is_read,
            )

        friend_notification(
            "alice", friendships[("charlie", "alice")], "charlie", "request", False
        )
        friend_notification(
            "emma", friendships[("emma", "alice")], "alice", "accepted", True
        )

        message_notification(
            "bob",
            "general",
            "alice",
            "Je vais tester le chat et les notifications aujourd’hui.",
            False,
        )
        message_notification(
            "alice",
            "private",
            "bob",
            "Pour le moment tout fonctionne 👍",
            False,
        )
        message_notification(
            "alice",
            "tournament-prep",
            "charlie",
            "Parfait. On fait un point demain matin.",
            True,
        )
        message_notification(
            "emma",
            "espanol",
            "diana",
            "¡Hola! Este canal es para hablar en español.",
            False,
        )
