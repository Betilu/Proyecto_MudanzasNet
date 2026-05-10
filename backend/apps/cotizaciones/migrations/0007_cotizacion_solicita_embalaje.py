# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cotizaciones', '0006_alter_cotizacion_latitud_destino_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='cotizacion',
            name='solicita_embalaje',
            field=models.BooleanField(
                default=False,
                help_text='Cliente solicita embalaje/refuerzo; se suma al precio y la IA lo considera',
            ),
        ),
    ]
