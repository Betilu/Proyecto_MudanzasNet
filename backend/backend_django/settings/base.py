import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _clean_env_string(name: str, default: str = '') -> str:
    value = config(name, default=default)
    if value is None:
        return ''
    value = str(value).strip()
    if ' #' in value:
        value = value.split(' #', 1)[0].strip()
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        value = value[1:-1]
    return value.strip()

SECRET_KEY = config('SECRET_KEY', default='django-insecure-o!zzo6wtl*!#lbi21-%^tjkgxuwf2%ky@pp4aa-j&r^gdkf!i_')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# ----------------------------------------------------------------
# APPS
# ----------------------------------------------------------------
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'channels',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'corsheaders',
    'drf_spectacular',
    'phonenumber_field',
    'anymail',
]

LOCAL_APPS = [
    'apps.usuarios',
    'apps.clientes',
    'apps.zonas',
    'apps.inventario',
    'apps.servicios',
    'apps.cotizaciones',
    'apps.reservas',
    'apps.vehiculos',
    'apps.personal',
    'apps.mudanzas',
    'apps.carga',
    'apps.chatbot',
    'apps.pagos',
    'apps.notificaciones',
    'apps.reportes',
    'apps.sistema',
    'apps.ia',
    'apps.app_cliente',
    'apps.realtime',
]

# daphne debe ir antes de django.contrib.staticfiles (comprobación daphne.E001)
INSTALLED_APPS = ['daphne'] + DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

ASGI_APPLICATION = 'backend_django.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# ----------------------------------------------------------------
# MIDDLEWARE
# ----------------------------------------------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend_django.urls'

# ----------------------------------------------------------------
# BASE DE DATOS (usa config existente crm_betty)
# ----------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='crm_betty'),
        'USER': config('DB_USER', default='defectdojo'),
        'PASSWORD': config('DB_PASSWORD', default='12345678'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5433'),
        'OPTIONS': {
            'connect_timeout': 5,
        },
    }
}

# ----------------------------------------------------------------
# MODELO DE USUARIO PERSONALIZADO
# ----------------------------------------------------------------
AUTH_USER_MODEL = 'usuarios.Usuario'

# ----------------------------------------------------------------
# REST FRAMEWORK
# ----------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',
        'user': '120/minute',
        'password_reset_request': '10/hour',
        'password_reset_confirm': '30/hour',
    },
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S',
    'DATE_FORMAT': '%Y-%m-%d',
}

# ----------------------------------------------------------------
# JWT
# ----------------------------------------------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ----------------------------------------------------------------
# CORS
# ----------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000,http://localhost:5173', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# ----------------------------------------------------------------
# ARCHIVOS Y ALMACENAMIENTO (local, sin AWS)
# ----------------------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Backup / restauración (PostgreSQL + media + ml_models).
# pg_dump/psql deben ser la misma versión major (o superior) que el servidor.
# Si en PATH hay un cliente viejo (p. ej. pg 12 con servidor 14), define el directorio del cliente correcto:
# BACKUP_PG_BIN=/opt/homebrew/opt/postgresql@14/bin
BACKUP_PG_BIN = config('BACKUP_PG_BIN', default='').strip()
# Solo afecta a POST /backup/restaurar/ (y subida). La descarga GET siempre la pueden usar administradores.
BACKUP_RESTORE_ENABLED = config('BACKUP_RESTORE_ENABLED', default=True, cast=bool)
BACKUP_MAX_UPLOAD_MB = config('BACKUP_MAX_UPLOAD_MB', default=512, cast=int)
BACKUP_MAX_UPLOAD_BYTES = BACKUP_MAX_UPLOAD_MB * 1024 * 1024

# Límite de subida de archivos (10MB para fotos)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# ----------------------------------------------------------------
# DRF SPECTACULAR (Documentación API)
# ----------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    'TITLE': 'API CRM Mudanzas',
    'DESCRIPTION': 'API REST para el Sistema de Gestión y Logística de Mudanzas con IA',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
    'SECURITY': [{'bearerAuth': []}],
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'bearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            }
        }
    },
}

# ----------------------------------------------------------------
# INTERNACIONALIZACIÓN
# ----------------------------------------------------------------
LANGUAGE_CODE = 'es-bo'
TIME_ZONE = 'America/La_Paz'
USE_I18N = True
USE_TZ = True

# ----------------------------------------------------------------
# CAMPO AUTO POR DEFECTO
# ----------------------------------------------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ----------------------------------------------------------------
# TEMPLATES (solo para emails y PDFs, no para frontend)
# ----------------------------------------------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.media',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend_django.wsgi.application'

# ----------------------------------------------------------------
# VALIDACIÓN DE CONTRASEÑAS
# ----------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ----------------------------------------------------------------
# CORREO — SendGrid API HTTP (django-anymail); sin SMTP.
# .env: SENDGRID_API_KEY=SG.... (misma clave que en SendGrid para la API v3).
# Sin clave: EMAIL_BACKEND por defecto = consola (ver abajo).
# ----------------------------------------------------------------
SENDGRID_API_KEY = _clean_env_string('SENDGRID_API_KEY', default='')
if SENDGRID_API_KEY:
    EMAIL_BACKEND = config(
        'EMAIL_BACKEND',
        default='anymail.backends.sendgrid.EmailBackend',
    )
    ANYMAIL = {
        'SENDGRID_API_KEY': SENDGRID_API_KEY,
    }
else:
    EMAIL_BACKEND = config(
        'EMAIL_BACKEND',
        default='django.core.mail.backends.console.EmailBackend',
    )

DEFAULT_FROM_EMAIL = _clean_env_string('DEFAULT_FROM_EMAIL', default='webmaster@localhost')
EMAIL_SITE_NAME = _clean_env_string('EMAIL_SITE_NAME', default='CRM Mudanzas')

# URL pública del portal React (enlace en correos de recuperación)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# ----------------------------------------------------------------
# LOGIN — intentos fallidos y bloqueo temporal (cache)
# ----------------------------------------------------------------
LOGIN_FAIL_MAX_ATTEMPTS = config('LOGIN_FAIL_MAX_ATTEMPTS', default=3, cast=int)
LOGIN_FAIL_LOCKOUT_SECONDS = config('LOGIN_FAIL_LOCKOUT_SECONDS', default=180, cast=int)

# ----------------------------------------------------------------
# RUTA DE MODELOS IA (Random Forest)
# ----------------------------------------------------------------
IA_MODELS_DIR = BASE_DIR / 'ml_models'
