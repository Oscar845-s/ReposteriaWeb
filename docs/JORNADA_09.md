# JORNADA 09 — Integración frontend y backend

Objetivo: RF03–RF07. Consumir SQL Server mediante la API de Jornada 8, conservando autenticación simulada y carrito local por cuenta. No se confirma ningún pedido ni se reserva inventario.

## 1. Preparación

Desde Git Bash, raíz del repositorio: `git status`. Mantén backend (`cd backend; npm run dev`) y frontend (`cd frontend; npm run dev`, desde raíz en otra terminal) activos. No instales dependencias.

## 2. Imágenes y descripciones

Tu carpeta public solo contiene favicon.svg e icons.svg: las ocho imágenes originales no están ahí. Crea `frontend/public/images` y copia tus JPG originales si los tienes, o imágenes propias con los nombres siguientes. Mientras tanto se mostrará la categoría como alternativa. Conservamos las categorías de SQL (Pan dulce) y no alteramos stock ni precio.

### `database/04_catalogo_imagenes.sql`

Crear o reemplazar el archivo completo:

```sql
-- Nombre: Oscar Armando Medina Gutiérrez
-- Materia: Verificación y Validación de Software
-- Programa: 04_catalogo_imagenes.sql
-- Descripción: Actualizar metadatos de los productos iniciales.
-- Requerimiento: RF03, RF04
-- Fecha: 20 de noviembre de 2026
USE DulceHogar;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
UPDATE p SET p.nombre = v.nombre, p.descripcion = v.descripcion, p.imagen = v.imagen
FROM dbo.Productos p JOIN (VALUES
(1, N'Pastel de chocolate', N'Pastel esponjoso con cobertura de chocolate.', N'/images/pastel-chocolate.jpg'),
(2, N'Pastel de fresa', N'Pastel de vainilla con fresas frescas.', N'/images/pastel-fresa.jpg'),
(3, N'Concha de vainilla', N'Pan dulce tradicional con cubierta de vainilla.', N'/images/concha.jpg'),
(4, N'Croissant de mantequilla', N'Pan hojaldrado recién horneado.', N'/images/croissant.jpg'),
(5, N'Galletas con chispas', N'Galletas suaves con chispas de chocolate.', N'/images/galletas.jpg'),
(6, N'Brownie', N'Brownie de chocolate intenso.', N'/images/brownie.jpg'),
(7, N'Cheesecake', N'Rebanada de cheesecake clásico.', N'/images/cheesecake.jpg'),
(8, N'Roles de canela', N'Rol suave con glaseado dulce.', N'/images/rol-canela.jpg')
) v(idProducto,nombre,descripcion,imagen) ON p.idProducto = v.idProducto;
IF @@ROWCOUNT <> 8
BEGIN
  ROLLBACK;
  THROW 50001, 'No se encontraron los ocho productos iniciales.', 1;
END;
COMMIT;
SELECT * FROM dbo.vwCatalogo ORDER BY idProducto;
GO
```

Ejecuta este script en SSMS una vez y guarda el archivo en database. Se usan los IDs comprobados en Jornada 8. No vuelvas a ejecutar 01 ni 02. Para una instalación nueva ejecuta 01, 02 y 04 en orden.

## 3. Servicio y contexto compartido

El contexto descarga productos y categorías una sola vez por montaje, permite actualizar y comparte datos con carrito y catálogo. Si falla, bloquea nuevas compras y conserva las cantidades locales.


### `frontend/src/services/catalogoServicio.js`

Crear o reemplazar el archivo completo:

```js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: catalogoServicio.js
// Descripción: Consultar API REST.
// Requerimiento: RF03, RF04, RF05, RF06, RF07
// Fecha: 20 de noviembre de 2026
const URL_API = 'http://localhost:3000/api';

// Recibe ruta y señal; devuelve JSON o lanza un error.
async function consultar(ruta, signal) {
  const respuesta = await fetch(`${URL_API}${ruta}`, { signal });
  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }
  return respuesta.json();
}

export function consultarCatalogo(signal) {
  return Promise.all([
    consultar('/productos', signal), consultar('/categorias', signal),
  ]);
}
```


### `frontend/src/context/catalogoContext.js`

Crear o reemplazar el archivo completo:

```js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: catalogoContext.js
// Descripción: Declarar contexto.
// Requerimiento: RF03, RF04, RF05, RF06, RF07
// Fecha: 20 de noviembre de 2026
import { createContext } from 'react';
export const CatalogoContext = createContext(null);
```


### `frontend/src/hooks/useCatalogo.js`

Crear o reemplazar el archivo completo:

```js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: useCatalogo.js
// Descripción: Consultar contexto compartido.
// Requerimiento: RF03, RF04, RF05, RF06, RF07
// Fecha: 20 de noviembre de 2026
import { useContext } from 'react';
import { CatalogoContext } from '../context/catalogoContext';
export function useCatalogo() {
  return useContext(CatalogoContext);
}
```


