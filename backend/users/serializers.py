import os
import re
from django.db.models import Q
from users.models import Friendship
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

User = get_user_model()

RESERVED_USERNAMES = {
    'admin', 'root', 'system', 'api', 'user', 'users',
    'support', 'help', 'moderator', 'mod', 'staff',
    'anonymous', 'guest', 'null', 'undefined',
    'me', 'self', 'register', 'login', 'logout',
}

USERNAME_REGEX = re.compile(r'^[a-zA-Z0-9_-]+$')

ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
MAX_AVATAR_SIZE = 5 * 1024 * 1024

class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.ImageField(required=True)

    def validate_avatar(self, value):
        if value.size > MAX_AVATAR_SIZE:
            raise serializers.ValidationError(
                f"Fichier trop volumineux. Maximum : {MAX_AVATAR_SIZE // (1024 * 1024)} Mo."
            )

        content_type = getattr(value, 'content_type', None)
        if content_type not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                f"Type non autorisé. Acceptés : {', '.join(ALLOWED_MIME_TYPES)}."
            )

        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"Extension non autorisée. Acceptées : {', '.join(ALLOWED_EXTENSIONS)}."
            )

        return value

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def validate_username(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Le nom d'utilisateur doit contenir au moins 3 caractères."
            )
        if len(value) > 30:
            raise serializers.ValidationError(
                "Le nom d'utilisateur ne doit pas dépasser 30 caractères."
            )
        if not USERNAME_REGEX.match(value):
            raise serializers.ValidationError(
                "Le nom d'utilisateur ne peut contenir que des lettres, "
                "chiffres, tirets et underscores."
            )
        if value.lower() in RESERVED_USERNAMES:
            raise serializers.ValidationError(
                "Ce nom d'utilisateur est réservé."
            )
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Ancien mot de passe incorrect.")
        return value

    def validate_new_password(self, value):
        try:
            validate_password(value, self.context['request'].user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email',
            'first_name', 'last_name', 'bio', 'avatar',
            'role', 'language',
            'is_online', 'last_seen',
            'two_fa_enabled',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'role', 'is_online', 'last_seen',
            'two_fa_enabled', 'created_at', 'updated_at',
        ]

    def validate_username(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Le nom d'utilisateur doit contenir au moins 3 caractères."
            )
        if len(value) > 30:
            raise serializers.ValidationError(
                "Le nom d'utilisateur ne doit pas dépasser 30 caractères."
            )
        if not USERNAME_REGEX.match(value):
            raise serializers.ValidationError(
                "Le nom d'utilisateur ne peut contenir que des lettres, "
                "chiffres, tirets et underscores."
            )
        if value.lower() in RESERVED_USERNAMES:
            raise serializers.ValidationError(
                "Ce nom d'utilisateur est réservé."
            )

        qs = User.objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "Ce nom d'utilisateur est déjà pris."
            )

        return value

    def validate_bio(self, value):
        if value is None:
            return value
        value = value.strip()
        if len(value) > 500:
            raise serializers.ValidationError(
                "La bio ne doit pas dépasser 500 caractères."
            )
        return value

    def validate_first_name(self, value):
        if value is None:
            return value
        value = value.strip()
        if len(value) > 150:
            raise serializers.ValidationError(
                "Le prénom ne doit pas dépasser 150 caractères."
            )
        return value

    def validate_last_name(self, value):
        if value is None:
            return value
        value = value.strip()
        if len(value) > 150:
            raise serializers.ValidationError(
                "Le nom ne doit pas dépasser 150 caractères."
            )
        return value

    def create(self, validated_data):
        user = User(**validated_data)
        user.save()
        return user

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class FriendshipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Friendship
        fields = ('id', 'addressee', 'requester', 'status', 'created_at', 'updated_at')
        read_only_fields = ('requester', 'status', 'created_at', 'updated_at')

    def validate(self, data):
        request = self.context.get('request')
        if request is None:
            return data

        user = request.user
        addressee = data.get('addressee')

        if addressee == user:
            raise serializers.ValidationError(
                {"addressee": "Vous ne pouvez pas vous ajouter vous-même."}
            )

        existing = Friendship.objects.filter(
            Q(requester=user, addressee=addressee) |
            Q(requester=addressee, addressee=user)
        ).first()

        if existing:
            if existing.status == Friendship.Status.ACCEPTED:
                msg = "Vous êtes déjà amis."
            elif existing.status == Friendship.Status.PENDING:
                msg = "Une demande est déjà en cours."
            elif existing.status == Friendship.Status.BLOCKED:
                msg = "Vous ne pouvez pas interagir avec cet utilisateur."
            else:
                msg = "Une relation existe déjà."
            raise serializers.ValidationError({"addressee": msg})

        return data
