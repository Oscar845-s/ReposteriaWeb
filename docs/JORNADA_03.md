# Jornada 3 — Catálogo de productos

**Proyecto:** ReposteriaWeb / Dulce Hogar  
**Tecnologías:** React, Vite, Tailwind CSS  
**Objetivo:** Construir un catálogo navegable con productos de ejemplo, búsqueda, filtros y disponibilidad, sin backend por ahora.

## 1. Alcance

- Mostrar productos de repostería mediante tarjetas reutilizables.
- Filtrar por categoría y buscar por nombre o descripción.
- Mostrar precio en MXN y existencias.
- Conservar los datos separados de los componentes.
- No implementar aún carrito funcional ni conexión con SQL Server.

## 2. Archivos

```text
frontend/src/data/products.js            (nuevo)
frontend/src/components/ProductCard.jsx  (nuevo)
frontend/src/pages/Catalogo.jsx          (modificar)
docs/JORNADA_03.md                       (nuevo)
```

## 3. Datos de prueba — `frontend/src/data/products.js`

```javascript
export const products = [
  { id: 1, nombre: 'Pastel de chocolate', descripcion: 'Pastel esponjoso con cobertura de chocolate.', categoria: 'Pasteles', precio: 320, stock: 8, imagen: '/images/pastel-chocolate.jpg' },
  { id: 2, nombre: 'Pastel de fresa', descripcion: 'Pastel de vainilla con fresas frescas.', categoria: 'Pasteles', precio: 350, stock: 5, imagen: '/images/pastel-fresa.jpg' },
  { id: 3, nombre: 'Concha de vainilla', descripcion: 'Pan dulce tradicional con cubierta de vainilla.', categoria: 'Panes', precio: 22, stock: 20, imagen: '/images/concha.jpg' },
  { id: 4, nombre: 'Croissant de mantequilla', descripcion: 'Pan hojaldrado recién horneado.', categoria: 'Panes', precio: 38, stock: 12, imagen: '/images/croissant.jpg' },
  { id: 5, nombre: 'Galletas con chispas', descripcion: 'Galletas suaves con chispas de chocolate.', categoria: 'Galletas', precio: 25, stock: 16, imagen: '/images/galletas.jpg' },
  { id: 6, nombre: 'Brownie', descripcion: 'Brownie de chocolate intenso.', categoria: 'Postres', precio: 45, stock: 0, imagen: '/images/brownie.jpg' },
  { id: 7, nombre: 'Cheesecake', descripcion: 'Rebanada de cheesecake clásico.', categoria: 'Postres', precio: 85, stock: 9, imagen: '/images/cheesecake.jpg' },
  { id: 8, nombre: 'Roles de canela', descripcion: 'Rol suave con glaseado dulce.', categoria: 'Panes', precio: 48, stock: 10, imagen: '/images/rol-canela.jpg' },
];
```

Las rutas de imágenes apuntan a `frontend/public/images/`. Debes agregar fotografías con esos nombres; mientras tanto, la tarjeta muestra un fondo de reserva si la imagen no carga.

## 4. Tarjeta reutilizable — `frontend/src/components/ProductCard.jsx`

```jsx
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
```

El botón se deja deshabilitado de forma intencional: todavía no existe lógica de carrito.

## 5. Página del catálogo — `frontend/src/pages/Catalogo.jsx`

```jsx
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
```

## 6. Fotografías

Crea `frontend/public/images/` y guarda fotografías propias o con licencia apropiada con los nombres utilizados en `products.js`. Hasta que las agregues, las tarjetas mostrarán la categoría como alternativa. No descargues imágenes de terceros sin verificar sus permisos de uso.

## 7. Ejecución y pruebas

Desde `frontend`:

```bash
npm run dev
npm run build
```

Visita `http://localhost:5173/catalogo` y comprueba:

1. Se muestran ocho productos.
2. El filtro **Pasteles** muestra dos.
3. Buscar `chocolate` encuentra productos que incluyen ese término.
4. Combinar búsqueda y categoría restringe los resultados.
5. Una búsqueda inexistente muestra el mensaje correspondiente.
6. Brownie aparece como agotado.
7. La cuadrícula se adapta a celular y escritorio.
8. Los botones de carrito están deshabilitados hasta su implementación.

## 8. Registro en Git

Desde la raíz del repositorio:

```bash
git status
git add frontend/src/data/products.js frontend/src/components/ProductCard.jsx frontend/src/pages/Catalogo.jsx docs/JORNADA_03.md
git commit -m "Jornada 3: catalogo con productos de ejemplo y filtros"
git push origin main
```

Si agregas imágenes, inclúyelas en el commit con `git add frontend/public/images/`.

## 9. Siguiente jornada

Implementar un carrito funcional, inicialmente en el frontend, con opción de añadir productos, cambiar cantidades y calcular subtotales. Posteriormente conectaremos los productos a la API y a SQL Server.

**Nota:** Este documento describe cambios propuestos para aplicar en el proyecto local. No certifica que estén implementados o probados hasta que se ejecuten los pasos.
