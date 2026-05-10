from django.core.management.base import BaseCommand
from apps.chatbot.models import FAQ


class Command(BaseCommand):
    help = 'Poblar FAQs iniciales del chatbot (Fase 1 del flujo operativo)'

    def handle(self, *args, **options):
        faqs = [
            # Precios
            {
                'pregunta': '¿Cómo se calcula el precio de una mudanza?',
                'respuesta': 'El precio se calcula considerando: la distancia entre origen y destino, el volumen total de objetos, el tipo de servicio (residencial/empresarial), y servicios adicionales como embalaje o seguro. Nuestra IA también considera factores como la demanda y complejidad para ofrecer el mejor precio.',
                'categoria': 'precios',
                'palabras_clave': ['precio', 'costo', 'tarifa', 'cuanto cuesta', 'cotización'],
            },
            {
                'pregunta': '¿Qué porcentaje de depósito debo pagar?',
                'respuesta': 'El depósito requerido es del 10% del valor total de la mudanza. Este depósito confirma tu reserva y será descontado del monto final.',
                'categoria': 'precios',
                'palabras_clave': ['depósito', 'anticipo', 'pago inicial', 'porcentaje'],
            },
            {
                'pregunta': '¿Los precios incluyen IVA?',
                'respuesta': 'Los precios mostrados no incluyen IVA. Se aplicará un 13% de IVA sobre el total del servicio al momento de generar la factura.',
                'categoria': 'precios',
                'palabras_clave': ['iva', 'impuesto', 'factura'],
            },
            # Zonas de cobertura
            {
                'pregunta': '¿Qué zonas cubren?',
                'respuesta': 'Cubrimos un radio de hasta 50 km desde nuestras bases de operación. Para consultar si tu zona está cubierta, puedes solicitarnos una cotización indicando tu dirección de origen y destino.',
                'categoria': 'zonas',
                'palabras_clave': ['zonas', 'cobertura', 'área', 'dónde', 'ubicación'],
            },
            {
                'pregunta': '¿Hacen mudanzas fuera de la ciudad?',
                'respuesta': 'Sí, realizamos mudanzas interdepartamentales. El precio y tiempo estimado variarán según la distancia. Te recomendamos solicitar una cotización personalizada.',
                'categoria': 'zonas',
                'palabras_clave': ['fuera de la ciudad', 'interdepartamental', 'larga distancia'],
            },
            # Tipos de servicio
            {
                'pregunta': '¿Qué tipos de mudanza ofrecen?',
                'respuesta': 'Ofrecemos mudanzas residenciales (hogares, departamentos) y mudanzas empresariales (oficinas, comercios). Ambas incluyen opciones de servicios adicionales como embalaje, desembalaje, y seguro.',
                'categoria': 'servicios',
                'palabras_clave': ['tipos', 'servicios', 'residencial', 'empresarial', 'qué ofrecen'],
            },
            {
                'pregunta': '¿Incluyen embalaje de objetos frágiles?',
                'respuesta': 'El embalaje de objetos frágiles se ofrece como servicio adicional. Nuestro equipo cuenta con materiales especializados para garantizar la protección de tus pertenencias más delicadas.',
                'categoria': 'servicios',
                'palabras_clave': ['embalaje', 'frágil', 'protección', 'cuidado'],
            },
            {
                'pregunta': '¿Ofrecen servicio de desarmado y armado de muebles?',
                'respuesta': 'Sí, ofrecemos servicio de desarmado y armado de muebles como parte de nuestros servicios adicionales. Esto incluye camas, roperos, escritorios, etc.',
                'categoria': 'servicios',
                'palabras_clave': ['desarmar', 'armar', 'muebles', 'instalación'],
            },
            # Políticas de cancelación
            {
                'pregunta': '¿Puedo cancelar mi reserva?',
                'respuesta': 'Sí, puedes cancelar tu reserva. Si cancelas con al menos 48 horas de anticipación, te reembolsaremos el 100% del depósito. Cancelaciones con menos de 48 horas tendrán una penalidad del 50% del depósito.',
                'categoria': 'políticas',
                'palabras_clave': ['cancelar', 'cancelación', 'reembolso', 'devolver'],
            },
            {
                'pregunta': '¿Cuánto tiempo tengo para aceptar una cotización?',
                'respuesta': 'Las cotizaciones tienen una vigencia de 7 días desde su emisión. Pasado este tiempo, deberás solicitar una nueva cotización ya que los precios pueden variar.',
                'categoria': 'políticas',
                'palabras_clave': ['vigencia', 'validez', 'tiempo', 'cotización'],
            },
            {
                'pregunta': '¿Qué pasa si algo se daña durante la mudanza?',
                'respuesta': 'Contamos con seguro opcional para tus pertenencias. Si contrataste el seguro, los daños estarán cubiertos según los términos del mismo. De lo contrario, evaluaremos cada caso individualmente.',
                'categoria': 'políticas',
                'palabras_clave': ['daño', 'seguro', 'rotura', 'responsabilidad'],
            },
        ]

        created_count = 0
        updated_count = 0

        for faq_data in faqs:
            faq, created = FAQ.objects.update_or_create(
                pregunta=faq_data['pregunta'],
                defaults={
                    'respuesta': faq_data['respuesta'],
                    'categoria': faq_data['categoria'],
                    'palabras_clave': faq_data['palabras_clave'],
                    'es_activa': True,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Creada FAQ: {faq.categoria} - {faq.pregunta[:50]}...'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'→ Actualizada FAQ: {faq.categoria} - {faq.pregunta[:50]}...'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Proceso completado: {created_count} FAQs creadas, {updated_count} actualizadas'))
        self.stdout.write(self.style.SUCCESS(f'Categorías: precios, zonas, servicios, políticas'))
