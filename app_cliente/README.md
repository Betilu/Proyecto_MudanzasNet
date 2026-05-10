# Mudanzas CRM - App Cliente (React Native + Expo)

App móvil para clientes del sistema de mudanzas con IA.

## Características Implementadas

### Fase 2 - Cotización del Cliente
- ✅ Registro e inicio de sesión
- ✅ Crear nueva cotización
- ✅ Seleccionar zonas origen/destino
- ✅ Registrar inventario de objetos con fotos
- ✅ Clasificación de riesgo con IA
- ✅ Cálculo de precio con Random Forest

### Fase 4 - Pago del Depósito
- ✅ Ver reservas generadas
- ✅ Subir comprobante de pago con cámara
- ✅ Descargar facturas PDF

### Fase 6-7 - Seguimiento y Confirmación
- ✅ Timeline de seguimiento en tiempo real
- ✅ Notificaciones push de cambios de estado
- ✅ Confirmar entrega con firma digital
- ✅ Reportar incidencias con fotos
- ✅ Calificar servicio (5 dimensiones)

## Estructura del Proyecto

```
src/
├── components/        # Componentes reutilizables
│   ├── ui/           # Button, Input, Card, Badge, Loading
│   └── common/       # Componentes comunes
├── screens/          # Pantallas de la app
│   ├── auth/         # Login, Register
│   ├── cotizacion/   # Nueva, Inventario, Detalle
│   ├── reserva/      # Lista, Detalle, Seguimiento
│   └── pago/         # Registro de pagos
├── navigation/       # Configuración de navegación
├── services/         # Servicios de API
├── hooks/            # Custom hooks
├── contexts/         # Context API (Auth)
├── constants/        # Constantes y configuración
├── utils/            # Utilidades
└── theme/            # Tema de la app
```

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con la URL del backend
```

3. Iniciar en desarrollo:
```bash
npx expo start
```

## Dependencias Principales

- **React Navigation**: Navegación entre pantallas
- **Axios**: Cliente HTTP para APIs
- **Expo Camera**: Captura de fotos de objetos
- **Expo Notifications**: Notificaciones push
- **Expo Location**: Geolocalización
- **AsyncStorage**: Almacenamiento local
- **Formik + Yup**: Manejo de formularios

## Endpoints API

Todos los endpoints usan el prefijo `/api/app-cliente/`

Ver documentación completa en: `../backend/ENDPOINTS_APP_CLIENTE.md`

## Configuración del Backend

El backend Django debe implementar los siguientes endpoints:

- `POST /api/app-cliente/auth/registro/` - Registro de cliente
- `POST /api/app-cliente/auth/login/` - Login
- `GET /api/app-cliente/cotizaciones/` - Listar cotizaciones
- `POST /api/app-cliente/cotizaciones/` - Crear cotización
- `POST /api/app-cliente/cotizaciones/{id}/calcular-precio/` - Calcular con IA
- `GET /api/app-cliente/reservas/{id}/seguimiento/` - Timeline en tiempo real
- Y más... (ver ENDPOINTS_APP_CLIENTE.md)

## Desarrollo

### Agregar nueva screen:
1. Crear archivo en `src/screens/`
2. Agregar ruta en `src/navigation/AppNavigator.js`
3. Implementar lógica de negocio

### Agregar nuevo servicio:
1. Crear archivo en `src/services/`
2. Exportar desde `src/services/index.js`
3. Usar con `useFetch` hook

## Build

### Android:
```bash
npx expo build:android
```

### iOS:
```bash
npx expo build:ios
```

## Notas Importantes

- La app requiere conexión con el backend Django
- **⚠️  Push notifications NO funcionan en Expo Go (SDK 53+)**
  - En Expo Go solo funcionan notificaciones locales
  - Para push notifications reales, necesitas crear un development build
  - Ver `NOTIFICACIONES_GUIA.md` para más información
- Las notificaciones locales funcionan perfectamente en Expo Go
- La cámara y ubicación requieren permisos del usuario
- Los tokens JWT se almacenan en AsyncStorage de forma segura

## Testing de Notificaciones

### En Expo Go (Desarrollo):
```bash
npm start
# Navegar a TestNotificacionesScreen para probar notificaciones locales
```

### Con Development Build (Push Notifications):
```bash
# Android
npx expo run:android

# iOS (requiere Mac)
npx expo run:ios
```

Ver documentación completa en: **NOTIFICACIONES_GUIA.md**
