# Jornada 6 — Autenticación y control de roles

**Proyecto:** ReposteriaWeb / Dulce Hogar  
**Tecnologías:** React, Vite, Tailwind CSS, React Router  
**Objetivo:** implementar registro, acceso, cierre de sesión y permisos simulados (RF01, RF02, RF18, RF05).

## 1. Alcance y decisiones

El catálogo es público. Solo Cliente puede comprar. Administrador y Personal de Producción tienen páginas de acceso provisional (sin operaciones administrativas todavía). Los registros nuevos son exclusivamente clientes. Las cuentas de prueba tienen credenciales públicas y no deben usarse en producción. Los usuarios registrados existen únicamente en memoria hasta recargar; la sesión de cualquier usuario se conserva en sessionStorage durante la pestaña, pero cerrar sesión tras una recarga implica volver a registrar una cuenta nueva si no era de prueba. No se guardan contraseñas reales en almacenamiento web; usa exclusivamente datos ficticios. No hay seguridad real hasta implementar backend, autorización y hash de contraseñas en servidor. RF19 queda pendiente.

El carrito se separa por correo y solo se carga para clientes autenticados. El carrito anterior de Jornada 5 queda en su clave original y no se migra automáticamente, para no atribuirlo a otra persona. El inventario real no cambia hasta confirmar pedido.

## 2. Preparación

Desde Git Bash:

```bash
cd /c/6to/reposteria-web
mkdir -p frontend/src/context frontend/src/hooks frontend/src/data
```

Crea o reemplaza los archivos indicados abajo. Conserva Catalogo.jsx, Carrito.jsx, products.js y los estilos actuales. No instales dependencias.

## 3. `frontend/src/data/usuariosDemo.js`

Cuentas ficticias y roles.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: usuariosDemo.js
// Descripción: Cuentas ficticias y roles.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

export const ROLES = Object.freeze({
  CLIENTE: 'Cliente',
  ADMIN: 'Administrador',
  PRODUCCION: 'Personal de Producción',
});

export const USUARIOS_DEMO = [
  { nombre: 'Cliente demo', correo: 'cliente@demo.mx', clave: 'Cliente123', rol: ROLES.CLIENTE },
  { nombre: 'Admin demo', correo: 'admin@demo.mx', clave: 'Admin1234', rol: ROLES.ADMIN },
  { nombre: 'Producción demo', correo: 'produccion@demo.mx', clave: 'Produccion123', rol: ROLES.PRODUCCION },
];
```

## 4. `frontend/src/context/authContext.js`

Declara el contexto de sesión.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: authContext.js
// Descripción: Declara el contexto de sesión.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { createContext } from 'react';
export const AuthContext = createContext(null);
```

## 5. `frontend/src/hooks/useAuth.js`

