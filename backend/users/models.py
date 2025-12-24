"""
Custom user model for the game application.

This model extends Django's AbstractUser to add a ``credits`` field
representing the number of in-game credits a user possesses.
"""
from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with additional credits field."""

    email = models.EmailField(unique=True)
    credits = models.PositiveIntegerField(default=0, help_text="Number of credits available to the user.")
    is_admin = models.BooleanField(
        default=False,
        help_text="Designates whether the user has application-level admin access.",
    )

    def __str__(self) -> str:
        return self.username
