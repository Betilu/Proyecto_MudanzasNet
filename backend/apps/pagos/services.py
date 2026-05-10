from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.core.files.base import ContentFile
from apps.notificaciones.services import NotificacionService
from .models import Pago, Factura
from .pdf_factura import generar_factura_pdf_buffer


class PagoService:
    """Servicio para gestión de pagos y facturación"""

    @staticmethod
    def verificar_pago(pago: Pago, verificado_por, referencia_banco: str | None = None) -> Pago:
        """
        Verifica un pago pendiente y confirma la reserva (Fase 4 del flujo).
        referencia_banco: referencia opcional que registra el operador al verificar.
        """
        with transaction.atomic():
            ref = (referencia_banco or '').strip()
            update_fields = ['estado', 'fecha_pago']
            pago.estado = 'completado'
            pago.fecha_pago = timezone.now()
            if ref:
                pago.referencia_transaccion = ref[:100]
                update_fields.append('referencia_transaccion')
            pago.save(update_fields=update_fields)

            reserva = pago.reserva

            # Depósito o pago total único: confirmar la reserva
            if pago.tipo_pago in ('deposito', 'total'):
                reserva.estado = 'confirmada'
                reserva.confirmada_en = timezone.now()
                reserva.save(update_fields=['estado', 'confirmada_en'])

                factura = PagoService.generar_factura(pago)

                NotificacionService.notificar_reserva_confirmada(
                    reserva.cliente, reserva, factura=factura
                )

                return pago

            # Saldo (resto tras depósito), u otros flujos
            elif pago.tipo_pago == 'saldo':
                # Generar factura del saldo
                factura = PagoService.generar_factura(pago)
                NotificacionService.notificar_pago_saldo_registrado(
                    reserva.cliente, reserva, factura
                )

                return pago

        return pago

    @staticmethod
    def generar_factura(pago: Pago) -> Factura:
        """
        Genera una factura para un pago completado
        """
        from apps.usuarios.models import ConfiguracionSistema

        # Obtener IVA de configuración
        try:
            iva_porcentaje = Decimal(ConfiguracionSistema.objects.get(clave='porcentaje_iva').valor)
        except (ConfiguracionSistema.DoesNotExist, ValueError):
            iva_porcentaje = Decimal('13')  # Default 13%

        # Calcular subtotal e impuesto
        total = pago.monto
        subtotal = total / (1 + (iva_porcentaje / 100))
        impuesto = total - subtotal

        # Generar número de factura
        año_actual = timezone.now().year
        ultimo_numero = Factura.objects.filter(
            numero_factura__startswith=f'FAC-{año_actual}-'
        ).count()
        numero_factura = f'FAC-{año_actual}-{str(ultimo_numero + 1).zfill(4)}'

        # Crear factura
        factura = Factura.objects.create(
            pago=pago,
            numero_factura=numero_factura,
            cliente=pago.reserva.cliente,
            subtotal=subtotal.quantize(Decimal('0.01')),
            impuesto=impuesto.quantize(Decimal('0.01')),
            total=total,
            nit_cliente=pago.reserva.cliente.nit or '',
            razon_social=pago.reserva.cliente.nombre_empresa or pago.reserva.cliente.usuario.nombre_completo
        )

        buf = generar_factura_pdf_buffer(factura)
        factura.pdf.save(
            f'{factura.numero_factura}.pdf',
            ContentFile(buf.read()),
            save=True,
        )

        return factura

    @staticmethod
    def calcular_deposito(monto_total: Decimal) -> Decimal:
        """
        Calcula el monto del depósito (10% por defecto)
        """
        from apps.usuarios.models import ConfiguracionSistema

        try:
            porcentaje = Decimal(ConfiguracionSistema.objects.get(clave='porcentaje_deposito').valor)
        except (ConfiguracionSistema.DoesNotExist, ValueError):
            porcentaje = Decimal('10')

        return (monto_total * porcentaje / 100).quantize(Decimal('0.01'))

    @staticmethod
    def calcular_saldo(reserva) -> Decimal:
        """
        Calcula el saldo pendiente de una reserva
        """
        total = reserva.cotizacion.precio_comercial_cliente
        anticipo_pagado = Pago.objects.filter(
            reserva=reserva,
            tipo_pago__in=('deposito', 'total'),
            estado='completado',
        ).aggregate(total=models.Sum('monto'))['total'] or Decimal('0')

        saldo = total - anticipo_pagado
        return saldo.quantize(Decimal('0.01'))


from django.db import models
