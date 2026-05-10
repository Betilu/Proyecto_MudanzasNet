from __future__ import annotations

import io
from html import escape
from typing import Any

from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def rows_to_matrix(headers: list[tuple[str, str]], rows: list[dict]) -> tuple[list[str], list[list[Any]]]:
    labels = [h[1] for h in headers]
    keys = [h[0] for h in headers]
    matrix = []
    for row in rows:
        matrix.append([row.get(k, '') for k in keys])
    return labels, matrix


def export_xlsx_bytes(headers: list[tuple[str, str]], rows: list[dict]) -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = 'Reporte'
    labels, matrix = rows_to_matrix(headers, rows)
    ws.append(labels)
    for r in matrix:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def export_html_string(title: str, headers: list[tuple[str, str]], rows: list[dict]) -> str:
    labels, matrix = rows_to_matrix(headers, rows)
    th = ''.join(f'<th>{escape(str(l))}</th>' for l in labels)
    body_rows = []
    for r in matrix:
        tds = ''.join(f'<td>{escape(str(v)) if v is not None else ""}</td>' for v in r)
        body_rows.append(f'<tr>{tds}</tr>')
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>{escape(title)}</title>
<style>
body {{ font-family: system-ui, sans-serif; margin: 1.5rem; }}
h1 {{ font-size: 1.25rem; }}
table {{ border-collapse: collapse; width: 100%; margin-top: 1rem; }}
th, td {{ border: 1px solid #ccc; padding: 8px 10px; text-align: left; }}
th {{ background: #f0f4f8; }}
</style></head><body>
<h1>{escape(title)}</h1>
<table><thead><tr>{th}</tr></thead><tbody>
{''.join(body_rows)}
</tbody></table>
</body></html>"""


def export_pdf_bytes(title: str, headers: list[tuple[str, str]], rows: list[dict]) -> bytes:
    html = export_html_string(title, headers, rows)
    from weasyprint import HTML
    return HTML(string=html).write_pdf()


def send_report_email(
    to_email: str,
    subject: str,
    title: str,
    headers: list[tuple[str, str]],
    rows: list[dict],
    attach_formats: list[str] | None = None,
) -> None:
    attach_formats = attach_formats or ['xlsx']
    html_body = export_html_string(title, headers, rows)
    text_fallback = f'Reporte: {title}\nAdjuntos: {", ".join(attach_formats)}.'

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_fallback,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'noreply@localhost',
        to=[to_email],
    )
    msg.attach_alternative(html_body, 'text/html')

    if 'xlsx' in attach_formats:
        xlsx = export_xlsx_bytes(headers, rows)
        msg.attach(f'{_slug_filename(title)}.xlsx', xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    if 'pdf' in attach_formats:
        pdf = export_pdf_bytes(title, headers, rows)
        msg.attach(f'{_slug_filename(title)}.pdf', pdf, 'application/pdf')

    msg.send(fail_silently=False)


def _slug_filename(title: str) -> str:
    import re
    s = re.sub(r'[^\w\s-]', '', title, flags=re.UNICODE).strip().lower()
    s = re.sub(r'[-\s]+', '_', s, flags=re.UNICODE)
    return (s or 'reporte')[:80]
