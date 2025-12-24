"""Domain models for adventures, entities, and gameplay history."""
from __future__ import annotations

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q


class Adventure(models.Model):
    is_template = models.BooleanField(default=False)
    is_waiting_ai = models.BooleanField(default=False)
    rollback_min_history_id = models.BigIntegerField(null=True, blank=True)
    author_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name="authored_adventures",
    )
    player_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="played_adventures",
    )
    template_adventure = models.ForeignKey(
        "self",
        on_delete=models.RESTRICT,
        null=True,
        blank=True,
        related_name="runs",
    )
    primary_hero = models.ForeignKey(
        "Character",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_in_adventures",
    )
    title = models.TextField()
    description = models.TextField(blank=True)
    intro = models.TextField(blank=True)
    spec_instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="adventures_template_or_run_chk",
                condition=(
                    (
                        Q(is_template=True)
                        & Q(player_user__isnull=True)
                        & Q(template_adventure__isnull=True)
                    )
                    | (
                        Q(is_template=False)
                        & Q(player_user__isnull=False)
                        & Q(template_adventure__isnull=False)
                    )
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["player_user"],
                name="idx_adventures_player",
                condition=Q(is_template=False),
            ),
            models.Index(fields=["is_template"], name="idx_adventures_template"),
        ]

    def __str__(self) -> str:
        return self.title

    def clean(self) -> None:
        if self.primary_hero_id and self.id and self.primary_hero.adventure_id != self.id:
            raise ValidationError("Primary hero adventure mismatch.")


class AdventureHeroSetup(models.Model):
    adventure = models.OneToOneField(
        Adventure,
        on_delete=models.CASCADE,
        related_name="hero_setup",
    )
    default_location = models.ForeignKey(
        "Location",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_for_hero_setup",
    )
    require_race = models.BooleanField(default=True)
    default_race = models.ForeignKey(
        "Race",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_for_hero_setup",
    )
    require_age = models.BooleanField(default=False)
    default_age = models.IntegerField(null=True, blank=True)
    require_body_power = models.BooleanField(default=True)
    default_body_power = models.IntegerField(null=True, blank=True)
    require_mind_power = models.BooleanField(default=True)
    default_mind_power = models.IntegerField(null=True, blank=True)
    require_will_power = models.BooleanField(default=True)
    default_will_power = models.IntegerField(null=True, blank=True)
    require_systems = models.BooleanField(default=False)
    require_techniques = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="hero_setup_default_age_nonneg",
                condition=Q(default_age__gte=0) | Q(default_age__isnull=True),
            ),
            models.CheckConstraint(
                name="hero_setup_default_body_nonneg",
                condition=Q(default_body_power__gte=0) | Q(default_body_power__isnull=True),
            ),
            models.CheckConstraint(
                name="hero_setup_default_mind_nonneg",
                condition=Q(default_mind_power__gte=0) | Q(default_mind_power__isnull=True),
            ),
            models.CheckConstraint(
                name="hero_setup_default_will_nonneg",
                condition=Q(default_will_power__gte=0) | Q(default_will_power__isnull=True),
            ),
        ]
        indexes = [
            models.Index(fields=["adventure"], name="idx_hero_setup_adv"),
        ]


class Location(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="locations")
    title = models.TextField()
    description = models.TextField(blank=True)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    width = models.IntegerField(default=1)
    height = models.IntegerField(default=1)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(name="locations_width_gt_zero", condition=Q(width__gt=0)),
            models.CheckConstraint(name="locations_height_gt_zero", condition=Q(height__gt=0)),
        ]
        indexes = [
            models.Index(fields=["adventure", "x", "y"], name="idx_locations_adv_xy"),
            GinIndex(fields=["tags"], name="idx_locations_tags_gin"),
        ]

    def __str__(self) -> str:
        return self.title


class Race(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="races")
    title = models.TextField()
    description = models.TextField(blank=True)
    life_span = models.IntegerField(default=100)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [GinIndex(fields=["tags"], name="idx_races_tags_gin")]

    def __str__(self) -> str:
        return self.title


