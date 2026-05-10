# Generated manually — grupos de usuarios y metadatos de permisos UI

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0002_usuario_preferencias_comunicacion'),
    ]

    operations = [
        migrations.CreateModel(
            name='Grupo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('descripcion', models.TextField(blank=True)),
                ('es_activo', models.BooleanField(default=True)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Grupo de usuarios',
                'verbose_name_plural': 'Grupos de usuarios',
                'db_table': 'grupos_usuario',
            },
        ),
        migrations.AddField(
            model_name='permiso',
            name='tipo_componente',
            field=models.CharField(
                choices=[
                    ('menu', 'Menú / navegación'),
                    ('formulario', 'Formulario / pantalla'),
                    ('boton', 'Botón / acción'),
                    ('campo', 'Campo de formulario'),
                    ('etiqueta', 'Texto / etiqueta'),
                    ('otro', 'Otro'),
                ],
                default='otro',
                help_text='Clasificación para el catálogo de privilegios de UI.',
                max_length=20,
            ),
        ),
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
                ],
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name='usuario',
            name='grupos',
            field=models.ManyToManyField(blank=True, related_name='usuarios', to='usuarios.grupo'),
        ),
        migrations.AddField(
            model_name='grupo',
            name='permisos',
            field=models.ManyToManyField(blank=True, related_name='grupos', to='usuarios.permiso'),
        ),
    ]
