"""Views for managing adventure templates and related resources."""
from __future__ import annotations

from rest_framework import generics, permissions

from .base import AdventureTemplateMixin
from ..models import (
    Adventure,
    AdventureEvent,
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
from ..serializers import (
    AdventureEventSerializer,
    AdventureHeroSetupSerializer,
    AdventureTemplateSerializer,
    CharacterSerializer,
    CharacterSystemSerializer,
    CharacterTechniqueSerializer,
    FactionSerializer,
    LocationSerializer,
    OtherInfoSerializer,
    RaceSerializer,
    SkillSystemSerializer,
    TechniqueSerializer,
)


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
