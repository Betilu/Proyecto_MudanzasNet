# Generated manually for DispositivoPush

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('notificaciones', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DispositivoPush',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(db_index=True, max_length=512, unique=True)),
                ('aplicacion', models.CharField(choices=[('cliente', 'App cliente'), ('conductor', 'App conductor / cargador')], db_index=True, max_length=20)),
                ('plataforma', models.CharField(choices=[('android', 'Android'), ('ios', 'iOS'), ('web', 'Web')], default='android', max_length=20)),
                ('activo', models.BooleanField(default=True)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dispositivos_push', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'notificaciones_dispositivos_push',
            },
        ),
        migrations.AddIndex(
            model_name='dispositivopush',
            index=models.Index(fields=['usuario', 'aplicacion', 'activo'], name='notificacio_usuario_16e311_idx'),
        ),
    ]
