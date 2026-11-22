# Dulce Hogar — Sistema web de repostería

Proyecto académico de Verificación y Validación de Software.

**Responsable:** Oscar Armando Medina Gutiérrez.

## Descripción

Aplicación web para consultar productos de repostería, registrarse, iniciar sesión, gestionar un carrito, confirmar y consultar pedidos, y administrar el catálogo, el inventario, la producción y los reportes de ventas según el rol.

## Tecnologías

- Frontend: React, Vite, React Router, Tailwind CSS y JavaScript.
- Backend: Node.js, Express y API REST.
- Base de datos: Microsoft SQL Server; conexión local configurada mediante variables de entorno.
- Autenticación: JWT; el cliente conserva el token de sesión en `sessionStorage`.

## Roles

- **Cliente:** catálogo, carrito, confirmación, historial y cancelación permitida.
- **Administrador:** productos, categorías, inventario, seguimiento de pedidos y reportes.
- **Personal de producción:** pedidos en preparación y marcado de pedidos listos.

## Requisitos de ejecución local

- Node.js compatible con los paquetes instalados (entorno de desarrollo utilizado: Node.js 24).
- npm.
- SQL Server disponible y base de datos `DulceHogar` creada mediante los scripts del proyecto.
- Variables de entorno del backend configuradas **localmente**, sin publicar secretos.

## Inicio local

En una terminal:

```bash
cd backend
npm install
npm run dev