class Character(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="characters")
    race = models.ForeignKey(
        Race,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="characters",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="characters",
    )
    is_player = models.BooleanField(default=False)
    in_party = models.BooleanField(default=False)
    title = models.TextField()
    age = models.IntegerField(null=True, blank=True)
    body_power = models.IntegerField(default=0)
    body_power_progress = models.IntegerField(default=0)
    mind_power = models.IntegerField(default=0)
    mind_power_progress = models.IntegerField(default=0)
    will_power = models.IntegerField(default=0)
    will_power_progress = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="characters_age_non_negative",
                condition=Q(age__gte=0) | Q(age__isnull=True),
            ),
            models.CheckConstraint(
                name="characters_body_non_negative",
                condition=Q(body_power__gte=0),
            ),
            models.CheckConstraint(
                name="characters_body_progress_range",
                condition=Q(body_power_progress__gte=0) & Q(body_power_progress__lte=100),
            ),
            models.CheckConstraint(
                name="characters_mind_non_negative",
                condition=Q(mind_power__gte=0),
            ),
            models.CheckConstraint(
                name="characters_mind_progress_range",
                condition=Q(mind_power_progress__gte=0) & Q(mind_power_progress__lte=100),
            ),
            models.CheckConstraint(
                name="characters_will_non_negative",
                condition=Q(will_power__gte=0),
            ),
            models.CheckConstraint(
                name="characters_will_progress_range",
                condition=Q(will_power_progress__gte=0) & Q(will_power_progress__lte=100),
            ),
        ]
        indexes = [
            models.Index(
                fields=["adventure", "location"],
                name="idx_characters_adv_location",
            ),
            models.Index(fields=["adventure", "is_player"], name="idx_characters_is_player"),
            models.Index(fields=["adventure", "in_party"], name="idx_characters_in_party"),
            GinIndex(fields=["tags"], name="idx_characters_tags_gin"),
        ]

    def __str__(self) -> str:
        return self.title


class SkillSystem(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="skill_systems")
    title = models.TextField()
    description = models.TextField(blank=True)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    w_body = models.IntegerField(default=0)
    w_mind = models.IntegerField(default=0)
    w_will = models.IntegerField(default=0)
    formula_hint = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="skill_systems_weights_nonneg",
                condition=Q(w_body__gte=0) & Q(w_mind__gte=0) & Q(w_will__gte=0),
            ),
            models.CheckConstraint(
                name="skill_systems_weights_not_all_zero",
                condition=Q(w_body__gt=0) | Q(w_mind__gt=0) | Q(w_will__gt=0),
            ),
        ]
        indexes = [
            models.Index(fields=["adventure"], name="idx_skill_systems_adv"),
            GinIndex(fields=["tags"], name="idx_skill_systems_tags_gin"),
        ]

    def __str__(self) -> str:
        return self.title


class Technique(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="techniques")
    system = models.ForeignKey(SkillSystem, on_delete=models.CASCADE, related_name="techniques")
    title = models.TextField()
    description = models.TextField(blank=True)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    difficulty = models.IntegerField(default=0)
    tier = models.IntegerField(null=True, blank=True)
    required_system_level = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="techniques_difficulty_nonneg",
                condition=Q(difficulty__gte=0),
            ),
            models.CheckConstraint(
                name="techniques_tier_nonneg",
                condition=Q(tier__gte=0) | Q(tier__isnull=True),
            ),
            models.CheckConstraint(
                name="techniques_required_level_nonneg",
                condition=Q(required_system_level__gte=0),
            ),
        ]
        indexes = [
            models.Index(fields=["adventure", "system"], name="idx_techniques_adv_system"),
            GinIndex(fields=["tags"], name="idx_techniques_tags_gin"),
        ]

    def __str__(self) -> str:
        return self.title


class Faction(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="factions")
    title = models.TextField()
    description = models.TextField(blank=True)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [GinIndex(fields=["tags"], name="idx_factions_tags_gin")]

    def __str__(self) -> str:
        return self.title


class OtherInfo(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="other_infos")
    category = models.TextField()
    title = models.TextField()
    description = models.TextField(blank=True)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["adventure", "category"], name="idx_other_info_category"),
            GinIndex(fields=["tags"], name="idx_other_info_tags_gin"),
        ]

    def __str__(self) -> str:
        return self.title


class CharacterSystem(models.Model):
    id = models.BigAutoField(primary_key=True)
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="character_systems")
    character = models.ForeignKey(
        Character,
        on_delete=models.CASCADE,
        related_name="character_systems",
    )
    system = models.ForeignKey(
        SkillSystem,
        on_delete=models.CASCADE,
        related_name="character_systems",
    )
    level = models.IntegerField(default=0)
    progress_percent = models.IntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["adventure", "character", "system"],
                name="uq_character_system",
            ),
            models.CheckConstraint(
                name="character_system_level_nonneg",
                condition=Q(level__gte=0),
            ),
            models.CheckConstraint(
                name="character_system_progress_pct",
                condition=Q(progress_percent__gte=0) & Q(progress_percent__lte=100),
            ),
        ]
        indexes = [
            models.Index(fields=["adventure"], name="idx_character_systems_adv"),
        ]

    def clean(self) -> None:
        if (
            self.character_id
            and self.adventure_id
            and self.character.adventure_id != self.adventure_id
        ):
            raise ValidationError("Character adventure mismatch.")
        if self.system_id and self.adventure_id and self.system.adventure_id != self.adventure_id:
            raise ValidationError("System adventure mismatch.")


