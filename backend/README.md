# Backend Django (`backend_django`)

Paquete de configuración del proyecto Django (settings, URLs, WSGI/ASGI). Los comandos de administración (`manage.py`) se ejecutan desde la **carpeta padre** del repositorio: `backend/`.

## Requisitos previos

- Python 3.12 o superior (compatible con Django 6.x)
- PostgreSQL accesible (el proyecto usa PostgreSQL por defecto)
- Entorno virtual recomendado (`venv`)

## Creación del entorno y dependencias

Desde la raíz del backend (donde está `manage.py` y `requirements.txt`):

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Variables de entorno (`.env`)

En la carpeta `backend/`, crea un archivo `.env` (no lo subas al repositorio; ya está en `.gitignore`). Las variables usadas en `backend_django/settings/base.py` incluyen, entre otras:

- `SECRET_KEY` — clave secreta de Django.
- `DEBUG` — `True` o `False`.
- `ALLOWED_HOSTS` — lista separada por comas.
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` — conexión a PostgreSQL.
- `CORS_ALLOWED_ORIGINS` — orígenes permitidos del frontend (por defecto incluye `http://localhost:5173`).
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS` — opcionales.

Valores por defecto en código (solo para desarrollo local): base de datos `crm_betty`, puerto `5433`, etc. Ajusta `DB_*` a tu instancia de PostgreSQL y crea la base de datos si aún no existe.

## Migraciones

Con el virtualenv activado y estando en `backend/`:

```bash
python manage.py migrate
```

Para generar migraciones nuevas tras cambiar modelos (solo cuando corresponda):

```bash
python manage.py makemigrations
python manage.py migrate
```

## Usuario administrador (superusuario)

Crea la cuenta que usa el panel de Django en `http://127.0.0.1:8000/admin/`:

```bash
python manage.py createsuperuser
```

Indica correo, nombre de usuario y contraseña cuando el comando lo solicite. El modelo de usuario personalizado es `apps.usuarios.Usuario` (`AUTH_USER_MODEL`).

## Comandos útiles posteriores al primer despliegue

- Poblar configuración inicial del sistema (porcentajes, plazos, etc.):

```bash
python manage.py poblar_configuracion_inicial
```

- Datos semilla base del dominio (roles y estructura esperada por el flujo operativo):

```bash
python manage.py seed_data
```

*(Hay también `seed_fake_data` para datos de prueba; ejecutar después de `seed_data`.)*

## Levantar el servidor de desarrollo

```bash
python manage.py runserver
```

Por defecto: **http://127.0.0.1:8000/**

- Panel admin: **http://127.0.0.1:8000/admin/**
- Documentación OpenAPI (Swagger): **http://127.0.0.1:8000/api/docs/**
- ReDoc: **http://127.0.0.1:8000/api/redoc/**

En desarrollo, los archivos subidos se sirven bajo `MEDIA_URL` cuando `DEBUG` es `True`.

## Módulos del proyecto (apps Django)

Definidas en `LOCAL_APPS` de `settings/base.py`:

| App | Prefijo API principal |
| --- | --- |
| `apps.usuarios` | `/api/auth/` |
| `apps.clientes` | `/api/clientes/` |
| `apps.zonas` | `/api/zonas/` |
| `apps.inventario` | `/api/inventario/` |
| `apps.servicios` | `/api/servicios/` |
| `apps.cotizaciones` | `/api/cotizaciones/` |
| `apps.reservas` | `/api/reservas/` |
| `apps.vehiculos` | `/api/vehiculos/` |
| `apps.personal` | `/api/personal/` |
| `apps.mudanzas` | `/api/mudanzas/` |
| `apps.carga` | `/api/carga/` |
| `apps.chatbot` | `/api/chatbot/` |
| `apps.pagos` | `/api/pagos/` |
| `apps.notificaciones` | `/api/notificaciones/` |
| `apps.reportes` | `/api/reportes/` |
| `apps.ia` | `/api/ia/` |

Stack destacado: **Django REST Framework**, **JWT (SimpleJWT)**, **CORS**, **drf-spectacular**, filtros, **PostgreSQL**.

## Settings por entorno

`manage.py` fija por defecto `DJANGO_SETTINGS_MODULE` a `backend_django.settings.development`. Para producción se usa `backend_django.settings.production` (definir según despliegue).
