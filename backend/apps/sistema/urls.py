from django.urls import path

from .views import BackupDescargarView, BackupRestaurarView

urlpatterns = [
    path('backup/descargar/', BackupDescargarView.as_view(), name='sistema-backup-descargar'),
    path('backup/restaurar/', BackupRestaurarView.as_view(), name='sistema-backup-restaurar'),
]
