from django.contrib import admin
from .models import Personal


@admin.register(Personal)
class PersonalAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'tipo_personal', 'esta_disponible', 'fecha_ingreso')
