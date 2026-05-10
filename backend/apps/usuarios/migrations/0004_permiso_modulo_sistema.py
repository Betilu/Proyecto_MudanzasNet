from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_grupos_y_permiso_ui'),
    ]

    operations = [
        migrations.AlterField(
            model_name='permiso',
            name='modulo',
            field=models.CharField(
                choices=[
                    ('usuarios', 'Usuarios'),
                    ('crm', 'CRM'),
                    ('inventario', 'Inventario'),
                    ('reservas', 'Reservas'),
                    ('reportes', 'Reportes'),
                    ('vehiculos', 'Vehículos'),
                    ('pagos', 'Pagos'),
                    ('chatbot', 'Chatbot'),
                    ('servicios', 'Servicios'),
                    ('ui', 'Interfaz (menú / componentes)'),
                    ('sistema', 'Sistema / mantenimiento'),
                ],
                max_length=50,
            ),
        ),
    ]
