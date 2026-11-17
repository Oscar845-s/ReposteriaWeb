# Jornada 5 — Correcciones del carrito

**Proyecto:** ReposteriaWeb / Dulce Hogar  
**Tecnologías:** React, Vite, Tailwind CSS, Context API  
**Objetivo:** Sincronizar disponibilidad y carrito, habilitar agregar desde el modal y consultar detalles desde el carrito.

## 1. Diagnóstico y alcance

- ProductCard ya calcula la cantidad en carrito, pero muestra el stock original.
- DetalleProducto conserva el botón deshabilitado de Jornada 4 y no consume el contexto.
- Carrito no monta el modal ni muestra fotografía, categoría o descripción.
- El reducer existente ya valida cantidades acumuladas; no se reemplaza. Tampoco se cambia el servicio, Header, main, catálogo o datos.
- Disponibilidad local = stock original menos unidades en carrito. No es una reserva real; RF17 descontará stock al confirmar el pedido en una jornada posterior. La autenticación y validación de servidor siguen pendientes.

## 2. Archivos

Desde la raíz del repositorio:

```bash
cd /c/6to/reposteria-web
```

Guarda este documento en `docs/JORNADA_05_CORRECCIONES.md`. Reemplaza completamente los tres archivos siguientes, conservando los demás.

## 3. `frontend/src/components/ProductCard.jsx`

```jsx
// Nombre: Oscar Armando Medina Gutiérrez// Materia: Verificación y Validación de Software
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

La tarjeta se vuelve a renderizar al cambiar el contexto. Muestra el saldo disponible y las unidades ya agregadas.

## 4. `frontend/src/components/DetalleProducto.jsx`

```jsx
// Nombre: Oscar Armando Medina Gutiérrez// Materia: Verificación y Validación de Software
// Programa: DetalleProducto.jsx
// Descripción: Muestra la información detallada de un producto.
// Requerimiento: RF04, RF05 / CU-06, CU-07
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
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
          </div>
        </div>
      </div>
    </dialog>
  );
}

// ===== Exportaciones =====
export default DetalleProducto;
```

El modal consume el mismo contexto. El selector se limita a unidades adicionales, no al stock original. Después de agregar, permanece abierto y reinicia la selección a una unidad (o cero si no quedan existencias). El contador En carrito confirma el cambio visible.

## 5. `frontend/src/pages/Carrito.jsx`

```jsx
// Nombre: Oscar Armando Medina Gutiérrez// Materia: Verificación y Validación de Software
// Programa: Carrito.jsx
// Descripción: Muestra productos, modifica cantidades y calcula importes.
// Requerimiento: RF06, RF07 / CU-08, CU-12
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { useState } from 'react';
import DetalleProducto from '../components/DetalleProducto';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Eye } from 'lucide-react';
import { useCarrito } from '../hooks/useCarrito';

// ===== Constantes =====
const FORMATO_MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});
const CANTIDAD_MINIMA = 1;

