"""W20 — Acta digital pre-traslado (PDF)."""
from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def generar_acta_pretraslado_pdf(cotizacion):
    """
    Genera PDF en memoria con inventario de objetos y referencia a fotos (rutas).
    cotizacion: instancia Cotizacion con prefetch objetos, objetos__fotos, objetos__categoria.
    """
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 2 * cm
    c.setFont('Helvetica-Bold', 14)
    c.drawString(2 * cm, y, 'Acta de inventario digital — Pre-traslado')
    y -= 0.8 * cm
    c.setFont('Helvetica', 10)
    c.drawString(2 * cm, y, f'Generado: {timezone.now().strftime("%Y-%m-%d %H:%M")}')
    y -= 0.5 * cm
    cli = cotizacion.cliente.usuario
    c.drawString(2 * cm, y, f'Cliente: {cli.nombre_completo} ({cli.email})')
    y -= 0.5 * cm
    c.drawString(2 * cm, y, f'Cotización ID: {cotizacion.pk} — Estado: {cotizacion.estado}')
    y -= 0.5 * cm
    c.drawString(2 * cm, y, f'Origen: {cotizacion.direccion_origen[:80]}...')
    y -= 0.5 * cm
    c.drawString(2 * cm, y, f'Destino: {cotizacion.direccion_destino[:80]}...')
    y -= 1 * cm

    c.setFont('Helvetica-Bold', 11)
    c.drawString(2 * cm, y, 'Objetos registrados')
    y -= 0.6 * cm
    c.setFont('Helvetica', 9)

    objetos = list(cotizacion.objetos.select_related('categoria').prefetch_related('fotos').all())

    for o in objetos:
        if y < 3 * cm:
            c.showPage()
            y = h - 2 * cm
            c.setFont('Helvetica', 9)
        line = (
            f'• {o.nombre} x{o.cantidad} | {o.peso_kg} kg | fragilidad {o.fragilidad}'
            f' | cat: {o.categoria.nombre if o.categoria else "-"}'
            f' | riesgo RF: {o.rf_nivel_riesgo or "-"}'
        )
        c.drawString(2 * cm, y, line[:110])
        y -= 0.35 * cm
        if o.descripcion:
            c.drawString(2.3 * cm, y, (o.descripcion[:100] + '…') if len(o.descripcion) > 100 else o.descripcion)
            y -= 0.35 * cm
        dims = []
        if o.largo_cm and o.ancho_cm and o.alto_cm:
            dims.append(f'{o.largo_cm}x{o.ancho_cm}x{o.alto_cm} cm')
        if dims:
            c.drawString(2.3 * cm, y, 'Dimensiones: ' + ' '.join(dims))
            y -= 0.35 * cm
        fotos_antes = [f for f in o.fotos.all() if f.tipo_foto == 'antes_traslado']
        if fotos_antes:
            c.drawString(
                2.3 * cm, y,
                f'Fotos evidencia (antes traslado): {len(fotos_antes)} archivo(s) registrado(s) en sistema',
            )
            y -= 0.35 * cm
        y -= 0.2 * cm

    y -= 0.5 * cm
    c.setFont('Helvetica-Oblique', 8)
    c.setFillColor(colors.grey)
    c.drawString(
        2 * cm, 2 * cm,
        'Documento generado automáticamente. Las imágenes se conservan en el sistema como evidencia del estado inicial.',
    )
    c.save()
    buf.seek(0)
    return buf
