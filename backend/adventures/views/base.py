"""Shared mixins for adventure views."""
from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS

from ..utils import is_moderator

from ..models import Adventure, ModerationEntry, PublishedAdventure


class AdventureTemplateMixin:
    def get_adventure(self) -> Adventure:
        if not hasattr(self, "_adventure"):
            if "template_id" in self.kwargs:
                adventure = get_object_or_404(
                    Adventure,
                    id=self.kwargs["template_id"],
                    is_template=True,
                )
                if adventure.author_user_id == self.request.user.id:
                    self._adventure = adventure
                elif (
                    self.request.method in SAFE_METHODS
                    and is_moderator(self.request.user)
                    and (
                        ModerationEntry.objects.filter(adventure=adventure).exists()
                        or PublishedAdventure.objects.filter(adventure=adventure).exists()
                    )
                ):
                    self._adventure = adventure
                else:
                    raise PermissionDenied("Недостаточно прав для доступа к приключению.")
            elif "run_id" in self.kwargs:
                self._adventure = get_object_or_404(
                    Adventure,
                    id=self.kwargs["run_id"],
                    player_user=self.request.user,
                    is_template=False,
                )
            else:
                raise ValueError("Adventure identifier is missing.")
        return self._adventure


class AdventureRunMixin:
    def get_adventure(self) -> Adventure:
        if not hasattr(self, "_adventure"):
            self._adventure = get_object_or_404(
                Adventure,
                id=self.kwargs["run_id"],
                player_user=self.request.user,
                is_template=False,
            )
        return self._adventure
