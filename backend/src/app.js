// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: app.js
// Descripción: Configuración de Express y CORS.
// Requerimiento: RF03, RF04
// Fecha: 20 de noviembre de 2026
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rutas from './routes/catalogoRutas.js';
import manejarError from './middleware/manejarError.js';
import { obtenerConexion } from './config/database.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json({ limit: '100kb' }));
app.get('/api/salud', async (req, res) => {
  const conexion = await obtenerConexion();
  await conexion.request().query('SELECT 1 AS prueba');
  res.json({ estado: 'ok', baseDatos: 'conectada' });
});
app.use('/api', rutas);
app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));
app.use(manejarError);
export default app;