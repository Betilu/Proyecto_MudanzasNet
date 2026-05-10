from django.utils import timezone

from .models import DispositivoPush, Notificacion
from .push_expo import enviar_expo_push

_PUSH_APP_POR_TIPO = {
    'servicio_asignado': DispositivoPush.APP_CONDUCTOR,
    'estado_servicio': DispositivoPush.APP_CLIENTE,
    'cotizacion_enviada': DispositivoPush.APP_CLIENTE,
    'cotizacion_aceptada': DispositivoPush.APP_CLIENTE,
    'reserva_confirmada': DispositivoPush.APP_CLIENTE,
    'pago_saldo_completado': DispositivoPush.APP_CLIENTE,
    'pago_rechazado': DispositivoPush.APP_CLIENTE,
    'incidencia_resuelta': DispositivoPush.APP_CLIENTE,
}


class NotificacionService:
    """Servicio para enviar notificaciones a usuarios"""

    @staticmethod
    def _tokens_push(usuario, aplicacion: str) -> list[str]:
        tokens = list(
            DispositivoPush.objects.filter(
                usuario=usuario, activo=True, aplicacion=aplicacion
            ).values_list('token', flat=True)
        )
        if aplicacion == DispositivoPush.APP_CLIENTE:
            pref = (usuario.preferencias_comunicacion or {}).get('expo_push_token')
            if pref:
                tokens.append(pref)
        return list(dict.fromkeys(tokens))

    @staticmethod
    def _disparar_push_expo(usuario, tipo: str, titulo: str, mensaje: str, datos_extra: dict | None):
        aplicacion = _PUSH_APP_POR_TIPO.get(tipo)
        if not aplicacion:
            return
        tokens = NotificacionService._tokens_push(usuario, aplicacion)
        if not tokens:
            return
        enviar_expo_push(tokens, titulo, mensaje, datos_extra)

    @staticmethod
    def enviar_notificacion(usuario, tipo, titulo, mensaje, canal='push', datos_extra=None):
        """Crea registro de notificación y, si aplica, envía push Expo al dispositivo correcto."""
        datos_extra = dict(datos_extra or {})
        datos_extra.setdefault('tipo', tipo)
        notificacion = Notificacion.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            canal=canal,
            datos_extra=datos_extra,
            enviada_en=timezone.now()
        )
        if canal == 'push':
            NotificacionService._disparar_push_expo(
                usuario, tipo, titulo, mensaje, datos_extra
            )
        return notificacion

    @staticmethod
    def notificar_cotizacion_enviada(cliente, cotizacion):
        """Notifica al cliente que su cotización está lista"""
        precio_cli = cotizacion.precio_comercial_cliente
        mensaje = (
            f"Tu cotización está lista. Precio: Bs {precio_cli} "
            f"para mudanza {cotizacion.zona_origen.nombre} a {cotizacion.zona_destino.nombre}, "
            f"{cotizacion.fecha_deseada.strftime('%d/%m/%Y')}. "
            f"Válida hasta el {cotizacion.valida_hasta.strftime('%d/%m/%Y')}."
        )
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='cotizacion_enviada',
            titulo='Cotización lista',
            mensaje=mensaje,
            datos_extra={'cotizacion_id': cotizacion.id}
        )

    @staticmethod
    def notificar_reserva_confirmada(cliente, reserva, factura=None):
        """Notifica al cliente que su reserva fue confirmada (Fase 4)."""
        cotizacion = reserva.cotizacion
        fecha_txt = (
            reserva.fecha_servicio.strftime('%d/%m/%Y')
            if reserva.fecha_servicio
            else 'por definir'
        )
        franja = reserva.franja_horaria or '—'
        zo = cotizacion.zona_origen.nombre if cotizacion.zona_origen else '—'
        zd = cotizacion.zona_destino.nombre if cotizacion.zona_destino else '—'
        mensaje = (
            f"Tu reserva {reserva.codigo_confirmacion} está CONFIRMADA. "
            f"Fecha: {fecha_txt}, franja: {franja}. "
            f"Mudanza de {zo} a {zd}. "
            f"Puedes descargar la factura del depósito desde la app o el portal web."
        )
        datos_extra = {'reserva_id': reserva.id}
        if factura:
            datos_extra['factura_id'] = factura.id
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='reserva_confirmada',
            titulo=f'Reserva {reserva.codigo_confirmacion} confirmada',
            mensaje=mensaje,
            datos_extra=datos_extra,
        )

    @staticmethod
    def notificar_pago_pendiente(operador, pago):
        """Notifica al operador que hay un nuevo pago pendiente de verificación"""
        mensaje = (
            f"Nuevo comprobante de pago recibido para reserva {pago.reserva.codigo_confirmacion}. "
            f"Monto: Bs {pago.monto}. Método: {pago.metodo_pago.nombre}. "
            f"Pendiente de verificación."
        )
        return NotificacionService.enviar_notificacion(
            usuario=operador,
            tipo='pago_pendiente',
            titulo='Nuevo pago pendiente de verificación',
            mensaje=mensaje,
            datos_extra={'pago_id': pago.id}
        )

    @staticmethod
    def notificar_servicio_asignado(personal, servicio):
        """Notifica al conductor/cargador que tiene un nuevo servicio asignado (Fase 5)"""
        from apps.inventario.models import ObjetoMudanza

        cotizacion = servicio.reserva.cotizacion

        # Contar objetos de alto riesgo
        objetos_alto_riesgo = ObjetoMudanza.objects.filter(
            cotizacion=cotizacion,
            rf_nivel_riesgo='alto'
        ).count()

        # Obtener equipo asignado
        equipo = servicio.equipo.select_related('personal__usuario').all()
        nombres_equipo = [a.personal.usuario.nombre_completo for a in equipo if a.personal.id != personal.id]

        dias_es = ('lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.', 'dom.')
        meses_es = (
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
        )
        fs = servicio.reserva.fecha_servicio
        if fs:
            fecha_txt = f"{dias_es[fs.weekday()]} {fs.day} de {meses_es[fs.month - 1]}"
        else:
            fecha_txt = 'fecha por definir'

        mensaje = (
            f"Nuevo servicio asignado. {fecha_txt}, "
            f"{servicio.reserva.franja_horaria or '—'}. "
            f"Origen: {cotizacion.direccion_origen}, {cotizacion.zona_origen.nombre}. "
            f"Destino: {cotizacion.direccion_destino}, {cotizacion.zona_destino.nombre}. "
            f"{cotizacion.cantidad_objetos} objetos"
        )

        if objetos_alto_riesgo > 0:
            mensaje += f" ({objetos_alto_riesgo} alto riesgo)"

        mensaje += f". Vehículo: {servicio.vehiculo.placa if servicio.vehiculo else 'Por asignar'}."

        if nombres_equipo:
            mensaje += f" Equipo: {', '.join(nombres_equipo)}."

        return NotificacionService.enviar_notificacion(
            usuario=personal.usuario,
            tipo='servicio_asignado',
            titulo='Nuevo servicio asignado',
            mensaje=mensaje,
            datos_extra={'servicio_id': servicio.id}
        )

    @staticmethod
    def notificar_cambio_estado_servicio(cliente, servicio, estado):
        """Notifica al cliente sobre cambios de estado del servicio"""
        mensajes_estado = {
            'en_camino': 'Tu equipo de mudanza está en camino.',
            'en_origen': 'El equipo llegó a tu dirección.',
            'cargando': 'Comenzó la carga de tus pertenencias.',
            'en_ruta': 'Tus pertenencias están en ruta hacia el destino.',
            'en_destino': 'El equipo llegó al destino.',
            'descargando': 'Comenzó la descarga.',
            'completado': 'Tu mudanza se completó exitosamente.',
        }
        mensaje = mensajes_estado.get(estado, f'Estado actualizado: {estado}')
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='estado_servicio',
            titulo=f'Servicio {servicio.reserva.codigo_confirmacion}',
            mensaje=mensaje,
            datos_extra={
                'servicio_id': servicio.id,
                'reserva_id': servicio.reserva_id,
                'estado': estado,
            },
        )

    @staticmethod
    def notificar_incidencia_reportada(operador, incidencia):
        """Notifica al operador sobre una nueva incidencia"""
        mensaje = (
            f"Nueva incidencia reportada en servicio {incidencia.servicio.reserva.codigo_confirmacion}. "
            f"Tipo: {incidencia.get_tipo_display()}. Gravedad: {incidencia.get_gravedad_display()}."
        )
        return NotificacionService.enviar_notificacion(
            usuario=operador,
            tipo='incidencia_reportada',
            titulo='Nueva incidencia reportada',
            mensaje=mensaje,
            datos_extra={'incidencia_id': incidencia.id}
        )

    @staticmethod
    def notificar_pago_saldo_registrado(cliente, reserva, factura):
        """Cliente: pago de saldo verificado y factura final (Fase 8)."""
        mensaje = (
            f"Pago de saldo registrado: Bs {factura.total}. "
            f"Factura {factura.numero_factura} disponible para descarga."
        )
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='pago_saldo_completado',
            titulo='Factura de saldo',
            mensaje=mensaje,
            datos_extra={'reserva_id': reserva.id, 'factura_id': factura.id},
        )

    @staticmethod
    def notificar_pago_rechazado(cliente, pago):
        """Cliente: comprobante rechazado por operador (Fase 4)."""
        mensaje = (
            f"Tu comprobante de pago (Bs {pago.monto}, reserva {pago.reserva.codigo_confirmacion}) "
            f"fue rechazado. Sube un nuevo comprobante desde la app o el portal."
        )
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='pago_rechazado',
            titulo='Pago no verificado',
            mensaje=mensaje,
            datos_extra={'pago_id': pago.id, 'reserva_id': pago.reserva_id},
        )
