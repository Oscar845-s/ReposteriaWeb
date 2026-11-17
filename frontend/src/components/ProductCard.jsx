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