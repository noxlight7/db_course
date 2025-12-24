"""
Views for listing, creating, and editing adventure templates and related entities.
"""
from __future__ import annotations

import json
import os
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.llm import LLMClient, get_llm_client
from .models import (
    Adventure,
    AdventureEvent,
    AdventureHistory,
    AdventureHeroSetup,
    Character,
    CharacterSystem,
    CharacterTechnique,
    Faction,
    Location,
    OtherInfo,
    Race,
    SkillSystem,
    Technique,
)
from .serializers import (
    AdventureTemplateSerializer,
    AdventureRunSerializer,
    AdventureRunDetailSerializer,
    AdventureEventSerializer,
    AdventureHeroSetupSerializer,
    CharacterSerializer,
    CharacterSystemSerializer,
    CharacterTechniqueSerializer,
    FactionSerializer,
    AdventureHistorySerializer,
    LocationSerializer,
    OtherInfoSerializer,
    RaceSerializer,
    SkillSystemSerializer,
    TechniqueSerializer,
)


def _get_history_limits() -> tuple[int, int]:
    max_posts = int(os.getenv("HISTORY_MAX_PROMPT_POSTS", "40"))
    tail_posts = int(os.getenv("HISTORY_TAIL_UPDATE_POSTS", "10"))
    if tail_posts < 0:
        tail_posts = 0
    if max_posts < 1:
        max_posts = 1
    if tail_posts > max_posts:
        tail_posts = max_posts
    return max_posts, tail_posts


def _get_update_token_limits() -> tuple[int, int]:
    max_tokens = int(os.getenv("HISTORY_UPDATE_MAX_TOKENS", "1200"))
    strict_tokens = int(os.getenv("HISTORY_UPDATE_STRICT_MAX_TOKENS", "800"))
    if max_tokens < 200:
        max_tokens = 200
    if strict_tokens < 200:
        strict_tokens = 200
    return max_tokens, strict_tokens


def _build_generation_prompt(
    adventure: Adventure,
    history_entries: list[AdventureHistory],
    word_limit: str = "40-50",
) -> str:
    history_text = "\n".join(f"{entry.role}: {entry.content}" for entry in history_entries)
    if not history_text:
        history_text = "История пока пуста."
    primary_hero = adventure.primary_hero
    hero_text = f"Главный герой: {primary_hero.title}." if primary_hero else "Главный герой не задан."
    current_location = primary_hero.location if primary_hero else None
    location_text = "Текущая локация: неизвестна."
    if current_location:
        location_text = f"Текущая локация: {current_location.title}."
        if current_location.description:
            location_text += f" {current_location.description}"

    party_characters = Character.objects.filter(adventure=adventure, in_party=True).order_by(
        "title"
    )
    systems = SkillSystem.objects.filter(adventure=adventure).order_by("title")
    system_map = {system.id: system for system in systems}
    techniques = Technique.objects.filter(adventure=adventure).order_by("title")
    technique_map = {technique.id: technique for technique in techniques}
    character_systems = {}
    for entry in CharacterSystem.objects.filter(adventure=adventure):
        character_systems.setdefault(entry.character_id, []).append(entry)
    character_techniques = {}
    for entry in CharacterTechnique.objects.filter(adventure=adventure):
        character_techniques.setdefault(entry.character_id, []).append(entry)

    available_systems_text = "Доступные системы: " + (
        ", ".join(system.title for system in systems) if systems else "—"
    )

    party_techniques = []
    for character in party_characters:
        for entry in character_techniques.get(character.id, []):
            technique = technique_map.get(entry.technique_id)
            if technique:
                party_techniques.append(technique.title)
    party_techniques_text = "Приемы партии: " + (", ".join(sorted(set(party_techniques))) or "—")

    heroes_lines = []
    for character in party_characters:
        parts = [
            f"{character.title}",
            f"Тело {character.body_power} ({character.body_power_progress}%)",
            f"Разум {character.mind_power} ({character.mind_power_progress}%)",
            f"Воля {character.will_power} ({character.will_power_progress}%)",
        ]
        if character.race_id:
            parts.append(f"Раса: {character.race.title}")
        if character.age is not None:
            parts.append(f"Возраст: {character.age}")
        systems_known = character_systems.get(character.id, [])
        if systems_known:
            system_lines = []
            for entry in systems_known:
                system = system_map.get(entry.system_id)
                title = system.title if system else "—"
                system_lines.append(
                    f"{title} (уровень {entry.level}, прогресс {entry.progress_percent}%)"
                )
            parts.append("Системы: " + "; ".join(system_lines))
        techniques_known = character_techniques.get(character.id, [])
        if techniques_known:
            technique_lines = []
            for entry in techniques_known:
                technique = technique_map.get(entry.technique_id)
                title = technique.title if technique else "—"
                technique_lines.append(title)
            parts.append("Приемы: " + "; ".join(technique_lines))
        heroes_lines.append(" • ".join(parts))

    heroes_text = (
        "Герои партии:\n" + "\n".join(heroes_lines)
        if heroes_lines
        else "Герои партии отсутствуют."
    )

    location_characters = []
    if current_location:
        location_characters = list(
            Character.objects.filter(adventure=adventure, location=current_location).order_by(
                "title"
            )
        )
    location_lines = []
    for character in location_characters:
        parts = [
            f"{character.title}",
            f"Тело {character.body_power} ({character.body_power_progress}%)",
            f"Разум {character.mind_power} ({character.mind_power_progress}%)",
            f"Воля {character.will_power} ({character.will_power_progress}%)",
        ]
        if character.description:
            parts.append(f"Описание: {character.description}")
        if character.race_id:
            parts.append(f"Раса: {character.race.title}")
        if character.age is not None:
            parts.append(f"Возраст: {character.age}")
        systems_known = character_systems.get(character.id, [])
        if systems_known:
            system_lines = []
            for entry in systems_known:
                system = system_map.get(entry.system_id)
                title = system.title if system else "—"
                system_lines.append(
                    f"{title} (уровень {entry.level}, прогресс {entry.progress_percent}%)"
                )
            parts.append("Системы: " + "; ".join(system_lines))
        techniques_known = character_techniques.get(character.id, [])
        if techniques_known:
            technique_lines = []
            for entry in techniques_known:
                technique = technique_map.get(entry.technique_id)
                title = technique.title if technique else "—"
                technique_lines.append(title)
            parts.append("Приемы: " + "; ".join(technique_lines))
        location_lines.append(" • ".join(parts))

    location_characters_text = (
        "Персонажи локации:\n" + "\n".join(location_lines)
        if location_lines
        else "Персонажи локации отсутствуют."
    )

    active_events = AdventureEvent.objects.filter(
        adventure=adventure, status=AdventureEvent.Status.ACTIVE
    ).order_by("title")
    if active_events:
        events_lines = []
        for event in active_events:
            line = f"{event.title}: {event.state or '—'}"
            events_lines.append(line)
        events_text = "Активные события:\n" + "\n".join(events_lines)
    else:
        events_text = "Активные события отсутствуют."

    rules_text = (
        "Важно: уровень владения системой повышает эффективность по геометрической прогрессии. "
        "То же относится к рангам/кругам приемов."
    )

    return (
        f"{hero_text}\n{rules_text}\n{location_text}\n{available_systems_text}\n"
        f"{party_techniques_text}\n{heroes_text}\n{location_characters_text}\n{events_text}\n\n"
        f"{history_text}\n\n"
        "Сгенерируй следующий абзац истории, логично продолжая сюжет. "
        "Не повторяй и не пересказывай события, уже записанные в истории промтов. "
        f"Ответ должен быть примерно на {word_limit} слов."
    )


