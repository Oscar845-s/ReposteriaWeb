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