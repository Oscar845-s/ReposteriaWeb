// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: server.js
// Descripción: Inicia la API después de comprobar SQL Server.
// Requerimiento: RF03, RF04
// Fecha: 20 de noviembre de 2026
import 'dotenv/config';
import app from './app.js';
import { obtenerConexion } from './config/database.js';

const puerto = Number(process.env.PORT || 3000);
try {
  await obtenerConexion();
  app.listen(puerto, '127.0.0.1', () => {
    console.log(`API disponible en http://localhost:${puerto}/api/salud`);
  });
} catch (error) {
  console.error('No fue posible conectar con SQL Server:', error.message);
  process.exitCode = 1;
}