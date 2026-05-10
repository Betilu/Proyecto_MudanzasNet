from .base import *

DEBUG = True

# Permitir acceso desde red local para pruebas con app móvil.
# Si .env define ALLOWED_HOSTS, se expande con defaults de desarrollo.
_dev_default_hosts = ['localhost', '127.0.0.1', '0.0.0.0', '192.168.100.146', '*']
_env_hosts = config('ALLOWED_HOSTS', default='', cast=Csv())
ALLOWED_HOSTS = sorted(set([*(_env_hosts or []), *_dev_default_hosts]))

# Almacenamiento local en desarrollo
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Correo: SENDGRID_API_KEY en .env → SendGrid por API HTTP (anymail).
# Sin SENDGRID_API_KEY → consola por defecto. Forzar consola:
# SENDGRID_API_KEY=
# EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Logging detallado
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django.db.backends': {'level': 'WARNING'},
    },
}
