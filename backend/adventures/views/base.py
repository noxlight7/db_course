"""Shared mixins for adventure views."""
from __future__ import annotations

from django.shortcuts import get_object_or_404

from ..models import Adventure


class AdventureTemplateMixin:
    def get_adventure(self) -> Adventure:
        if not hasattr(self, "_adventure"):
            if "template_id" in self.kwargs:
                self._adventure = get_object_or_404(
                    Adventure,
                    id=self.kwargs["template_id"],
                    author_user=self.request.user,
                    is_template=True,
                )
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
