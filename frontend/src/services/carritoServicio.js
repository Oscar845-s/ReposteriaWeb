// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: carritoServicio.js
// Descripción: Gestiona cantidades y persistencia local del carrito.
// Requerimiento: RF05, RF06, RF07 / CU-07, CU-08, CU-11, CU-12
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====


// ===== Constantes =====
const CLAVE_CARRITO = 'dulce-hogar-carrito-v1';
const CANTIDAD_MINIMA = 1;

// ===== Funciones =====
// Recibe un ID; devuelve el producto registrado o undefined.
export function obtenerProducto(idProducto, productos) {
  return productos.find(producto => producto.id === idProducto);
}

// Recibe ID y cantidad; devuelve si la cantidad cumple RF05 y CU-11.
export function validarCantidad(idProducto, cantidad, productos) {
  const producto = obtenerProducto(idProducto, productos);
  return Boolean(producto) && Number.isInteger(cantidad) &&
    cantidad >= CANTIDAD_MINIMA && cantidad <= producto.stock;
}

// Recupera y valida datos locales; devuelve un arreglo sin IDs repetidos.
export function cargarCarrito(correo) {
  if (!correo) { return []; }
  try {
    const datos = JSON.parse(localStorage.getItem(`${CLAVE_CARRITO}:${correo}`) || '[]');
    if (!Array.isArray(datos)) {
      return [];
    }
    const registrados = new Set();
    return datos.filter(item => {
      if (!item || !Number.isInteger(item.idProducto) ||
          !Number.isInteger(item.cantidad) || item.cantidad < 1 ||
          registrados.has(item.idProducto)) {
        return false;
      }
      registrados.add(item.idProducto);
      return true;
    }).map(({ idProducto, cantidad }) => ({ idProducto, cantidad }));
  } catch {
    return [];
  }
}

// Recibe un arreglo; devuelve true si se guardó correctamente.
export function guardarCarrito(items, correo) {
  if (!correo) { return true; }
  try {
    localStorage.setItem(`${CLAVE_CARRITO}:${correo}`, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

// Recibe items; devuelve detalles calculados con los precios actuales (RF07).
export function obtenerDetalles(items, productos) {
  return items.flatMap(item => {
    const producto = obtenerProducto(item.idProducto, productos);
    if (!producto || !producto.stock) { return []; }
    const cantidad = Math.min(item.cantidad, producto.stock);
    return [{ ...item, cantidad, producto, subtotal: producto.precio * cantidad }];
  });
}