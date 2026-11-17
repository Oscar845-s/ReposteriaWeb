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