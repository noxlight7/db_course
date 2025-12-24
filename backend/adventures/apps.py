from django.apps import AppConfig


class AdventuresConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "adventures"

    def ready(self):
        from django.db.utils import OperationalError, ProgrammingError

        try:
            from .models import Adventure

            Adventure.objects.filter(is_waiting_ai=True).update(is_waiting_ai=False)
        except (OperationalError, ProgrammingError):
            # Database might not be ready during migrations/startup.
            return