def _build_card_update_prompt(
    adventure: Adventure,
    tail_entries: list[AdventureHistory],
    strict_json: bool = False,
) -> str:
    tail_text = "\n".join(f"{entry.role}: {entry.content}" for entry in tail_entries)
    if not tail_text:
        tail_text = "История пока пуста."

    active_events = list(
        AdventureEvent.objects.filter(adventure=adventure, status=AdventureEvent.Status.ACTIVE)
        .order_by("title")
        .values("id", "title", "state", "status")
    )
    party_characters = Character.objects.filter(adventure=adventure, in_party=True).order_by(
        "title"
    )
    party_character_ids = [character.id for character in party_characters]
    systems = list(
        SkillSystem.objects.filter(adventure=adventure)
        .order_by("title")
        .values("id", "title", "description", "tags", "w_body", "w_mind", "w_will", "formula_hint")
    )
    techniques = list(
        Technique.objects.filter(adventure=adventure)
        .order_by("title")
        .values(
            "id",
            "title",
            "description",
            "tags",
            "difficulty",
            "tier",
            "required_system_level",
            "system_id",
        )
    )
    character_systems = list(
        CharacterSystem.objects.filter(adventure=adventure, character_id__in=party_character_ids)
        .order_by("id")
        .values("id", "character_id", "system_id", "level", "progress_percent", "notes")
    )
    character_techniques = list(
        CharacterTechnique.objects.filter(
            adventure=adventure, character_id__in=party_character_ids
        )
        .order_by("id")
        .values("id", "character_id", "technique_id", "notes")
    )

    party_characters = list(
        Character.objects.filter(adventure=adventure, in_party=True)
        .order_by("title")
        .values(
            "id",
            "title",
            "description",
            "body_power",
            "body_power_progress",
            "mind_power",
            "mind_power_progress",
            "will_power",
            "will_power_progress",
        )
    )

    # TODO: also update cards that are affected by tags once tag-based linking is implemented.
    rules_prefix = (
        "Верни только JSON, без пояснений и без markdown. "
        if strict_json
        else "Верни строго JSON (без пояснений) в формате:\n"
    )

    return (
        "Ты анализируешь последние события истории и обновляешь карточки.\n"
        f"{rules_prefix}"
        "{"
        "\"events\":[{\"id\":1,\"status\":\"active|resolved|inactive\",\"state\":\"...\"}],"
        "\"characters\":[{\"id\":1,\"description\":\"...\",\"body_power\":0,\"body_power_progress\":0,"
        "\"mind_power\":0,\"mind_power_progress\":0,\"will_power\":0,\"will_power_progress\":0}],"
        "\"character_systems\":[{\"id\":1,\"level\":0,\"progress_percent\":0,\"notes\":\"...\"}],"
        "\"character_techniques\":[{\"id\":1,\"notes\":\"...\"}]"
        "}\n"
        "Правила ответа:\n"
        "- Возвращай только те записи, где есть изменения.\n"
        "- Не возвращай полные списки без изменений.\n"
        "- Если изменений нет, верни пустые массивы.\n"
        "- JSON должен быть валидным и полностью закрытым.\n\n"
        "Правила: уровни владения системами и ранги приемов растут по геометрической прогрессии. "
        "Характеристики повышаются постепенно, через прогресс в процентах (0-100) до следующего значения.\n\n"
        f"Последние посты истории:\n{tail_text}\n\n"
        f"Активные события: {json.dumps(active_events, ensure_ascii=False)}\n"
        f"Доступные системы: {json.dumps(systems, ensure_ascii=False)}\n"
        f"Доступные приемы: {json.dumps(techniques, ensure_ascii=False)}\n"
        f"Карточки партии: {json.dumps(party_characters, ensure_ascii=False)}\n"
        f"Знания систем партии: {json.dumps(character_systems, ensure_ascii=False)}\n"
        f"Выученные приемы партии: {json.dumps(character_techniques, ensure_ascii=False)}\n"
    )