### `frontend/src/context/CatalogoProvider.jsx`

Crear o reemplazar el archivo completo:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CatalogoProvider.jsx
// Descripción: Compartir catálogo remoto.
// Requerimiento: RF03, RF04, RF05, RF06, RF07
// Fecha: 20 de noviembre de 2026
import { useEffect, useState } from 'react';
import { CatalogoContext } from './catalogoContext';
import { consultarCatalogo } from '../services/catalogoServicio';

export default function CatalogoProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState({ productos: [], categorias: [], version: -1, error: '' });
  useEffect(() => {
    const controlador = new AbortController();
    consultarCatalogo(controlador.signal).then(([productos, categorias]) => {
      if (!controlador.signal.aborted) {
        setDatos({ productos, categorias, version, error: '' });
      }
    }).catch(() => {
      if (!controlador.signal.aborted) {
        setDatos(anterior => ({ ...anterior, version, error: 'No se pudo consultar la API.' }));
      }
    });
    return () => controlador.abort();
  }, [version]);
  const cargando = datos.version !== version;
  const listo = !cargando && !datos.error;
  return <CatalogoContext.Provider value={{ ...datos, cargando, listo,
    actualizar: () => setVersion(v => v + 1) }}>{children}</CatalogoContext.Provider>;
}
```


### `frontend/src/services/carritoServicio.js`

Crear o reemplazar el archivo completo:

```js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: carritoServicio.js
// Descripción: Gestiona cantidades y persistencia local del carrito.
// Requerimiento: RF05, RF06, RF07 / CU-07, CU-08, CU-11, CU-12
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====


// ===== Constantes =====
const CLAVE_CARRITO = 'dulce-hogar-carrito-v1';
const CANTIDAD_MINIMA = 1;

// ===== Funciones =====
// Recibe un ID; devuelve el producto registrado o undefined.
export function obtenerProducto(idProducto, productos) {
  return productos.find(producto => producto.id === idProducto);
}

