"""
Predicción de **lealtad / recompra del cliente** (CRM — W15).

Independiente de la IA de **precios de cotización** (`apps.ia`, `rf_precio_predicho` en
Cotizacion): aquí solo se usan histórico de reservas, gasto y tipo de cliente para
rellenar `Cliente.rf_probabilidad_retencion` y `rf_segmento_predicho`.
"""
from decimal import Decimal

from django.db.models import Max
from django.utils import timezone

try:
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
except ImportError:  # pragma: no cover
    np = None
    RandomForestClassifier = None

from .models import Cliente


def _dias_desde_ultima_reserva(cliente):
    """Usa `_ultima_reserva` si el queryset fue anotado; si no, una consulta agregada."""
    last = getattr(cliente, '_ultima_reserva', None)
    if last is None:
        last = cliente.reservas.aggregate(m=Max('fecha_servicio'))['m']
    if not last:
        return 365
    return (timezone.now().date() - last).days


def _queryset_clientes_para_lealtad():
    """select_related + annotate para evitar N+1; sin campos eliminados del modelo."""
    return Cliente.objects.select_related('usuario').annotate(_ultima_reserva=Max('reservas__fecha_servicio'))


def ejecutar_prediccion_lealtad_todos():
    """
    Actualiza rf_probabilidad_retencion, rf_segmento_predicho, rf_ultima_prediccion
    para todos los clientes (solo CRM / lealtad, no precios de cotización).
    """
    clientes = list(_queryset_clientes_para_lealtad().all())
    if not clientes:
        return {'actualizados': 0, 'metodo': 'ninguno', 'alcance': 'lealtad_cliente_crm'}

    if np is None or RandomForestClassifier is None or len(clientes) < 4:
        return _heuristica_simple(clientes)

    X = []
    y = []
    ids = []
    for c in clientes:
        tipo_emp = 1.0 if c.tipo_cliente == 'empresarial' else 0.0
        dias = float(min(_dias_desde_ultima_reserva(c), 730))
        monto = float(c.monto_total_gastado or 0)
        n_mov = float(c.cantidad_mudanzas or 0)
        X.append([n_mov, monto, tipo_emp, dias])
        ids.append(c.pk)
        # Etiqueta débil: cliente "leal" si varias mudanzas o gasto alto
        y.append(1 if (c.cantidad_mudanzas or 0) >= 2 or monto >= 2000 else 0)

    X = np.array(X, dtype=float)
    y = np.array(y, dtype=int)

    if len(np.unique(y)) < 2:
        return _heuristica_simple(clientes)

    clf = RandomForestClassifier(
        n_estimators=80, max_depth=5, random_state=42, class_weight='balanced'
    )
    clf.fit(X, y)
    probas = clf.predict_proba(X)
    # índice de clase positiva (1)
    idx = list(clf.classes_).index(1) if 1 in clf.classes_ else probas.shape[1] - 1
    p1 = probas[:, idx]

    now = timezone.now()
    actualizados = 0
    for c, p in zip(clientes, p1):
        seg = 'alto' if p >= 0.6 else ('medio' if p >= 0.35 else 'bajo')
        Cliente.objects.filter(pk=c.pk).update(
            rf_probabilidad_retencion=Decimal(str(round(float(p), 4))),
            rf_segmento_predicho=seg,
            rf_ultima_prediccion=now,
        )
        actualizados += 1

    return {
        'actualizados': actualizados,
        'metodo': 'random_forest_lealtad_crm',
        'alcance': 'lealtad_cliente_crm',
    }


def _heuristica_simple(clientes):
    now = timezone.now()
    n = 0
    for c in clientes:
        monto = float(c.monto_total_gastado or 0)
        mov = c.cantidad_mudanzas or 0
        dias = _dias_desde_ultima_reserva(c)
        base = 0.15 + 0.12 * min(mov, 5) + min(monto / 15000, 0.35)
        decay = min(dias / 500, 0.25)
        p = max(0.05, min(0.98, base - decay))
        seg = 'alto' if p >= 0.55 else ('medio' if p >= 0.3 else 'bajo')
        Cliente.objects.filter(pk=c.pk).update(
            rf_probabilidad_retencion=Decimal(str(round(p, 4))),
            rf_segmento_predicho=seg,
            rf_ultima_prediccion=now,
        )
        n += 1
    return {
        'actualizados': n,
        'metodo': 'heuristica_lealtad_crm',
        'alcance': 'lealtad_cliente_crm',
    }