def _extract_json_payload(text: str) -> dict | None:
    cleaned = text.strip()
    if not cleaned:
        return None
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    try:
        payload = json.loads(cleaned)
        return payload if isinstance(payload, dict) else None
    except json.JSONDecodeError:
        return None
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    snippet = cleaned[start : end + 1]
    try:
        payload = json.loads(snippet)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _apply_card_updates(adventure: Adventure, payload: dict) -> None:
    events_updates = payload.get("events", [])
    if isinstance(events_updates, list) and events_updates:
        for entry in events_updates:
            if not isinstance(entry, dict):
                continue
            event_id = entry.get("id")
            if not event_id:
                continue
            event = AdventureEvent.objects.filter(adventure=adventure, id=event_id).first()
            if event is None:
                continue
            status = entry.get("status")
            state = entry.get("state")
            update_fields = []
            if status in AdventureEvent.Status.values:
                event.status = status
                update_fields.append("status")
            if isinstance(state, str):
                event.state = state
                update_fields.append("state")
            if update_fields:
                event.save(update_fields=update_fields)

    characters_updates = payload.get("characters", [])
    if isinstance(characters_updates, list) and characters_updates:
        for entry in characters_updates:
            if not isinstance(entry, dict):
                continue
            character_id = entry.get("id")
            if not character_id:
                continue
            character = Character.objects.filter(adventure=adventure, id=character_id).first()
            if character is None:
                continue
            update_fields = []
            if "description" in entry and isinstance(entry.get("description"), str):
                character.description = entry.get("description")
                update_fields.append("description")
            for field in (
                "body_power",
                "mind_power",
                "will_power",
                "body_power_progress",
                "mind_power_progress",
                "will_power_progress",
            ):
                if field not in entry or entry.get(field) is None:
                    continue
                value = int(entry.get(field))
                if field.endswith("_progress"):
                    value = max(0, min(100, value))
                setattr(character, field, value)
                update_fields.append(field)
            if update_fields:
                character.save(update_fields=update_fields)

    system_updates = payload.get("character_systems", [])
    if isinstance(system_updates, list) and system_updates:
        for entry in system_updates:
            if not isinstance(entry, dict):
                continue
            record_id = entry.get("id")
            if not record_id:
                continue
            record = CharacterSystem.objects.filter(adventure=adventure, id=record_id).first()
            if record is None:
                continue
            update_fields = []
            current_level = record.level
            current_progress = record.progress_percent
            new_level = entry.get("level")
            new_progress = entry.get("progress_percent")
            if new_level is not None:
                new_level = int(new_level)
                if new_level >= current_level:
                    record.level = new_level
                    update_fields.append("level")
            if new_progress is not None:
                new_progress = int(new_progress)
                if new_level is not None and new_level > current_level:
                    record.progress_percent = new_progress
                    update_fields.append("progress_percent")
                elif new_progress >= current_progress:
                    record.progress_percent = new_progress
                    update_fields.append("progress_percent")
            if "notes" in entry and isinstance(entry.get("notes"), str):
                record.notes = entry.get("notes")
                update_fields.append("notes")
            if update_fields:
                record.save(update_fields=update_fields)

    technique_updates = payload.get("character_techniques", [])
    if isinstance(technique_updates, list) and technique_updates:
        for entry in technique_updates:
            if not isinstance(entry, dict):
                continue
            record_id = entry.get("id")
            if not record_id:
                continue
            record = CharacterTechnique.objects.filter(adventure=adventure, id=record_id).first()
            if record is None:
                continue
            if "notes" in entry and isinstance(entry.get("notes"), str):
                record.notes = entry.get("notes")
                record.save(update_fields=["notes"])


def _prepare_history_for_prompt(adventure: Adventure, client: LLMClient) -> list[AdventureHistory]:
    history_entries = list(AdventureHistory.objects.filter(adventure=adventure).order_by("id"))
    max_posts, tail_posts = _get_history_limits()
    if len(history_entries) <= max_posts or tail_posts == 0:
        return history_entries
    if len(history_entries) <= tail_posts:
        return history_entries
    cutoff_entry = history_entries[-tail_posts - 1]
    if adventure.rollback_min_history_id and adventure.rollback_min_history_id >= cutoff_entry.id:
        return [entry for entry in history_entries if entry.id <= adventure.rollback_min_history_id]

    attempt_tail = tail_posts
    cutoff_entry = history_entries[-attempt_tail - 1]
    tail_entries = history_entries[-attempt_tail:]
    update_prompt = _build_card_update_prompt(adventure, tail_entries)
    update_max_tokens, strict_max_tokens = _get_update_token_limits()
    response = client.generate(prompt=update_prompt, max_tokens=update_max_tokens)
    payload = _extract_json_payload(response.text)
    if payload is None:
        print("Invalid card update JSON (first pass):", response.text)
        strict_prompt = _build_card_update_prompt(adventure, tail_entries, strict_json=True)
        response = client.generate(prompt=strict_prompt, max_tokens=strict_max_tokens)
        payload = _extract_json_payload(response.text)
    if payload is None:
        print("Invalid card update JSON (strict pass):", response.text)
    if payload is not None:
        _apply_card_updates(adventure, payload)
        adventure.rollback_min_history_id = cutoff_entry.id
        adventure.save(update_fields=["rollback_min_history_id"])
        return [entry for entry in history_entries if entry.id <= cutoff_entry.id]

    # If updates failed, still drop the tail to avoid overly long prompts.
    return [entry for entry in history_entries if entry.id <= cutoff_entry.id]


