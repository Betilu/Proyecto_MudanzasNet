import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0001_initial'),
        ('servicios', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='direccion_origen_habitual',
            field=models.TextField(blank=True, help_text='Dirección de origen frecuente (W9)'),
        ),
        migrations.AddField(
            model_name='cliente',
            name='direccion_destino_habitual',
            field=models.TextField(blank=True, help_text='Dirección de destino frecuente (W9)'),
        ),
        migrations.AddField(
            model_name='cliente',
            name='tipo_mudanza_preferido',
            field=models.ForeignKey(
                blank=True,
                help_text='Tipo de mudanza / servicio preferido (W9)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='clientes_preferencia',
                to='servicios.tiposervicio',
            ),
        ),
        migrations.AlterField(
            model_name='comunicacioncliente',
            name='canal',
            field=models.CharField(
                choices=[
                    ('llamada', 'Llamada'),
                    ('email', 'Email'),
                    ('sms', 'SMS'),
                    ('whatsapp', 'WhatsApp'),
                    ('mensaje', 'Mensaje / chat'),
                    ('sistema', 'Sistema'),
                ],
                max_length=20,
            ),
        ),
    ]
