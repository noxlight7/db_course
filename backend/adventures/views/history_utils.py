"""History preparation and card update helpers for AI prompts."""
from __future__ import annotations

import json

from backend.llm import LLMClient

from ..models import Adventure, AdventureEvent, AdventureHistory, Character, CharacterSystem, CharacterTechnique
from .prompts import _build_card_update_prompt, _get_history_limits, _get_update_token_limits


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
            record = CharacterSystem.objects.filter(
                character__adventure=adventure, id=record_id
            ).first()
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
            record = CharacterTechnique.objects.filter(
                character__adventure=adventure, id=record_id
            ).first()
            if record is None:
                continue
            if "notes" in entry and isinstance(entry.get("notes"), str):
                record.notes = entry.get("notes")
                record.save(update_fields=["notes"])


def _prepare_history_for_prompt(adventure: Adventure, client: LLMClient) -> list[AdventureHistory]:
    history_entries = list(AdventureHistory.objects.filter(adventure=adventure).order_by("id"))
    max_posts, tail_posts = _get_history_limits()
    if len(history_entries) <= max_posts:
        return history_entries
    if tail_posts == 0:
        return history_entries[-max_posts:]
    if adventure.rollback_min_history_id:
        trimmed = [entry for entry in history_entries if entry.id >= adventure.rollback_min_history_id]
        if len(trimmed) <= max_posts:
            return trimmed
    if len(history_entries) <= tail_posts:
        return history_entries
    cutoff_entry = history_entries[-max_posts]

    attempt_tail = tail_posts
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
        return history_entries[-max_posts:]

    return history_entries[-max_posts:]


def _set_ai_waiting(adventure_id: int, waiting: bool) -> None:
    Adventure.objects.filter(id=adventure_id).update(is_waiting_ai=waiting)
