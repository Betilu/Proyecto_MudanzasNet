# Generated manually: widen lat/lng decimals so JS float precision validates.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cotizaciones', '0003_cotizacion_descripcion'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cotizacion',
            name='latitud_destino',
            field=models.DecimalField(
                blank=True,
                decimal_places=9,
                help_text='Coordenada GPS destino',
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='cotizacion',
            name='latitud_origen',
            field=models.DecimalField(
                blank=True,
                decimal_places=9,
                help_text='Coordenada GPS origen',
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='cotizacion',
            name='longitud_destino',
            field=models.DecimalField(
                blank=True,
                decimal_places=9,
                help_text='Coordenada GPS destino',
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='cotizacion',
            name='longitud_origen',
            field=models.DecimalField(
                blank=True,
                decimal_places=9,
                help_text='Coordenada GPS origen',
                max_digits=12,
                null=True,
            ),
        ),
    ]
