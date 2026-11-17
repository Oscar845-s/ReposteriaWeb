# Jornada 5 — Carrito de compras

**Proyecto:** ReposteriaWeb / Dulce Hogar  
**Tecnologías:** React, Vite, Tailwind CSS, Context API, localStorage  
**Objetivo:** Implementar un carrito compartido con validación de existencias, cantidades y totales.

## 1. Alcance

- RF05 / CU-07: agregar productos desde tarjetas y detalle.
- RF06 / CU-08: modificar cantidades y eliminar productos.
- RF07 / CU-12: calcular subtotales y total.
- CU-11: comprobar existencias acumuladas.
- Mostrar contador en el encabezado y persistir el carrito localmente.

**Limitación:** CU-07 exige sesión iniciada. Esta jornada es un prototipo local que permite probar el carrito sin autenticación; se aplicará esa precondición en la Jornada 6. No se descuenta inventario al agregar al carrito. RF08 y RF17 se implementarán al confirmar pedidos en el backend. localStorage no es una fuente confiable de inventario ni precios; el servidor deberá verificarlos.

## 2. Archivos

```text
frontend/src/services/carritoServicio.js (nuevo)
frontend/src/context/carritoContext.js   (nuevo)
frontend/src/context/CarritoProvider.jsx (nuevo)
frontend/src/hooks/useCarrito.js        (nuevo)
frontend/src/main.jsx                   (modificar)
frontend/src/components/Header.jsx      (modificar)
frontend/src/components/ProductCard.jsx (modificar)
frontend/src/components/DetalleProducto.jsx (modificar)
frontend/src/pages/Carrito.jsx          (modificar)
docs/JORNADA_05.md                      (este documento)
```

Desde Git Bash:

```bash
cd /c/6to/reposteria-web
mkdir -p frontend/src/{services,context,hooks}
touch frontend/src/services/carritoServicio.js frontend/src/context/carritoContext.js frontend/src/context/CarritoProvider.jsx frontend/src/hooks/useCarrito.js
```

No instalar dependencias. Catalogo.jsx, App.jsx y products.js permanecen sin cambios.

## 3. Servicio — `frontend/src/services/carritoServicio.js`

```javascript
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: carritoServicio.js
// Descripción: Gestiona cantidades y persistencia local del carrito.
// Requerimiento: RF05, RF06, RF07 / CU-07, CU-08, CU-11, CU-12
// Fecha: 16 de noviembre de 2026

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
export function cargarCarrito() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || '[]');
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
export function guardarCarrito(items) {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
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

Solo se guardan identificadores y cantidades, no copias del precio. Al cargar se eliminan registros inválidos o agotados.

## 4. Contexto — `frontend/src/context/carritoContext.js`

```javascript
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: carritoContext.js
// Descripción: Define el contexto compartido del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { createContext } from 'react';

// ===== Exportaciones =====
export const CarritoContext = createContext(null);
```

## 5. Proveedor — `frontend/src/context/CarritoProvider.jsx`

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CarritoProvider.jsx
// Descripción: Centraliza las operaciones y el estado del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 16 de noviembre de 2026

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
export default function CarritoProvider({ children }) {
  const [estado, dispatch] = useReducer(reducirCarrito, null, () => ({
    items: cargarCarrito(), mensaje: '',
  }));
  const [hayErrorGuardado, setHayErrorGuardado] = useState(false);
  useEffect(() => {
    setHayErrorGuardado(!guardarCarrito(estado.items));
  }, [estado.items]);

  const detalles = obtenerDetalles(estado.items);
  const total = detalles.reduce((suma, item) => suma + item.subtotal, 0);
  const cantidadTotal = estado.items.reduce((suma, item) => suma + item.cantidad, 0);

  const valor = {
    detalles, total, cantidadTotal, mensaje: estado.mensaje, hayErrorGuardado,
    agregarAlCarrito: (idProducto, cantidad = 1) =>
      dispatch({ tipo: 'AGREGAR', idProducto, cantidad }),
    modificarCantidad: (idProducto, cantidad) =>
      dispatch({ tipo: 'MODIFICAR', idProducto, cantidad }),
    eliminarProducto: idProducto => dispatch({ tipo: 'ELIMINAR', idProducto }),
    vaciarCarrito: () => dispatch({ tipo: 'VACIAR' }),
  };
  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}
```