def _set_ai_waiting(adventure_id: int, waiting: bool) -> None:
    Adventure.objects.filter(id=adventure_id).update(is_waiting_ai=waiting)


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


class AdventureTemplateListCreateView(generics.ListCreateAPIView):
    serializer_class = AdventureTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Adventure.objects.filter(author_user=self.request.user, is_template=True).order_by(
            "-created_at"
        )


class AdventureTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdventureTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Adventure.objects.filter(author_user=self.request.user, is_template=True)

    def perform_update(self, serializer):
        adventure = serializer.save()
        if adventure.primary_hero_id:
            character = Character.objects.filter(
                adventure=adventure, id=adventure.primary_hero_id
            ).first()
            if character and not character.is_player:
                character.is_player = True
                character.in_party = True
                character.save(update_fields=["is_player", "in_party"])


class AdventureHeroSetupDetailView(AdventureTemplateMixin, generics.RetrieveUpdateAPIView):
    serializer_class = AdventureHeroSetupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        adventure = self.get_adventure()
        setup, _ = AdventureHeroSetup.objects.get_or_create(adventure=adventure)
        return setup


class AdventureRunListView(generics.ListAPIView):
    serializer_class = AdventureRunSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Adventure.objects.filter(player_user=self.request.user, is_template=False).order_by(
            "-created_at"
        )


class AdventureRunDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdventureRunDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Adventure.objects.filter(player_user=self.request.user, is_template=False)

    def perform_update(self, serializer):
        adventure = serializer.save()
        if adventure.primary_hero_id:
            character = Character.objects.filter(
                adventure=adventure, id=adventure.primary_hero_id
            ).first()
            if character and not character.is_player:
                character.is_player = True
                character.in_party = True
                character.save(update_fields=["is_player", "in_party"])


class LocationListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Location.objects.filter(adventure=self.get_adventure()).order_by("title")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class LocationDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Location.objects.filter(adventure=self.get_adventure())


class RaceListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = RaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Race.objects.filter(adventure=self.get_adventure()).order_by("title")

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class RaceDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Race.objects.filter(adventure=self.get_adventure())


class SkillSystemListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = SkillSystemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SkillSystem.objects.filter(adventure=self.get_adventure()).order_by("title")

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class SkillSystemDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SkillSystemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SkillSystem.objects.filter(adventure=self.get_adventure())


class TechniqueListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = TechniqueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Technique.objects.filter(adventure=self.get_adventure()).order_by("title")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class TechniqueDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TechniqueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Technique.objects.filter(adventure=self.get_adventure())

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context


class FactionListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = FactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Faction.objects.filter(adventure=self.get_adventure()).order_by("title")

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class FactionDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Faction.objects.filter(adventure=self.get_adventure())


class OtherInfoListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = OtherInfoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OtherInfo.objects.filter(adventure=self.get_adventure()).order_by("title")

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class OtherInfoDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OtherInfoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OtherInfo.objects.filter(adventure=self.get_adventure())


class CharacterListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = CharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Character.objects.filter(adventure=self.get_adventure()).order_by("title")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context

    def perform_create(self, serializer):
        adventure = self.get_adventure()
        character = serializer.save(adventure=adventure)
        if character.is_player and not character.in_party:
            character.in_party = True
            character.save(update_fields=["in_party"])
        if character.is_player and adventure.primary_hero_id != character.id:
            adventure.primary_hero = character
            adventure.save(update_fields=["primary_hero"])


class CharacterDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Character.objects.filter(adventure=self.get_adventure())

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context

    def perform_update(self, serializer):
        adventure = self.get_adventure()
        character = serializer.save()
        if character.is_player and not character.in_party:
            character.in_party = True
            character.save(update_fields=["in_party"])
        if character.is_player and adventure.primary_hero_id != character.id:
            adventure.primary_hero = character
            adventure.save(update_fields=["primary_hero"])
        elif not character.is_player and adventure.primary_hero_id == character.id:
            adventure.primary_hero = None
            adventure.save(update_fields=["primary_hero"])


class CharacterSystemListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = CharacterSystemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CharacterSystem.objects.filter(adventure=self.get_adventure()).order_by("id")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class CharacterSystemDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CharacterSystemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CharacterSystem.objects.filter(adventure=self.get_adventure())

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context


class CharacterTechniqueListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = CharacterTechniqueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CharacterTechnique.objects.filter(adventure=self.get_adventure()).order_by("id")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class CharacterTechniqueDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CharacterTechniqueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CharacterTechnique.objects.filter(adventure=self.get_adventure())

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context


class AdventureEventListCreateView(AdventureTemplateMixin, generics.ListCreateAPIView):
    serializer_class = AdventureEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AdventureEvent.objects.filter(adventure=self.get_adventure()).order_by("title")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure())


