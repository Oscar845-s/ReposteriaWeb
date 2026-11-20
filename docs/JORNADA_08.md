# Jornada 08 — Backend y API REST

**Proyecto:** Dulce Hogar / ReposteriaWeb  
**Fecha:** 20 de noviembre de 2026

## 1. Objetivo

Crear una API de lectura para RF03 y RF04, conectada a SQL Server mediante autenticación integrada de Windows. No modificar el frontend ni volver a ejecutar los scripts de creación. La autenticación real y las operaciones de escritura quedan pendientes.

## 2. Preparar el entorno

En SSMS ejecuta:

```sql
USE DulceHogar;
SELECT * FROM dbo.vwCatalogo;
SELECT idCategoria, nombre FROM dbo.Categorias WHERE esActiva = 1;
```

Comprueba que existen productos. En PowerShell comprueba los controladores ODBC:

```powershell
Get-OdbcDriver | Where-Object Name -like '*ODBC Driver*SQL Server*'
```

Si no aparece ODBC Driver 18 for SQL Server de 64 bits, instala el controlador oficial de Microsoft (https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server). El código usa el nombre del controlador 18.

Desde Git Bash:

```bash
cd /c/6to/reposteria-web/backend
npm init -y
npm install express cors dotenv mssql msnodesqlv8
npm pkg set type=module
npm pkg set 'scripts.start=node src/server.js' 'scripts.dev=node --watch src/server.js'
mkdir -p src/{config,services,controllers,routes,middleware}
```

Node 24 incluye modo watch, por lo que no instalaremos nodemon. msnodesqlv8 es un módulo nativo: si npm falla, conserva el error completo y no cambies de versión ni de autenticación sin diagnosticarlo.

## 3. Estructura

```text
backend/
  .env
  .env.example
  .gitignore
  package.json
  package-lock.json
  src/
    config/database.js
    services/catalogoServicio.js
    controllers/catalogoControlador.js
    routes/catalogoRutas.js
    middleware/manejarError.js
    app.js
    server.js
```

Crea `backend/.gitignore`:

```gitignore
node_modules/
.env
```

Crea `backend/.env.example`:

```dotenv
PORT=3000
DB_SERVER=localhost
DB_INSTANCE=MSSQLSERVER01
DB_DATABASE=DulceHogar
DB_DRIVER=ODBC Driver 18 for SQL Server
FRONTEND_ORIGIN=http://localhost:5173
```

Copia el archivo: `cp .env.example .env`. La instancia se especifica por separado. No se necesitan usuario ni contraseña: el proceso Node utiliza la identidad Windows que lo ejecuta.

## 4. Código completo

### backend/src/config/database.js

```js
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
```

El driver ODBC permite autenticación integrada. TrustServerCertificate se usa únicamente para desarrollo local; en producción se requiere un certificado confiable. No se habilita autenticación mixta.

### backend/src/services/catalogoServicio.js

```js
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
```

El alias `id` mantiene compatibilidad con el catálogo React. La vista existente filtra bajas lógicas; los productos agotados siguen visibles. Los IDs se parametrizan para evitar inyección SQL.

### backend/src/controllers/catalogoControlador.js

```js
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
```

### backend/src/routes/catalogoRutas.js

```js
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
```

### backend/src/middleware/manejarError.js

```js
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
```

### backend/src/app.js

```js
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
```

Express 5 maneja automáticamente rechazos de controladores async. Verifica `npm ls express`: debe ser 5.x. CORS no sustituye autenticación.

### backend/src/server.js

```js
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
```

## 5. Ejecutar y diagnosticar

```bash
npm run dev
```

Si la instancia no se encuentra, abre SQL Server Configuration Manager y verifica que SQL Server (MSSQLSERVER01) esté iniciado. Para conexión TCP con instancia nombrada, verifica TCP/IP y SQL Server Browser; si modificas protocolos reinicia el servicio. No abras puertos hacia Internet. Si sigue fallando, comparte el error exacto y la salida de `npm ls --depth=0`. Si aparece ERR_MODULE_NOT_FOUND para mssql/msnodesqlv8.js, comprueba `ls node_modules/mssql` antes de ajustar la importación. Si aparece Login failed, verifica que Node se esté ejecutando bajo la misma identidad Windows que SSMS. No concedas sysadmin para resolverlo.

## 6. Pruebas

Desde otra terminal Git Bash:

```bash
curl -i http://localhost:3000/api/salud
curl -i http://localhost:3000/api/productos
curl -i http://localhost:3000/api/productos/1
curl -i http://localhost:3000/api/categorias
curl -i http://localhost:3000/api/productos/abc
curl -i http://localhost:3000/api/productos/0
curl -i http://localhost:3000/api/productos/2147483648
curl -i http://localhost:3000/api/productos/2147483647
curl -i http://localhost:3000/api/inexistente
curl -i -H 'Origin: http://localhost:5173' http://localhost:3000/api/productos
```

| Prueba | Resultado esperado |
|---|---|
| Salud | 200 y baseDatos conectada |
| Productos | 200, arreglo con los productos visibles de SSMS |
| Producto 1 | 200 si existe y está activo |
| Categorías | 200, arreglo de categorías activas |
| ID abc | 400 |
| ID cero | 400 |
| ID fuera del rango INT | 400 |
| ID inexistente | 404, si el ID indicado no existe |
| Ruta inexistente | 404 |
| CORS | Access-Control-Allow-Origin: http://localhost:5173 |

Comprueba también que precio y stock coincidan con SSMS, que el brownie agotado aparezca si está activo, y que ninguna respuesta incluya credenciales. No se ha ejecutado este código contra tu servidor: registra tus resultados reales. Si Vite usa otro puerto, actualiza FRONTEND_ORIGIN y reinicia Node.

## 7. Git

Guarda este documento como `docs/JORNADA_08.md`. Desde la raíz:

```bash
cd /c/6to/reposteria-web
 git status --short
 git check-ignore backend/.env backend/node_modules
 git add backend/ docs/JORNADA_08.md
 git diff --cached --stat
 git commit -m "Implementar API de catalogo y conexion SQL Server (RF03, RF04)"
 git push origin main
```

Verifica que .env y node_modules no estén preparados para commit. Conserva package-lock.json.

## 8. Cierre

La API de catálogo solo realiza lecturas. Aún no reemplaza los datos simulados de React, ni implementa usuarios, pedidos o inventario transaccional. La Jornada 9 integrará el catálogo real con React, verificando IDs, imágenes, stock y manejo de carga y errores.
