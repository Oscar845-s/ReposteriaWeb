// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: carritoServicio.js
// Descripción: Gestiona cantidades y persistencia local del carrito.
// Requerimiento: RF05, RF06, RF07 / CU-07, CU-08, CU-11, CU-12
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { products } from '../data/products';

// ===== Constantes =====
const CLAVE_CARRITO = 'dulce-hogar-carrito-v1';
const CANTIDAD_MINIMA = 1;

// ===== Funciones =====
// Recibe un ID; devuelve el producto registrado o undefined.
export function obtenerProducto(idProducto) {
  return products.find(producto => producto.id === idProducto);
}

// Recibe ID y cantidad; devuelve si la cantidad cumple RF05 y CU-11.
export function validarCantidad(idProducto, cantidad) {
  const producto = obtenerProducto(idProducto);
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
      if (!item || !validarCantidad(item.idProducto, item.cantidad) ||
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
export function obtenerDetalles(items) {
  return items.map(item => {
    const producto = obtenerProducto(item.idProducto);
    return { ...item, producto, subtotal: producto.precio * item.cantidad };
  });
}