Devuelve el contexto y detecta un proveedor ausente.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: useAuth.js
// Descripción: Devuelve el contexto y detecta un proveedor ausente.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useContext } from 'react';
import { AuthContext } from '../context/authContext';

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth requiere AuthProvider');
  }
  return contexto;
}
```

## 6. `frontend/src/context/AuthProvider.jsx`

Gestiona cuentas temporales, sesión y validaciones.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: AuthProvider.jsx
// Descripción: Gestiona cuentas temporales, sesión y validaciones.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useState } from 'react';
import { AuthContext } from './authContext';
import { ROLES, USUARIOS_DEMO } from '../data/usuariosDemo';

const CLAVE_SESION = 'dulce-hogar-sesion-demo-v1';
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLAVE_VALIDA = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

// Recupera solamente el perfil ficticio, nunca la contraseña.
function cargarSesion() {
  try {
    const perfil = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null');
    if (perfil && typeof perfil.nombre === 'string' &&
        typeof perfil.correo === 'string' && Object.values(ROLES).includes(perfil.rol)) {
      return perfil;
    }
  } catch { /* La sesión no está disponible. */ }
  return null;
}

// Persiste un perfil de demostración o elimina la sesión.
function guardarSesion(perfil) {
  try {
    if (perfil) {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(perfil));
    } else {
      sessionStorage.removeItem(CLAVE_SESION);
    }
  } catch { /* La sesión sigue funcionando en memoria. */ }
}

export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(cargarSesion);
  const [cuentas, setCuentas] = useState(USUARIOS_DEMO);

  // Recibe credenciales; devuelve un mensaje de error o cadena vacía.
  function iniciarSesion(correo, clave) {
    const cuenta = cuentas.find(item =>
      item.correo === correo.trim().toLowerCase() && item.clave === clave);
    if (!cuenta) {
      return 'Correo o contraseña incorrectos.';
    }
    const perfil = { nombre: cuenta.nombre, correo: cuenta.correo, rol: cuenta.rol };
    guardarSesion(perfil);
    setUsuario(perfil);
    return '';
  }

  // Valida datos ficticios y crea una cuenta cliente en memoria.
  function registrar(nombre, correo, clave) {
    const correoNormalizado = correo.trim().toLowerCase();
    if (!nombre.trim() || !CORREO_VALIDO.test(correoNormalizado)) {
      return 'Introduce un nombre y correo válido.';
    }
    if (!CLAVE_VALIDA.test(clave)) {
      return 'La contraseña requiere 8 caracteres, una mayúscula y un número.';
    }
    if (cuentas.some(item => item.correo === correoNormalizado)) {
      return 'El correo ya está registrado.';
    }
    setCuentas(actuales => [...actuales, {
      nombre: nombre.trim(), correo: correoNormalizado, clave, rol: ROLES.CLIENTE,
    }]);
    return '';
  }

  // Elimina la sesión sin borrar el carrito privado.
  function cerrarSesion() {
    guardarSesion(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, iniciarSesion, registrar, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## 7. `frontend/src/components/RutaProtegida.jsx`

Comprueba sesión y rol antes de renderizar una ruta.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: RutaProtegida.jsx
// Descripción: Comprueba sesión y rol antes de renderizar una ruta.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RutaProtegida({ roles }) {
  const { usuario } = useAuth();
  const ubicacion = useLocation();
  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }
  if (!roles.includes(usuario.rol)) {
    return <Navigate to="/sin-acceso" replace />;
  }
  return <Outlet />;
}
```

## 8. `frontend/src/pages/Login.jsx`

Formulario de acceso con mensajes y redirección por rol.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Login.jsx
// Descripción: Formulario de acceso con mensajes y redirección por rol.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../data/usuariosDemo';

export default function Login() {
  const { usuario, iniciarSesion } = useAuth();
  const { state } = useLocation();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  // Procesa el formulario sin recargar la página.
  function enviar(evento) {
    evento.preventDefault();
    setError(iniciarSesion(correo, clave));
  }

  if (usuario) {
    const destino = usuario.rol === ROLES.ADMIN ? '/admin' :
      usuario.rol === ROLES.PRODUCCION ? '/produccion' :
      state?.desde === '/carrito' ? '/carrito' : '/catalogo';
    return <Navigate to={destino} replace />;
  }

  return (
    <section className="max-w-md mx-auto px-5 py-14">
      <form onSubmit={enviar} className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h1 className="text-3xl font-bold text-rose-900">Iniciar sesión</h1>
        <label className="block">Correo electrónico
          <input type="email" required value={correo} autoComplete="username"
            onChange={e => setCorreo(e.target.value)} className="border rounded p-3 w-full" />
        </label>
        <label className="block">Contraseña
          <input type="password" required value={clave} autoComplete="current-password"
            onChange={e => setClave(e.target.value)} className="border rounded p-3 w-full" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button className="bg-rose-700 text-white rounded-lg p-3 w-full">Entrar</button>
        <Link to="/registro" className="text-rose-700 underline">Crear cuenta</Link>
      </form>
    </section>
  );
}
```

## 9. `frontend/src/pages/Registro.jsx`

Registro de clientes con confirmación de contraseña.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Registro.jsx
// Descripción: Registro de clientes con confirmación de contraseña.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Registro() {
  const { usuario, registrar } = useAuth();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ nombre: '', correo: '', clave: '', confirmar: '' });
  const [error, setError] = useState('');

  // Actualiza un campo del formulario.
  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos(actuales => ({ ...actuales, [name]: value }));
  }

  // Comprueba confirmación y solicita registro al contexto.
  function enviar(evento) {
    evento.preventDefault();
    if (datos.clave !== datos.confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    const resultado = registrar(datos.nombre, datos.correo, datos.clave);
    setError(resultado);
    if (!resultado) {
      navegar('/login', { replace: true });
    }
  }

  if (usuario) {
    return <Navigate to="/" replace />;
  }
  const campos = [ ['nombre', 'Nombre', 'text'], ['correo', 'Correo', 'email'],
    ['clave', 'Contraseña', 'password'], ['confirmar', 'Confirmar contraseña', 'password'] ];
  return (
    <section className="max-w-md mx-auto px-5 py-14">
      <form onSubmit={enviar} className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h1 className="text-3xl font-bold text-rose-900">Crear cuenta</h1>
        {campos.map(([name, etiqueta, tipo]) => (
          <label key={name} className="block">{etiqueta}
            <input name={name} type={tipo} required value={datos[name]} onChange={cambiar}
              autoComplete={tipo === 'password' ? 'new-password' : name === 'correo' ? 'email' : 'name'}
              className="border rounded p-3 w-full" />
          </label>
        ))}
        <p className="text-sm">Usa datos ficticios. Mínimo 8 caracteres, una mayúscula y un número.</p>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button className="bg-rose-700 text-white rounded-lg p-3 w-full">Registrarme</button>
        <Link to="/login" className="text-rose-700 underline">Ya tengo cuenta</Link>
      </form>
    </section>
  );
}
```

