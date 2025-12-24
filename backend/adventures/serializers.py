"""
Serializers for the adventures app.
"""
from __future__ import annotations

from rest_framework import serializers

from .models import (
    Adventure,
    AdventureHeroSetup,
    Character,
    CharacterSystem,
    CharacterTechnique,
    AdventureEvent,
    Faction,
    AdventureHistory,
    Location,
    OtherInfo,
    Race,
    SkillSystem,
    Technique,
)


class AdventureTemplateSerializer(serializers.ModelSerializer):
    """Serializer for listing/creating adventure templates."""

    class Meta:
        model = Adventure
        fields = (
            "id",
            "title",
            "description",
            "spec_instructions",
            "intro",
            "primary_hero",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data: dict) -> Adventure:
        user = self.context["request"].user
        return Adventure.objects.create(
            author_user=user,
            is_template=True,
            player_user=None,
            template_adventure=None,
            **validated_data,
        )

    def validate(self, attrs: dict) -> dict:
        adventure = self.instance
        primary_hero = attrs.get("primary_hero", getattr(adventure, "primary_hero", None))
        if adventure is None and primary_hero is not None:
            raise serializers.ValidationError(
                {"primary_hero": "Главного героя можно назначить после создания приключения."}
            )
        if adventure and primary_hero and primary_hero.adventure_id != adventure.id:
            raise serializers.ValidationError(
                {"primary_hero": "Главный герой принадлежит другому приключению."}
            )
        return attrs


class AdventureHeroSetupSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdventureHeroSetup
        fields = (
            "default_location",
            "require_race",
            "default_race",
            "require_age",
            "default_age",
            "require_body_power",
            "default_body_power",
            "require_mind_power",
            "default_mind_power",
            "require_will_power",
            "default_will_power",
            "require_systems",
            "require_techniques",
        )

    def validate_default_race(self, value):
        if value is None:
            return value
        if self.instance and value.adventure_id != self.instance.adventure_id:
            raise serializers.ValidationError("Раса принадлежит другому приключению.")
        return value

    def validate_default_location(self, value):
        if value is None:
            return value
        if self.instance and value.adventure_id != self.instance.adventure_id:
            raise serializers.ValidationError("Локация принадлежит другому приключению.")
        return value


class AdventureRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = Adventure
        fields = (
            "id",
            "title",
            "description",
            "intro",
            "spec_instructions",
            "template_adventure",
            "primary_hero",
            "rollback_min_history_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AdventureRunDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Adventure
        fields = (
            "id",
            "title",
            "description",
            "intro",
            "spec_instructions",
            "template_adventure",
            "primary_hero",
            "rollback_min_history_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "template_adventure", "created_at", "updated_at")

    def validate(self, attrs: dict) -> dict:
        adventure = self.instance
        primary_hero = attrs.get("primary_hero", getattr(adventure, "primary_hero", None))
        if adventure and primary_hero and primary_hero.adventure_id != adventure.id:
            raise serializers.ValidationError(
                {"primary_hero": "Главный герой принадлежит другому приключению."}
            )
        return attrs


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = (
            "id",
            "title",
            "description",
            "x",
            "y",
            "width",
            "height",
            "tags",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class RaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Race
        fields = (
            "id",
            "title",
            "description",
            "life_span",
            "tags",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class SkillSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillSystem
        fields = (
            "id",
            "title",
            "description",
            "tags",
            "w_body",
            "w_mind",
            "w_will",
            "formula_hint",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs: dict) -> dict:
        w_body = attrs.get("w_body", getattr(self.instance, "w_body", 0))
        w_mind = attrs.get("w_mind", getattr(self.instance, "w_mind", 0))
        w_will = attrs.get("w_will", getattr(self.instance, "w_will", 0))
        if w_body < 0 or w_mind < 0 or w_will < 0:
            raise serializers.ValidationError("Веса характеристик не могут быть отрицательными.")
        if (w_body + w_mind + w_will) <= 0:
            raise serializers.ValidationError("Нужно задать хотя бы один вес больше нуля.")
        return attrs


class TechniqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Technique
        fields = (
            "id",
            "system",
            "title",
            "description",
            "tags",
            "difficulty",
            "tier",
            "required_system_level",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs: dict) -> dict:
        adventure = self.context.get("adventure")
        if adventure is None:
            return attrs
        system = attrs.get("system", getattr(self.instance, "system", None))
        if system and system.adventure_id != adventure.id:
            raise serializers.ValidationError({"system": "Система из другого приключения."})
        return attrs


class FactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Faction
        fields = ("id", "title", "description", "tags", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class OtherInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = OtherInfo
        fields = (
            "id",
            "category",
            "title",
            "description",
            "tags",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

class CharacterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Character
        fields = (
            "id",
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
            "race",
            "location",
            "tags",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs: dict) -> dict:
        adventure = self.context.get("adventure")
        if adventure is None:
            return attrs
        race = attrs.get("race", getattr(self.instance, "race", None))
        if race and race.adventure_id != adventure.id:
            raise serializers.ValidationError({"race": "Раса принадлежит другому приключению."})
        location = attrs.get("location", getattr(self.instance, "location", None))
        if location and location.adventure_id != adventure.id:
            raise serializers.ValidationError({"location": "Локация принадлежит другому приключению."})
        for field in (
            "body_power_progress",
            "mind_power_progress",
            "will_power_progress",
        ):
            value = attrs.get(field, getattr(self.instance, field, 0))
            if value < 0 or value > 100:
                raise serializers.ValidationError({field: "Прогресс должен быть в диапазоне 0-100."})
        return attrs


class CharacterSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CharacterSystem
        fields = (
            "id",
            "character",
            "system",
            "level",
            "progress_percent",
            "notes",
        )
        read_only_fields = ("id",)

    def validate(self, attrs: dict) -> dict:
        adventure = self.context.get("adventure")
        if adventure is None:
            return attrs
        character = attrs.get("character", getattr(self.instance, "character", None))
        if character and character.adventure_id != adventure.id:
            raise serializers.ValidationError({"character": "Персонаж из другого приключения."})
        system = attrs.get("system", getattr(self.instance, "system", None))
        if system and system.adventure_id != adventure.id:
            raise serializers.ValidationError({"system": "Система из другого приключения."})
        progress = attrs.get("progress_percent", getattr(self.instance, "progress_percent", 0))
        if progress < 0 or progress > 100:
            raise serializers.ValidationError(
                {"progress_percent": "Прогресс должен быть в диапазоне 0-100."}
            )
        return attrs


class CharacterTechniqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CharacterTechnique
        fields = (
            "id",
            "character",
            "technique",
            "learned_at",
            "notes",
        )
        read_only_fields = ("id", "learned_at")

    def validate(self, attrs: dict) -> dict:
        adventure = self.context.get("adventure")
        if adventure is None:
            return attrs
        character = attrs.get("character", getattr(self.instance, "character", None))
        if character and character.adventure_id != adventure.id:
            raise serializers.ValidationError({"character": "Персонаж из другого приключения."})
        technique = attrs.get("technique", getattr(self.instance, "technique", None))
        if technique and technique.adventure_id != adventure.id:
            raise serializers.ValidationError({"technique": "Прием из другого приключения."})
        return attrs


class AdventureEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdventureEvent
        fields = (
            "id",
            "location",
            "status",
            "title",
            "trigger_hint",
            "state",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs: dict) -> dict:
        adventure = self.context.get("adventure")
        if adventure is None:
            return attrs
        location = attrs.get("location", getattr(self.instance, "location", None))
        if location and location.adventure_id != adventure.id:
            raise serializers.ValidationError({"location": "Локация из другого приключения."})
        return attrs


class AdventureHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AdventureHistory
        fields = ("id", "role", "content", "metadata", "created_at")
        read_only_fields = ("id", "created_at")
