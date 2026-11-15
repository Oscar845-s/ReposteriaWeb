
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: ProductCard.jsx
// Descripción: Muestra una tarjeta de producto del catálogo.
// Requerimiento: RF03, RF04 / CU-05, CU-06
// Fecha: 14 de noviembre de 2026

// ===== Importaciones =====
import { useState } from 'react';
import { Eye } from 'lucide-react';

// ===== Constantes =====
const FORMATO_MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

// ===== Funciones =====

/**
 * Presenta la información resumida de un producto.
 * Recibe: product y función abrirDetalle.
 * Devuelve: tarjeta JSX del producto.
 */
function ProductCard({ product, abrirDetalle }) {
  const [hayErrorImagen, setHayErrorImagen] = useState(false);

  const hayExistencias = product.stock > 0;

  return (
    <article
      className="overflow-hidden rounded-2xl bg-white
        shadow-sm border border-rose-100"
    >
      <div
        className="h-48 bg-rose-100 flex
          items-center justify-center"
      >
        {!hayErrorImagen ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            className="h-full w-full object-cover"
            onError={() => setHayErrorImagen(true)}
          />
        ) : (
          <span className="text-rose-700 font-semibold">
            {product.categoria}
          </span>
        )}
      </div>

      <div className="p-5 space-y-2">
        <p className="text-sm text-rose-700">
          {product.categoria}
        </p>

        <h2 className="text-xl font-bold text-rose-900">
          {product.nombre}
        </h2>

        <p className="text-stone-600 text-sm">
          {product.descripcion}
        </p>

        <p className="text-lg font-bold text-stone-900">
          {FORMATO_MONEDA.format(product.precio)}
        </p>

        <p
          className={
            hayExistencias
              ? 'text-green-700 text-sm'
              : 'text-red-700 text-sm'
          }
        >
          {hayExistencias
            ? `Disponibles: ${product.stock}`
            : 'Agotado'}
        </p>

        {/* RF04: permite consultar el detalle del producto */}
        <button
          type="button"
          onClick={() => abrirDetalle(product.id)}
          className="flex items-center justify-center gap-2
            w-full rounded-lg border border-rose-600
            text-rose-700 py-2 hover:bg-rose-50 transition"
        >
          <Eye size={18} />
          Ver detalle
        </button>

        {/* RF05: pendiente de implementación */}
        <button
          type="button"
          disabled
          title="El carrito se implementará posteriormente"
          className="w-full rounded-lg bg-rose-200
            text-rose-900 py-2 cursor-not-allowed"
        >
          {hayExistencias
            ? 'Agregar al carrito (próximamente)'
            : 'Producto agotado'}
        </button>
      </div>
    </article>
  );
}

// ===== Exportaciones =====
export default ProductCard;