`useReducer` procesa cada operación con el estado más reciente, incluso si se pulsa rápidamente varias veces. `useEffect` guarda después de cambiar los items. El reducer permanece puro para funcionar correctamente con StrictMode. El contador suma unidades, no productos distintos.

## 6. Hook — `frontend/src/hooks/useCarrito.js`

```javascript
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: useCarrito.js
// Descripción: Permite acceder al contexto compartido del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { useContext } from 'react';
import { CarritoContext } from '../context/carritoContext';

// ===== Funciones =====
// No recibe argumentos; devuelve el contexto del carrito.
export function useCarrito() {
  const contexto = useContext(CarritoContext);
  if (!contexto) {
    throw new Error('useCarrito requiere CarritoProvider.');
  }
  return contexto;
}
```

## 7. Punto de entrada — `frontend/src/main.jsx`

Reemplazar por:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: main.jsx
// Descripción: Inicializa React, navegación y contexto del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import CarritoProvider from './context/CarritoProvider';
import './index.css';

// ===== Inicialización =====
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CarritoProvider>
        <App />
      </CarritoProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

## 8. Encabezado — `frontend/src/components/Header.jsx`

Reemplazar por:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Header.jsx
// Descripción: Navegación y contador de unidades del carrito.
// Requerimiento: RF05, RF06
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { CakeSlice, ShoppingCart, UserRound } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useCarrito } from '../hooks/useCarrito';

// ===== Funciones =====
// Recibe el estado de navegación; devuelve las clases del enlace.
const obtenerClaseEnlace = ({ isActive }) =>
  `hover:text-rose-700 ${isActive ? 'text-rose-700 font-semibold' : 'text-stone-700'}`;