// ===== Funciones =====
// Recibe un item; devuelve su fila con controles de modificación.
function FilaCarrito({ item, abrirDetalle }) {
  const { modificarCantidad, eliminarProducto } = useCarrito();
  const { producto, cantidad, subtotal, idProducto } = item;
  const [hayErrorImagen, setHayErrorImagen] = useState(false);
  return (
    <article className="rounded-xl bg-white border border-rose-100 p-4 flex flex-wrap gap-4
      items-center justify-between">
      <div className="w-24 h-24 rounded-lg bg-rose-100 overflow-hidden
        flex items-center justify-center shrink-0">
        {hayErrorImagen ? <span className="text-xs">{producto.categoria}</span> : (
          <img src={producto.imagen} alt={producto.nombre}
            className="w-full h-full object-cover" onError={() => setHayErrorImagen(true)} />
        )}
      </div>
      <div className="flex-1 min-w-40">
        <p className="text-sm text-rose-700">{producto.categoria}</p>
        <h2 className="font-bold text-rose-900">{producto.nombre}</h2>
        <p className="text-sm">{FORMATO_MONEDA.format(producto.precio)} MXN / unidad</p>
        <p className="text-sm text-stone-600">{producto.descripcion}</p>
        <p className="text-sm">Disponibles para agregar: {Math.max(0, producto.stock - cantidad)}</p>
        <button type="button" onClick={() => abrirDetalle(producto)}
          className="flex items-center gap-2 text-rose-700 underline mt-2">
          <Eye size={18} /> Ver detalle
        </button>
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
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  return (
    <section className="max-w-6xl mx-auto px-5 py-14 space-y-6">
      <h1 className="text-3xl font-bold text-rose-950">Carrito de compras</h1>
      {detalles.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center">Tu carrito está vacío.</div>
      ) : (
        <div className="space-y-4">
          {detalles.map(item => <FilaCarrito key={item.idProducto} item={item}
             abrirDetalle={setProductoSeleccionado} />)}
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
      {productoSeleccionado && (
        <DetalleProducto key={productoSeleccionado.id} producto={productoSeleccionado}
          cerrarDetalle={() => setProductoSeleccionado(null)} />
      )}
    </section>
  );
}
```

Cada fila muestra la información resumida y abre el mismo modal del catálogo. Desde él se pueden agregar unidades adicionales. Los controles de fila modifican la cantidad total, no la cantidad adicional.

## 6. Ejecución y pruebas

```bash
cd /c/6to/reposteria-web/frontend
npm run dev
```

Abre `/catalogo`. Vacía primero el carrito para obtener resultados reproducibles.

| ID | Acción | Resultado esperado |
|---|---|---|
| CP05-C01 | Agregar un pastel de chocolate desde tarjeta | 1 en carrito, 7 disponibles |
| CP05-C02 | Abrir detalle y seleccionar 3 adicionales | Subtotal de $960; permite agregar |
| CP05-C03 | Agregar esas 3 unidades | 4 en carrito, 4 disponibles; total $1280 |
| CP05-C04 | Agregar las 4 restantes | 8 en carrito, 0 disponibles; botón bloqueado en ambos lugares |
| CP05-C05 | Abrir detalle desde carrito | Foto, descripción, categoría, precio y cantidad en carrito; agregar bloqueado al límite |
| CP05-C06 | Disminuir cantidad de 8 a 7 desde fila | 1 disponible en catálogo y modal |
| CP05-C07 | Eliminar pastel | 8 disponibles nuevamente |
| CP05-C08 | Consultar Brownie | Agotado, selector 0 y botón bloqueado |
| CP05-C09 | Agregar y recargar | Cantidades y disponibilidad conservadas |
| CP05-C10 | Vaciar carrito | Disponibilidad original de todos los productos |
| CP05-C11 | Cerrar modal con X y Escape | Regresa a la página de origen |
| CP05-C12 | Compilar | Sin errores |

Detén el servidor con Ctrl+C y ejecuta:

```bash
npm run build
npm run lint
```

Si el proyecto no tiene script lint, omite ese comando. Registra los resultados reales antes de cerrar la jornada.

## 7. Registro en Git

```bash
cd /c/6to/reposteria-web
git status
git add frontend/src/components/ProductCard.jsx frontend/src/components/DetalleProducto.jsx frontend/src/pages/Carrito.jsx docs/JORNADA_05_CORRECCIONES.md
git commit -m "Corregir disponibilidad y detalle del carrito (RF04, RF05, RF06)"
git push origin main
```

## 8. Trazabilidad y siguiente jornada

RF04: detalle reutilizable; RF05: agregar y validar acumulación; RF06: modificar y eliminar; RF07: totales existentes conservados. La disponibilidad es local y no sustituye una validación transaccional en el servidor. No se han ejecutado estas pruebas en tu entorno. Después de verificar las correcciones, continuar con autenticación y roles.
