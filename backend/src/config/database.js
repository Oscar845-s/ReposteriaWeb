// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: database.js
// Descripción: Conexión integrada a SQL Server.
// Requerimiento: RF03, RF04
// Fecha: 20 de noviembre de 2026
import 'dotenv/config';
import sql from 'mssql/msnodesqlv8.js';

const servidor = `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE}`;
const configuracion = {
  connectionString: `Driver={${process.env.DB_DRIVER}};Server=${servidor};` +
    `Database=${process.env.DB_DATABASE};Trusted_Connection=Yes;` +
    'Encrypt=Yes;TrustServerCertificate=Yes;',
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};
let promesaConexion;

// Sin parámetros; devuelve la promesa del pool compartido.
export function obtenerConexion() {
  if (!promesaConexion) {
    promesaConexion = new sql.ConnectionPool(configuracion).connect().catch(error => {
      promesaConexion = undefined;
      throw error;
    });
  }
  return promesaConexion;
}

export { sql };