// No recibe parámetros; devuelve el encabezado del sitio.
export default function Header() {
  const { cantidadTotal, mensaje, hayErrorGuardado } = useCarrito();
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
          <NavLink to="/carrito" className={obtenerClaseEnlace}
            aria-label={`Carrito: ${cantidadTotal} unidades`}>
            <span className="relative inline-flex">
              <ShoppingCart aria-hidden="true" />
              <span className="absolute -top-2 -right-3 rounded-full bg-rose-700
                text-white text-xs px-1.5">{cantidadTotal}</span>
            </span>
          </NavLink>
          <NavLink to="/login" className={obtenerClaseEnlace} aria-label="Iniciar sesión">
            <UserRound aria-hidden="true" />
          </NavLink>
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

## 9. Tarjeta — `frontend/src/components/ProductCard.jsx`

Reemplazar por:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: ProductCard.jsx
// Descripción: Presenta el producto y permite agregar una unidad al carrito.
// Requerimiento: RF03, RF04, RF05
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { useState } from 'react';
import { Eye } from 'lucide-react';
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
  const cantidadEnCarrito = detalles.find(item => item.idProducto === product.id)?.cantidad ?? 0;
  const hayExistencias = product.stock > 0;
  const sePuedeAgregar = cantidadEnCarrito < product.stock;
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
        <p className={hayExistencias ? 'text-green-700 text-sm' : 'text-red-700 text-sm'}>
          {hayExistencias ? `Disponibles: ${product.stock}` : 'Agotado'}
        </p>
        <button type="button" onClick={() => abrirDetalle(product.id)}
          className="flex items-center justify-center gap-2 w-full rounded-lg border
            border-rose-600 text-rose-700 py-2 hover:bg-rose-50">
          <Eye size={18} /> Ver detalle
        </button>
        <button type="button" disabled={!sePuedeAgregar}
          onClick={() => agregarAlCarrito(product.id)}
          className="w-full rounded-lg bg-rose-700 text-white py-2
            hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed">
          {!hayExistencias ? 'Producto agotado' : sePuedeAgregar
            ? 'Agregar al carrito' : 'Límite en carrito'}
        </button>
      </div>
    </article>
  );
}
```

## 10. Modal — `frontend/src/components/DetalleProducto.jsx`

Reemplazar por esta versión que conserva el diálogo y limita la cantidad a las unidades que todavía pueden agregarse.

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: DetalleProducto.jsx
// Descripción: Consulta producto y agrega cantidades válidas al carrito.
// Requerimiento: RF04, RF05 / CU-06, CU-07, CU-11
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCarrito } from '../hooks/useCarrito';

// ===== Constantes =====
const CANTIDAD_MINIMA = 1;
const FORMATO_MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});

// ===== Funciones =====
// Recibe producto y función de cierre; devuelve el diálogo del producto.
export default function DetalleProducto({ producto, cerrarDetalle }) {
  const dialogo = useRef(null);
  const [hayErrorImagen, setHayErrorImagen] = useState(false);
  const [cantidad, setCantidad] = useState(CANTIDAD_MINIMA);
  const { detalles, agregarAlCarrito } = useCarrito();
  const cantidadEnCarrito = detalles.find(item => item.idProducto === producto.id)?.cantidad ?? 0;
  const cantidadDisponible = Math.max(0, producto.stock - cantidadEnCarrito);
  const cantidadSeleccionada = Math.min(cantidad, cantidadDisponible);
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

  // No recibe argumentos; agrega la selección y cierra el detalle.
  function agregarSeleccion() {
    if (cantidadSeleccionada >= CANTIDAD_MINIMA) {
      agregarAlCarrito(producto.id, cantidadSeleccionada);
      cerrarDetalle();
    }
  }

  return (
    <dialog ref={dialogo} aria-labelledby="titulo-detalle"
      onCancel={evento => { evento.preventDefault(); cerrarDetalle(); }}
      className="fixed inset-0 m-auto w-[92%] max-w-3xl max-h-[90vh]
        overflow-y-auto rounded-2xl bg-white p-0 text-stone-800 shadow-2xl backdrop:bg-black/60">
      <div className="relative p-6">
        <button type="button" onClick={cerrarDetalle} aria-label="Cerrar detalle" autoFocus
          className="absolute right-3 top-3 rounded-full bg-rose-100 p-2 text-rose-900">
          <X size={22} />
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
          <div className="h-64 md:h-full min-h-64 bg-rose-100 rounded-xl
            overflow-hidden flex items-center justify-center">
            {!hayErrorImagen ? <img src={producto.imagen} alt={producto.nombre}
              onError={() => setHayErrorImagen(true)} className="w-full h-full object-cover" />
              : <span className="text-rose-700">{producto.categoria}</span>}
          </div>
          <div className="space-y-4">
            <p className="text-rose-700">{producto.categoria}</p>
            <h2 id="titulo-detalle" className="text-3xl font-bold text-rose-900">
              {producto.nombre}
            </h2>
            <p>{producto.descripcion}</p>
            <p className="text-2xl font-bold">{FORMATO_MONEDA.format(producto.precio)} MXN</p>
            <p>{producto.stock > 0 ? `Existencias: ${producto.stock}` : 'Producto agotado'}</p>
            <p className="text-sm">En carrito: {cantidadEnCarrito} · Puedes agregar: {cantidadDisponible}</p>
            <p className="font-semibold">Cantidad</p>
            <div className="flex items-center gap-4">
              <button type="button" aria-label="Disminuir cantidad"
                disabled={cantidadSeleccionada <= CANTIDAD_MINIMA}
                onClick={() => setCantidad(cantidadSeleccionada - 1)}
                className="rounded-lg border border-rose-200 p-2 disabled:opacity-40">
                <Minus size={20} />
              </button>
              <span aria-live="polite">{cantidadSeleccionada}</span>
              <button type="button" aria-label="Aumentar cantidad"
                disabled={cantidadSeleccionada >= cantidadDisponible}
                onClick={() => setCantidad(cantidadSeleccionada + 1)}
                className="rounded-lg border border-rose-200 p-2 disabled:opacity-40">
                <Plus size={20} />
              </button>
            </div>
            <p className="text-xl font-bold text-rose-900">
              Subtotal: {FORMATO_MONEDA.format(producto.precio * cantidadSeleccionada)}
            </p>
            <button type="button" disabled={cantidadSeleccionada === 0}
              onClick={agregarSeleccion}
              className="flex items-center justify-center gap-2 w-full rounded-lg
                bg-rose-700 text-white py-3 disabled:opacity-50 disabled:cursor-not-allowed">
              <ShoppingCart size={20} />
              {cantidadDisponible > 0 ? 'Agregar al carrito' : 'Sin unidades para agregar'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
```

