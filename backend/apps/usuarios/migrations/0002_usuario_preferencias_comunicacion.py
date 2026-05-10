# Generated manually for W6 preferencias de comunicación

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='preferencias_comunicacion',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Preferencias: notificar_email, notificar_sms, notificar_whatsapp, idioma, etc.',
            ),
        ),
    ]
