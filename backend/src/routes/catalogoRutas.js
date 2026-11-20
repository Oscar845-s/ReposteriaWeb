// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: catalogoRutas.js
// Descripción: Rutas públicas de lectura del catálogo.
// Requerimiento: RF03, RF04
// Fecha: 20 de noviembre de 2026
import { Router } from 'express';
import { listarProductos, consultarProducto, listarCategorias }
  from '../controllers/catalogoControlador.js';

const rutas = Router();
rutas.get('/productos', listarProductos);
rutas.get('/productos/:id', consultarProducto);
rutas.get('/categorias', listarCategorias);
export default rutas;