"""
Views for the users app.

This module defines API endpoints for registering a new user. It uses
Django REST Framework's generic views to handle common logic and leverages
the serializers defined in `serializers.py` for validation and object creation.
"""
from __future__ import annotations

from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status

from .serializers import RegisterSerializer, UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """API endpoint that allows users to register for a new account."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):  # type: ignore[override]
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # After successful registration, return the created user (without password fields)
        user_data = UserSerializer(user).data
        return Response(user_data, status=status.HTTP_201_CREATED)


class CurrentUserView(generics.RetrieveAPIView):
    """API endpoint to retrieve the authenticated user's information."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user