## 11. Página — `frontend/src/pages/Carrito.jsx`

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Carrito.jsx
// Descripción: Muestra productos, modifica cantidades y calcula importes.
// Requerimiento: RF06, RF07 / CU-08, CU-12
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCarrito } from '../hooks/useCarrito';

// ===== Constantes =====
const FORMATO_MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});
const CANTIDAD_MINIMA = 1;

// ===== Funciones =====
// Recibe un item; devuelve su fila con controles de modificación.
function FilaCarrito({ item }) {
  const { modificarCantidad, eliminarProducto } = useCarrito();
  const { producto, cantidad, subtotal, idProducto } = item;
  return (
    <article className="rounded-xl bg-white border border-rose-100 p-4 flex flex-wrap gap-4
      items-center justify-between">
      <div className="flex-1 min-w-40">
        <h2 className="font-bold text-rose-900">{producto.nombre}</h2>
        <p className="text-sm">{FORMATO_MONEDA.format(producto.precio)} MXN / unidad</p>
        <p className="text-sm">Existencias: {producto.stock}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" disabled={cantidad <= CANTIDAD_MINIMA}
          aria-label={`Disminuir ${producto.nombre}`}
          onClick={() => modificarCantidad(idProducto, cantidad - 1)}
          className="border border-rose-200 rounded-lg p-2 disabled:opacity-40">
          <Minus size={18} />
        </button>
        <span aria-live="polite">{cantidad}</span>
        <button type="button" disabled={cantidad >= producto.stock}
          aria-label={`Aumentar ${producto.nombre}`}
          onClick={() => modificarCantidad(idProducto, cantidad + 1)}
          className="border border-rose-200 rounded-lg p-2 disabled:opacity-40">
          <Plus size={18} />
        </button>
      </div>
      <p className="font-bold">{FORMATO_MONEDA.format(subtotal)}</p>
      <button type="button" aria-label={`Eliminar ${producto.nombre}`}
        onClick={() => eliminarProducto(idProducto)} className="text-red-700 p-2">
        <Trash2 size={20} />
      </button>
    </article>
  );
}