// Recibe ID y cantidad; devuelve si la cantidad cumple RF05 y CU-11.
export function validarCantidad(idProducto, cantidad, productos) {
  const producto = obtenerProducto(idProducto, productos);
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
      if (!item || !Number.isInteger(item.idProducto) ||
          !Number.isInteger(item.cantidad) || item.cantidad < 1 ||
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
export function obtenerDetalles(items, productos) {
  return items.flatMap(item => {
    const producto = obtenerProducto(item.idProducto, productos);
    if (!producto || !producto.stock) { return []; }
    const cantidad = Math.min(item.cantidad, producto.stock);
    return [{ ...item, cantidad, producto, subtotal: producto.precio * cantidad }];
  });
}
```


### `frontend/src/context/CarritoProvider.jsx`

Crear o reemplazar el archivo completo:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CarritoProvider.jsx
// Descripción: Centraliza las operaciones y el estado del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { useReducer, useEffect, useState } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';
import { CarritoContext } from './carritoContext';
import {
  cargarCarrito, guardarCarrito, validarCantidad, obtenerDetalles,
} from '../services/carritoServicio';

// ===== Funciones =====
// Recibe estado y acción; devuelve el nuevo estado sin efectos secundarios.
function reducirCarrito(estado, accion) {
  if (accion.tipo === 'SINCRONIZAR') {
    return { ...estado, items: obtenerDetalles(estado.items, accion.productos)
      .map(({ idProducto, cantidad }) => ({ idProducto, cantidad })) };
  }
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
      !validarCantidad(idProducto, nuevaCantidad, accion.productos)) {
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
  const { productos, listo } = useCatalogo();
  const [estado, dispatch] = useReducer(reducirCarrito, null, () => ({
    items: cargarCarrito(correo), mensaje: '',
  }));
  const [hayErrorGuardado, setHayErrorGuardado] = useState(false);
  useEffect(() => {
    if (listo) {
      dispatch({ tipo: 'SINCRONIZAR', productos });
    }
  }, [listo, productos]);
  useEffect(() => {
    if (listo) {
      const ajustados = obtenerDetalles(estado.items, productos)
        .map(({ idProducto, cantidad }) => ({ idProducto, cantidad }));
      setHayErrorGuardado(!guardarCarrito(ajustados, correo));
    }
  }, [estado.items, correo, listo, productos]);

  const detalles = obtenerDetalles(estado.items, productos);
  const total = detalles.reduce((suma, item) => suma + item.subtotal, 0);
  const cantidadTotal = detalles.reduce((suma, item) => suma + item.cantidad, 0);

  const valor = {
    detalles, total, cantidadTotal, mensaje: estado.mensaje, hayErrorGuardado,
    agregarAlCarrito: (idProducto, cantidad = 1) =>
      correo && listo && dispatch({ tipo: 'AGREGAR', idProducto, cantidad, productos }),
    modificarCantidad: (idProducto, cantidad) =>
      correo && listo && dispatch({ tipo: 'MODIFICAR', idProducto, cantidad, productos }),
    eliminarProducto: idProducto => correo && listo && dispatch({ tipo: 'ELIMINAR', idProducto }),
    vaciarCarrito: () => correo && listo && dispatch({ tipo: 'VACIAR' }),
  };
  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}
```


### `frontend/src/main.jsx`

Crear o reemplazar el archivo completo:

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
import CatalogoProvider from './context/CatalogoProvider';
import { useCatalogo } from './hooks/useCatalogo';
import AuthProvider from './context/AuthProvider';
import CarritoProvider from './context/CarritoProvider';
import { useAuth } from './hooks/useAuth';
import { ROLES } from './data/usuariosDemo';
import './index.css';

// Monta un carrito independiente para cada cliente.
function AplicacionConCarrito() {
  const { usuario } = useAuth();
  const { listo, cargando, error, actualizar } = useCatalogo();
  if (!listo) {
    return <main className="p-8" role="status">
      {cargando ? 'Cargando catálogo...' : error}
      {!cargando && <button className="ml-4 underline" onClick={actualizar}>Reintentar</button>}
    </main>;
  }
  const correo = usuario?.rol === ROLES.CLIENTE ? usuario.correo : null;
  return (
    <CarritoProvider key={correo ?? 'sin-cliente'} correo={correo}>
      <button type="button" className="m-2 text-sm underline" onClick={actualizar}>
        Actualizar catálogo e inventario
      </button>
      <App />
    </CarritoProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><CatalogoProvider><AplicacionConCarrito />
      </CatalogoProvider></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```


### `frontend/src/pages/Catalogo.jsx`

Crear o reemplazar el archivo completo:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Catalogo.jsx
// Descripción: Presenta el catálogo, filtros y detalle de productos.
// Requerimiento: RF03, RF04 / CU-05, CU-06
// Fecha: 14 de noviembre de 2026

// ===== Importaciones =====
import { useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import DetalleProducto from '../components/DetalleProducto';
import { useCatalogo } from '../hooks/useCatalogo';

// ===== Constantes =====
const CATEGORIA_TODAS = 'Todas';



// ===== Funciones =====

/**
 * Muestra el catálogo y controla la consulta de productos.
 * Recibe: ningún parámetro.
 * Devuelve: página JSX del catálogo.
 */
function Catalogo() {
  const { productos, categorias } = useCatalogo();
  const CATEGORIAS = [CATEGORIA_TODAS, ...categorias.map(item => item.nombre)];
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIA_TODAS);

  const [productoSeleccionado, setProductoSeleccionado] =
    useState(null);

  const [mensajeError, setMensajeError] = useState('');

  // Filtra los productos cuando cambia la búsqueda o categoría.
  const filtrados = useMemo(() => {
    return productos.filter(producto => {
      const texto =
        `${producto.nombre} ${producto.descripcion}`
          .toLocaleLowerCase('es');

      const coincideTexto = texto.includes(
        busqueda.trim().toLocaleLowerCase('es')
      );

      const coincideCategoria =
        categoria === CATEGORIA_TODAS ||
        producto.categoria === categoria;

      return coincideTexto && coincideCategoria;
    });
  }, [busqueda, categoria, productos]);

  /**
   * Localiza el producto seleccionado y abre su detalle.
   * Recibe: identificador del producto.
   * Devuelve: ningún valor.
   */
  function abrirDetalle(idProducto) {
    setMensajeError('');

    const productoEncontrado = productos.find(
      producto => producto.id === idProducto
    );

    // CU-06, excepción E1: producto inexistente.
    if (!productoEncontrado) {
      setProductoSeleccionado(null);
      setMensajeError('El producto seleccionado ya no está disponible.');
      return;
    }

    setProductoSeleccionado(productoEncontrado);
  }

  /**
   * Cierra la ventana de detalle.
   * Recibe: ningún parámetro.
   * Devuelve: ningún valor.
   */
  function cerrarDetalle() {
    setProductoSeleccionado(null);
  }

  return (
    <section className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="text-4xl font-bold text-rose-900 mb-3">
        Nuestro catálogo
      </h1>

      <p className="text-stone-600 mb-8">
        Descubre los postres y panes de Dulce Hogar.
      </p>

      {/* Búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="search"
          aria-label="Buscar productos"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={evento => setBusqueda(evento.target.value)}
          className="w-full rounded-lg border border-rose-200
            bg-white p-3 outline-rose-600"
        />

        <select
          aria-label="Filtrar por categoría"
          value={categoria}
          onChange={evento => setCategoria(evento.target.value)}
          className="rounded-lg border border-rose-200
            bg-white p-3"
        >
          {CATEGORIAS.map(categoriaDisponible => (
            <option
              key={categoriaDisponible}
              value={categoriaDisponible}
            >
              {categoriaDisponible}
            </option>
          ))}
        </select>
      </div>

      {/* Mensajes de error */}
      {mensajeError && (
        <p
          role="alert"
          className="rounded-lg bg-red-100
            text-red-800 p-3 mb-5"
        >
          {mensajeError}
        </p>
      )}

      <p className="text-sm text-stone-600 mb-5">
        {filtrados.length} producto(s) encontrado(s)
      </p>

      {/* Listado de productos */}
      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2
          lg:grid-cols-3 gap-6">
          {filtrados.map(producto => (
            <ProductCard
              key={producto.id}
              product={producto}
              abrirDetalle={abrirDetalle}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-white p-8
          text-center text-stone-600">
          No se encontraron productos.
        </p>
      )}

      {/* Ventana modal del producto seleccionado */}
      {productoSeleccionado !== null && (
        <DetalleProducto
          key={productoSeleccionado.id}
          producto={productoSeleccionado}
          cerrarDetalle={cerrarDetalle}
        />
      )}
    </section>
  );
}

// ===== Exportaciones =====
export default Catalogo;
```


### `frontend/src/components/ProductCard.jsx`

Crear o reemplazar el archivo completo:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
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
        {product.imagen && !hayErrorImagen ? <img src={product.imagen} alt={product.nombre}
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


### `frontend/src/components/DetalleProducto.jsx`

Crear o reemplazar el archivo completo:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
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
            {producto.imagen && !hayErrorImagen ? (
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

## 4. Verificación de referencias y comportamiento

Ejecuta `grep -R -n 'data/products\|obtenerProducto\|validarCantidad' frontend/src` desde raíz. Los únicos consumidores esperados de las funciones de carrito son servicio y proveedor; si aparecen otros consumidores, revisarlos antes de eliminar el mock. Conserva products.js por ahora como referencia histórica, no como fuente activa. Home no requiere cambios. El carrito existente sigue recibiendo detalles con la misma estructura. El botón Actualizar recarga el catálogo y remonta la aplicación interna, conservando la sesión y el carrito guardado. Durante carga/error se bloquea toda la interfaz (decisión temporal para evitar compras con inventario desconocido). El detalle usa la instantánea de catálogo, no una nueva consulta individual. El stock se actualiza al recargar o pulsar Actualizar, no en tiempo real. Las cantidades guardadas superiores al nuevo stock se reducen; los productos agotados o retirados se eliminan del carrito al actualizar correctamente. No se borran carritos por fallo de red.

## 5. Pruebas

1. `curl -i http://localhost:3000/api/productos`: ocho rutas de imagen y descripciones actualizadas.
2. Abrir catálogo: ocho productos, cuatro categorías, filtro Pan dulce y búsqueda.
3. Abrir detalle y cerrar con Escape.
4. Imágenes presentes se muestran; si faltan, se muestra alternativa.
5. Cliente demo: agregar dos unidades desde tarjeta/modal, verificar subtotal y límite; Brownie agotado.
6. Modificar y eliminar desde carrito; recargar y comprobar persistencia.
7. Cerrar sesión y entrar con otra cuenta: carritos independientes.
8. Administrador y producción no pueden comprar.
9. En SSMS cambiar de forma temporal `UPDATE dbo.Productos SET precio = 321 WHERE idProducto = 1;` y pulsar Actualizar: debe mostrarse 321 en catálogo y carrito. Restaurar a 320.
10. Agregar dos unidades del producto 1; cambiar stock temporalmente a 1, actualizar y verificar reducción a una unidad. Restaurar stock a 8. Estas pruebas son únicamente sobre datos de desarrollo y no representan movimientos comerciales reales.
11. Detener backend con Ctrl+C; recargar: mensaje de error; iniciar backend y pulsar Reintentar: datos y carrito recuperados.
12. Desde frontend ejecutar `npm run build` y `npm run lint`; reportar errores existentes o nuevos. No se han ejecutado estas pruebas en tu equipo desde este documento.

## 6. Git

Desde raíz:
```bash
git status
git add frontend/src database/04_catalogo_imagenes.sql docs/JORNADA_09.md
# Si agregaste imágenes propias:
# git add frontend/public/images
git diff --cached --stat
git commit -m "Integrar catalogo y carrito con API REST (RF03, RF04, RF05, RF06, RF07)"
git push origin main
```
No subir .env ni node_modules. Próxima jornada: autenticación real y pedidos; el orden puede ajustarse para asegurar que los pedidos estén asociados a usuarios reales.
