"""PDF de factura (Fase 4 — depósito / saldo)."""
from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def generar_factura_pdf_buffer(factura):
    """
    Genera PDF en memoria para una instancia de Factura ya persistida
    (requiere pago, cliente, totales).
    """
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 2 * cm

    c.setFont('Helvetica-Bold', 16)
    c.drawString(2 * cm, y, 'FACTURA')
    y -= 0.7 * cm
    c.setFont('Helvetica', 10)
    c.drawString(2 * cm, y, f'N° {factura.numero_factura}')
    y -= 0.5 * cm
    c.drawString(2 * cm, y, f'Emitida: {timezone.now().strftime("%Y-%m-%d %H:%M")}')
    y -= 1 * cm

    c.setFont('Helvetica-Bold', 11)
    c.drawString(2 * cm, y, 'Cliente')
    y -= 0.45 * cm
    c.setFont('Helvetica', 10)
    c.drawString(2 * cm, y, factura.razon_social or '—')
    y -= 0.4 * cm
    if factura.nit_cliente:
        c.drawString(2 * cm, y, f'NIT: {factura.nit_cliente}')
        y -= 0.4 * cm

    y -= 0.4 * cm
    c.setFont('Helvetica-Bold', 11)
    c.drawString(2 * cm, y, 'Detalle')
    y -= 0.55 * cm
    c.setFont('Helvetica', 10)
    tipo_txt = factura.pago.get_tipo_pago_display()
    linea = f'Pago — {tipo_txt} — Reserva {factura.pago.reserva.codigo_confirmacion}'
    c.drawString(2 * cm, y, linea[:95])
    y -= 1.2 * cm

    c.setFont('Helvetica', 10)
    c.drawString(12 * cm, y, 'Subtotal (sin IVA):')
    c.drawRightString(19 * cm, y, f'Bs {factura.subtotal:.2f}')
    y -= 0.45 * cm
    c.drawString(12 * cm, y, 'IVA:')
    c.drawRightString(19 * cm, y, f'Bs {factura.impuesto:.2f}')
    y -= 0.55 * cm
    c.setFont('Helvetica-Bold', 11)
    c.drawString(12 * cm, y, 'Total:')
    c.drawRightString(19 * cm, y, f'Bs {factura.total:.2f}')

    y = 2.5 * cm
    c.setFont('Helvetica-Oblique', 8)
    c.setFillColor(colors.grey)
    c.drawString(
        2 * cm, y,
        'Documento tributario de referencia. Conserve este comprobante.',
    )
    c.save()
    buf.seek(0)
    return buf