// No recibe argumentos; devuelve la página del carrito.
export default function Carrito() {
  const { detalles, total, vaciarCarrito } = useCarrito();
  return (
    <section className="max-w-6xl mx-auto px-5 py-14 space-y-6">
      <h1 className="text-3xl font-bold text-rose-950">Carrito de compras</h1>
      {detalles.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center">Tu carrito está vacío.</div>
      ) : (
        <div className="space-y-4">
          {detalles.map(item => <FilaCarrito key={item.idProducto} item={item} />)}
          <button type="button" onClick={vaciarCarrito} className="text-red-700 underline">
            Vaciar carrito
          </button>
        </div>
      )}
      <div className="rounded-xl bg-white border border-rose-100 p-6 space-y-4">
        <p className="text-2xl font-bold text-rose-900" aria-live="polite">
          Total: {FORMATO_MONEDA.format(total)} MXN
        </p>
        <button type="button" disabled className="w-full rounded-lg bg-rose-200 py-3
          text-rose-900 cursor-not-allowed">Confirmar pedido (próximamente)</button>
      </div>
      <Link to="/catalogo" className="text-rose-700 underline">Seguir comprando</Link>
    </section>
  );
}
```

## 12. Ejecución y pruebas

```bash
cd /c/6to/reposteria-web/frontend
npm run dev
```

Abrir `/catalogo` y realizar las pruebas. Iniciar con el carrito vacío.

| ID | Requisito | Prueba | Resultado esperado |
|---|---|---|---|
| CP05-01 | RF05 | Agregar pastel de chocolate desde tarjeta | Una unidad, $320, contador 1 |
| CP05-02 | RF05 | Agregar dos unidades del mismo pastel desde detalle | Tres unidades en una fila, $960 |
| CP05-03 | RF05 | Agregar hasta completar ocho pasteles | No permite superar 8 |
| CP05-04 | CU-11 | Abrir detalle con ocho pasteles en carrito | Cantidad 0, agregar deshabilitado |
| CP05-05 | RF05 | Consultar Brownie agotado | No permite agregar |
| CP05-06 | RF06 | Reducir cantidad hasta uno | No permite bajar de uno |
| CP05-07 | RF06 | Eliminar única fila | Carrito vacío y total cero |
| CP05-08 | RF07 | Agregar un pastel de chocolate y tres galletas | Total $395, contador 4 |
| CP05-09 | RF05 | Recargar página | Se conservan cantidades |
| CP05-10 | RF06 | Vaciar y recargar | Carrito permanece vacío |
| CP05-11 | RF04 | Cerrar detalle con X o Escape | Conserva filtros y catálogo |
| CP05-12 | RF05 | Pulsar repetidamente Agregar | Nunca supera stock |
| CP05-13 | RF07 | Consultar en pantalla pequeña | Controles y total visibles |

Para comprobar datos locales dañados, con el carrito vacío ejecutar en la consola del navegador `localStorage.setItem('dulce-hogar-carrito-v1', 'JSON invalido')` y recargar. Debe abrir sin errores y mostrar carrito vacío. No hacer esta prueba sobre datos que se quieran conservar.

Detener Vite con Ctrl+C y ejecutar:

```bash
npm run build
npm run lint
```

Ejecutar lint solo si el script existe en package.json. Registrar los resultados reales; las pruebas anteriores todavía no están ejecutadas. El estándar A8 se aplica a encabezados, nombres, sangría y reglas de negocio; algunos componentes JSX superan la longitud recomendada de 40 líneas y podrán dividirse en una revisión posterior.

## 13. Registro en Git

Guardar este documento como `docs/JORNADA_05.md`. Después de las pruebas:

```bash
cd /c/6to/reposteria-web
git status
git add frontend/src/services/carritoServicio.js frontend/src/context/carritoContext.js
git add frontend/src/context/CarritoProvider.jsx frontend/src/hooks/useCarrito.js
git add frontend/src/main.jsx frontend/src/components/Header.jsx
git add frontend/src/components/ProductCard.jsx frontend/src/components/DetalleProducto.jsx
git add frontend/src/pages/Carrito.jsx docs/JORNADA_05.md
git diff --cached --stat
git commit -m "Implementar carrito de compras (RF05, RF06, RF07)"
git push origin main
```

## 14. Siguiente jornada

Autenticación y roles: RF01, RF02, RF18 y preparación de RF19. Aplicar la precondición de sesión de CU-07 y separar los carritos por usuario antes de permitir compras reales. La autenticación segura y las validaciones definitivas requieren backend.

**Nota:** guía de implementación propuesta adaptada al código compartido; no certifica ejecución ni cumplimiento definitivo de los requisitos.
