import { useState } from 'react';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  const disponible = product.stock > 0;

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm border border-rose-100">
      <div className="h-48 bg-rose-100 flex items-center justify-center">
        {!imageError ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-rose-700 font-semibold">{product.categoria}</span>
        )}
      </div>
      <div className="p-5 space-y-2">
        <p className="text-sm text-rose-700">{product.categoria}</p>
        <h2 className="text-xl font-bold text-rose-900">{product.nombre}</h2>
        <p className="text-stone-600 text-sm">{product.descripcion}</p>
        <p className="text-lg font-bold text-stone-900">{money.format(product.precio)}</p>
        <p className={disponible ? 'text-green-700 text-sm' : 'text-red-700 text-sm'}>
          {disponible ? `Disponibles: ${product.stock}` : 'Agotado'}
        </p>
        <button
          type="button"
          disabled
          title="El carrito se implementará en la siguiente jornada"
          className="w-full rounded-lg bg-rose-200 text-rose-900 py-2 cursor-not-allowed"
        >
          Agregar al carrito (próximamente)
        </button>
      </div>
    </article>
  );
}