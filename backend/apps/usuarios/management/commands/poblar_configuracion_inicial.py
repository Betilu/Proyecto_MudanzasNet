from django.core.management.base import BaseCommand
from apps.usuarios.models import ConfiguracionSistema


class Command(BaseCommand):
    help = 'Poblar configuración inicial del sistema (Fase 1 del flujo operativo)'

    def handle(self, *args, **options):
        configuraciones = [
            {
                'clave': 'porcentaje_deposito',
                'valor': '10',
                'tipo_dato': 'decimal',
                'descripcion': 'Porcentaje del depósito inicial requerido para confirmar reserva',
            },
            {
                'clave': 'horas_cancelacion_gratuita',
                'valor': '48',
                'tipo_dato': 'integer',
                'descripcion': 'Horas de anticipación para cancelación gratuita',
            },
            {
                'clave': 'porcentaje_iva',
                'valor': '13',
                'tipo_dato': 'decimal',
                'descripcion': 'Porcentaje de IVA aplicado a las facturas',
            },
            {
                'clave': 'dias_vigencia_cotizacion',
                'valor': '7',
                'tipo_dato': 'integer',
                'descripcion': 'Días de vigencia de una cotización enviada',
            },
            {
                'clave': 'horario_atencion_inicio',
                'valor': '08:00',
                'tipo_dato': 'time',
                'descripcion': 'Hora de inicio del horario de atención',
            },
            {
                'clave': 'horario_atencion_fin',
                'valor': '21:00',
                'tipo_dato': 'time',
                'descripcion': 'Hora de fin del horario de atención',
            },
            {
                'clave': 'km_maximos_cobertura',
                'valor': '50',
                'tipo_dato': 'integer',
                'descripcion': 'Kilómetros máximos de cobertura del servicio',
            },
        ]

        created_count = 0
        updated_count = 0

        for config_data in configuraciones:
            config, created = ConfiguracionSistema.objects.update_or_create(
                clave=config_data['clave'],
                defaults={
                    'valor': config_data['valor'],
                    'tipo_dato': config_data['tipo_dato'],
                    'descripcion': config_data['descripcion'],
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Creada: {config.clave} = {config.valor}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'→ Actualizada: {config.clave} = {config.valor}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Proceso completado: {created_count} creadas, {updated_count} actualizadas'))