class CharacterTechnique(models.Model):
    id = models.BigAutoField(primary_key=True)
    adventure = models.ForeignKey(
        Adventure,
        on_delete=models.CASCADE,
        related_name="character_techniques",
    )
    character = models.ForeignKey(
        Character,
        on_delete=models.CASCADE,
        related_name="character_techniques",
    )
    technique = models.ForeignKey(
        Technique,
        on_delete=models.CASCADE,
        related_name="character_techniques",
    )
    learned_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["adventure", "character", "technique"],
                name="uq_character_technique",
            ),
        ]
        indexes = [
            models.Index(fields=["adventure"], name="idx_character_techniques_adv"),
        ]

    def clean(self) -> None:
        if (
            self.character_id
            and self.adventure_id
            and self.character.adventure_id != self.adventure_id
        ):
            raise ValidationError("Character adventure mismatch.")
        if self.technique_id and self.adventure_id and self.technique.adventure_id != self.adventure_id:
            raise ValidationError("Technique adventure mismatch.")


class CharacterFaction(models.Model):
    id = models.BigAutoField(primary_key=True)
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="character_factions")
    character = models.ForeignKey(
        Character,
        on_delete=models.CASCADE,
        related_name="character_factions",
    )
    faction = models.ForeignKey(Faction, on_delete=models.CASCADE, related_name="character_factions")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["adventure", "character", "faction"],
                name="uq_characters_factions",
            ),
        ]
        indexes = [
            models.Index(fields=["adventure"], name="idx_characters_factions_adv"),
        ]

    def clean(self) -> None:
        if (
            self.character_id
            and self.adventure_id
            and self.character.adventure_id != self.adventure_id
        ):
            raise ValidationError("Character adventure mismatch.")
        if self.faction_id and self.adventure_id and self.faction.adventure_id != self.adventure_id:
            raise ValidationError("Faction adventure mismatch.")


class CharacterRelationship(models.Model):
    adventure = models.ForeignKey(
        Adventure,
        on_delete=models.CASCADE,
        related_name="character_relationships",
    )
    from_character = models.ForeignKey(
        Character,
        on_delete=models.CASCADE,
        related_name="relationships_from",
    )
    to_character = models.ForeignKey(
        Character,
        on_delete=models.CASCADE,
        related_name="relationships_to",
    )
    kind = models.TextField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="rel_not_self",
                condition=~Q(from_character=F("to_character")),
            ),
            models.UniqueConstraint(
                fields=["adventure", "from_character", "to_character", "kind"],
                name="uq_relationship",
            ),
        ]
        indexes = [
            models.Index(fields=["adventure", "from_character"], name="idx_rel_from"),
            models.Index(fields=["adventure", "to_character"], name="idx_rel_to"),
            models.Index(fields=["adventure", "kind"], name="idx_rel_kind"),
        ]

    def clean(self) -> None:
        if (
            self.from_character_id
            and self.adventure_id
            and self.from_character.adventure_id != self.adventure_id
        ):
            raise ValidationError("From-character adventure mismatch.")
        if (
            self.to_character_id
            and self.adventure_id
            and self.to_character.adventure_id != self.adventure_id
        ):
            raise ValidationError("To-character adventure mismatch.")


class AdventureHistory(models.Model):
    class Role(models.TextChoices):
        USER = "user", "user"
        AI = "ai", "ai"
        SYSTEM = "system", "system"

    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="history")
    role = models.TextField(choices=Role.choices)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="history_role_chk",
                condition=Q(role__in=["user", "ai", "system"]),
            )
        ]
        indexes = [
            models.Index(
                fields=["adventure", "-id"],
                name="idx_history_adv_entry_desc",
            ),
        ]


class AdventureMemory(models.Model):
    class Kind(models.TextChoices):
        SUMMARY = "summary", "summary"
        FACT = "fact", "fact"
        RULE = "rule", "rule"
        GOAL = "goal", "goal"

    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="memories")
    kind = models.TextField(choices=Kind.choices)
    title = models.TextField(blank=True)
    content = models.TextField()
    importance = models.IntegerField(default=0)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="memories_kind_chk",
                condition=Q(kind__in=["summary", "fact", "rule", "goal"]),
            )
        ]
        indexes = [
            models.Index(
                fields=["adventure", "-importance"],
                name="idx_memories_adv_importance",
            ),
            GinIndex(fields=["tags"], name="idx_memories_tags_gin"),
        ]


class AdventureEvent(models.Model):
    class Status(models.TextChoices):
        INACTIVE = "inactive", "inactive"
        ACTIVE = "active", "active"
        RESOLVED = "resolved", "resolved"

    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="events")
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )
    status = models.TextField(choices=Status.choices, default=Status.INACTIVE)
    title = models.TextField()
    trigger_hint = models.TextField(blank=True)
    state = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="events_status_chk",
                condition=Q(status__in=["inactive", "active", "resolved"]),
            )
        ]
        indexes = [
            models.Index(fields=["adventure", "status"], name="idx_events_adv_status"),
            models.Index(fields=["adventure", "location", "status"], name="idx_events_adv_loc_status"),
        ]

    def __str__(self) -> str:
        return self.title
