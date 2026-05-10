"""
Comando para cargar datos iniciales del sistema CRM de Mudanzas.
Ejecutar: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.usuarios.models import Rol, Permiso, RolPermiso
from apps.zonas.models import Zona, TarifaDistancia
from apps.servicios.models import TipoServicio, ServicioAdicional
from apps.vehiculos.models import TipoContenedor
from apps.inventario.models import CategoriaObjeto
from apps.pagos.models import MetodoPago


class Command(BaseCommand):
    help = 'Carga datos iniciales del sistema (roles, permisos, zonas, servicios, etc.)'

    def handle(self, *args, **options):
        with transaction.atomic():
            self.stdout.write('Creando roles...')
            self._crear_roles_permisos()

            self.stdout.write('Creando tipos de servicio...')
            self._crear_tipos_servicio()

            self.stdout.write('Creando servicios adicionales...')
            self._crear_servicios_adicionales()

            self.stdout.write('Creando categorías de objetos...')
            self._crear_categorias_objeto()

            self.stdout.write('Creando tipos de contenedor...')
            self._crear_tipos_contenedor()

            self.stdout.write('Creando métodos de pago...')
            self._crear_metodos_pago()

            self.stdout.write('Creando zonas de Santa Cruz...')
            self._crear_zonas_santa_cruz()

            self.stdout.write('Creando tarifas entre zonas...')
            self._crear_tarifas_muestra()

        self.stdout.write(self.style.SUCCESS('Datos iniciales cargados correctamente'))

    def _crear_roles_permisos(self):
        roles_data = [
            ('admin', 'Administrador del sistema'),
            ('administrador', 'Administrador del sistema (sinónimo operativo)'),
            ('operador', 'Operador de reservas y atención al cliente'),
            ('conductor', 'Conductor de vehículos'),
            ('cargador', 'Personal de carga'),
            ('cliente', 'Cliente final'),
        ]
        for nombre, desc in roles_data:
            Rol.objects.get_or_create(nombre=nombre, defaults={'descripcion': desc})

        permisos_data = [
            ('usuarios.crear', 'usuarios', 'Crear usuarios'),
            ('usuarios.editar', 'usuarios', 'Editar usuarios'),
            ('usuarios.eliminar', 'usuarios', 'Eliminar usuarios'),
            ('usuarios.gestion_roles', 'usuarios', 'Gestionar roles y permisos (catálogo)'),
            ('crm.ver_clientes', 'crm', 'Ver clientes'),
            ('crm.editar_clientes', 'crm', 'Editar clientes'),
            ('crm.registro_cliente', 'crm', 'Registro centralizado de cliente '),
            ('crm.eliminar_cliente', 'crm', 'Eliminar clientes del CRM'),
            ('crm.historial_mudanzas', 'crm', 'Historial completo de mudanzas por cliente'),
            ('crm.pipeline_solicitudes', 'crm', 'Gestionar pipeline cotización/reserva '),
            ('crm.log_comunicaciones', 'crm', 'Registro de llamadas, emails y mensajes '),
            ('crm.segmentacion', 'crm', 'Segmentación y clasificación de clientes '),
            ('crm.alertas_seguimiento', 'crm', 'Alertas y seguimiento a leads '),
            ('crm.rf_prediccion_lealtad', 'crm', 'Ejecutar predicción RF de lealtad '),
            ('crm.reportes_comportamiento', 'crm', 'Reportes y métricas de comportamiento '),
            ('inventario.ver', 'inventario', 'Ver inventario'),
            ('inventario.editar', 'inventario', 'Editar inventario'),
            ('inventario.registrar_objetos', 'inventario', 'Registrar objetos detallados '),
            ('inventario.admin_categorias', 'inventario', 'Administrar categorías de objetos'),
            ('inventario.fotos_objeto', 'inventario', 'Subir fotos por objeto (W19)'),
            ('inventario.acta_pretraslado', 'inventario', 'Generar/descargar acta PDF pre-traslado '),
            ('inventario.incidencias_postentrega', 'inventario', 'Reportar incidencias post-entrega '),
            ('inventario.confirmar_entrega', 'inventario', 'Confirmar entrega con firma '),
            ('reservas.crear', 'reservas', 'Crear reservas'),
            ('reservas.ver', 'reservas', 'Ver reservas'),
            ('reservas.gestionar', 'reservas', 'Gestionar reservas (estados y operación)'),
            ('reportes.ver', 'reportes', 'Ver reportes'),
            ('vehiculos.ver', 'vehiculos', 'Ver vehículos'),
            ('vehiculos.editar', 'vehiculos', 'Editar vehículos'),
            ('pagos.ver', 'pagos', 'Ver pagos'),
            ('pagos.procesar', 'pagos', 'Procesar pagos'),
            ('sistema.respaldos', 'sistema', 'Backup y restauración del sistema'),
        ]
        for nombre, modulo, desc in permisos_data:
            Permiso.objects.get_or_create(
                nombre=nombre,
                defaults={'modulo': modulo, 'descripcion': desc, 'tipo_componente': 'otro'},
            )

        ui_menus = [
            ('ui.menu.dashboard', 'Menú: Dashboard'),
            ('ui.menu.clientes', 'Menú: Clientes'),
            ('ui.menu.cotizaciones', 'Menú: Cotizaciones'),
            ('ui.menu.crm_pipeline', 'Menú: Pipeline CRM'),
            ('ui.menu.crm_informes', 'Menú: Informes CRM'),
            ('ui.menu.reservas', 'Menú: Reservas'),
            ('ui.menu.mudanzas', 'Menú: Mudanzas'),
            ('ui.menu.pagos', 'Menú: Pagos'),
            ('ui.menu.zonas', 'Menú: Zonas'),
            ('ui.menu.servicios', 'Menú: Servicios'),
            ('ui.menu.inventario', 'Menú: Inventario'),
            ('ui.menu.vehiculos', 'Menú: Vehículos'),
            ('ui.menu.personal', 'Menú: Personal'),
            ('ui.menu.chatbot', 'Menú: Chatbot'),
            ('ui.menu.reportes', 'Menú: Reportes'),
            ('ui.menu.incidencias', 'Menú: Incidencias'),
            ('ui.menu.usuarios', 'Menú: Usuarios'),
            ('ui.menu.roles', 'Menú: Roles y permisos'),
            ('ui.menu.configuracion', 'Menú: Configuración'),
            ('ui.menu.bitacora', 'Menú: Bitácora'),
            ('ui.menu.respaldos', 'Menú: Respaldos'),
        ]
        for nombre, desc in ui_menus:
            Permiso.objects.update_or_create(
                nombre=nombre,
                defaults={'modulo': 'ui', 'descripcion': desc, 'tipo_componente': 'menu'},
            )

        admin_rol = Rol.objects.get(nombre='admin')
        for permiso in Permiso.objects.all():
            RolPermiso.objects.get_or_create(rol=admin_rol, permiso=permiso)

        admin_alt = Rol.objects.filter(nombre='administrador').first()
        if admin_alt:
            for permiso in Permiso.objects.all():
                RolPermiso.objects.get_or_create(rol=admin_alt, permiso=permiso)

        operador_rol = Rol.objects.filter(nombre='operador').first()
        if operador_rol:
            nombres_operador = [
                'crm.ver_clientes', 'crm.editar_clientes', 'crm.registro_cliente',
                'crm.historial_mudanzas', 'crm.pipeline_solicitudes',
                'crm.log_comunicaciones', 'crm.alertas_seguimiento',
                'crm.reportes_comportamiento',
                'reservas.crear', 'reservas.ver', 'reservas.gestionar',
                'reportes.ver', 'inventario.ver', 'inventario.editar',
                'inventario.registrar_objetos', 'inventario.fotos_objeto',
                'inventario.acta_pretraslado', 'inventario.incidencias_postentrega',
                'pagos.ver', 'pagos.procesar',
                'usuarios.crear', 'usuarios.editar',
                'vehiculos.ver', 'vehiculos.editar',
            ]
            nombres_operador += [n for n, _ in ui_menus if n not in (
                'ui.menu.roles', 'ui.menu.configuracion', 'ui.menu.bitacora', 'ui.menu.respaldos',
            )]
            for nombre in nombres_operador:
                p = Permiso.objects.filter(nombre=nombre).first()
                if p:
                    RolPermiso.objects.get_or_create(rol=operador_rol, permiso=p)

        conductor_rol = Rol.objects.filter(nombre='conductor').first()
        if conductor_rol:
            nombres_conductor = [
                'reservas.ver', 'inventario.ver', 'vehiculos.ver',
                'ui.menu.dashboard', 'ui.menu.mudanzas', 'ui.menu.inventario',
                'ui.menu.chatbot', 'ui.menu.reservas', 'ui.menu.personal',
            ]
            for nombre in nombres_conductor:
                p = Permiso.objects.filter(nombre=nombre).first()
                if p:
                    RolPermiso.objects.get_or_create(rol=conductor_rol, permiso=p)

        cargador_rol = Rol.objects.filter(nombre='cargador').first()
        if cargador_rol:
            nombres_cargador = [
                'inventario.ver', 'vehiculos.ver',
                'ui.menu.dashboard', 'ui.menu.mudanzas', 'ui.menu.inventario',
                'ui.menu.chatbot', 'ui.menu.personal',
            ]
            for nombre in nombres_cargador:
                p = Permiso.objects.filter(nombre=nombre).first()
                if p:
                    RolPermiso.objects.get_or_create(rol=cargador_rol, permiso=p)

        cliente_rol = Rol.objects.filter(nombre='cliente').first()
        if cliente_rol:
            nombres_cliente_inv = [
                'inventario.ver',
                'inventario.registrar_objetos',
                'inventario.fotos_objeto',
                'inventario.acta_pretraslado',
                'inventario.incidencias_postentrega',
            ]
            for nombre in nombres_cliente_inv:
                p = Permiso.objects.filter(nombre=nombre).first()
                if p:
                    RolPermiso.objects.get_or_create(rol=cliente_rol, permiso=p)

    def _crear_tipos_servicio(self):
        tipos = [
            ('Básico', 'Mudanza estándar sin embalaje', False, False, False, 1.0),
            ('Completo', 'Incluye embalaje y desmontaje', True, True, True, 1.5),
            ('Express', 'Mudanza urgente el mismo día', False, False, False, 1.3),
        ]
        for nombre, desc, emb, mont, desm, factor in tipos:
            TipoServicio.objects.get_or_create(
                nombre=nombre,
                defaults={
                    'descripcion': desc,
                    'incluye_embalaje': emb,
                    'incluye_montaje': mont,
                    'incluye_desmontaje': desm,
                    'factor_precio': factor,
                }
            )

    def _crear_servicios_adicionales(self):
        servicios = [
            ('Embalaje profesional', 'Material y mano de obra de embalaje', 150.00, False),
            ('Montaje de muebles', 'Armado de muebles en destino', 80.00, False),
            ('Desmontaje', 'Desarmado de muebles en origen', 60.00, False),
            ('Funda colchón', 'Protección de colchón', 25.00, True),
        ]
        for nombre, desc, precio, por_obj in servicios:
            ServicioAdicional.objects.get_or_create(
                nombre=nombre,
                defaults={'descripcion': desc, 'precio': precio, 'es_por_objeto': por_obj}
            )

    def _crear_categorias_objeto(self):
        categorias = [
            ('Muebles', 'Sillas, mesas, camas, armarios', 'media'),
            ('Electrodomésticos', 'Nevera, lavadora, TV', 'media'),
            ('Cajas', 'Cajas empaquetadas', 'baja'),
            ('Objetos frágiles', 'Cristalería, cuadros, espejos', 'alta'),
            ('Documentos', 'Archivos, documentación', 'baja'),
            ('Gran volumen', 'Objetos de gran volumen (clasificación automática)', 'media'),
        ]
        for nombre, desc, frag in categorias:
            CategoriaObjeto.objects.get_or_create(
                nombre=nombre,
                defaults={'descripcion': desc, 'fragilidad_default': frag}
            )

    def _crear_tipos_contenedor(self):
        contenedores = [
            ('Camión pequeño', 15, 1500, 300, 200, 200),
            ('Camión mediano', 25, 2500, 400, 220, 280),
            ('Camión grande', 40, 4000, 500, 240, 330),
        ]
        for nombre, vol, peso, largo, ancho, alto in contenedores:
            TipoContenedor.objects.get_or_create(
                nombre=nombre,
                defaults={
                    'volumen_capacidad_m3': vol,
                    'peso_capacidad_kg': peso,
                    'largo_cm': largo,
                    'ancho_cm': ancho,
                    'alto_cm': alto,
                }
            )

    def _crear_metodos_pago(self):
        metodos = [
            ('Transferencia bancaria', 'transferencia', '', 0),
            ('Efectivo', 'efectivo', '', 0),
            ('Tarjeta de crédito/débito', 'tarjeta', '', 2.5),
            ('QR', 'qr', 'Banco local', 1.5),
        ]
        for nombre, tipo, prov, comision in metodos:
            MetodoPago.objects.get_or_create(
                nombre=nombre,
                defaults={'tipo': tipo, 'proveedor': prov, 'comision_porcentaje': comision}
            )

    def _crear_zonas_santa_cruz(self):
        zonas_nombres = [
            'Centro', 'Equipetrol', 'Urbari', 'Barrio Lindo', 'Plan 3000',
            'Monseñor Rivero', 'La Florida', 'Villa Primero de Mayo', 'Distrito 7',
            'Distrito 8', 'Cotoca', 'El Torno', 'Warnes', 'Montero',
        ]
        for nombre in zonas_nombres:
            Zona.objects.get_or_create(nombre=nombre, defaults={'es_activa': True})

    def _crear_tarifas_muestra(self):
        """Crea tarifas base entre zonas principales para cotizaciones."""
        rutas = [
            ('Centro', 'Equipetrol', 5, 150),
            ('Centro', 'Urbari', 8, 220),
            ('Centro', 'Plan 3000', 12, 320),
            ('Equipetrol', 'Urbari', 4, 120),
            ('Equipetrol', 'Barrio Lindo', 6, 180),
            ('Urbari', 'Plan 3000', 10, 280),
            ('Centro', 'Cotoca', 25, 450),
            ('Centro', 'Warnes', 30, 520),
        ]
        for origen, destino, km, tarifa in rutas:
            zo = Zona.objects.filter(nombre=origen).first()
            zd = Zona.objects.filter(nombre=destino).first()
            if zo and zd:
                TarifaDistancia.objects.get_or_create(
                    zona_origen=zo,
                    zona_destino=zd,
                    defaults={'distancia_km': km, 'tarifa_base': tarifa}
                )
