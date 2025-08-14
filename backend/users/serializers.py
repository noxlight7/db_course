"""
Serializers for the users app.

These classes convert complex data such as Django model instances to native
Python datatypes that can then be easily rendered into JSON or other
content types. They also provide deserialization, allowing parsed data
to be converted back into complex types after first validating the
incoming data.
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for reading user details."""

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'credits')
        read_only_fields = ('id', 'credits')


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for registering a new user.

    Validates that the username is unique, the email has a plausible format,
    and that the two provided passwords match and meet length requirements.
    """

    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True, label='Confirm password')

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Это имя пользователя уже занято.')
        return value

    def validate_password(self, value: str) -> str:
        # Enforce password length between 8 and 24 characters
        if not (8 <= len(value) <= 24):
            raise serializers.ValidationError('Пароль должен содержать от 8 до 24 символов.')
        # Use Django's built-in password validators for additional checks
        validate_password(value)
        return value

    def validate_email(self, value: str) -> str:
        # A simple check that the email contains an '@' character. Real-world
        # implementations should perform more thorough validation or rely on
        # Django's built-in validators.
        if '@' not in value:
            raise serializers.ValidationError('Введите корректный адрес электронной почты.')
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Пользователь с таким адресом уже существует.')
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({'password2': 'Пароли не совпадают.'})
        return attrs

    def create(self, validated_data: dict) -> User:
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
        )
        user.set_password(validated_data['password'])
        user.save()
        return user