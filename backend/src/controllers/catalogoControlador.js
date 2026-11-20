// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: catalogoControlador.js
// Descripción: Respuestas HTTP y validación de identificadores.
// Requerimiento: RF03, RF04
// Fecha: 20 de noviembre de 2026
import * as servicio from '../services/catalogoServicio.js';

// Recibe solicitud y respuesta; devuelve el catálogo JSON.
export async function listarProductos(req, res) {
  res.json(await servicio.obtenerProductos());
}

// Recibe solicitud y respuesta; devuelve un producto o error HTTP.
export async function consultarProducto(req, res) {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(req.params.id) || !Number.isInteger(id) ||
      id <= 0 || id > 2147483647) {
    return res.status(400).json({ mensaje: 'Identificador inválido.' });
  }
  const producto = await servicio.obtenerProducto(id);
  if (!producto) {
    return res.status(404).json({ mensaje: 'Producto no encontrado.' });
  }
  return res.json(producto);
}

// Recibe solicitud y respuesta; devuelve categorías JSON.
export async function listarCategorias(req, res) {
  res.json(await servicio.obtenerCategorias());
}