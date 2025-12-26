"""Prompt-building helpers for AI interactions."""
from __future__ import annotations

import json
import os

from ..models import (
    Adventure,
    AdventureEvent,
    AdventureHistory,
    Character,
    CharacterSystem,
    CharacterTechnique,
    SkillSystem,
    Technique,
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
    techniques = Technique.objects.filter(system__adventure=adventure).order_by("title")
    technique_map = {technique.id: technique for technique in techniques}
    character_systems = {}
    for entry in CharacterSystem.objects.filter(character__adventure=adventure):
        character_systems.setdefault(entry.character_id, []).append(entry)
    character_techniques = {}
    for entry in CharacterTechnique.objects.filter(character__adventure=adventure):
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
        Technique.objects.filter(system__adventure=adventure)
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
        CharacterSystem.objects.filter(
            character__adventure=adventure, character_id__in=party_character_ids
        )
        .order_by("id")
        .values("id", "character_id", "system_id", "level", "progress_percent", "notes")
    )
    character_techniques = list(
        CharacterTechnique.objects.filter(character__adventure=adventure, character_id__in=party_character_ids)
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

    # TODO: также обновить карточки, которые затронуты тэгами, когда связывание по тэгам будет реализовано
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
