# Jornada 02 — Diseño y navegación

**Proyecto:** ReposteriaWeb — E-commerce de repostería  
**Fecha:** 10 de noviembre de 2026  
**Tecnologías:** React, Vite, React Router, Tailwind CSS, Lucide React

## 1. Objetivo

Implementar la estructura de navegación y las primeras vistas del sistema de repostería, utilizando componentes reutilizables y un diseño responsivo. Esta jornada prepara la interfaz; no incluye autenticación real, inventario, pedidos ni conexión con SQL Server.

## 2. Alcance y requerimientos relacionados

- Interfaz general y navegación del cliente (RIU01–04, según el documento de requerimientos).
- Preparación visual del catálogo (RF03), carrito (RF05–RF07) e inicio de sesión (RF02).
- Los requerimientos funcionales anteriores **no se consideran implementados completamente** en esta jornada; únicamente se crean las vistas base.

## 3. Dependencias

Desde `frontend/`:

```bash
npm install react-router-dom lucide-react
npm install tailwindcss @tailwindcss/vite
```

Verificar que `vite.config.js` contenga el plugin `@tailwindcss/vite` y que `src/index.css` incluya `@import "tailwindcss";`.

## 4. Archivos creados

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/Header.jsx` | Barra superior, logo, enlaces y acceso al carrito. |
| `src/components/Footer.jsx` | Información general y enlaces del pie de página. |
| `src/layouts/MainLayout.jsx` | Estructura común con `Header`, contenido mediante `Outlet` y `Footer`. |
| `src/pages/Home.jsx` | Portada y enlace al catálogo. |
| `src/pages/Catalogo.jsx` | Vista inicial del catálogo (contenido provisional). |
| `src/pages/Carrito.jsx` | Vista inicial del carrito (contenido provisional). |
| `src/pages/Login.jsx` | Vista inicial de acceso (contenido provisional). |
| `src/pages/NotFound.jsx` | Mensaje para rutas inexistentes. |

## 5. Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `src/App.jsx` | Declaración de rutas mediante `Routes` y `Route`. |
| `src/main.jsx` | Envoltura de la aplicación en `BrowserRouter`. |
| `src/index.css` | Importación de Tailwind y estilos globales mínimos. |

## 6. Código para implementar

### `src/components/Header.jsx`

```jsx
import { CakeSlice, ShoppingCart, UserRound } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const linkClass = ({ isActive }) =>
  `hover:text-rose-700 ${isActive ? 'text-rose-700 font-semibold' : 'text-stone-700'}`;

export default function Header() {
  return (
    <header className="bg-white border-b border-rose-100">
      <nav className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap gap-4 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-rose-700">
          <CakeSlice aria-hidden="true" /> Dulce Hogar
        </Link>
        <div className="flex flex-wrap items-center gap-5">
          <NavLink to="/" end className={linkClass}>Inicio</NavLink>
          <NavLink to="/catalogo" className={linkClass}>Catálogo</NavLink>
          <NavLink to="/carrito" className={linkClass} aria-label="Carrito">
            <ShoppingCart aria-hidden="true" />
          </NavLink>
          <NavLink to="/login" className={linkClass} aria-label="Iniciar sesión">
            <UserRound aria-hidden="true" />
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
```

### `src/components/Footer.jsx`

```jsx
export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-200 py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-5 text-center text-sm">
        <p className="font-semibold">Dulce Hogar — Repostería artesanal</p>
        <p className="mt-2">Proyecto universitario de comercio electrónico.</p>
      </div>
    </footer>
  );
}
```

### `src/layouts/MainLayout.jsx`

```jsx
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-rose-50 text-stone-800">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
```

### `src/pages/Home.jsx`

```jsx
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-24 text-center">
      <p className="uppercase tracking-widest text-rose-700 font-semibold mb-4">Repostería artesanal</p>
      <h1 className="text-4xl md:text-6xl font-bold text-rose-950 mb-6">Un detalle dulce para cada ocasión</h1>
      <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-9">
        Descubre nuestros pasteles, panes y postres preparados con cariño.
      </p>
      <Link to="/catalogo" className="inline-block bg-rose-700 hover:bg-rose-800 text-white px-7 py-3 rounded-lg">
        Explorar productos
      </Link>
    </section>
  );
}
```

### `src/pages/Catalogo.jsx`

```jsx
export default function Catalogo() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-14">
      <h1 className="text-3xl font-bold text-rose-950">Catálogo</h1>
      <p className="mt-4 text-stone-600">Próximamente mostraremos nuestros productos y categorías.</p>
    </section>
  );
}
```

### `src/pages/Carrito.jsx`

```jsx
export default function Carrito() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-14">
      <h1 className="text-3xl font-bold text-rose-950">Carrito de compras</h1>
      <p className="mt-4 text-stone-600">Aquí aparecerán los productos que agregues al carrito.</p>
    </section>
  );
}
```

### `src/pages/Login.jsx`

```jsx
export default function Login() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-14">
      <h1 className="text-3xl font-bold text-rose-950">Iniciar sesión</h1>
      <p className="mt-4 text-stone-600">El formulario de acceso se implementará en una jornada posterior.</p>
    </section>
  );
}
```

### `src/pages/NotFound.jsx`

```jsx
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-20 text-center">
      <h1 className="text-4xl font-bold">Página no encontrada</h1>
      <p className="my-5">La dirección solicitada no existe.</p>
      <Link to="/" className="text-rose-700 underline">Volver al inicio</Link>
    </section>
  );
}
```

### `src/App.jsx`

```jsx
import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
```

### `src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### `src/index.css`

```css
@import "tailwindcss";

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}
```

## 7. Verificación

Desde `frontend/`:

```bash
npm run dev
```

Pruebas manuales:

- [ ] La página `/` muestra el encabezado, la portada y el pie de página.
- [ ] El enlace **Explorar productos** abre `/catalogo`.
- [ ] El menú abre `/catalogo`, `/carrito` y `/login`.
- [ ] La URL `/ruta-inexistente` muestra **Página no encontrada**.
- [ ] La navegación funciona sin recargar completamente la aplicación.
- [ ] El diseño es legible en una pantalla pequeña.
- [ ] `npm run build` termina sin errores.

**Nota de despliegue:** para publicar con `BrowserRouter` en GitHub Pages habrá que configurar la ruta base de Vite y resolver las rutas profundas (o considerar `HashRouter`). Esto se revisará durante el despliegue.

## 8. Control de versiones

Desde la raíz del repositorio:

```bash
git status
git add .
git commit -m "Jornada 2: navegacion y estructura de paginas"
git push origin main
```

No ejecutar el commit hasta haber implementado y verificado los cambios.

## 9. Próxima jornada

Jornada 03: implementar el catálogo con productos de ejemplo, tarjetas reutilizables, imágenes, precios, categorías y filtros. Más adelante se sustituirán los datos de ejemplo por consultas al backend y SQL Server.
