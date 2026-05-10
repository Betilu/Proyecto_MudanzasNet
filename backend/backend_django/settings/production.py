from decouple import config
from .base import *

DEBUG = False

# Restauración vía POST /api/sistema/backup/restaurar/ desactivada por defecto (CLI: backup_restaurar). La descarga del .zip no depende de esto.
BACKUP_RESTORE_ENABLED = config('BACKUP_RESTORE_ENABLED', default=False, cast=bool)

# Almacenamiento local en producción (sin AWS por indicación del usuario)
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Detrás de Nginx: el cliente usa HTTPS en el borde; Gunicorn recibe HTTP.
# Sin esto Django cree que la petición es HTTP y SECURE_SSL_REDIRECT redirige a https://
# (fallo si 443 no está configurado o bucles raros).
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Seguridad (si Nginx solo tiene :80, pon SECURE_SSL_REDIRECT=False en .env hasta Certbot)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=SECURE_SSL_REDIRECT, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=SECURE_SSL_REDIRECT, cast=bool)

# Correo: base.py (SendGrid API HTTP con SENDGRID_API_KEY + django-anymail)
