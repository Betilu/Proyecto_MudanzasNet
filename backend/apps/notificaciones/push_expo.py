"""Envío de notificaciones a través de la API HTTP de Expo Push (sin dependencias extra)."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def _payload_data(datos: dict[str, Any] | None) -> dict[str, str]:
    """Expo recomienda valores string en el objeto data."""
    if not datos:
        return {}
    out: dict[str, str] = {}
    for k, v in datos.items():
        if v is None:
            continue
        out[str(k)] = v if isinstance(v, str) else json.dumps(v, default=str)
    return out


def enviar_expo_push(
    tokens: list[str],
    titulo: str,
    cuerpo: str,
    datos_extra: dict[str, Any] | None = None,
) -> None:
    """
    Envía un mensaje a uno o más tokens Expo. Errores de red/API se registran y no propagan.
    """
    tokens = [t for t in tokens if t and isinstance(t, str)]
    if not tokens:
        return

    data = _payload_data(datos_extra)
    messages = [
        {
            'to': token,
            'title': titulo[:200],
            'body': cuerpo[:2000] if cuerpo else '',
            'data': data,
            # Omitir 'sound': en Android Expo interpreta 'default' como recurso custom no incluido en el plugin.
            'priority': 'high',
            'channelId': 'default',
        }
        for token in tokens
    ]

    body = json.dumps(messages).encode('utf-8')
    req = urllib.request.Request(
        EXPO_PUSH_URL,
        data=body,
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
        parsed = json.loads(raw)
        if isinstance(parsed, dict) and parsed.get('errors'):
            logger.warning('Expo push respondió con errores: %s', parsed['errors'])
    except urllib.error.HTTPError as e:
        logger.warning('Expo push HTTP %s: %s', e.code, e.read().decode('utf-8', errors='replace')[:500])
    except urllib.error.URLError as e:
        logger.warning('Expo push red: %s', e)
    except Exception:
        logger.exception('Expo push falló de forma inesperada')
