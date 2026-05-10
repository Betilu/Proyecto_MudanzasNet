# Generated manually — tipo pago total (app cliente: cobro único del servicio)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pagos', '0002_alter_pago_estado_alter_pago_tipo_pago'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pago',
            name='tipo_pago',
            field=models.CharField(
                choices=[
                    ('deposito', 'Depósito'),
                    ('saldo', 'Saldo'),
                    ('total', 'Pago total'),
                ],
                max_length=20,
            ),
        ),
    ]
