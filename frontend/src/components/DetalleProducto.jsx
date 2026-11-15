
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: DetalleProducto.jsx
// Descripción: Muestra la información detallada de un producto.
// Requerimiento: RF04 / CU-06
// Fecha: 14 de noviembre de 2026

// ===== Importaciones =====
import { useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';

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

  const hayExistencias = producto.stock > 0;

  const [cantidad, setCantidad] = useState(
    hayExistencias ? CANTIDAD_MINIMA : 0
  );

  const [hayErrorImagen, setHayErrorImagen] = useState(false);

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
    setCantidad(cantidadActual =>
      Math.min(cantidadActual + 1, producto.stock)
    );
  }

  /**
   * Disminuye la cantidad respetando el mínimo permitido.
   * Recibe: ningún parámetro.
   * Devuelve: ningún valor.
   */
  function disminuirCantidad() {
    setCantidad(cantidadActual =>
      Math.max(cantidadActual - 1, CANTIDAD_MINIMA)
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
                ? `Disponibles: ${producto.stock} unidades`
                : 'Producto agotado'}
            </p>

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
                  disabled={!hayExistencias || cantidad >= producto.stock}
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

            {/* RF05: se implementará en la jornada del carrito */}
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2
                w-full rounded-lg bg-rose-200 py-3
                text-rose-900 cursor-not-allowed"
            >
              <ShoppingCart size={20} />
              {hayExistencias
                ? 'Agregar al carrito (próximamente)'
                : 'Producto agotado'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

// ===== Exportaciones =====
export default DetalleProducto;
