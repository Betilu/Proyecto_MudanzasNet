from django.core.management.base import BaseCommand
from apps.usuarios.models import Usuario, Rol
from apps.clientes.models import Cliente


class Command(BaseCommand):
    help = 'Asigna rol cliente y crea perfil de Cliente para usuarios sin rol'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Procesar todos los usuarios sin rol (no solo staff/superuser)',
        )

    def handle(self, *args, **options):
        # Obtener o crear rol cliente
        rol_cliente, created = Rol.objects.get_or_create(
            nombre='cliente',
            defaults={
                'descripcion': 'Cliente del sistema (app móvil y portal)',
                'es_activo': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Rol "cliente" creado'))
        else:
            self.stdout.write(f'✓ Rol "cliente" ya existe')

        # Filtrar usuarios sin rol que no sean staff/superuser
        usuarios_sin_rol = Usuario.objects.filter(rol__isnull=True)
        if not options['all']:
            usuarios_sin_rol = usuarios_sin_rol.filter(is_staff=False, is_superuser=False)

        total = usuarios_sin_rol.count()
        if total == 0:
            self.stdout.write(self.style.WARNING('No hay usuarios sin rol para procesar'))
            return

        self.stdout.write(f'\nProcesando {total} usuario(s)...\n')

        procesados = 0
        creados = 0

        for usuario in usuarios_sin_rol:
            # Asignar rol cliente
            usuario.rol = rol_cliente
            usuario.save(update_fields=['rol'])
            procesados += 1

            # Crear perfil de Cliente si no existe
            if not hasattr(usuario, 'cliente'):
                Cliente.objects.create(
                    usuario=usuario,
                    tipo_cliente='residencial',
                    preferencia_comunicacion='email'
                )
                creados += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ {usuario.email}: rol asignado + perfil creado')
                )
            else:
                self.stdout.write(f'  ✓ {usuario.email}: rol asignado')

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Procesados: {procesados} usuario(s)'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'✓ Perfiles de Cliente creados: {creados}'
        ))
