"""
URL configurations for the users app.

Defines endpoints for registration and retrieving the current user's data.
"""
from django.urls import path

from .views import RegisterView, CurrentUserView


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
]