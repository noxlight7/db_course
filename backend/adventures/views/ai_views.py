"""Views that invoke AI generation for adventure history."""
from __future__ import annotations

from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.llm import get_llm_client

from .base import AdventureRunMixin
from .history_utils import _prepare_history_for_prompt, _set_ai_waiting
from .prompts import _build_generation_prompt
from ..models import Adventure, AdventureHistory
from ..serializers import AdventureHistorySerializer


class AdventureRunHistoryGenerateView(AdventureRunMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id):
        adventure = self.get_adventure()
        with transaction.atomic():
            locked = Adventure.objects.select_for_update().get(id=adventure.id)
            if locked.is_waiting_ai:
                return Response(
                    {"detail": "Model response is already in progress."},
                    status=status.HTTP_409_CONFLICT,
                )
            locked.is_waiting_ai = True
            locked.save(update_fields=["is_waiting_ai"])
        try:
            client = get_llm_client()
            history_entries = _prepare_history_for_prompt(adventure, client)
            prompt = _build_generation_prompt(adventure, history_entries)
            response = client.generate(prompt=prompt, max_tokens=120)
            content = response.text.strip()
            if not content:
                raise ValueError("Empty model response.")
            entry = AdventureHistory.objects.create(
                adventure=adventure,
                role=AdventureHistory.Role.AI,
                content=content,
                metadata={},
            )
        except ValueError as exc:
            _set_ai_waiting(adventure.id, False)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            _set_ai_waiting(adventure.id, False)
            return Response({"detail": "Model response failed."}, status=status.HTTP_502_BAD_GATEWAY)
        _set_ai_waiting(adventure.id, False)
        return Response(AdventureHistorySerializer(entry).data, status=status.HTTP_201_CREATED)


class AdventureRunHeroPromptView(AdventureRunMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id):
        adventure = self.get_adventure()
        payload = request.data or {}
        content = (payload.get("content") or "").strip()
        if not content:
            return Response({"detail": "Content is required."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            locked = Adventure.objects.select_for_update().get(id=adventure.id)
            if locked.is_waiting_ai:
                return Response(
                    {"detail": "Model response is already in progress."},
                    status=status.HTTP_409_CONFLICT,
                )
            locked.is_waiting_ai = True
            locked.save(update_fields=["is_waiting_ai"])
        primary_hero = adventure.primary_hero
        hero_prefix = f"{primary_hero.title}: " if primary_hero else ""
        user_entry = AdventureHistory.objects.create(
            adventure=adventure,
            role=AdventureHistory.Role.USER,
            content=f"{hero_prefix}{content}",
            metadata={},
        )
        try:
            client = get_llm_client()
            history_entries = _prepare_history_for_prompt(adventure, client)
            prompt = _build_generation_prompt(adventure, history_entries)
            response = client.generate(prompt=prompt, max_tokens=120)
            ai_text = response.text.strip()
            if not ai_text:
                raise ValueError("Empty model response.")
            ai_entry = AdventureHistory.objects.create(
                adventure=adventure,
                role=AdventureHistory.Role.AI,
                content=ai_text,
                metadata={},
            )
        except ValueError as exc:
            _set_ai_waiting(adventure.id, False)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            _set_ai_waiting(adventure.id, False)
            return Response({"detail": "Model response failed."}, status=status.HTTP_502_BAD_GATEWAY)
        _set_ai_waiting(adventure.id, False)
        return Response(
            {
                "user_entry": AdventureHistorySerializer(user_entry).data,
                "ai_entry": AdventureHistorySerializer(ai_entry).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdventureRunHistoryRollbackView(AdventureRunMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id, entry_id):
        adventure = self.get_adventure()
        with transaction.atomic():
            locked = Adventure.objects.select_for_update().get(id=adventure.id)
            if locked.is_waiting_ai:
                return Response(
                    {"detail": "Model response is already in progress."},
                    status=status.HTTP_409_CONFLICT,
                )
            min_id = locked.rollback_min_history_id
            target = AdventureHistory.objects.filter(adventure=adventure, id=entry_id).first()
            if target is None:
                return Response({"detail": "History entry not found."}, status=status.HTTP_404_NOT_FOUND)
            if min_id is not None and target.id < min_id:
                return Response(
                    {"detail": "Rollback is not allowed for this entry."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            deleted, _ = AdventureHistory.objects.filter(
                adventure=adventure, id__gt=target.id
            ).delete()
        return Response({"deleted": deleted}, status=status.HTTP_200_OK)


class AdventureRunHistoryRegenerateView(AdventureRunMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id):
        adventure = self.get_adventure()
        with transaction.atomic():
            locked = Adventure.objects.select_for_update().get(id=adventure.id)
            if locked.is_waiting_ai:
                return Response(
                    {"detail": "Model response is already in progress."},
                    status=status.HTTP_409_CONFLICT,
                )
            last_entry = AdventureHistory.objects.filter(adventure=adventure).order_by("-id").first()
            if last_entry is None:
                return Response({"detail": "History is empty."}, status=status.HTTP_400_BAD_REQUEST)
            min_id = locked.rollback_min_history_id
            if min_id is not None and last_entry.id < min_id:
                return Response(
                    {"detail": "Regeneration is not allowed for this entry."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if last_entry.role != AdventureHistory.Role.AI:
                return Response(
                    {"detail": "Last entry is not generated by AI."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            last_entry.delete()
            locked.is_waiting_ai = True
            locked.save(update_fields=["is_waiting_ai"])
        try:
            client = get_llm_client()
            history_entries = _prepare_history_for_prompt(adventure, client)
            prompt = _build_generation_prompt(adventure, history_entries)
            response = client.generate(prompt=prompt, max_tokens=120)
            content = response.text.strip()
            if not content:
                raise ValueError("Empty model response.")
            entry = AdventureHistory.objects.create(
                adventure=adventure,
                role=AdventureHistory.Role.AI,
                content=content,
                metadata={},
            )
        except ValueError as exc:
            _set_ai_waiting(adventure.id, False)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            _set_ai_waiting(adventure.id, False)
            return Response({"detail": "Model response failed."}, status=status.HTTP_502_BAD_GATEWAY)
        _set_ai_waiting(adventure.id, False)
        return Response(AdventureHistorySerializer(entry).data, status=status.HTTP_201_CREATED)
