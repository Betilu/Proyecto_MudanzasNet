"""
Comando para poblar la BD con datos de prueba (10 items por tabla).
Ejecutar primero: python manage.py seed_data
Luego: python manage.py seed_fake_data
"""
import time
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

TS = int(time.time() * 1000)


class Command(BaseCommand):
    help = 'Genera 10 registros coherentes por tabla usando factories'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Cantidad por tabla (default: 10)')
        parser.add_argument('--no-seed', action='store_true', help='No ejecutar seed_data primero')

    def handle(self, *args, **options):
        count = options['count']
        if not options['no_seed']:
            self.stdout.write('Ejecutando seed_data...')
            call_command('seed_data')

        self._crear_datos(count)
        self.stdout.write(self.style.SUCCESS(f'Datos de prueba creados ({count} por tabla)'))

    def _crear_datos(self, n):
        from django.db import IntegrityError
        from apps.usuarios.models import Rol, Usuario, ConfiguracionSistema
        from apps.usuarios.factories import UsuarioFactory, BitacoraAuditoriaFactory, ConfiguracionSistemaFactory
        from apps.clientes.models import Cliente, SegmentoCliente, ClienteSegmento, ComunicacionCliente, AlertaCliente
        from apps.clientes.factories import SegmentoClienteFactory, ClienteFactory, ComunicacionClienteFactory, AlertaClienteFactory
        from apps.zonas.models import Zona, TarifaDistancia
        from apps.zonas.factories import ZonaFactory, TarifaDistanciaFactory
        from apps.servicios.models import TipoServicio, ServicioAdicional
        from apps.servicios.factories import TipoServicioFactory, ServicioAdicionalFactory
        from apps.vehiculos.models import TipoContenedor, Vehiculo, MantenimientoVehiculo
        from apps.vehiculos.factories import TipoContenedorFactory, VehiculoFactory, MantenimientoVehiculoFactory
        from apps.inventario.models import CategoriaObjeto, ObjetoMudanza
        from apps.inventario.factories import CategoriaObjetoFactory, ObjetoMudanzaFactory
        from apps.pagos.models import MetodoPago, Pago
        from apps.pagos.factories import PagoFactory, FacturaFactory, ReembolsoFactory
        from apps.personal.models import Personal
        from apps.personal.factories import PersonalFactory
        from apps.cotizaciones.models import Cotizacion, CotizacionServicioAdicional
        from apps.cotizaciones.factories import CotizacionFactory, CotizacionServicioAdicionalFactory
        from apps.reservas.models import Reserva
        from apps.reservas.factories import ReservaFactory
        from apps.mudanzas.models import ServicioMudanza, AsignacionPersonal, Incidencia, CalificacionServicio
        from apps.mudanzas.factories import ServicioMudanzaFactory, AsignacionPersonalFactory, IncidenciaFactory, CalificacionServicioFactory
        from apps.chatbot.models import FAQ, ConversacionChatbot, MensajeChatbot
        from apps.chatbot.factories import FAQFactory, ConversacionChatbotFactory, MensajeChatbotFactory
        from apps.notificaciones.models import Notificacion
        from apps.notificaciones.factories import NotificacionFactory
        from apps.ia.models import RFModelo, RFPrediccionDemanda, RFPrediccionDisponibilidad
        from apps.ia.factories import RFModeloFactory, RFPrediccionDemandaFactory, RFPrediccionDisponibilidadFactory
        from apps.carga.models import PlanCarga, ItemPlanCarga
        from apps.carga.factories import PlanCargaFactory, ItemPlanCargaFactory

        def crear_hasta(modelo, factory_cls, n_items):
            existentes = modelo.objects.count()
            if existentes >= n_items:
                return
            for i in range(n_items - existentes):
                try:
                    factory_cls.create()
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  Skip {modelo.__name__}: {e}'))


        # 1. Roles (ya en seed_data)
        rol_admin = Rol.objects.filter(nombre='admin').first()
        rol_cliente = Rol.objects.filter(nombre='cliente').first()
        rol_operador = Rol.objects.filter(nombre='operador').first()
        rol_conductor = Rol.objects.filter(nombre='conductor').first()
        rol_cargador = Rol.objects.filter(nombre='cargador').first()

        # 2. Usuarios (operadores)
        self.stdout.write('Usuarios...')
        for i in range(n):
            try:
                u = UsuarioFactory.create(
                    email=f'operador{TS}{i}@mudanzas.com',
                    with_password='password123',
                    with_rol=rol_operador
                )
            except Exception:
                pass

        # 3. Segmentos
        self.stdout.write('Segmentos cliente...')
        crear_hasta(SegmentoCliente, SegmentoClienteFactory, n)

        # 4. Clientes (con usuario+rol cliente)
        self.stdout.write('Clientes...')
        for i in range(n):
            try:
                u = UsuarioFactory.create(
                    email=f'cliente{TS}{i}@ejemplo.com',
                    with_password='password123',
                    with_rol=rol_cliente
                )
                ClienteFactory.create(usuario=u)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Cliente: {e}'))

        # 5. Personal (conductores/cargadores)
        self.stdout.write('Personal...')
        for i in range(n):
            try:
                r = rol_conductor if i % 2 == 0 else rol_cargador
                u = UsuarioFactory.create(
                    email=f'personal{TS}{i}@mudanzas.com',
                    with_password='password123',
                    with_rol=r
                )
                PersonalFactory.create(usuario=u, tipo_personal='conductor' if i % 2 == 0 else 'cargador')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Personal: {e}'))

        # 6. Zonas, Tarifas
        self.stdout.write('Zonas...')
        crear_hasta(Zona, ZonaFactory, n)
        self.stdout.write('Tarifas...')
        zonas = list(Zona.objects.all()[:20])
        creadas = 0
        for i in range(n * 3):  # intentos extra por colisiones
            if creadas >= n or len(zonas) < 2:
                break
            from random import choice
            zo, zd = choice(zonas), choice(zonas)
            if zo != zd:
                try:
                    TarifaDistanciaFactory.create(zona_origen=zo, zona_destino=zd)
                    creadas += 1
                except IntegrityError:
                    pass

        # 7. Tipos servicio, Servicios adicionales
        self.stdout.write('Tipos servicio...')
        crear_hasta(TipoServicio, TipoServicioFactory, n)
        self.stdout.write('Servicios adicionales...')
        crear_hasta(ServicioAdicional, ServicioAdicionalFactory, n)

        # 8. Tipos contenedor, Vehículos
        self.stdout.write('Tipos contenedor...')
        crear_hasta(TipoContenedor, TipoContenedorFactory, n)
        self.stdout.write('Vehículos...')
        for i in range(n):
            try:
                tc = TipoContenedor.objects.order_by('?').first()
                if tc:
                    VehiculoFactory.create(tipo_contenedor=tc, placa=f'XYZ-{2000+i:04d}')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Vehículo: {e}'))

        # 9. Categorías objeto
        self.stdout.write('Categorías objeto...')
        crear_hasta(CategoriaObjeto, CategoriaObjetoFactory, n)

        # 10. Configuración
        self.stdout.write('Configuración...')
        crear_hasta(ConfiguracionSistema, ConfiguracionSistemaFactory, n)

        # 11. Cotizaciones (con cliente, zonas, tipo_servicio)
        self.stdout.write('Cotizaciones...')
        clientes = list(Cliente.objects.all())
        zonas = list(Zona.objects.all())
        tipos = list(TipoServicio.objects.all())
        for i in range(n):
            if clientes and zonas and tipos:
                from random import choice
                c = choice(clientes)
                zo = choice(zonas)
                zd = choice([z for z in zonas if z != zo] or zonas)
                t = choice(tipos)
                try:
                    cot = CotizacionFactory.create(
                        cliente=c, zona_origen=zo, zona_destino=zd, tipo_servicio=t,
                        estado=['borrador', 'enviada', 'aceptada'][i % 3]
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  Cotización: {e}'))

        # 12. Objetos mudanza (por cotización)
        self.stdout.write('Objetos mudanza...')
        cotizaciones = list(Cotizacion.objects.all())
        categorias = list(CategoriaObjeto.objects.all())
        for i in range(n):
            if cotizaciones and categorias:
                from random import choice
                try:
                    ObjetoMudanzaFactory.create(
                        cotizacion=choice(cotizaciones),
                        categoria=choice(categorias)
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  Objeto: {e}'))

        # 13. Cotización-Servicio adicional
        self.stdout.write('Cotización servicios adicionales...')
        servicios_adic = list(ServicioAdicional.objects.all())
        for cot in cotizaciones[:n]:
            if servicios_adic:
                from random import choice
                try:
                    s = choice(servicios_adic)
                    CotizacionServicioAdicionalFactory.create(
                        cotizacion=cot, servicio_adicional=s,
                        cantidad=1, precio_unitario=s.precio, precio_total=s.precio
                    )
                except Exception:
                    pass

        # 14. Reservas (solo cotizaciones aceptadas)
        self.stdout.write('Reservas...')
        cot_aceptadas = Cotizacion.objects.filter(estado='aceptada')
        for cot in cot_aceptadas[:n]:
            try:
                if not hasattr(cot, 'reserva'):
                    ReservaFactory.create(
                        cotizacion=cot, cliente=cot.cliente,
                        fecha_servicio=timezone.now().date() + timezone.timedelta(days=7),
                        franja_horaria='08:00-12:00', estado='confirmada'
                    )
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Reserva: {e}'))

        # Aceptar más cotizaciones si no hay suficientes
        pendientes = Cotizacion.objects.filter(estado='enviada')[:n - cot_aceptadas.count()]
        for cot in pendientes:
            cot.estado = 'aceptada'
            cot.save()
            try:
                ReservaFactory.create(
                    cotizacion=cot, cliente=cot.cliente,
                    fecha_servicio=timezone.now().date() + timezone.timedelta(days=14),
                    franja_horaria='12:00-16:00', estado='confirmada'
                )
            except Exception:
                pass

        # 15. Servicios mudanza
        self.stdout.write('Servicios mudanza...')
        reservas = list(Reserva.objects.filter(estado='confirmada')[:n * 2])
        vehiculos = list(Vehiculo.objects.all())
        usuarios = list(Usuario.objects.filter(Q(rol=rol_admin) | Q(rol=rol_operador))[:1])
        if not usuarios:
            usuarios = list(Usuario.objects.exclude(rol=rol_cliente).exclude(rol__isnull=True)[:1])
        for i, res in enumerate(reservas[:n]):
            if vehiculos:
                from random import choice
                try:
                    v = choice(vehiculos)
                    srv = ServicioMudanzaFactory.create(
                        reserva=res, vehiculo=v,
                        estado=['asignado', 'en_camino', 'completado'][i % 3]
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  ServicioMudanza: {e}'))

        # 16. Pagos
        self.stdout.write('Pagos...')
        reservas_con_servicio = Reserva.objects.filter(servicio__isnull=False)[:n]
        metodos = list(MetodoPago.objects.filter(es_activo=True))
        for res in reservas_con_servicio:
            if metodos:
                from random import choice
                try:
                    m = choice(metodos)
                    pago = PagoFactory.create(
                        reserva=res, metodo_pago=m,
                        monto=res.cotizacion.precio_total_calculado or 500,
                        estado='completado'
                    )
                    FacturaFactory.create(
                        pago=pago, cliente=res.cliente,
                        subtotal=pago.monto * 0.87, impuesto=pago.monto * 0.13, total=pago.monto
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  Pago: {e}'))

        # 17. Comunicaciones, Alertas
        self.stdout.write('Comunicaciones cliente...')
        for i in range(n):
            if clientes and usuarios:
                from random import choice
                try:
                    ComunicacionClienteFactory.create(
                        cliente=choice(clientes), operador=usuarios[0] if usuarios else None
                    )
                    AlertaClienteFactory.create(
                        cliente=choice(clientes), operador=usuarios[0] if usuarios else None
                    )
                except Exception:
                    pass

        # 18. Bitácora
        self.stdout.write('Bitácora...')
        for i in range(n):
            if usuarios:
                try:
                    BitacoraAuditoriaFactory.create(usuario=usuarios[0] if usuarios else None)
                except Exception:
                    pass

        # 19. Mantenimientos vehículo
        self.stdout.write('Mantenimientos vehículo...')
        for v in Vehiculo.objects.all()[:n]:
            try:
                MantenimientoVehiculoFactory.create(vehiculo=v)
            except Exception:
                pass

        # 20. FAQ, Conversaciones chatbot
        self.stdout.write('FAQs...')
        crear_hasta(FAQ, FAQFactory, n)
        self.stdout.write('Conversaciones chatbot...')
        for i in range(n):
            if clientes:
                from random import choice
                try:
                    conv = ConversacionChatbotFactory.create(
                        cliente=choice(clientes),
                        estado=['activa', 'cerrada'][i % 2]
                    )
                    MensajeChatbotFactory.create(conversacion=conv, tipo_emisor='cliente')
                    MensajeChatbotFactory.create(conversacion=conv, tipo_emisor='bot')
                except Exception:
                    pass

        # 21. Notificaciones
        self.stdout.write('Notificaciones...')
        usuarios_all = list(Usuario.objects.all()[:n * 2])
        for i in range(n):
            if usuarios_all:
                from random import choice
                try:
                    NotificacionFactory.create(usuario=choice(usuarios_all))
                except Exception:
                    pass

        # 22. Modelos IA
        self.stdout.write('Modelos IA...')
        for i in range(n):
            try:
                modelo = RFModeloFactory.create()
                zona = Zona.objects.order_by('?').first()
                RFPrediccionDemandaFactory.create(modelo=modelo, zona=zona)
                RFPrediccionDisponibilidadFactory.create(modelo=modelo, zona=zona)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  IA: {e}'))

        # 23. Planes de carga
        self.stdout.write('Planes de carga...')
        servicios_mudanza = list(ServicioMudanza.objects.all()[:n])
        tipos_cont = list(TipoContenedor.objects.all())
        objetos = list(ObjetoMudanza.objects.all())
        for srv in servicios_mudanza[:n]:
            if tipos_cont and objetos:
                from random import choice
                try:
                    plan = PlanCargaFactory.create(
                        servicio=srv, tipo_contenedor=choice(tipos_cont)
                    )
                    for j, obj in enumerate(objetos[:5]):
                        try:
                            ItemPlanCargaFactory.create(
                                plan_carga=plan, objeto=obj, orden_carga=j
                            )
                        except Exception:
                            pass
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  PlanCarga: {e}'))

        # 24. Asignaciones personal, Incidencias, Calificaciones
        self.stdout.write('Asignaciones e incidencias...')
        personal_list = list(Personal.objects.all())
        servicios_list = list(ServicioMudanza.objects.all())
        for srv in servicios_list[:n]:
            if personal_list and usuarios:
                from random import choice
                try:
                    AsignacionPersonalFactory.create(
                        servicio=srv, personal=choice(personal_list),
                        rol_asignado='conductor'
                    )
                    if hash(str(srv.pk)) % 3 == 0:
                        IncidenciaFactory.create(
                            servicio=srv, reportado_por=usuarios[0],
                            tipo='retraso', descripcion='Llegada 15 min tarde'
                        )
                    CalificacionServicioFactory.create(
                        servicio=srv, cliente=srv.reserva.cliente
                    )
                except Exception as e:
                    pass

        self.stdout.write('Listo.')
