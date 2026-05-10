"""
Catálogo de fuentes de datos para reportes personalizables.
Solo se permiten columnas y campos de filtro declarados aquí (sin SQL arbitrario).
"""

from __future__ import annotations

from typing import Any

# Tipos: string | number | decimal | date | datetime | choice
# filter_ops deben coincidir con apply_filters en query.py

DATA_SOURCES: dict[str, dict[str, Any]] = {
    'reservas': {
        'label': 'Reservas',
        'description': 'Reservas de mudanza y datos vinculados al cliente y cotización',
        'columns': [
            {'key': 'id', 'field': 'id', 'label': 'ID', 'type': 'number', 'filter_ops': ['exact', 'in', 'gte', 'lte']},
            {'key': 'codigo_confirmacion', 'field': 'codigo_confirmacion', 'label': 'Código', 'type': 'string', 'filter_ops': ['exact', 'icontains']},
            {'key': 'fecha_servicio', 'field': 'fecha_servicio', 'label': 'Fecha servicio', 'type': 'date', 'filter_ops': ['exact', 'gte', 'lte']},
            {'key': 'franja_horaria', 'field': 'franja_horaria', 'label': 'Franja', 'type': 'string', 'filter_ops': ['exact', 'icontains']},
            {'key': 'estado', 'field': 'estado', 'label': 'Estado', 'type': 'choice', 'filter_ops': ['exact', 'in']},
            {'key': 'cliente_nombre', 'field': 'cliente__usuario__nombre', 'label': 'Nombre cliente', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'cliente_apellido', 'field': 'cliente__usuario__apellido', 'label': 'Apellido cliente', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'cliente_email', 'field': 'cliente__usuario__email', 'label': 'Email cliente', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'precio_total', 'field': 'cotizacion__precio_total_calculado', 'label': 'Precio cotización (calc.)', 'type': 'decimal', 'filter_ops': ['exact', 'gte', 'lte']},
            {'key': 'precio_ia', 'field': 'cotizacion__rf_precio_predicho', 'label': 'Precio IA', 'type': 'decimal', 'filter_ops': ['exact', 'gte', 'lte']},
            {'key': 'zona_origen', 'field': 'cotizacion__zona_origen__nombre', 'label': 'Zona origen', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'zona_destino', 'field': 'cotizacion__zona_destino__nombre', 'label': 'Zona destino', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'creado_en', 'field': 'creado_en', 'label': 'Creado', 'type': 'datetime', 'filter_ops': ['gte', 'lte', 'exact']},
        ],
        'default_order': [{'field': 'fecha_servicio', 'desc': True}],
    },
    'cotizaciones': {
        'label': 'Cotizaciones',
        'description': 'Cotizaciones con zonas y totales',
        'columns': [
            {'key': 'id', 'field': 'id', 'label': 'ID', 'type': 'number', 'filter_ops': ['exact', 'in', 'gte', 'lte']},
            {'key': 'estado', 'field': 'estado', 'label': 'Estado', 'type': 'choice', 'filter_ops': ['exact', 'in']},
            {'key': 'fecha_deseada', 'field': 'fecha_deseada', 'label': 'Fecha deseada', 'type': 'date', 'filter_ops': ['exact', 'gte', 'lte']},
            {'key': 'precio_total_calculado', 'field': 'precio_total_calculado', 'label': 'Total calculado', 'type': 'decimal', 'filter_ops': ['gte', 'lte', 'exact']},
            {'key': 'rf_precio_predicho', 'field': 'rf_precio_predicho', 'label': 'Precio predicho IA', 'type': 'decimal', 'filter_ops': ['gte', 'lte', 'exact']},
            {'key': 'volumen_total_m3', 'field': 'volumen_total_m3', 'label': 'Volumen m³', 'type': 'decimal', 'filter_ops': ['gte', 'lte']},
            {'key': 'peso_total_kg', 'field': 'peso_total_kg', 'label': 'Peso kg', 'type': 'decimal', 'filter_ops': ['gte', 'lte']},
            {'key': 'cliente_email', 'field': 'cliente__usuario__email', 'label': 'Email cliente', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'zona_origen', 'field': 'zona_origen__nombre', 'label': 'Zona origen', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'zona_destino', 'field': 'zona_destino__nombre', 'label': 'Zona destino', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'creado_en', 'field': 'creado_en', 'label': 'Creado', 'type': 'datetime', 'filter_ops': ['gte', 'lte']},
        ],
        'default_order': [{'field': 'creado_en', 'desc': True}],
    },
    'clientes': {
        'label': 'Clientes',
        'description': 'Clientes CRM y métricas',
        'columns': [
            {'key': 'id', 'field': 'id', 'label': 'ID', 'type': 'number', 'filter_ops': ['exact', 'in', 'gte', 'lte']},
            {'key': 'tipo_cliente', 'field': 'tipo_cliente', 'label': 'Tipo', 'type': 'choice', 'filter_ops': ['exact', 'in']},
            {'key': 'nombre_empresa', 'field': 'nombre_empresa', 'label': 'Empresa', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'usuario_email', 'field': 'usuario__email', 'label': 'Email', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'usuario_nombre', 'field': 'usuario__nombre', 'label': 'Nombre', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'usuario_apellido', 'field': 'usuario__apellido', 'label': 'Apellido', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'cantidad_mudanzas', 'field': 'cantidad_mudanzas', 'label': 'Mudanzas', 'type': 'number', 'filter_ops': ['exact', 'gte', 'lte']},
            {'key': 'monto_total_gastado', 'field': 'monto_total_gastado', 'label': 'Total gastado', 'type': 'decimal', 'filter_ops': ['gte', 'lte', 'exact']},
            {'key': 'rf_segmento_predicho', 'field': 'rf_segmento_predicho', 'label': 'Segmento IA', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'creado_en', 'field': 'creado_en', 'label': 'Alta', 'type': 'datetime', 'filter_ops': ['gte', 'lte']},
        ],
        'default_order': [{'field': 'creado_en', 'desc': True}],
    },
    'pagos': {
        'label': 'Pagos',
        'description': 'Pagos por reserva',
        'columns': [
            {'key': 'id', 'field': 'id', 'label': 'ID', 'type': 'number', 'filter_ops': ['exact', 'in', 'gte', 'lte']},
            {'key': 'tipo_pago', 'field': 'tipo_pago', 'label': 'Tipo pago', 'type': 'choice', 'filter_ops': ['exact', 'in']},
            {'key': 'monto', 'field': 'monto', 'label': 'Monto', 'type': 'decimal', 'filter_ops': ['gte', 'lte', 'exact']},
            {'key': 'estado', 'field': 'estado', 'label': 'Estado', 'type': 'choice', 'filter_ops': ['exact', 'in']},
            {'key': 'metodo_pago', 'field': 'metodo_pago__nombre', 'label': 'Método', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'reserva_codigo', 'field': 'reserva__codigo_confirmacion', 'label': 'Reserva', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'moneda', 'field': 'moneda', 'label': 'Moneda', 'type': 'string', 'filter_ops': ['exact']},
            {'key': 'creado_en', 'field': 'creado_en', 'label': 'Creado', 'type': 'datetime', 'filter_ops': ['gte', 'lte']},
        ],
        'default_order': [{'field': 'creado_en', 'desc': True}],
    },
    'servicios_mudanza': {
        'label': 'Servicios de mudanza',
        'description': 'Servicios operativos vinculados a reserva',
        'columns': [
            {'key': 'id', 'field': 'id', 'label': 'ID', 'type': 'number', 'filter_ops': ['exact', 'in', 'gte', 'lte']},
            {'key': 'estado', 'field': 'estado', 'label': 'Estado', 'type': 'choice', 'filter_ops': ['exact', 'in']},
            {'key': 'reserva_codigo', 'field': 'reserva__codigo_confirmacion', 'label': 'Reserva', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'vehiculo_placa', 'field': 'vehiculo__placa', 'label': 'Placa', 'type': 'string', 'filter_ops': ['icontains', 'exact']},
            {'key': 'viajes_reales', 'field': 'viajes_reales', 'label': 'Viajes reales', 'type': 'number', 'filter_ops': ['exact', 'gte', 'lte']},
            {'key': 'duracion_minutos', 'field': 'duracion_minutos', 'label': 'Duración min', 'type': 'number', 'filter_ops': ['exact', 'gte', 'lte']},
            {'key': 'creado_en', 'field': 'creado_en', 'label': 'Creado', 'type': 'datetime', 'filter_ops': ['gte', 'lte']},
        ],
        'default_order': [{'field': 'creado_en', 'desc': True}],
    },
}


def get_source_meta(slug: str) -> dict | None:
    if slug not in DATA_SOURCES:
        return None
    src = DATA_SOURCES[slug]
    return {
        'slug': slug,
        'label': src['label'],
        'description': src.get('description', ''),
        'columns': src['columns'],
        'default_order': src.get('default_order', []),
    }


def list_sources_meta() -> list[dict]:
    return [get_source_meta(k) for k in DATA_SOURCES]


def columns_by_key(slug: str) -> dict[str, dict]:
    src = DATA_SOURCES.get(slug)
    if not src:
        return {}
    return {c['key']: c for c in src['columns']}


def get_column_field(slug: str, key: str) -> str | None:
    c = columns_by_key(slug).get(key)
    return c['field'] if c else None
