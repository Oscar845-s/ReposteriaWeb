// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: manejarError.js
// Descripción: Manejo centralizado de errores.
// Requerimiento: RF03, RF04
// Fecha: 20 de noviembre de 2026

// Recibe error y objetos Express; devuelve respuesta HTTP segura.
export default function manejarError(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }
  console.error(error.message);
  return res.status(500).json({ mensaje: 'Error interno del servidor.' });
}