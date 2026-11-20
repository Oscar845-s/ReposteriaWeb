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