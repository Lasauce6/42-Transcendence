from django.db.models import Q
from users.models import Friendship
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

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
