"""Restaura desde un .zip generado por este proyecto. Uso con precaución en mantenimiento."""

from pathlib import Path

from django.core.management.base import BaseCommand

from apps.sistema.backup_service import BackupError, restore_from_zip_path


class Command(BaseCommand):
    help = 'Restaura base de datos y archivos desde un ZIP de respaldo'

    def add_arguments(self, parser):
        parser.add_argument('archivo', type=str, help='Ruta al archivo .zip')
        parser.add_argument(
            '--reemplazar-media',
            action='store_true',
            help='Vaciar MEDIA_ROOT antes de copiar archivos del respaldo',
        )
        parser.add_argument(
            '--no-reemplazar-ml',
            action='store_true',
            help='No vaciar IA_MODELS_DIR antes de copiar (fusionar)',
        )

    def handle(self, *args, **options):
        path = Path(options['archivo']).resolve()
        if not path.is_file():
            self.stderr.write(self.style.ERROR('Archivo no encontrado'))
            return
        try:
            resumen = restore_from_zip_path(
                path,
                reemplazar_media=options['reemplazar_media'],
                reemplazar_ml=not options['no_reemplazar_ml'],
            )
        except BackupError as e:
            self.stderr.write(self.style.ERROR(str(e)))
            return
        self.stdout.write(self.style.SUCCESS('Restauración completada'))
        self.stdout.write(str(resumen))
