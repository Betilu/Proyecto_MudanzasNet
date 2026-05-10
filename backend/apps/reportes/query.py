from __future__ import annotations

import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db.models import Model, QuerySet

from .registry import DATA_SOURCES, columns_by_key


def _base_queryset(slug: str) -> QuerySet | None:
    if slug == 'reservas':
        from apps.reservas.models import Reserva
        return Reserva.objects.select_related(
            'cliente__usuario', 'cotizacion', 'cotizacion__zona_origen', 'cotizacion__zona_destino'
        ).all()
    if slug == 'cotizaciones':
        from apps.cotizaciones.models import Cotizacion
        return Cotizacion.objects.select_related(
            'cliente__usuario', 'zona_origen', 'zona_destino', 'tipo_servicio'
        ).all()
    if slug == 'clientes':
        from apps.clientes.models import Cliente
        return Cliente.objects.select_related('usuario').all()
    if slug == 'pagos':
        from apps.pagos.models import Pago
        return Pago.objects.select_related('reserva', 'metodo_pago').all()
    if slug == 'servicios_mudanza':
        from apps.mudanzas.models import ServicioMudanza
        return ServicioMudanza.objects.select_related('reserva', 'vehiculo').all()
    return None


def _coerce_value(col_type: str, value: Any) -> Any:
    if value is None or value == '':
        return None
    if col_type in ('number',):
        return int(value) if not isinstance(value, int) else value
    if col_type in ('decimal',):
        if isinstance(value, (int, float, Decimal)):
            return Decimal(str(value))
        try:
            return Decimal(str(value).replace(',', '.'))
        except InvalidOperation:
            return None
    if col_type == 'date':
        if isinstance(value, datetime.date):
            return value
        if isinstance(value, datetime.datetime):
            return value.date()
        if isinstance(value, str):
            return datetime.date.fromisoformat(value[:10])
    if col_type == 'datetime':
        if isinstance(value, datetime.datetime):
            return value
        if isinstance(value, str):
            return datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if col_type in ('string', 'choice'):
        return str(value)
    return value


def apply_filters(qs: QuerySet, slug: str, filters: list[dict]) -> QuerySet:
    cmap = columns_by_key(slug)
    for item in filters or []:
        key = item.get('field')
        op = item.get('op')
        raw_val = item.get('value')
        if key not in cmap or op not in (
            'exact', 'icontains', 'iexact', 'gte', 'lte', 'gt', 'lt', 'in'
        ):
            continue
        col = cmap[key]
        if op not in (col.get('filter_ops') or []):
            continue
        orm_field = col['field']
        ctype = col['type']
        if op == 'in':
            vals = raw_val if isinstance(raw_val, list) else str(raw_val).split(',')
            coerced = [_coerce_value(ctype, v.strip() if isinstance(v, str) else v) for v in vals]
            coerced = [x for x in coerced if x is not None and x != '']
            if not coerced:
                continue
            qs = qs.filter(**{f'{orm_field}__in': coerced})
            continue
        val = _coerce_value(ctype, raw_val)
        if val is None and raw_val not in (0, '0', False):
            continue
        if op == 'exact':
            qs = qs.filter(**{orm_field: val})
        else:
            qs = qs.filter(**{f'{orm_field}__{op}': val})
    return qs


def apply_order(qs: QuerySet, slug: str, order: list[dict]) -> QuerySet:
    cmap = columns_by_key(slug)
    parts: list[str] = []
    for o in order or []:
        key = o.get('field')
        if key not in cmap:
            continue
        f = cmap[key]['field']
        prefix = '-' if o.get('desc') else ''
        parts.append(f'{prefix}{f}')
    if parts:
        return qs.order_by(*parts)
    src = DATA_SOURCES.get(slug, {})
    for d in src.get('default_order', []):
        key = d.get('field')
        if key in cmap:
            f = cmap[key]['field']
            prefix = '-' if d.get('desc') else ''
            parts.append(f'{prefix}{f}')
    return qs.order_by(*parts) if parts else qs


def get_value_from_instance(obj: Model, field_path: str) -> Any:
    cur: Any = obj
    for part in field_path.split('__'):
        if cur is None:
            return None
        cur = getattr(cur, part, None)
    if isinstance(cur, Decimal):
        return float(cur)
    if isinstance(cur, (datetime.date, datetime.datetime)):
        return cur.isoformat()
    return cur


def execute_report(
    slug: str,
    column_keys: list[str],
    filters: list[dict] | None = None,
    order: list[dict] | None = None,
    limit: int = 200,
    offset: int = 0,
    max_limit: int = 2000,
) -> tuple[list[dict], int]:
    if slug not in DATA_SOURCES:
        raise ValueError('fuente_invalida')
    cmap = columns_by_key(slug)
    keys = [k for k in column_keys if k in cmap]
    if not keys:
        keys = [c['key'] for c in DATA_SOURCES[slug]['columns'][:8]]

    qs = _base_queryset(slug)
    if qs is None:
        raise ValueError('fuente_invalida')
    qs = apply_filters(qs, slug, filters or [])
    total = qs.count()
    qs = apply_order(qs, slug, order or [])
    cap = max(1, min(max_limit, 5000))
    limit = max(1, min(int(limit or 200), cap))
    offset = max(0, int(offset or 0))
    qs = qs[offset : offset + limit]

    rows: list[dict] = []
    for obj in qs:
        row = {}
        for k in keys:
            row[k] = get_value_from_instance(obj, cmap[k]['field'])
        rows.append(row)
    return rows, total


def headers_for_keys(slug: str, column_keys: list[str]) -> list[tuple[str, str]]:
    cmap = columns_by_key(slug)
    out: list[tuple[str, str]] = []
    for k in column_keys:
        if k in cmap:
            out.append((k, cmap[k]['label']))
    return out
