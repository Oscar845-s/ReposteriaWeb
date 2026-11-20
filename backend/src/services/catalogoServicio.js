// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: catalogoServicio.js
// Descripción: Consultas parametrizadas del catálogo.
// Requerimiento: RF03, RF04
// Fecha: 20 de noviembre de 2026
import { obtenerConexion, sql } from '../config/database.js';

// Sin parámetros; devuelve productos visibles, incluyendo agotados.
export async function obtenerProductos() {
  const conexion = await obtenerConexion();
  const resultado = await conexion.request().query(`
    SELECT idProducto AS id, nombre, descripcion, categoria, precio, stock, imagen
    FROM dbo.vwCatalogo ORDER BY idProducto
  `);
  return resultado.recordset;
}

// Recibe el ID entero; devuelve un producto o null.
export async function obtenerProducto(idProducto) {
  const conexion = await obtenerConexion();
  const resultado = await conexion.request().input('id', sql.Int, idProducto).query(`
    SELECT idProducto AS id, nombre, descripcion, categoria, precio, stock, imagen
    FROM dbo.vwCatalogo WHERE idProducto = @id
  `);
  return resultado.recordset[0] ?? null;
}

// Sin parámetros; devuelve categorías activas.
export async function obtenerCategorias() {
  const conexion = await obtenerConexion();
  const resultado = await conexion.request().query(`
    SELECT idCategoria AS id, nombre FROM dbo.Categorias
    WHERE esActiva = 1 ORDER BY nombre
  `);
  return resultado.recordset;
}