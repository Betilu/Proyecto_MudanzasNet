from django.apps import AppConfig


class MudanzasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.mudanzas'
    verbose_name = 'Mudanzas'

    def ready(self):
        import apps.mudanzas.signals  # noqa: F401
