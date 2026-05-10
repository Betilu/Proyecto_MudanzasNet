# Frontend - Proyecto React (Vite)

Este proyecto corresponde al frontend desarrollado con React + Vite.

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior

## Como levantar el proyecto

1. Entrar a la carpeta del frontend:

```bash
cd frontend
```

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar en modo desarrollo:

```bash
npm run dev
```

4. Abrir en el navegador la URL que muestra Vite (normalmente `http://localhost:5173`).

## Scripts disponibles

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: genera la compilacion de produccion.
- `npm run preview`: levanta una vista previa del build.
- `npm run lint`: ejecuta ESLint.

## Modulos del proyecto

El frontend esta organizado de la siguiente forma:

- `src/pages`: pantallas principales del sistema:
  - Autenticacion: `Login`, `Registro`.
  - Inicio y perfil: `Dashboard`, `Perfil`.
  - Operacion: `Clientes`, `Cotizaciones`, `Reservas`, `Mudanzas`, `Pagos`.
  - Catalogos: `Zonas`, `Servicios`, `Inventario`, `Vehiculos`, `Personal`.
  - CRM: `CrmPipeline`, `CrmInformes`.
  - Administracion: `Usuarios`, `Roles`, `Configuracion`, `Bitacora`.
  - Usuario cliente: `MisCotizaciones`, `MisReservas`, `MisPagos`.
  - Otros: `Chatbot`, `Reportes`.

- `src/components`: componentes reutilizables (formularios, tablas, modales, proteccion de rutas, etc.).
- `src/layouts`: layouts base de la aplicacion (`MainLayout`).
- `src/context`: estado global de autenticacion (`AuthContext`).
- `src/api`: cliente HTTP y configuracion de consumo de API (`client.js`).
- `src/main.jsx`: punto de entrada de React.
- `src/App.jsx`: definicion de rutas y control de acceso por roles.

## Stack principal

- React 19
- React Router DOM
- Axios
- Vite
- Tailwind CSS
