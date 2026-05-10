from decimal import Decimal
from apps.carga.models import PlanCarga, ItemPlanCarga
from apps.inventario.models import ObjetoMudanza


class PlanCargaService:
    """Servicio para generar planes de carga con heurística de empaquetado"""

    @staticmethod
    def generar_plan_carga(servicio):
        """
        Genera el plan de carga para un servicio de mudanza (Fase 5 del flujo)

        Implementa heurística de empaquetado basada en:
        - Clasificación de riesgo RF de cada objeto
        - Peso y dimensiones
        - Distribución de carga (pesados al fondo, frágiles arriba)
        """
        cotizacion = servicio.reserva.cotizacion

        # Obtener todos los objetos de la cotización
        objetos = ObjetoMudanza.objects.filter(cotizacion=cotizacion).order_by('id')

        if not objetos.exists():
            raise ValueError("No hay objetos en el inventario para generar el plan de carga")

        # Obtener tipo de contenedor del servicio
        tipo_contenedor = servicio.rf_tipo_contenedor_recomendado or servicio.vehiculo.tipo_contenedor

        # Crear el plan de carga
        plan = PlanCarga.objects.create(
            servicio=servicio,
            tipo_contenedor=tipo_contenedor,
            numero_viaje=1,
            volumen_utilizado_m3=cotizacion.volumen_total_m3,
            peso_total_kg=cotizacion.peso_total_kg,
            rf_modelo_version='v1.0',
            rf_datos_entrada={
                'cantidad_objetos': cotizacion.cantidad_objetos,
                'volumen_total': float(cotizacion.volumen_total_m3),
                'peso_total': float(cotizacion.peso_total_kg),
            }
        )

        # Calcular porcentaje de ocupación
        if tipo_contenedor:
            porcentaje_ocupacion = (cotizacion.volumen_total_m3 / tipo_contenedor.volumen_capacidad_m3) * 100
            plan.porcentaje_ocupacion = Decimal(str(round(porcentaje_ocupacion, 2)))

        # Ejecutar heurística de empaquetado
        items_ordenados = PlanCargaService._ordenar_objetos_por_heuristica(objetos)

        # Generar instrucciones generales
        instrucciones_generales = PlanCargaService._generar_instrucciones_generales(
            items_ordenados, porcentaje_ocupacion if tipo_contenedor else 0
        )
        plan.instrucciones_generales = instrucciones_generales
        plan.save()

        # Crear items del plan de carga
        for item in items_ordenados:
            ItemPlanCarga.objects.create(
                plan_carga=plan,
                objeto=item['objeto'],
                orden_carga=item['orden'],
                zona_posicion=item['zona'],
                requiere_proteccion=item['requiere_proteccion'],
                instrucciones_especiales=item['instrucciones']
            )

        return plan

    @staticmethod
    def _ordenar_objetos_por_heuristica(objetos):
        """
        Ordena los objetos según la heurística de empaquetado:
        1. Objetos pesados y de bajo riesgo → Fondo inferior
        2. Objetos medianos y riesgo medio → Medio central
        3. Objetos livianos de bajo riesgo → Medio central (apilables)
        4. Objetos frágiles de alto riesgo → Frente superior
        """
        items_ordenados = []
        orden = 1

        # Separar objetos por riesgo y peso
        objetos_alto_riesgo = []
        objetos_medio_riesgo = []
        objetos_bajo_riesgo = []

        for obj in objetos:
            nivel_riesgo = obj.rf_nivel_riesgo or 'bajo'
            if nivel_riesgo == 'alto':
                objetos_alto_riesgo.append(obj)
            elif nivel_riesgo == 'medio':
                objetos_medio_riesgo.append(obj)
            else:
                objetos_bajo_riesgo.append(obj)

        # 1. Cargar objetos de alto riesgo pesados primero (al fondo)
        objetos_alto_riesgo_pesados = [obj for obj in objetos_alto_riesgo if float(obj.peso_kg) > 50]
        objetos_alto_riesgo_pesados.sort(key=lambda x: float(x.peso_kg), reverse=True)

        for obj in objetos_alto_riesgo_pesados:
            items_ordenados.append({
                'objeto': obj,
                'orden': orden,
                'zona': 'fondo_inferior',
                'requiere_proteccion': True,
                'instrucciones': f'{obj.rf_proteccion_sugerida or "Embalaje especial"} obligatorio. '
                                f'Riesgo ALTO. Peso: {obj.peso_kg}kg. Cargar al fondo con protección reforzada.'
            })
            orden += 1

        # 2. Cargar objetos de riesgo medio (al fondo/medio)
        objetos_medio_riesgo.sort(key=lambda x: float(x.peso_kg), reverse=True)

        for obj in objetos_medio_riesgo:
            zona = 'fondo' if float(obj.peso_kg) > 30 else 'medio_central'
            items_ordenados.append({
                'objeto': obj,
                'orden': orden,
                'zona': zona,
                'requiere_proteccion': True,
                'instrucciones': f'Protección estándar. Riesgo MEDIO. Peso: {obj.peso_kg}kg.'
            })
            orden += 1

        # 3. Cargar objetos de bajo riesgo (medio, apilables)
        objetos_bajo_riesgo.sort(key=lambda x: float(x.peso_kg), reverse=True)

        for obj in objetos_bajo_riesgo:
            es_caja = 'caja' in obj.nombre.lower() or 'box' in obj.nombre.lower()
            items_ordenados.append({
                'objeto': obj,
                'orden': orden,
                'zona': 'medio_central',
                'requiere_proteccion': False,
                'instrucciones': f'Protección estándar. Riesgo BAJO. {"Apilable." if es_caja else ""}'
            })
            orden += 1

        # 4. Cargar objetos de alto riesgo livianos al final (frente superior)
        # Estos son típicamente TVs, espejos, cuadros, etc.
        objetos_alto_riesgo_livianos = [obj for obj in objetos_alto_riesgo if float(obj.peso_kg) <= 50]
        objetos_alto_riesgo_livianos.sort(key=lambda x: float(x.peso_kg))

        for obj in objetos_alto_riesgo_livianos:
            items_ordenados.append({
                'objeto': obj,
                'orden': orden,
                'zona': 'frente_superior',
                'requiere_proteccion': True,
                'instrucciones': f'{obj.rf_proteccion_sugerida or "Caja reforzada + burbuja"}. '
                                f'Riesgo ALTO. Último en cargar, primero en descargar. '
                                f'NO apilar nada encima.'
            })
            orden += 1

        return items_ordenados

    @staticmethod
    def _generar_instrucciones_generales(items_ordenados, porcentaje_ocupacion):
        """Genera las instrucciones generales del plan de carga"""

        # Contar objetos de alto riesgo
        objetos_alto_riesgo = [
            item for item in items_ordenados
            if item['objeto'].rf_nivel_riesgo == 'alto'
        ]

        # Encontrar objetos específicos que requieren mención
        objetos_fondo = [item for item in items_ordenados if item['zona'] == 'fondo_inferior']
        objetos_frente = [item for item in items_ordenados if item['zona'] == 'frente_superior']

        instrucciones = []

        # Instrucción sobre objetos pesados
        if objetos_fondo:
            instrucciones.append(
                f"Cargar objetos pesados al fondo: {', '.join([i['objeto'].nombre for i in objetos_fondo[:3]])}."
            )

        # Instrucción sobre objetos de alto riesgo
        if objetos_alto_riesgo:
            instrucciones.append(
                f"Verificar embalaje de {len(objetos_alto_riesgo)} objeto(s) de ALTO RIESGO antes de cargar."
            )

        # Instrucción sobre objetos al frente
        if objetos_frente:
            nombres_frente = ', '.join([i['objeto'].nombre for i in objetos_frente])
            instrucciones.append(
                f"{nombres_frente} va(n) al frente superior. Último(s) en cargar, primero(s) en descargar."
            )
            instrucciones.append(
                f"NO apilar nada sobre objetos en zona frente_superior."
            )

        # Instrucción sobre ocupación
        if porcentaje_ocupacion > 0:
            instrucciones.append(
                f"Ocupación estimada: {porcentaje_ocupacion:.0f}%. "
                f"{'Espacio ajustado, cargar con cuidado.' if porcentaje_ocupacion > 80 else 'Espacio suficiente.'}"
            )

        return ' '.join(instrucciones)
