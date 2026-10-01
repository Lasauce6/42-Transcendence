from django.core.management.base import BaseCommand

from users.models import User, Friendship
from chat.models import Channel, ChannelMember, Message
from api.models import Notification


class Command(BaseCommand):

    def handle(self, *args, **options):

        users_data = [
            ("alice", "Alice", "Martin", "alice@example.test", "USER", "FR"),
            ("bob", "Bob", "Durand", "bob@example.test", "USER", "EN"),
            ("charlie", "Charlie", "Bernard", "charlie@example.test", "MODERATOR", "EN"),
            ("diana", "Diana", "Lopez", "diana@example.test", "USER", "ES"),
            ("emma", "Emma", "Petit", "emma@example.test", "USER", "FR"),
            ("admin42", "Admin", "FortyTwo", "admin42@example.test", "ADMIN", "EN"),
        ]

        users = {}

        for username, first_name, last_name, email, role, language in users_data:

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "role": role,
                    "language": language,
                    "is_active": True,
                    "is_online": False,
                },
            )

            if created:
                user.set_password("Transcendence42!")
                user.save()

            users[username] = user

        friendships_data = [
            ("alice", "bob", "ACCEPTED"),
            ("charlie", "alice", "PENDING"),
            ("diana", "bob", "BLOCKED"),
            ("emma", "alice", "ACCEPTED"),
            ("admin42", "charlie", "ACCEPTED"),
        ]

        friendships = []

        for requester, addressee, status in friendships_data:

            friendship, _ = Friendship.objects.get_or_create(
                requester=users[requester],
                addressee=users[addressee],
                defaults={
                    "status": status
                },
            )

            friendships.append(friendship)

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

            ChannelMember.objects.get_or_create(
                channel=channels[channel],
                user=users[username],
                defaults={
                    "role": role
                },
            )

        messages_data = [
            ("general", "alice", "Salut tout le monde 👋"),
            ("general", "bob", "Hello Alice ! Prêt pour une partie ce soir ?"),
            ("general", "charlie", "Je prépare aussi un petit tournoi pour ce week-end."),
            ("general", "emma", "Bonne idée, je suis partante."),
            ("general", "admin42", "Pensez à signaler les bugs trouvés pendant les tests."),
            ("general", "alice", "Je vais tester le chat et les notifications aujourd’hui."),

            ("tournament-prep", "charlie", "On utilise ce channel pour préparer le tournoi."),
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

        messages = []

        for channel, sender, content in messages_data:

            message = Message.objects.create(
                channel=channels[channel],
                sender=users[sender],
                content=content,
                is_deleted=False,
            )

            messages.append(message)

        Notification.objects.create(
            recipient=users["alice"],
            type="FRIEND",
            entity_type="Friendship",
            entity_id=friendships[1].id,
            payload={
                "from_username": "charlie",
                "action": "request",
            },
            is_read=False,
        )

        Notification.objects.create(
            recipient=users["emma"],
            type="FRIEND",
            entity_type="Friendship",
            entity_id=friendships[3].id,
            payload={
                "from_username": "alice",
                "action": "accepted",
            },
            is_read=True,
        )

        Notification.objects.create(
            recipient=users["bob"],
            type="MESSAGE",
            entity_type="Channel",
            entity_id=channels["general"].id,
            payload={
                "from_username": "alice",
                "channel_name": "general",
                "preview": "Je vais tester le chat et les notifications aujourd’hui.",
            },
            is_read=False,
        )

        Notification.objects.create(
            recipient=users["alice"],
            type="MESSAGE",
            entity_type="Channel",
            entity_id=channels["private"].id,
            payload={
                "from_username": "bob",
                "preview": "Pour le moment tout fonctionne 👍",
            },
            is_read=False,
        )

        Notification.objects.create(
            recipient=users["alice"],
            type="MESSAGE",
            entity_type="Channel",
            entity_id=channels["tournament-prep"].id,
            payload={
                "from_username": "charlie",
                "channel_name": "tournament-prep",
                "preview": "Parfait. On fait un point demain matin.",
            },
            is_read=True,
        )

        Notification.objects.create(
            recipient=users["emma"],
            type="MESSAGE",
            entity_type="Channel",
            entity_id=channels["espanol"].id,
            payload={
                "from_username": "diana",
                "channel_name": "espanol",
                "preview": "¡Hola! Este canal es para hablar en español.",
            },
            is_read=False,
        )

        print("Users:", User.objects.count())
        print("Friendships:", Friendship.objects.count())
        print("Channels:", Channel.objects.count())
        print("Channel members:", ChannelMember.objects.count())
        print("Messages:", Message.objects.count())
        print("Notifications:", Notification.objects.count())