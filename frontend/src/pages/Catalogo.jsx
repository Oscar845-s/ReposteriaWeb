import { useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { products } from '../data/products';

const categorias = ['Todas', ...new Set(products.map(p => p.categoria))];

export default function Catalogo() {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');

  const filtrados = useMemo(() => products.filter(product => {
    const texto = `${product.nombre} ${product.descripcion}`.toLocaleLowerCase('es');
    const coincideTexto = texto.includes(busqueda.trim().toLocaleLowerCase('es'));
    const coincideCategoria = categoria === 'Todas' || product.categoria === categoria;
    return coincideTexto && coincideCategoria;
  }), [busqueda, categoria]);

  return (
    <section className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="text-4xl font-bold text-rose-900 mb-3">Nuestro catálogo</h1>
      <p className="text-stone-600 mb-8">Descubre los postres y panes de Dulce Hogar.</p>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="search"
          aria-label="Buscar productos"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-rose-200 bg-white p-3 outline-rose-600"
        />
        <select
          aria-label="Filtrar por categoría"
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          className="rounded-lg border border-rose-200 bg-white p-3"
        >
          {categorias.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <p className="text-sm text-stone-600 mb-5">{filtrados.length} producto(s) encontrado(s)</p>
      {filtrados.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <p className="rounded-xl bg-white p-8 text-center text-stone-600">No se encontraron productos.</p>
      )}
    </section>
  );
}