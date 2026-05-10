"""
Backup y restauración coherentes con el stack del proyecto:
- PostgreSQL (pg_dump / psql)
- MEDIA_ROOT (archivos locales)
- IA_MODELS_DIR (Random Forest persistidos en disco)

No sustituye copias en S3 u otros almacenes externos: si se configuran después,
documentar sincronización aparte.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Generator

import django
from django.conf import settings


MANIFEST_VERSION = 1
MANIFEST_NAME = 'manifest.json'
DB_SQL_REL = Path('database') / 'database.sql'
MEDIA_PREFIX = 'media/'
ML_PREFIX = 'ml_models/'


class BackupError(RuntimeError):
    pass


def _db_config() -> dict[str, Any]:
    db = settings.DATABASES['default']
    if db.get('ENGINE') != 'django.db.backends.postgresql':
        raise BackupError('El backup integrado solo admite PostgreSQL.')
    return db


def _pg_tool_path(bin_name: str) -> str:
    """
    Resuelve pg_dump / psql. Si BACKUP_PG_BIN está definido, se busca primero ahí
    (evita usar un cliente antiguo que esté antes en PATH).
    """
    bin_dir = (getattr(settings, 'BACKUP_PG_BIN', '') or '').strip()
    if bin_dir:
        search = f'{Path(bin_dir).resolve()}{os.pathsep}{os.environ.get("PATH", "")}'
        path = shutil.which(bin_name, path=search)
        if path:
            return path
        raise BackupError(
            f'BACKUP_PG_BIN está definido ({bin_dir}) pero no hay "{bin_name}" ejecutable en ese directorio.'
        )
    path = shutil.which(bin_name)
    if not path:
        raise BackupError(
            f'No se encontró "{bin_name}" en PATH. Instala el cliente PostgreSQL '
            f'(misma versión major o superior que el servidor) o define BACKUP_PG_BIN con la carpeta bin del cliente.'
        )
    return path


def _append_pg_version_hint(msg: str) -> str:
    low = msg.lower()
    if 'version mismatch' in low or 'aborting because of server version' in low:
        if 'pg_dump' in low:
            return (
                f'{msg} '
                'El binario pg_dump debe ser de la misma versión major (o superior) que PostgreSQL del servidor. '
                'En macOS/Homebrew: brew install postgresql@14 y en .env pon '
                'BACKUP_PG_BIN=/opt/homebrew/opt/postgresql@14/bin (Intel: /usr/local/opt/postgresql@14/bin).'
            )
        if 'psql' in low:
            return (
                f'{msg} '
                'Usa psql del mismo major que el servidor o define BACKUP_PG_BIN con la carpeta bin correcta.'
            )
        return (
            f'{msg} '
            'Define BACKUP_PG_BIN apuntando al directorio bin del cliente PostgreSQL que coincida con el servidor.'
        )
    return msg


def _pg_env() -> dict[str, str]:
    db = _db_config()
    env = {**os.environ, 'PGPASSWORD': str(db.get('PASSWORD') or '')}
    return env


def run_pg_dump(sql_out: Path) -> None:
    db = _db_config()
    dump = _pg_tool_path('pg_dump')
    sql_out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        dump,
        '-h',
        str(db.get('HOST') or 'localhost'),
        '-p',
        str(db.get('PORT') or 5432),
        '-U',
        str(db.get('USER') or ''),
        '-d',
        str(db.get('NAME') or ''),
        '--no-owner',
        '--no-acl',
        '--clean',
        '--if-exists',
        '-F',
        'p',
        '-f',
        str(sql_out),
    ]
    try:
        subprocess.run(cmd, env=_pg_env(), check=True, timeout=3600, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        err = (e.stderr or e.stdout or str(e)).strip()
        raise BackupError(_append_pg_version_hint(f'pg_dump falló: {err}')) from e
    except FileNotFoundError as e:
        raise BackupError(str(e)) from e


def run_psql_file(sql_file: Path) -> None:
    db = _db_config()
    psql = _pg_tool_path('psql')
    cmd = [
        psql,
        '-h',
        str(db.get('HOST') or 'localhost'),
        '-p',
        str(db.get('PORT') or 5432),
        '-U',
        str(db.get('USER') or ''),
        '-d',
        str(db.get('NAME') or ''),
        '-v',
        'ON_ERROR_STOP=1',
        '-f',
        str(sql_file),
    ]
    try:
        subprocess.run(cmd, env=_pg_env(), check=True, timeout=7200, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        err = (e.stderr or e.stdout or str(e)).strip()
        raise BackupError(_append_pg_version_hint(f'psql (restauración) falló: {err}')) from e


def _add_tree_to_zip(z: zipfile.ZipFile, base: Path, arc_prefix: str) -> None:
    if not base.is_dir():
        return
    for p in base.rglob('*'):
        if p.is_file():
            rel = p.relative_to(base)
            z.write(p, f'{arc_prefix}{rel.as_posix()}')


def build_manifest(includes: list[str]) -> dict[str, Any]:
    db = _db_config()
    return {
        'version': MANIFEST_VERSION,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'django_version': django.get_version(),
        'db_engine': 'postgresql',
        'db_name': db.get('NAME'),
        'includes': includes,
    }


def create_backup_zip_stream() -> tuple[Callable[[], Generator[bytes, None, None]], dict[str, Any]]:
    """
    Genera el .zip en un directorio temporal y devuelve un generador que lee el archivo
    y luego borra el directorio temporal (evita cargar todo en RAM).
    """
    work = Path(tempfile.mkdtemp(prefix='crm_backup_'))
    zip_path = work / 'respaldo.zip'
    meta: dict[str, Any] = {'workdir': str(work), 'zip_path': str(zip_path)}

    includes: list[str] = ['database']
    db_sql = work / DB_SQL_REL
    db_sql.parent.mkdir(parents=True, exist_ok=True)
    run_pg_dump(db_sql)

    media_root = Path(settings.MEDIA_ROOT)
    if media_root.is_dir() and any(media_root.iterdir()):
        includes.append('media')

    ia_dir = Path(getattr(settings, 'IA_MODELS_DIR', ''))
    if ia_dir.is_dir() and any(ia_dir.iterdir()):
        includes.append('ml_models')

    manifest = build_manifest(includes)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr(MANIFEST_NAME, json.dumps(manifest, indent=2, ensure_ascii=False))
        z.write(db_sql, DB_SQL_REL.as_posix())
        if 'media' in includes:
            _add_tree_to_zip(z, media_root, MEDIA_PREFIX)
        if 'ml_models' in includes:
            _add_tree_to_zip(z, ia_dir, ML_PREFIX)

    def reader() -> Generator[bytes, None, None]:
        try:
            with open(zip_path, 'rb') as f:
                while True:
                    chunk = f.read(1024 * 512)
                    if not chunk:
                        break
                    yield chunk
        finally:
            shutil.rmtree(work, ignore_errors=True)

    return reader, meta


def _safe_extract(z: zipfile.ZipFile, dest: Path) -> None:
    root = dest.resolve()
    for m in z.infolist():
        name = (m.filename or '').replace('\\', '/').strip('/')
        if not name or '..' in name.split('/'):
            raise BackupError('Archivo ZIP no válido (ruta sospechosa).')
        target = (root / name).resolve()
        try:
            target.relative_to(root)
        except ValueError as e:
            raise BackupError('Archivo ZIP no válido (path traversal).') from e
    z.extractall(dest)


def restore_from_zip_path(
    zip_path: Path,
    *,
    reemplazar_media: bool = False,
    reemplazar_ml: bool = True,
) -> dict[str, Any]:
    """
    Restaura base de datos (SQL) y opcionalmente media / modelos ML.
    Cierra conexiones Django antes de psql para reducir bloqueos.
    """
    work = Path(tempfile.mkdtemp(prefix='crm_restore_'))
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            _safe_extract(z, work)

        man_path = work / MANIFEST_NAME
        if not man_path.is_file():
            raise BackupError(f'Falta {MANIFEST_NAME} en el respaldo.')

        manifest = json.loads(man_path.read_text(encoding='utf-8'))
        if manifest.get('version') != MANIFEST_VERSION:
            raise BackupError('Versión de manifiesto no compatible.')
        if manifest.get('db_engine') != 'postgresql':
            raise BackupError('Este respaldo no es de PostgreSQL.')

        sql_file = work / DB_SQL_REL
        if not sql_file.is_file():
            raise BackupError('Falta database/database.sql en el respaldo.')

        from django.db import connections

        connections.close_all()

        run_psql_file(sql_file)

        resumen: dict[str, Any] = {'manifest': manifest, 'media': None, 'ml_models': None}

        media_src = work / 'media'
        if media_src.is_dir():
            media_dest = Path(settings.MEDIA_ROOT)
            media_dest.mkdir(parents=True, exist_ok=True)
            if reemplazar_media:
                for child in media_dest.iterdir():
                    if child.is_dir():
                        shutil.rmtree(child, ignore_errors=True)
                    elif child.is_file():
                        child.unlink(missing_ok=True)
            for p in media_src.rglob('*'):
                if p.is_file():
                    rel = p.relative_to(media_src)
                    target = media_dest / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(p, target)
            resumen['media'] = 'restaurado'

        ml_src = work / 'ml_models'
        if ml_src.is_dir() and any(ml_src.iterdir()):
            ml_dest = Path(getattr(settings, 'IA_MODELS_DIR', ''))
            if ml_dest:
                ml_dest.mkdir(parents=True, exist_ok=True)
                if reemplazar_ml:
                    for child in ml_dest.iterdir():
                        if child.is_dir():
                            shutil.rmtree(child, ignore_errors=True)
                        elif child.is_file():
                            child.unlink(missing_ok=True)
                for p in ml_src.rglob('*'):
                    if p.is_file():
                        rel = p.relative_to(ml_src)
                        target = ml_dest / rel
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(p, target)
                resumen['ml_models'] = 'restaurado'

        return resumen
    finally:
        shutil.rmtree(work, ignore_errors=True)


def restore_from_uploaded_file(
    file_obj,
    *,
    reemplazar_media: bool = False,
    reemplazar_ml: bool = True,
    max_bytes: int,
) -> dict[str, Any]:
    suffix = Path(getattr(file_obj, 'name', 'backup.zip')).suffix or '.zip'
    size = 0
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        for chunk in file_obj.chunks():
            size += len(chunk)
            if size > max_bytes:
                tmp.close()
                Path(tmp.name).unlink(missing_ok=True)
                raise BackupError(f'El archivo supera el límite de {max_bytes // (1024 * 1024)} MB.')
            tmp.write(chunk)
        tmp.flush()
        path = Path(tmp.name)
    try:
        return restore_from_zip_path(path, reemplazar_media=reemplazar_media, reemplazar_ml=reemplazar_ml)
    finally:
        path.unlink(missing_ok=True)