class AdventureEventDetailView(AdventureTemplateMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdventureEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AdventureEvent.objects.filter(adventure=self.get_adventure())

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["adventure"] = self.get_adventure()
        return context


class AdventureRunBootstrapView(AdventureRunMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, run_id):
        adventure = self.get_adventure()
        locations = LocationSerializer(
            Location.objects.filter(adventure=adventure).order_by("title"), many=True
        ).data
        races = RaceSerializer(
            Race.objects.filter(adventure=adventure).order_by("title"), many=True
        ).data
        systems = SkillSystemSerializer(
            SkillSystem.objects.filter(adventure=adventure).order_by("title"), many=True
        ).data
        techniques = TechniqueSerializer(
            Technique.objects.filter(adventure=adventure).order_by("title"), many=True
        ).data
        setup, _ = AdventureHeroSetup.objects.get_or_create(adventure=adventure)
        return Response(
            {
                "adventure": AdventureRunSerializer(adventure).data,
                "locations": locations,
                "races": races,
                "systems": systems,
                "techniques": techniques,
                "hero_setup": AdventureHeroSetupSerializer(setup).data,
            }
        )


class AdventureRunStartView(AdventureTemplateMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, template_id):
        template = self.get_adventure()
        with transaction.atomic():
            template_setup, _ = AdventureHeroSetup.objects.get_or_create(adventure=template)
            run = Adventure.objects.create(
                author_user=template.author_user,
                player_user=request.user,
                template_adventure=template,
                is_template=False,
                title=template.title,
                description=template.description,
                intro=template.intro,
                spec_instructions=template.spec_instructions,
            )

            location_map = {}
            for location in Location.objects.filter(adventure=template).order_by("title"):
                location_map[location.id] = Location.objects.create(
                    adventure=run,
                    title=location.title,
                    description=location.description,
                    x=location.x,
                    y=location.y,
                    width=location.width,
                    height=location.height,
                    tags=list(location.tags),
                )

            race_map = {}
            for race in Race.objects.filter(adventure=template).order_by("title"):
                race_map[race.id] = Race.objects.create(
                    adventure=run,
                    title=race.title,
                    description=race.description,
                    life_span=race.life_span,
                    tags=list(race.tags),
                )

            AdventureHeroSetup.objects.update_or_create(
                adventure=run,
                defaults={
                    "default_location": location_map.get(template_setup.default_location_id),
                    "require_race": template_setup.require_race,
                    "default_race": race_map.get(template_setup.default_race_id),
                    "require_age": template_setup.require_age,
                    "default_age": template_setup.default_age,
                    "require_body_power": template_setup.require_body_power,
                    "default_body_power": template_setup.default_body_power,
                    "require_mind_power": template_setup.require_mind_power,
                    "default_mind_power": template_setup.default_mind_power,
                    "require_will_power": template_setup.require_will_power,
                    "default_will_power": template_setup.default_will_power,
                    "require_systems": template_setup.require_systems,
                    "require_techniques": template_setup.require_techniques,
                },
            )

            system_map = {}
            for system in SkillSystem.objects.filter(adventure=template).order_by("title"):
                system_map[system.id] = SkillSystem.objects.create(
                    adventure=run,
                    title=system.title,
                    description=system.description,
                    tags=list(system.tags),
                    w_body=system.w_body,
                    w_mind=system.w_mind,
                    w_will=system.w_will,
                    formula_hint=system.formula_hint,
                )

            technique_map = {}
            for technique in Technique.objects.filter(adventure=template).order_by("title"):
                system = system_map.get(technique.system_id)
                if system is None:
                    continue
                technique_map[technique.id] = Technique.objects.create(
                    adventure=run,
                    system=system,
                    title=technique.title,
                    description=technique.description,
                    tags=list(technique.tags),
                    difficulty=technique.difficulty,
                    tier=technique.tier,
                    required_system_level=technique.required_system_level,
                )

            for faction in Faction.objects.filter(adventure=template).order_by("title"):
                Faction.objects.create(
                    adventure=run,
                    title=faction.title,
                    description=faction.description,
                    tags=list(faction.tags),
                )

            for info in OtherInfo.objects.filter(adventure=template).order_by("title"):
                OtherInfo.objects.create(
                    adventure=run,
                    category=info.category,
                    title=info.title,
                    description=info.description,
                    tags=list(info.tags),
                )

            for event in AdventureEvent.objects.filter(adventure=template).order_by("title"):
                AdventureEvent.objects.create(
                    adventure=run,
                    title=event.title,
                    status=event.status,
                    trigger_hint=event.trigger_hint,
                    state=event.state,
                    location=location_map.get(event.location_id),
                )

            character_map = {}
            for character in Character.objects.filter(adventure=template).order_by("title"):
                character_map[character.id] = Character.objects.create(
                    adventure=run,
                    title=character.title,
                    description=character.description,
                    is_player=character.is_player,
                    in_party=character.in_party,
                    age=character.age,
                    body_power=character.body_power,
                    body_power_progress=character.body_power_progress,
                    mind_power=character.mind_power,
                    mind_power_progress=character.mind_power_progress,
                    will_power=character.will_power,
                    will_power_progress=character.will_power_progress,
                    tags=list(character.tags),
                    race=race_map.get(character.race_id),
                    location=location_map.get(character.location_id),
                )

            for entry in CharacterSystem.objects.filter(adventure=template).order_by("id"):
                character = character_map.get(entry.character_id)
                system = system_map.get(entry.system_id)
                if character is None or system is None:
                    continue
                CharacterSystem.objects.create(
                    adventure=run,
                    character=character,
                    system=system,
                    level=entry.level,
                    progress_percent=entry.progress_percent,
                    notes=entry.notes,
                )

            for entry in CharacterTechnique.objects.filter(adventure=template).order_by("id"):
                character = character_map.get(entry.character_id)
                technique = technique_map.get(entry.technique_id)
                if character is None or technique is None:
                    continue
                CharacterTechnique.objects.create(
                    adventure=run,
                    character=character,
                    technique=technique,
                    notes=entry.notes,
                )

            run.primary_hero = character_map.get(template.primary_hero_id)
            run.save(update_fields=["primary_hero"])
            if run.primary_hero and not run.primary_hero.in_party:
                run.primary_hero.in_party = True
                run.primary_hero.save(update_fields=["in_party"])
            if run.primary_hero and run.intro:
                intro_text = run.intro.replace("<main_hero>", run.primary_hero.title)
                AdventureHistory.objects.create(
                    adventure=run,
                    role=AdventureHistory.Role.SYSTEM,
                    content=intro_text,
                    metadata={},
                )

        return Response(AdventureRunSerializer(run).data, status=status.HTTP_201_CREATED)


class AdventureRunHeroSetupView(AdventureRunMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id):
        adventure = self.get_adventure()
        if adventure.primary_hero_id is not None:
            return Response(
                {"detail": "Primary hero already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = request.data or {}
        hero_data = payload.get("hero", {}) or {}
        system_entries = payload.get("systems", []) or []
        technique_entries = payload.get("techniques", []) or []
        setup, _ = AdventureHeroSetup.objects.get_or_create(adventure=adventure)
        race_id = hero_data.get("race")
        location_id = payload.get("location_id")
        location_title = (payload.get("location_title") or "").strip()

        if setup.require_race and race_id is None:
            return Response({"detail": "Race is required."}, status=status.HTTP_400_BAD_REQUEST)
        if setup.require_age and hero_data.get("age") is None:
            return Response({"detail": "Age is required."}, status=status.HTTP_400_BAD_REQUEST)
        if setup.require_body_power and hero_data.get("body_power") is None:
            return Response({"detail": "Body power is required."}, status=status.HTTP_400_BAD_REQUEST)
        if setup.require_mind_power and hero_data.get("mind_power") is None:
            return Response({"detail": "Mind power is required."}, status=status.HTTP_400_BAD_REQUEST)
        if setup.require_will_power and hero_data.get("will_power") is None:
            return Response({"detail": "Will power is required."}, status=status.HTTP_400_BAD_REQUEST)

        if setup.default_location is None and location_id is None and not location_title:
            return Response({"detail": "Location is required."}, status=status.HTTP_400_BAD_REQUEST)

        if location_id is not None:
            location = Location.objects.filter(adventure=adventure, id=location_id).first()
            if location is None:
                return Response({"detail": "Location not found."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            location = None

        validated_systems = []
        if system_entries:
            for entry in system_entries:
                system = SkillSystem.objects.filter(
                    adventure=adventure, id=entry.get("system")
                ).first()
                if system is None:
                    return Response(
                        {"detail": "System not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                validated_systems.append((system, entry))

        validated_techniques = []
        if technique_entries:
            for entry in technique_entries:
                technique = Technique.objects.filter(
                    adventure=adventure, id=entry.get("technique")
                ).first()
                if technique is None:
                    return Response(
                        {"detail": "Technique not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                validated_techniques.append((technique, entry))

        race = None
        if race_id is not None:
            race = Race.objects.filter(adventure=adventure, id=race_id).first()
            if race is None:
                return Response({"detail": "Race not found."}, status=status.HTTP_400_BAD_REQUEST)
        elif not setup.require_race:
            race = setup.default_race

        age = hero_data.get("age")
        if age is None and not setup.require_age:
            age = setup.default_age

        body_power = hero_data.get("body_power")
        if body_power is None and not setup.require_body_power:
            body_power = setup.default_body_power if setup.default_body_power is not None else 0

        mind_power = hero_data.get("mind_power")
        if mind_power is None and not setup.require_mind_power:
            mind_power = setup.default_mind_power if setup.default_mind_power is not None else 0

        will_power = hero_data.get("will_power")
        if will_power is None and not setup.require_will_power:
            will_power = setup.default_will_power if setup.default_will_power is not None else 0

        with transaction.atomic():
            if setup.default_location is not None:
                location = setup.default_location
            elif location is None:
                location = Location.objects.create(
                    adventure=adventure,
                    title=location_title,
                    description=payload.get("location_description", ""),
                    x=0,
                    y=0,
                    width=1,
                    height=1,
                    tags=[],
                )

            hero = Character.objects.create(
                adventure=adventure,
                title=hero_data.get("title", "Hero"),
                description=hero_data.get("description", ""),
                is_player=True,
                in_party=True,
                age=age,
                body_power=body_power if body_power is not None else 0,
                body_power_progress=0,
                mind_power=mind_power if mind_power is not None else 0,
                mind_power_progress=0,
                will_power=will_power if will_power is not None else 0,
                will_power_progress=0,
                tags=hero_data.get("tags", []) or [],
                race=race,
                location=location,
            )

            if validated_systems:
                for system, entry in validated_systems:
                    CharacterSystem.objects.create(
                        adventure=adventure,
                        character=hero,
                        system=system,
                        level=entry.get("level", 0),
                        progress_percent=entry.get("progress_percent", 0),
                        notes=entry.get("notes", ""),
                    )

            if validated_techniques:
                for technique, entry in validated_techniques:
                    CharacterTechnique.objects.create(
                        adventure=adventure,
                        character=hero,
                        technique=technique,
                        notes=entry.get("notes", ""),
                    )

            adventure.primary_hero = hero
            adventure.save(update_fields=["primary_hero"])

            if adventure.intro:
                intro_text = adventure.intro.replace("<main_hero>", hero.title)
                AdventureHistory.objects.create(
                    adventure=adventure,
                    role=AdventureHistory.Role.SYSTEM,
                    content=intro_text,
                    metadata={},
                )

        return Response({"hero_id": hero.id}, status=status.HTTP_201_CREATED)


class AdventureRunHistoryView(AdventureRunMixin, generics.ListCreateAPIView):
    serializer_class = AdventureHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AdventureHistory.objects.filter(adventure=self.get_adventure()).order_by("id")

    def perform_create(self, serializer):
        serializer.save(adventure=self.get_adventure(), role=AdventureHistory.Role.USER)


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


class AdventureRunCharactersView(AdventureRunMixin, generics.ListAPIView):
    serializer_class = CharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Character.objects.filter(adventure=self.get_adventure(), in_party=True).order_by(
            "title"
        )


def _build_export_list(queryset, fields):
    export_id_map = {}
    items = []
    for index, item in enumerate(queryset, start=1):
        export_id = str(index)
        export_id_map[item.id] = export_id
        payload = {"export_id": export_id}
        for field in fields:
            payload[field] = getattr(item, field)
        items.append((item, payload))
    return items, export_id_map


class AdventureTemplateExportView(AdventureTemplateMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, template_id):
        adventure = self.get_adventure()

        locations, location_map = _build_export_list(
            Location.objects.filter(adventure=adventure).order_by("title"),
            ["title", "description", "x", "y", "width", "height", "tags"],
        )
        races, race_map = _build_export_list(
            Race.objects.filter(adventure=adventure).order_by("title"),
            ["title", "description", "life_span", "tags"],
        )
        systems, system_map = _build_export_list(
            SkillSystem.objects.filter(adventure=adventure).order_by("title"),
            ["title", "description", "tags", "w_body", "w_mind", "w_will", "formula_hint"],
        )
        techniques, technique_map = _build_export_list(
            Technique.objects.filter(adventure=adventure).order_by("title"),
            ["title", "description", "tags", "difficulty", "tier", "required_system_level"],
        )
        factions, faction_map = _build_export_list(
            Faction.objects.filter(adventure=adventure).order_by("title"),
            ["title", "description", "tags"],
        )
        other_info, other_info_map = _build_export_list(
            OtherInfo.objects.filter(adventure=adventure).order_by("title"),
            ["category", "title", "description", "tags"],
        )
        characters, character_map = _build_export_list(
            Character.objects.filter(adventure=adventure).order_by("title"),
            [
                "title",
                "description",
                "is_player",
                "in_party",
                "age",
                "body_power",
                "body_power_progress",
                "mind_power",
                "mind_power_progress",
                "will_power",
                "will_power_progress",
                "tags",
            ],
        )

        for character, entry in characters:
            entry["race"] = race_map.get(character.race_id)
            entry["location"] = location_map.get(character.location_id)

        for technique, entry in techniques:
            entry["system"] = system_map.get(technique.system_id)

        events, event_map = _build_export_list(
            AdventureEvent.objects.filter(adventure=adventure).order_by("title"),
            ["title", "status", "trigger_hint", "state"],
        )
        for event, entry in events:
            entry["location"] = location_map.get(event.location_id)

        character_systems = []
        for entry in CharacterSystem.objects.filter(adventure=adventure).order_by("id"):
            character_systems.append(
                {
                    "character": character_map.get(entry.character_id),
                    "system": system_map.get(entry.system_id),
                    "level": entry.level,
                    "progress_percent": entry.progress_percent,
                    "notes": entry.notes,
                }
            )

        character_techniques = []
        for entry in CharacterTechnique.objects.filter(adventure=adventure).order_by("id"):
            character_techniques.append(
                {
                    "character": character_map.get(entry.character_id),
                    "technique": technique_map.get(entry.technique_id),
                    "notes": entry.notes,
                }
            )

        hero_setup, _ = AdventureHeroSetup.objects.get_or_create(adventure=adventure)

        payload = {
            "version": 2,
            "adventure": {
                "title": adventure.title,
                "description": adventure.description,
                "spec_instructions": adventure.spec_instructions,
                "intro": adventure.intro,
                "primary_hero": character_map.get(adventure.primary_hero_id),
            },
            "hero_setup": {
                "default_location": location_map.get(hero_setup.default_location_id),
                "require_race": hero_setup.require_race,
                "default_race": race_map.get(hero_setup.default_race_id),
                "require_age": hero_setup.require_age,
                "default_age": hero_setup.default_age,
                "require_body_power": hero_setup.require_body_power,
                "default_body_power": hero_setup.default_body_power,
                "require_mind_power": hero_setup.require_mind_power,
                "default_mind_power": hero_setup.default_mind_power,
                "require_will_power": hero_setup.require_will_power,
                "default_will_power": hero_setup.default_will_power,
                "require_systems": hero_setup.require_systems,
                "require_techniques": hero_setup.require_techniques,
            },
            "locations": [entry for _, entry in locations],
            "races": [entry for _, entry in races],
            "systems": [entry for _, entry in systems],
            "techniques": [entry for _, entry in techniques],
            "factions": [entry for _, entry in factions],
            "other_info": [entry for _, entry in other_info],
            "characters": [entry for _, entry in characters],
            "events": [entry for _, entry in events],
            "character_systems": character_systems,
            "character_techniques": character_techniques,
        }
        return Response(payload)


class AdventureTemplateImportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        if not isinstance(data, dict):
            return Response({"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST)

        adventure_data = data.get("adventure", {}) or {}
        hero_setup_data = data.get("hero_setup", {}) or {}
        with transaction.atomic():
            adventure = Adventure.objects.create(
                author_user=request.user,
                is_template=True,
                player_user=None,
                template_adventure=None,
                title=adventure_data.get("title", "Imported adventure"),
                description=adventure_data.get("description", ""),
                spec_instructions=adventure_data.get("spec_instructions", ""),
                intro=adventure_data.get("intro", ""),
            )

            location_map = {}
            for entry in data.get("locations", []) or []:
                location = Location.objects.create(
                    adventure=adventure,
                    title=entry.get("title", ""),
                    description=entry.get("description", ""),
                    x=entry.get("x", 0),
                    y=entry.get("y", 0),
                    width=entry.get("width", 1),
                    height=entry.get("height", 1),
                    tags=entry.get("tags", []) or [],
                )
                location_map[entry.get("export_id")] = location

            race_map = {}
            for entry in data.get("races", []) or []:
                race = Race.objects.create(
                    adventure=adventure,
                    title=entry.get("title", ""),
                    description=entry.get("description", ""),
                    life_span=entry.get("life_span", 100),
                    tags=entry.get("tags", []) or [],
                )
                race_map[entry.get("export_id")] = race

            system_map = {}
            for entry in data.get("systems", []) or []:
                system = SkillSystem.objects.create(
                    adventure=adventure,
                    title=entry.get("title", ""),
                    description=entry.get("description", ""),
                    tags=entry.get("tags", []) or [],
                    w_body=entry.get("w_body", 0),
                    w_mind=entry.get("w_mind", 0),
                    w_will=entry.get("w_will", 0),
                    formula_hint=entry.get("formula_hint", ""),
                )
                system_map[entry.get("export_id")] = system

            technique_map = {}
            for entry in data.get("techniques", []) or []:
                system = system_map.get(entry.get("system"))
                if system is None:
                    continue
                technique = Technique.objects.create(
                    adventure=adventure,
                    system=system,
                    title=entry.get("title", ""),
                    description=entry.get("description", ""),
                    tags=entry.get("tags", []) or [],
                    difficulty=entry.get("difficulty", 0),
                    tier=entry.get("tier", None),
                    required_system_level=entry.get("required_system_level", 0),
                )
                technique_map[entry.get("export_id")] = technique

            for entry in data.get("factions", []) or []:
                Faction.objects.create(
                    adventure=adventure,
                    title=entry.get("title", ""),
                    description=entry.get("description", ""),
                    tags=entry.get("tags", []) or [],
                )

            for entry in data.get("other_info", []) or []:
                OtherInfo.objects.create(
                    adventure=adventure,
                    category=entry.get("category", ""),
                    title=entry.get("title", ""),
                    description=entry.get("description", ""),
                    tags=entry.get("tags", []) or [],
                )

            character_map = {}
            for entry in data.get("characters", []) or []:
                character = Character.objects.create(
                    adventure=adventure,
                    title=entry.get("title", ""),
                    description=entry.get("description", ""),
                    is_player=entry.get("is_player", False),
                    in_party=entry.get("in_party", False),
                    age=entry.get("age"),
                    body_power=entry.get("body_power", 0),
                    body_power_progress=entry.get("body_power_progress", 0),
                    mind_power=entry.get("mind_power", 0),
                    mind_power_progress=entry.get("mind_power_progress", 0),
                    will_power=entry.get("will_power", 0),
                    will_power_progress=entry.get("will_power_progress", 0),
                    tags=entry.get("tags", []) or [],
                    race=race_map.get(entry.get("race")),
                    location=location_map.get(entry.get("location")),
                )
                character_map[entry.get("export_id")] = character

            for entry in data.get("events", []) or []:
                AdventureEvent.objects.create(
                    adventure=adventure,
                    title=entry.get("title", ""),
                    status=entry.get("status", "inactive"),
                    trigger_hint=entry.get("trigger_hint", ""),
                    state=entry.get("state", ""),
                    location=location_map.get(entry.get("location")),
                )

            for entry in data.get("character_systems", []) or []:
                character = character_map.get(entry.get("character"))
                system = system_map.get(entry.get("system"))
                if character is None or system is None:
                    continue
                CharacterSystem.objects.create(
                    adventure=adventure,
                    character=character,
                    system=system,
                    level=entry.get("level", 0),
                    progress_percent=entry.get("progress_percent", 0),
                    notes=entry.get("notes", ""),
                )

            for entry in data.get("character_techniques", []) or []:
                character = character_map.get(entry.get("character"))
                technique = technique_map.get(entry.get("technique"))
                if character is None or technique is None:
                    continue
                CharacterTechnique.objects.create(
                    adventure=adventure,
                    character=character,
                    technique=technique,
                    notes=entry.get("notes", ""),
                )

            primary_hero_ref = adventure_data.get("primary_hero")
            if primary_hero_ref and primary_hero_ref in character_map:
                adventure.primary_hero = character_map[primary_hero_ref]
                adventure.save(update_fields=["primary_hero"])

            AdventureHeroSetup.objects.update_or_create(
                adventure=adventure,
                defaults={
                    "default_location": location_map.get(hero_setup_data.get("default_location")),
                    "require_race": hero_setup_data.get("require_race", True),
                    "default_race": race_map.get(hero_setup_data.get("default_race")),
                    "require_age": hero_setup_data.get("require_age", False),
                    "default_age": hero_setup_data.get("default_age"),
                    "require_body_power": hero_setup_data.get("require_body_power", True),
                    "default_body_power": hero_setup_data.get("default_body_power"),
                    "require_mind_power": hero_setup_data.get("require_mind_power", True),
                    "default_mind_power": hero_setup_data.get("default_mind_power"),
                    "require_will_power": hero_setup_data.get("require_will_power", True),
                    "default_will_power": hero_setup_data.get("default_will_power"),
                    "require_systems": hero_setup_data.get("require_systems", False),
                    "require_techniques": hero_setup_data.get("require_techniques", False),
                },
            )

        return Response(AdventureTemplateSerializer(adventure).data, status=status.HTTP_201_CREATED)
