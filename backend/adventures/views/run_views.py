"""Views for running adventures (non-template gameplay)."""
from __future__ import annotations

from io import BytesIO
import os

from django.db import transaction
from django.http import HttpResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .base import AdventureRunMixin, AdventureTemplateMixin
from ..models import (
    Adventure,
    AdventureEvent,
    AdventureHeroSetup,
    AdventureHistory,
    Character,
    CharacterSystem,
    CharacterTechnique,
    Faction,
    Location,
    ModerationEntry,
    PublishedAdventure,
    OtherInfo,
    Race,
    SkillSystem,
    Technique,
)
from ..serializers import (
    AdventureHeroSetupSerializer,
    AdventureHistorySerializer,
    AdventureRunSerializer,
    AdventureRunDetailSerializer,
    CharacterSerializer,
    LocationSerializer,
    RaceSerializer,
    SkillSystemSerializer,
    TechniqueSerializer,
)


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


class AdventureRunBootstrapView(AdventureRunMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, run_id):
        adventure = self.get_adventure()
        locations = LocationSerializer(
            Location.objects.filter(adventure=adventure).order_by("title"), many=True
        ).data
        races = RaceSerializer(Race.objects.filter(adventure=adventure).order_by("title"), many=True).data
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
        template = Adventure.objects.filter(id=template_id, is_template=True).first()
        if not template:
            raise PermissionDenied("Шаблон приключения не найден.")
        if template.author_user_id != request.user.id:
            if ModerationEntry.objects.filter(adventure=template).exists():
                raise PermissionDenied("Приключение еще на модерации.")
            if not PublishedAdventure.objects.filter(adventure=template).exists():
                raise PermissionDenied("Недостаточно прав для запуска приключения.")
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


class AdventureRunHistoryPdfView(AdventureRunMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, run_id):
        adventure = self.get_adventure()
        history_entries = AdventureHistory.objects.filter(adventure=adventure).order_by("id")
        heroes = Character.objects.filter(adventure=adventure, is_player=True).order_by("title")

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        font_name = "Helvetica"
        font_size = 11
        font_path = os.getenv(
            "PDF_FONT_PATH",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        )
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))
                font_name = "DejaVuSans"
            except Exception:
                font_name = "Helvetica"
        width, height = A4
        left_margin = 48
        top = height - 54
        line_height = 14

        def set_font():
            pdf.setFont(font_name, font_size)

        def write_line(text, current_y):
            set_font()
            pdf.drawString(left_margin, current_y, text)
            return current_y - line_height

        def wrap_text(text, max_width):
            paragraphs = text.splitlines() or [""]
            lines = []
            for paragraph in paragraphs:
                words = paragraph.split()
                if not words:
                    lines.append("")
                    continue
                current = ""
                for word in words:
                    test = f"{current} {word}".strip()
                    if pdfmetrics.stringWidth(test, font_name, font_size) <= max_width:
                        current = test
                    else:
                        if current:
                            lines.append(current)
                        current = word
                if current:
                    lines.append(current)
            return lines

        y = top
        y = write_line(f"Приключение: {adventure.title}", y)
        hero_names = ", ".join(hero.title for hero in heroes) or "—"
        y = write_line(f"Главные герои: {hero_names}", y)
        y = write_line("История:", y - line_height)

        max_width = width - left_margin * 2
        for entry in history_entries:
            role_label = entry.role
            header = f"{role_label.upper()}:"
            if y < 72:
                pdf.showPage()
                y = top
                set_font()
            y = write_line(header, y)
            for line in wrap_text(entry.content or "", max_width):
                if y < 72:
                    pdf.showPage()
                    y = top
                    set_font()
                if line == "":
                    y -= line_height
                else:
                    y = write_line(line, y)
            y -= line_height / 2

        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="adventure_{adventure.id}_history.pdf"'
        return response


class AdventureRunCharactersView(AdventureRunMixin, generics.ListAPIView):
    serializer_class = CharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Character.objects.filter(adventure=self.get_adventure(), in_party=True).order_by(
            "title"
        )
