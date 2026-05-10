"""Control de intentos fallidos de login (por IP + correo) con bloqueo temporal."""
from __future__ import annotations

import hashlib
import time

from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import APIException, AuthenticationFailed

from .audit import obtener_ip_cliente


class LoginTemporarilyLocked(APIException):
    status_code = 429
    default_code = 'login_locked'


def _guard_key(request, email: str) -> str:
    ip = obtener_ip_cliente(request) or 'unknown'
    email_norm = (email or '').strip().lower()
    digest = hashlib.sha256(f'{ip}|{email_norm}'.encode()).hexdigest()[:40]
    return f'login_guard:v1:{digest}'


def _max_attempts() -> int:
    return int(getattr(settings, 'LOGIN_FAIL_MAX_ATTEMPTS', 3))


def _lockout_seconds() -> int:
    return int(getattr(settings, 'LOGIN_FAIL_LOCKOUT_SECONDS', 180))


def get_login_guard_state(request, email: str) -> dict:
    key = _guard_key(request, email)
    state = cache.get(key)
    now = time.time()
    if not state:
        return {'fails': 0, 'locked_until': None, 'key': key}
    locked_until = state.get('locked_until')
    if locked_until is not None and now >= float(locked_until):
        cache.delete(key)
        return {'fails': 0, 'locked_until': None, 'key': key}
    return {
        'fails': int(state.get('fails', 0)),
        'locked_until': locked_until,
        'key': key,
    }


def assert_login_not_locked(request, email: str) -> None:
    state = get_login_guard_state(request, email)
    lu = state.get('locked_until')
    if lu is None:
        return
    now = time.time()
    if now >= float(lu):
        return
    retry = int(float(lu) - now + 0.999)
    minutes = max(1, (retry + 59) // 60)
    raise LoginTemporarilyLocked(
        detail={
            'detail': (
                'Demasiados intentos fallidos. El inicio de sesión está bloqueado temporalmente '
                f'({minutes} minuto(s)).'
            ),
            'retry_after_seconds': retry,
            'max_intentos': _max_attempts(),
            'intentos_restantes': 0,
        }
    )


def record_login_failure(request, email: str) -> None:
    """Incrementa fallos; si se alcanza el máximo, bloquea. Siempre lanza excepción HTTP."""
    max_a = _max_attempts()
    lock_s = _lockout_seconds()
    state = get_login_guard_state(request, email)
    key = state['key']
    fails = int(state['fails']) + 1

    if fails >= max_a:
        now = time.time()
        payload = {'fails': 0, 'locked_until': now + lock_s}
        cache.set(key, payload, timeout=lock_s + 120)
        minutes = max(1, (lock_s + 59) // 60)
        raise LoginTemporarilyLocked(
            detail={
                'detail': (
                    f'Se superó el número de intentos permitidos. Vuelve a intentar en {minutes} minuto(s).'
                ),
                'retry_after_seconds': int(lock_s),
                'max_intentos': max_a,
                'intentos_restantes': 0,
            }
        )

    payload = {'fails': fails, 'locked_until': None}
    cache.set(key, payload, timeout=86400)
    restantes = max(0, max_a - fails)
    raise AuthenticationFailed(
        detail={
            'detail': 'Correo o contraseña incorrectos.',
            'intentos_restantes': restantes,
            'max_intentos': max_a,
        }
    )


def clear_login_guard(request, email: str) -> None:
    cache.delete(_guard_key(request, email))