## 10. `frontend/src/pages/PanelRol.jsx`

Página provisional para verificar permisos.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: PanelRol.jsx
// Descripción: Página provisional para verificar permisos.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useAuth } from '../hooks/useAuth';
export default function PanelRol() {
  const { usuario } = useAuth();
  return (
    <section className="max-w-6xl mx-auto px-5 py-14">
      <h1 className="text-3xl font-bold text-rose-900">Panel: {usuario.rol}</h1>
      <p>Bienvenido, {usuario.nombre}. Las operaciones se implementarán posteriormente.</p>
    </section>
  );
}
```

## 11. `frontend/src/App.jsx`

Conserva las rutas existentes y agrega protección por rol.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: App.jsx
// Descripción: Conserva las rutas existentes y agrega protección por rol.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { Routes, Route, Link } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Login from './pages/Login';
import Registro from './pages/Registro';
import NotFound from './pages/NotFound';
import PanelRol from './pages/PanelRol';
import RutaProtegida from './components/RutaProtegida';
import { ROLES } from './data/usuariosDemo';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route element={<RutaProtegida roles={[ROLES.CLIENTE]} />}>
          <Route path="/carrito" element={<Carrito />} />
        </Route>
        <Route element={<RutaProtegida roles={[ROLES.ADMIN]} />}>
          <Route path="/admin" element={<PanelRol />} />
        </Route>
        <Route element={<RutaProtegida roles={[ROLES.PRODUCCION]} />}>
          <Route path="/produccion" element={<PanelRol />} />
        </Route>
        <Route path="/sin-acceso" element={<section className="p-10">
          <h1 className="text-2xl font-bold">Acceso no autorizado</h1>
          <Link to="/" className="underline">Volver al inicio</Link>
        </section>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
```

## 12. `frontend/src/services/carritoServicio.js`

Separa la persistencia del carrito por cuenta de cliente.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: carritoServicio.js
// Descripción: Gestiona cantidades y persistencia local del carrito.
// Requerimiento: RF05, RF06, RF07 / CU-07, CU-08, CU-11, CU-12
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { products } from '../data/products';

// ===== Constantes =====
const CLAVE_CARRITO = 'dulce-hogar-carrito-v1';
const CANTIDAD_MINIMA = 1;

// ===== Funciones =====
// Recibe un ID; devuelve el producto registrado o undefined.
export function obtenerProducto(idProducto) {
  return products.find(producto => producto.id === idProducto);
}

// Recibe ID y cantidad; devuelve si la cantidad cumple RF05 y CU-11.
export function validarCantidad(idProducto, cantidad) {
  const producto = obtenerProducto(idProducto);
  return Boolean(producto) && Number.isInteger(cantidad) &&
    cantidad >= CANTIDAD_MINIMA && cantidad <= producto.stock;
}

// Recupera y valida datos locales; devuelve un arreglo sin IDs repetidos.
export function cargarCarrito(correo) {
  if (!correo) { return []; }
  try {
    const datos = JSON.parse(localStorage.getItem(`${CLAVE_CARRITO}:${correo}`) || '[]');
    if (!Array.isArray(datos)) {
      return [];
    }
    const registrados = new Set();
    return datos.filter(item => {
      if (!item || !validarCantidad(item.idProducto, item.cantidad) ||
          registrados.has(item.idProducto)) {
        return false;
      }
      registrados.add(item.idProducto);
      return true;
    }).map(({ idProducto, cantidad }) => ({ idProducto, cantidad }));
  } catch {
    return [];
  }
}

