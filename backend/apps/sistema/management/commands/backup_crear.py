"""Genera un respaldo .zip en la ruta indicada (o en cwd). Uso operativo / cron."""

from pathlib import Path

from django.core.management.base import BaseCommand

from apps.sistema.backup_service import BackupError, create_backup_zip_stream


class Command(BaseCommand):
    help = 'Crea un archivo ZIP de respaldo (PostgreSQL + media + ml_models)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--salida',
            type=str,
            default='respaldo_crm.zip',
            help='Ruta del .zip a escribir',
        )

    def handle(self, *args, **options):
        out = Path(options['salida']).resolve()
        try:
            reader, _meta = create_backup_zip_stream()
        except BackupError as e:
            self.stderr.write(self.style.ERROR(str(e)))
            return

        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, 'wb') as f:
            for chunk in reader():
                f.write(chunk)
        self.stdout.write(self.style.SUCCESS(f'Respaldo creado: {out}'))
