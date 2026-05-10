import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportePersonalizado',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=150)),
                ('descripcion', models.TextField(blank=True)),
                ('fuente', models.CharField(db_index=True, max_length=80)),
                ('columnas', models.JSONField(default=list, help_text='Lista de keys de columnas según catálogo de la fuente')),
                ('filtros', models.JSONField(default=list, help_text='Filtros sugeridos al abrir el reporte')),
                ('orden', models.JSONField(default=list, help_text='Lista de {field, desc} para ordenar')),
                ('es_compartido', models.BooleanField(default=False, help_text='Si es True, otros usuarios con permiso de reportes pueden ver y usar la plantilla')),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_personalizados', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Reporte personalizado',
                'verbose_name_plural': 'Reportes personalizados',
                'db_table': 'reportes_personalizados',
                'ordering': ['-actualizado_en'],
            },
        ),
    ]
