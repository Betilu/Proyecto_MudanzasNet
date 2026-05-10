from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator

from .models import Usuario


def build_reset_link(user: Usuario) -> tuple[str, str]:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = settings.FRONTEND_URL.rstrip('/')
    return f'{base}/restablecer-contrasena?uid={uid}&token={token}', uid


def send_password_reset_email(user: Usuario) -> None:
    reset_url, _uid = build_reset_link(user)
    context = {
        'user': user,
        'reset_url': reset_url,
        'site_name': getattr(settings, 'EMAIL_SITE_NAME', 'CRM Mudanzas'),
    }
    subject = f'{context["site_name"]}: recuperación de contraseña'
    body_text = render_to_string('emails/password_reset.txt', context)
    body_html = render_to_string('emails/password_reset.html', context)
    send_mail(
        subject=subject,
        message=body_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=body_html,
        fail_silently=False,
    )
