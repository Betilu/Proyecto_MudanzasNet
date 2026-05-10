"""
W18 — Clasificación automática por categoría.
W23 — Nivel de riesgo (Random Forest entrenado con etiquetas heurísticas + histórico incidencias).
"""
import unicodedata
from decimal import Decimal

try:
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
except ImportError:  # pragma: no cover
    np = None
    RandomForestClassifier = None


def _norm(text):
    if not text:
        return ''
    t = unicodedata.normalize('NFKD', str(text).lower())
    return ''.join(c for c in t if not unicodedata.combining(c))


_KEYWORDS = [
    (('muebles', 'silla', 'mesa', 'cama', 'armario', 'sofa', 'sofá', 'estanteria', 'escritorio'), 'Muebles'),
    (('nevera', 'lavadora', 'secadora', 'horno', 'microondas', 'tv', 'televisor', 'electro'), 'Electrodomésticos'),
    (('caja', 'cajas', 'embalaje'), 'Cajas'),
    (('fragil', 'frágil', 'cristal', 'vidrio', 'espejo', 'cuadro', 'porcelana'), 'Objetos frágiles'),
    (('documento', 'archivo', 'papel'), 'Documentos'),
]

_UMBRAL_GRAN_VOLUMEN_CM3 = Decimal('350000')


def sugerir_categoria_id(nombre, descripcion, volumen_cm3=None):
    from .models import CategoriaObjeto

    if volumen_cm3 is not None and volumen_cm3 >= _UMBRAL_GRAN_VOLUMEN_CM3:
        cat = CategoriaObjeto.objects.filter(nombre__iexact='Gran volumen').first()
        if cat:
            return cat.pk

    blob = _norm(f'{nombre} {descripcion}')
    for palabras, nombre_cat in _KEYWORDS:
        if any(p in blob for p in palabras):
            cat = CategoriaObjeto.objects.filter(nombre__iexact=nombre_cat).first()
            if cat:
                return cat.pk
    return None


def _fragilidad_num(frag):
    return {'baja': 0, 'media': 1, 'alta': 2}.get(frag, 1)


def _ratio_dano_categoria(cat_id):
    from apps.mudanzas.models import Incidencia
    from .models import ObjetoMudanza

    if not cat_id:
        return 0.0
    total = ObjetoMudanza.objects.filter(categoria_id=cat_id).count()
    if total <= 0:
        return 0.0
    danos = Incidencia.objects.filter(tipo='dano', objeto__categoria_id=cat_id).count()
    return min(1.0, danos / max(total, 1))


def _features_obj(o):
    vol = o.volumen_cm3
    vol_m3 = float(vol / Decimal('1000000')) if vol else 0.0
    peso = float(o.peso_kg or 0)
    frag = _fragilidad_num(o.fragilidad)
    rcat = _ratio_dano_categoria(o.categoria_id)
    return [peso, frag, min(vol_m3, 8.0), rcat]


def _heuristic_score_and_class(peso, frag, vol_m3, ratio_cat):
    score = 0.12 * frag + 0.008 * min(peso / 10, 3) + 0.06 * min(vol_m3, 5) + 0.25 * ratio_cat
    if score >= 0.55:
        return score, 'alto'
    if score >= 0.32:
        return score, 'medio'
    return score, 'bajo'


def calcular_riesgo_objeto(obj):
    from .models import ObjetoMudanza

    vol = obj.volumen_cm3
    vol_m3 = float(vol / Decimal('1000000')) if vol else 0.0
    peso = float(obj.peso_kg or 0)
    frag = _fragilidad_num(obj.fragilidad)
    ratio_cat = _ratio_dano_categoria(obj.categoria_id)

    X_train = []
    y_train = []
    qs_otros = ObjetoMudanza.objects.all()
    if getattr(obj, 'pk', None):
        qs_otros = qs_otros.exclude(pk=obj.pk)
    for o in qs_otros[:400]:
        feats = _features_obj(o)
        _, cls = _heuristic_score_and_class(feats[0], feats[1], feats[2], feats[3])
        X_train.append(feats)
        y_train.append({'bajo': 0, 'medio': 1, 'alto': 2}[cls])

    use_rf = (
        np is not None
        and RandomForestClassifier is not None
        and len(X_train) >= 12
        and len(set(y_train)) >= 2
    )

    x = np.array([_features_obj(obj)], dtype=float)

    if use_rf:
        clf = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42, class_weight='balanced')
        clf.fit(np.array(X_train), np.array(y_train))
        proba = clf.predict_proba(x)[0]
        classes = list(clf.classes_)
        p_alto = float(proba[classes.index(2)]) if 2 in classes else 0.0
        p_medio = float(proba[classes.index(1)]) if 1 in classes else 0.0
        p_bajo = float(proba[classes.index(0)]) if 0 in classes else 0.0
        if p_alto >= 0.38:
            nivel = 'alto'
        elif p_medio + p_alto >= 0.42:
            nivel = 'medio'
        else:
            nivel = 'bajo'
        prob = Decimal(str(round(p_alto + 0.45 * p_medio, 4)))
    else:
        score, nivel = _heuristic_score_and_class(peso, frag, vol_m3, ratio_cat)
        prob = Decimal(str(round(min(0.98, max(0.05, score)), 4)))

    if nivel == 'alto':
        prot = 'Embalaje reforzado y seguro obligatorio'
    elif nivel == 'medio':
        prot = 'Protección estándar y esquinas acolchadas'
    else:
        prot = 'Protección básica'

    return nivel, prob, prot


def aplicar_clasificacion_y_riesgo(obj):
    from .models import ObjetoMudanza

    if not obj.pk:
        return

    updates = {}
    if not obj.categoria_id:
        cid = sugerir_categoria_id(obj.nombre, obj.descripcion, obj.volumen_cm3)
        if cid:
            updates['categoria_id'] = cid
            obj.categoria_id = cid

    nivel, prob, prot = calcular_riesgo_objeto(obj)
    updates['rf_nivel_riesgo'] = nivel
    updates['rf_probabilidad_dano'] = prob
    updates['rf_proteccion_sugerida'] = prot

    ObjetoMudanza.objects.filter(pk=obj.pk).update(**updates)
    for k, v in updates.items():
        setattr(obj, k, v)