// Recibe un arreglo; devuelve true si se guardó correctamente.
export function guardarCarrito(items, correo) {
  if (!correo) { return true; }
  try {
    localStorage.setItem(`${CLAVE_CARRITO}:${correo}`, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

// Recibe items; devuelve detalles calculados con los precios actuales (RF07).
export function obtenerDetalles(items) {
  return items.map(item => {
    const producto = obtenerProducto(item.idProducto);
    return { ...item, producto, subtotal: producto.precio * item.cantidad };
  });
}
```

## 13. `frontend/src/context/CarritoProvider.jsx`

Conserva el reducer y bloquea operaciones sin cuenta cliente.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CarritoProvider.jsx
// Descripción: Centraliza las operaciones y el estado del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { useReducer, useEffect, useState } from 'react';
import { CarritoContext } from './carritoContext';
import {
  cargarCarrito, guardarCarrito, validarCantidad, obtenerDetalles,
} from '../services/carritoServicio';

// ===== Funciones =====
// Recibe estado y acción; devuelve el nuevo estado sin efectos secundarios.
function reducirCarrito(estado, accion) {
  const { items } = estado;
  const { tipo, idProducto, cantidad } = accion;
  if (tipo === 'VACIAR') {
    return { items: [], mensaje: 'Carrito vacío.' };
  }
  if (tipo === 'ELIMINAR') {
    return {
      items: items.filter(item => item.idProducto !== idProducto),
      mensaje: 'Producto eliminado.',
    };
  }
  const existente = items.find(item => item.idProducto === idProducto);
  if (tipo !== 'AGREGAR' && tipo !== 'MODIFICAR') {
    return estado;
  }
  const nuevaCantidad = tipo === 'AGREGAR'
    ? (existente?.cantidad ?? 0) + cantidad : cantidad;
  // RF05/RF06: validar tanto entrada como cantidad acumulada.
  if (!Number.isInteger(cantidad) || cantidad < 1 ||
      !validarCantidad(idProducto, nuevaCantidad)) {
    return { ...estado, mensaje: 'Cantidad inválida o existencias insuficientes.' };
  }
  if (tipo === 'MODIFICAR' && !existente) {
    return estado;
  }
  const nuevosItems = existente
    ? items.map(item => item.idProducto === idProducto
      ? { ...item, cantidad: nuevaCantidad } : item)
    : [...items, { idProducto, cantidad: nuevaCantidad }];
  return { items: nuevosItems, mensaje: 'Carrito actualizado.' };
}

// Recibe los componentes hijos; devuelve el proveedor con estado compartido.
export default function CarritoProvider({ children, correo }) {
  const [estado, dispatch] = useReducer(reducirCarrito, null, () => ({
    items: cargarCarrito(correo), mensaje: '',
  }));
  const [hayErrorGuardado, setHayErrorGuardado] = useState(false);
  useEffect(() => {
    setHayErrorGuardado(!guardarCarrito(estado.items, correo));
  }, [estado.items, correo]);

  const detalles = obtenerDetalles(estado.items);
  const total = detalles.reduce((suma, item) => suma + item.subtotal, 0);
  const cantidadTotal = estado.items.reduce((suma, item) => suma + item.cantidad, 0);

  const valor = {
    detalles, total, cantidadTotal, mensaje: estado.mensaje, hayErrorGuardado,
    agregarAlCarrito: (idProducto, cantidad = 1) =>
      correo && dispatch({ tipo: 'AGREGAR', idProducto, cantidad }),
    modificarCantidad: (idProducto, cantidad) =>
      correo && dispatch({ tipo: 'MODIFICAR', idProducto, cantidad }),
    eliminarProducto: idProducto => correo && dispatch({ tipo: 'ELIMINAR', idProducto }),
    vaciarCarrito: () => correo && dispatch({ tipo: 'VACIAR' }),
  };
  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}
```

## 14. `frontend/src/main.jsx`

Inicializa autenticación antes del carrito; el cambio de cuenta reinicia el proveedor.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: main.jsx
// Descripción: Inicializa autenticación antes del carrito; el cambio de cuenta reinicia el proveedor.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import AuthProvider from './context/AuthProvider';
import CarritoProvider from './context/CarritoProvider';
import { useAuth } from './hooks/useAuth';
import { ROLES } from './data/usuariosDemo';
import './index.css';

// Monta un carrito independiente para cada cliente.
function AplicacionConCarrito() {
  const { usuario } = useAuth();
  const correo = usuario?.rol === ROLES.CLIENTE ? usuario.correo : null;
  return (
    <CarritoProvider key={correo ?? 'sin-cliente'} correo={correo}>
      <App />
    </CarritoProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><AplicacionConCarrito /></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

## 15. `frontend/src/components/Header.jsx`

Mantiene contador y avisos, agrega navegación de sesión y roles.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Header.jsx
// Descripción: Navegación y contador de unidades del carrito.
// Requerimiento: RF05, RF06
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { CakeSlice, ShoppingCart, UserRound } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../data/usuariosDemo';
import { useCarrito } from '../hooks/useCarrito';

// ===== Funciones =====
// Recibe el estado de navegación; devuelve las clases del enlace.
const obtenerClaseEnlace = ({ isActive }) =>
  `hover:text-rose-700 ${isActive ? 'text-rose-700 font-semibold' : 'text-stone-700'}`;

// No recibe parámetros; devuelve el encabezado del sitio.
export default function Header() {
  const { cantidadTotal, mensaje, hayErrorGuardado } = useCarrito();
  const { usuario, cerrarSesion } = useAuth();
  return (
    <header className="bg-white border-b border-rose-100">
      <nav className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap gap-4
        items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-rose-700">
          <CakeSlice aria-hidden="true" /> Dulce Hogar
        </Link>
        <div className="flex flex-wrap items-center gap-5">
          <NavLink to="/" end className={obtenerClaseEnlace}>Inicio</NavLink>
          <NavLink to="/catalogo" className={obtenerClaseEnlace}>Catálogo</NavLink>
          {(!usuario || usuario.rol === ROLES.CLIENTE) && <NavLink to="/carrito" className={obtenerClaseEnlace}
            aria-label={`Carrito: ${cantidadTotal} unidades`}>
            <span className="relative inline-flex">
              <ShoppingCart aria-hidden="true" />
              <span className="absolute -top-2 -right-3 rounded-full bg-rose-700
                text-white text-xs px-1.5">{cantidadTotal}</span>
            </span>
          </NavLink>}
          {usuario ? <>
            {usuario.rol === ROLES.ADMIN && <Link to="/admin">Administración</Link>}
            {usuario.rol === ROLES.PRODUCCION && <Link to="/produccion">Producción</Link>}
            <span className="text-sm">{usuario.nombre}</span>
            <Link to="/" onClick={cerrarSesion} className="text-rose-700">Cerrar sesión</Link>
          </> : <NavLink to="/login" className={obtenerClaseEnlace} aria-label="Iniciar sesión">
            <UserRound aria-hidden="true" />
          </NavLink>}
        </div>
      </nav>
      {mensaje && <p role="status" className="px-5 pb-2 text-sm text-center">{mensaje}</p>}
      {hayErrorGuardado && <p role="alert" className="px-5 text-red-700 text-sm">
        No fue posible guardar el carrito en este navegador.
      </p>}
    </header>
  );
}
```

## 16. `frontend/src/components/ProductCard.jsx`

Conserva el detalle y disponibilidad, limita la compra a clientes autenticados.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez// Materia: Verificación y Validación de Software
// Programa: ProductCard.jsx
// Descripción: Presenta el producto y permite agregar una unidad al carrito.
// Requerimiento: RF03, RF04, RF05
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../data/usuariosDemo';
import { useCarrito } from '../hooks/useCarrito';

// ===== Constantes =====
const FORMATO_MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});

// ===== Funciones =====
// Recibe producto y función abrirDetalle; devuelve la tarjeta.
export default function ProductCard({ product, abrirDetalle }) {
  const [hayErrorImagen, setHayErrorImagen] = useState(false);
  const { detalles, agregarAlCarrito } = useCarrito();
  const { usuario } = useAuth();
  const puedeComprar = usuario?.rol === ROLES.CLIENTE;
  const cantidadEnCarrito = detalles.find(item => item.idProducto === product.id)?.cantidad ?? 0;
  const hayExistencias = product.stock > 0;
  const disponibles = Math.max(0, product.stock - cantidadEnCarrito);
  const sePuedeAgregar = disponibles > 0;
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm border border-rose-100">
      <div className="h-48 bg-rose-100 flex items-center justify-center">
        {!hayErrorImagen ? <img src={product.imagen} alt={product.nombre}
          className="h-full w-full object-cover" onError={() => setHayErrorImagen(true)} />
          : <span className="text-rose-700 font-semibold">{product.categoria}</span>}
      </div>
      <div className="p-5 space-y-2">
        <p className="text-sm text-rose-700">{product.categoria}</p>
        <h2 className="text-xl font-bold text-rose-900">{product.nombre}</h2>
        <p className="text-stone-600 text-sm">{product.descripcion}</p>
        <p className="text-lg font-bold">{FORMATO_MONEDA.format(product.precio)}</p>
        <p className={sePuedeAgregar ? 'text-green-700 text-sm' : 'text-red-700 text-sm'}>
          {hayExistencias ? `Disponibles para agregar: ${disponibles}` : 'Agotado'}
        </p>
        <p className="text-sm text-stone-600">En carrito: {cantidadEnCarrito}
        </p>
        <button type="button" onClick={() => abrirDetalle(product.id)}
          className="flex items-center justify-center gap-2 w-full rounded-lg border
            border-rose-600 text-rose-700 py-2 hover:bg-rose-50">
          <Eye size={18} /> Ver detalle
        </button>
        {puedeComprar ? (
<button type="button" disabled={!sePuedeAgregar}
          onClick={() => agregarAlCarrito(product.id)}
          className="w-full rounded-lg bg-rose-700 text-white py-2
            hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed">
          {!hayExistencias ? 'Producto agotado' : sePuedeAgregar
            ? 'Agregar al carrito' : 'Límite en carrito'}
        </button>
) : (
<p className="text-sm text-rose-700" role="status">
          {usuario ? 'Solo los clientes pueden comprar.' : 'Inicia sesión para agregar productos.'}
        </p>
)}
      </div>
    </article>
  );
}
```

## 17. `frontend/src/components/DetalleProducto.jsx`

Conserva el detalle y disponibilidad, limita la compra a clientes autenticados.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez// Materia: Verificación y Validación de Software
// Programa: DetalleProducto.jsx
// Descripción: Muestra la información detallada de un producto.
// Requerimiento: RF04, RF05 / CU-06, CU-07
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../data/usuariosDemo';
import { useCarrito } from '../hooks/useCarrito';

// ===== Constantes =====
const CANTIDAD_MINIMA = 1;

const FORMATO_MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

// ===== Funciones =====

/**
 * Muestra el modal con la información del producto.
 * Recibe: producto y función cerrarDetalle.
 * Devuelve: componente JSX del detalle del producto.
 */
function DetalleProducto({ producto, cerrarDetalle }) {
  const dialogo = useRef(null);

  const { detalles, agregarAlCarrito } = useCarrito();
  const { usuario } = useAuth();
  const puedeComprar = usuario?.rol === ROLES.CLIENTE;
  const cantidadEnCarrito = detalles.find(
    item => item.idProducto === producto.id
  )?.cantidad ?? 0;
  const disponibles = Math.max(0, producto.stock - cantidadEnCarrito);
  const hayExistencias = disponibles > 0;

  const [cantidadElegida, setCantidad] = useState(
    CANTIDAD_MINIMA
  );

  const [hayErrorImagen, setHayErrorImagen] = useState(false);

  const cantidad = Math.min(cantidadElegida, disponibles);

  // Importe de referencia según la cantidad seleccionada.
  const subtotal = producto.precio * cantidad;

  // Abre la ventana modal al montar el componente.
  useEffect(() => {
    const elemento = dialogo.current;

    if (elemento && !elemento.open) {
      elemento.showModal();
    }

    return () => {
      if (elemento?.open) {
        elemento.close();
      }
    };
  }, []);

  /**
   * Aumenta la cantidad sin superar las existencias.
   * Recibe: ningún parámetro.
   * Devuelve: ningún valor.
   */
  function aumentarCantidad() {
    setCantidad(() =>
      Math.min(cantidad + 1, disponibles)
    );
  }

  /**
   * Disminuye la cantidad respetando el mínimo permitido.
   * Recibe: ningún parámetro.
   * Devuelve: ningún valor.
   */
  function disminuirCantidad() {
    setCantidad(() =>
      Math.max(cantidad - 1, CANTIDAD_MINIMA)
    );
  }

  /**
   * Gestiona el cierre mediante la tecla Escape.
   * Recibe: evento de cancelación del diálogo.
   * Devuelve: ningún valor.
   */
  function cancelarDetalle(evento) {
    evento.preventDefault();
    cerrarDetalle();
  }

  // Agrega la cantidad seleccionada; el reducer vuelve a validar el inventario.
  function agregarSeleccion() {
    if (cantidad < 1 || cantidad > disponibles) {
      return;
    }
    agregarAlCarrito(producto.id, cantidad);
    setCantidad(CANTIDAD_MINIMA);
  }

  return (
    <dialog
      ref={dialogo}
      onCancel={cancelarDetalle}
      aria-labelledby="titulo-detalle"
      className="fixed inset-0 m-auto w-[92%] max-w-3xl
        max-h-[90vh] overflow-y-auto rounded-2xl
        bg-white p-0 text-stone-800 shadow-2xl
        backdrop:bg-black/60"
    >
      <div className="relative p-6">
        <button
          type="button"
          onClick={cerrarDetalle}
          aria-label="Cerrar detalle"
          autoFocus
          className="absolute right-3 top-3 rounded-full
            bg-rose-100 p-2 text-rose-900
            hover:bg-rose-200"
        >
          <X size={22} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">

          {/* Imagen del producto */}
          <div
            className="h-64 md:h-full min-h-64
              bg-rose-100 rounded-xl overflow-hidden
              flex items-center justify-center"
          >
            {!hayErrorImagen ? (
              <img
                src={producto.imagen}
                alt={producto.nombre}
                onError={() => setHayErrorImagen(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-semibold text-rose-700">
                {producto.categoria}
              </span>
            )}
          </div>

          {/* Información del producto */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-rose-700">
              {producto.categoria}
            </p>

            <h2
              id="titulo-detalle"
              className="text-3xl font-bold text-rose-900"
            >
              {producto.nombre}
            </h2>

            <p className="text-stone-600">
              {producto.descripcion}
            </p>

            <p className="text-2xl font-bold text-rose-800">
              {FORMATO_MONEDA.format(producto.precio)} MXN
            </p>

            <p
              className={
                hayExistencias
                  ? 'text-green-700 font-medium'
                  : 'text-red-700 font-medium'
              }
            >
              {hayExistencias
                ? `Disponibles para agregar: ${disponibles} unidades`
                : producto.stock === 0 ? 'Producto agotado' : 'Límite en carrito'}
            </p>
            <p aria-live="polite" className="text-sm text-stone-600">En carrito: {cantidadEnCarrito}</p>

            {/* Selector de cantidad */}
            <div>
              <p className="font-semibold mb-2">Cantidad</p>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={disminuirCantidad}
                  disabled={!hayExistencias || cantidad <= CANTIDAD_MINIMA}
                  aria-label="Disminuir cantidad"
                  className="rounded-lg border border-rose-200
                    p-2 hover:bg-rose-100
                    disabled:opacity-40
                    disabled:cursor-not-allowed"
                >
                  <Minus size={20} />
                </button>

                <span
                  aria-live="polite"
                  className="text-lg font-bold min-w-8 text-center"
                >
                  {cantidad}
                </span>

                <button
                  type="button"
                  onClick={aumentarCantidad}
                  disabled={!hayExistencias || cantidad >= disponibles}
                  aria-label="Aumentar cantidad"
                  className="rounded-lg border border-rose-200
                    p-2 hover:bg-rose-100
                    disabled:opacity-40
                    disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="border-t border-rose-100 pt-4">
              <p className="text-sm text-stone-600">
                Subtotal
              </p>

              <p
                aria-live="polite"
                className="text-2xl font-bold text-rose-900"
              >
                {FORMATO_MONEDA.format(subtotal)}
              </p>
            </div>

            {/* RF05: agregar unidades adicionales */}
            {puedeComprar ? (
<button
              type="button"
              disabled={!hayExistencias || cantidad < 1}
              onClick={agregarSeleccion}
              className="flex items-center justify-center gap-2
                w-full rounded-lg bg-rose-700 py-3 text-white
                hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={20} />
              {hayExistencias
                ? 'Agregar al carrito'
                : producto.stock === 0 ? 'Producto agotado' : 'Límite en carrito'}
            </button>
) : (
<p className="text-sm text-rose-700" role="status">
          {usuario ? 'Solo los clientes pueden comprar.' : 'Inicia sesión para agregar productos.'}
        </p>
)}
          </div>
        </div>
      </div>
    </dialog>
  );
}

// ===== Exportaciones =====
export default DetalleProducto;
```

## Explicación de la integración

AuthProvider comparte el perfil; RutaProtegida utiliza Outlet para permitir únicamente el rol autorizado. El proveedor del carrito se monta de nuevo al cambiar de correo mediante key: evita mostrar datos de otra cuenta y permite conservar el carrito propio en localStorage. Los botones de compra se sustituyen por un aviso cuando no hay permiso; el enlace de inicio de sesión está en el encabezado (cierra el modal primero). El proveedor añade una segunda comprobación local. Ninguna de estas comprobaciones reemplaza la autorización del servidor.

## Ejecución y pruebas

```bash
cd /c/6to/reposteria-web/frontend
npm run dev
```

Cuentas de prueba: cliente@demo.mx / Cliente123; admin@demo.mx / Admin1234; produccion@demo.mx / Produccion123.

| Prueba | Resultado esperado |
|---|---|
| RF01: registro con correo inválido, clave débil o confirmación distinta | Rechazo |
| RF01: registrar correo demo existente | Rechazo |
| RF01: registrar nuevo correo ficticio y acceder sin recargar | Acceso como Cliente |
| RF02: contraseña incorrecta | Mensaje de error |
| RF02: acceso cliente | Catálogo |
| RF02: acceso admin y producción | Panel correspondiente |
| RF05: visitante abre catálogo y detalle | Puede consultar, no comprar |
| RF05: visitante visita /carrito | Redirección al login, luego carrito si es cliente |
| Permisos: cliente visita /admin o /produccion | Acceso no autorizado |
| Permisos: admin visita /produccion o /carrito | Acceso no autorizado |
| RF05: cliente agrega desde tarjeta y modal | Contador y disponibilidad actualizados |
| RF06/RF07: cambiar cantidades y abrir detalle desde carrito | Total actualizado, detalle funcional |
| RF18: cerrar sesión y acceder al carrito | Solicita acceso |
| Cambiar entre dos cuentas cliente ficticias | Carritos independientes |
| Recargar con cliente demo | Sesión y carrito conservados |
| Cerrar sesión y entrar nuevamente como cliente demo | Recupera su carrito |
| Recargar tras registro temporal, cerrar sesión | Cuenta temporal ya no está disponible; registrar nuevamente |
| Navegación a URL inexistente | NotFound |

Detén el servidor con Ctrl+C y ejecuta `npm run build`. El resultado esperado es una compilación sin errores. Las pruebas todavía deben ejecutarse en tu equipo. La longitud de algunos componentes JSX supera la recomendación A8; se prioriza conservar los componentes existentes y se podrá refactorizar después.

## Registro en Git

Desde la raíz del repositorio:

```bash
cd /c/6to/reposteria-web
git status
git add frontend/src/data/usuariosDemo.js
git add frontend/src/context/authContext.js
git add frontend/src/hooks/useAuth.js
git add frontend/src/context/AuthProvider.jsx
git add frontend/src/components/RutaProtegida.jsx
git add frontend/src/pages/Login.jsx
git add frontend/src/pages/Registro.jsx
git add frontend/src/pages/PanelRol.jsx
git add frontend/src/App.jsx
git add frontend/src/services/carritoServicio.js
git add frontend/src/context/CarritoProvider.jsx
git add frontend/src/main.jsx
git add frontend/src/components/Header.jsx
git add frontend/src/components/ProductCard.jsx
git add frontend/src/components/DetalleProducto.jsx
git add docs/JORNADA_06.md
git diff --cached --stat
git commit -m "Implementar autenticacion y roles (RF01 RF02 RF18 RF05)"
git push origin main
```

## Siguiente jornada

Diseñar la base de datos SQL Server y preparar la transición de cuentas ficticias a autenticación real. No utilizar este prototipo como sistema de producción.
