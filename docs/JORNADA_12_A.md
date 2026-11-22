# JORNADA 12-A — Pruebas integrales y automatizadas

**Proyecto:** Dulce Hogar / ReposteriaWeb  
**Autor:** Oscar Armando Medina Gutiérrez  
**Materia:** Verificación y Validación de Software  
**Fecha:** 21 de noviembre de 2026  
**Alcance:** Verificación final de RF01–RF20 implementados, con especial atención a RF05–RF09, RF10–RF16 y RF18.  
**Dependencias:** Jornadas 10, 11-A, 11-B y 11-C implementadas. Node.js 24 (o versión con `fetch` nativo). No requiere paquetes adicionales.

> **IMPORTANTE:** Esta jornada comienza con pruebas **no destructivas**. El script consulta datos y valida permisos; **no crea pedidos, no modifica inventario y no cambia estados**. Las pruebas de escritura se realizan manualmente en un entorno de prueba y con productos/pedidos destinados a ello. No ejecutar scripts de inicialización de SQL Server sobre la base con datos reales.

## 1. Objetivos

1. Comprobar salud del backend y conexión a SQL Server.
2. Verificar catálogo público y endpoints protegidos.
3. Comprobar que el administrador puede consultar reportes y que los demás roles no.
4. Verificar que la información de pedidos y reportes coincide con la base de datos.
5. Ejecutar lint, compilación, pruebas de integración y pruebas de regresión.
6. Registrar evidencias y anomalías antes de pasar a la auditoría de seguridad (12-B).

## 2. Estructura de archivos

Crear únicamente estos archivos nuevos:

```text
reposteria-web/
├── pruebas/
│   ├── prueba-integracion.mjs      NUEVO
│   └── RESULTADOS_JORNADA_12_A.md NUEVO (rellenar tras ejecutar)
└── docs/
    └── JORNADA_12_A.md           COPIA DE ESTA GUÍA
```

No es necesario modificar los archivos de React, Express o SQL para ejecutar estas pruebas.

## 3. Script automatizado completo

**Ruta:** `pruebas/prueba-integracion.mjs`

Este script usa variables de entorno **solo en memoria**; nunca imprime claves ni tokens. Las credenciales son opcionales: sin ellas ejecuta las pruebas públicas y de denegación de acceso. Para comprobar los roles, se recomienda configurar usuarios de prueba existentes. La variable `URL_API` puede cambiarse si el backend no usa el puerto 3000.

```js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: prueba-integracion.mjs
// Descripción: Pruebas de integración no destructivas para API Dulce Hogar.
// Requerimiento: RF01, RF02, RF03, RF04, RF08, RF09, RF10, RF14, RF15, RF16, RF18
// Fecha: 21 de noviembre de 2026

const URL_API = (process.env.URL_API || 'http://localhost:3000/api').replace(/\/$/, '');
const resultados = [];

function registrar(nombre, condicion, detalle = '') {
  const correcto = Boolean(condicion);
  resultados.push({ nombre, correcto, detalle });
  console.log(`${correcto ? 'OK' : 'FALLO'} | ${nombre}${detalle ? ` | ${detalle}` : ''}`);
}

async function solicitar(ruta, { metodo = 'GET', token, datos } = {}) {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    method: metodo,
    headers: {
      Accept: 'application/json',
      ...(datos === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(datos === undefined ? {} : { body: JSON.stringify(datos) }),
    signal: AbortSignal.timeout(10000),
  });
  let cuerpo;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }
  return { estado: respuesta.status, cuerpo };
}

async function comprobar(nombre, ejecutar, validar) {
  try {
    const respuesta = await ejecutar();
    registrar(nombre, validar(respuesta), `HTTP ${respuesta.estado}`);
    return respuesta;
  } catch (error) {
    registrar(nombre, false, `${error.name}: ${error.message}`);
    return null;
  }
}

async function iniciarSesion(tipo) {
  const correo = process.env[`CORREO_${tipo}`];
  const clave = process.env[`CLAVE_${tipo}`];
  if (!correo || !clave) {
    console.log(`OMITIDO | Inicio de sesión ${tipo}: no se configuraron credenciales.`);
    return null;
  }
  const respuesta = await comprobar(
    `Inicio de sesión ${tipo}`,
    () => solicitar('/auth/login', { metodo: 'POST', datos: { correo, clave } }),
    r => r.estado === 200 && typeof r.cuerpo?.token === 'string' && r.cuerpo.token.length > 0,
  );
  return respuesta?.estado === 200 ? respuesta.cuerpo.token : null;
}

console.log(`Pruebas no destructivas contra ${URL_API}`);

await comprobar(
  'Salud y conexión a SQL Server',
  () => solicitar('/salud'),
  r => r.estado === 200 && r.cuerpo?.estado === 'ok' && r.cuerpo?.baseDatos === 'conectada',
);

await comprobar(
  'Catálogo público de productos',
  () => solicitar('/productos'),
  r => r.estado === 200 && Array.isArray(r.cuerpo),
);

await comprobar(
  'Catálogo público de categorías',
  () => solicitar('/categorias'),
  r => r.estado === 200 && Array.isArray(r.cuerpo),
);

await comprobar(
  'Ruta inexistente responde 404',
  () => solicitar('/ruta-inexistente-prueba-12a'),
  r => r.estado === 404,
);

for (const [nombre, ruta] of [
  ['Mis pedidos sin sesión', '/pedidos'],
  ['Pedidos administrativos sin sesión', '/operaciones/pedidos'],
  ['Producción sin sesión', '/operaciones/produccion'],
  ['Reporte sin sesión', '/reportes/ventas?desde=2026-11-01&hasta=2026-11-30'],
  ['Productos administrativos sin sesión', '/admin/productos'],
]) {
  await comprobar(nombre, () => solicitar(ruta), r => r.estado === 401);
}

await comprobar(
  'Token inválido rechazado',
  () => solicitar('/auth/me', { token: 'token-invalido' }),
  r => r.estado === 401,
);

const tokenCliente = await iniciarSesion('CLIENTE');
const tokenAdmin = await iniciarSesion('ADMIN');
const tokenProduccion = await iniciarSesion('PRODUCCION');

for (const [tipo, token] of [
  ['CLIENTE', tokenCliente],
  ['ADMIN', tokenAdmin],
  ['PRODUCCION', tokenProduccion],
]) {
  if (!token) continue;
  await comprobar(
    `Perfil autenticado ${tipo}`,
    () => solicitar('/auth/me', { token }),
    r => r.estado === 200 && typeof r.cuerpo?.rol === 'string',
  );
}

if (tokenCliente) {
  await comprobar(
    'Cliente consulta sus pedidos',
    () => solicitar('/pedidos', { token: tokenCliente }),
    r => r.estado === 200 && Array.isArray(r.cuerpo),
  );
  await comprobar(
    'Cliente no accede a reportes',
    () => solicitar('/reportes/ventas?desde=2026-11-01&hasta=2026-11-30', { token: tokenCliente }),
    r => r.estado === 403,
  );
  await comprobar(
    'Cliente no accede a pedidos administrativos',
    () => solicitar('/operaciones/pedidos', { token: tokenCliente }),
    r => r.estado === 403,
  );
}

if (tokenProduccion) {
  await comprobar(
    'Producción consulta su panel',
    () => solicitar('/operaciones/produccion', { token: tokenProduccion }),
    r => r.estado === 200 && Array.isArray(r.cuerpo),
  );
  await comprobar(
    'Producción no accede a reportes',
    () => solicitar('/reportes/ventas?desde=2026-11-01&hasta=2026-11-30', { token: tokenProduccion }),
    r => r.estado === 403,
  );
}

if (tokenAdmin) {
  await comprobar(
    'Administrador consulta pedidos',
    () => solicitar('/operaciones/pedidos', { token: tokenAdmin }),
    r => r.estado === 200 && Array.isArray(r.cuerpo),
  );
  await comprobar(
    'Administrador consulta productos',
    () => solicitar('/admin/productos', { token: tokenAdmin }),
    r => r.estado === 200 && Array.isArray(r.cuerpo),
  );
  await comprobar(
    'Administrador consulta reporte de ventas',
    () => solicitar('/reportes/ventas?desde=2026-11-01&hasta=2026-11-30', { token: tokenAdmin }),
    r => r.estado === 200 && r.cuerpo?.resumen && Array.isArray(r.cuerpo?.porEstado)
      && Array.isArray(r.cuerpo?.porDia) && Array.isArray(r.cuerpo?.productos),
  );
  for (const [nombre, parametros] of [
    ['Reporte sin fechas', ''],
    ['Reporte con fecha imposible', '?desde=2026-02-30&hasta=2026-03-01'],
    ['Reporte con fechas invertidas', '?desde=2026-11-30&hasta=2026-11-01'],
    ['Reporte con periodo excesivo', '?desde=2025-01-01&hasta=2026-11-30'],
  ]) {
    await comprobar(
      nombre,
      () => solicitar(`/reportes/ventas${parametros}`, { token: tokenAdmin }),
      r => r.estado === 400,
    );
  }
}

const correctas = resultados.filter(r => r.correcto).length;
const fallidas = resultados.length - correctas;
console.log(`\nRESULTADO: ${correctas}/${resultados.length} correctas; ${fallidas} fallidas.`);
console.log('Las pruebas omitidas por falta de credenciales no cuentan como aprobadas.');
process.exitCode = fallidas === 0 ? 0 : 1;
```

**Nota de compatibilidad:** este script supone que los endpoints de catálogo devuelven arreglos directamente, como en las jornadas anteriores. Si tu API responde `{ productos: [...] }` o `{ categorias: [...] }`, adapta **solo** la validación del cuerpo tras confirmar el contrato real. No cambies la API para satisfacer una prueba mal configurada.

## 4. Ejecutar las pruebas

### Terminal 1 — backend

```bash
cd /c/6to/reposteria-web/backend
npm run dev
```

Si el proyecto no tiene `dev`, revisa `backend/package.json` y usa el script de inicio existente.

### Terminal 2 — frontend

```bash
cd /c/6to/reposteria-web/frontend
npm run lint
npm run build
npm run dev
```

### Terminal 3 — integración

```bash
cd /c/6to/reposteria-web
node pruebas/prueba-integracion.mjs
```

**Opcional: pruebas de rol con cuentas existentes de prueba.** En Git Bash, configura las variables solo para esa terminal. **No copies credenciales a documentos, capturas, Git ni mensajes.**

```bash
read -r -p 'Correo cliente: ' CORREO_CLIENTE
read -r -s -p 'Clave cliente: ' CLAVE_CLIENTE; echo
read -r -p 'Correo administrador: ' CORREO_ADMIN
read -r -s -p 'Clave administrador: ' CLAVE_ADMIN; echo
read -r -p 'Correo producción: ' CORREO_PRODUCCION
read -r -s -p 'Clave producción: ' CLAVE_PRODUCCION; echo
export CORREO_CLIENTE CLAVE_CLIENTE CORREO_ADMIN CLAVE_ADMIN CORREO_PRODUCCION CLAVE_PRODUCCION
node pruebas/prueba-integracion.mjs
unset CORREO_CLIENTE CLAVE_CLIENTE CORREO_ADMIN CLAVE_ADMIN CORREO_PRODUCCION CLAVE_PRODUCCION
```

> Las pruebas con credenciales reales dependen de que las cuentas existan y sus roles sean correctos. Si alguna falla, revisar primero los usuarios de prueba y los códigos HTTP, sin suponer que el sistema está defectuoso.

## 5. Pruebas funcionales manuales de extremo a extremo

Usar **productos de prueba y pedidos de prueba**, anotando IDs y stock inicial. No reutilizar un pedido de un cliente real.

| ID | Rol | Acción | Resultado esperado |
|---|---|---|---|
| PA-12A-01 | Visitante | Abrir inicio y catálogo | Se muestran productos disponibles |
| PA-12A-02 | Visitante | Entrar a `/carrito` sin sesión | Solicita iniciar sesión o bloquea acceso |
| PA-12A-03 | Cliente | Iniciar sesión con credenciales válidas | Accede a su cuenta |
| PA-12A-04 | Cliente | Añadir dos productos al carrito | Cantidades y total correctos |
| PA-12A-05 | Cliente | Modificar cantidad | Total y subtotal se recalculan |
| PA-12A-06 | Cliente | Confirmar pedido de prueba | Se crea un único pedido |
| PA-12A-07 | Cliente | Volver al carrito tras confirmar | El carrito está vacío, incluso tras recargar |
| PA-12A-08 | Cliente | Consultar `/pedidos` | Pedido visible con sus líneas y total |
| PA-12A-09 | Administrador | Consultar inventario | Stock disminuyó según el pedido |
| PA-12A-10 | Administrador | Iniciar preparación | Estado cambia de 1 a 2 |
| PA-12A-11 | Producción | Marcar como listo | Estado cambia de 2 a 3 |
| PA-12A-12 | Administrador | Marcar como entregado | Estado cambia de 3 a 4 |
| PA-12A-13 | Administrador | Consultar reportes del periodo | Pedido entregado figura en ventas según fecha de creación |
| PA-12A-14 | Cliente | Crear otro pedido de prueba y cancelarlo pendiente | Estado 5 y stock restaurado una sola vez |
| PA-12A-15 | Cliente | Intentar cancelar pedido ya entregado | Operación no permitida |
| PA-12A-16 | Producción | Abrir `/admin/reportes` | Acceso denegado |
| PA-12A-17 | Administrador | Editar nombre/precio de producto de prueba | Catálogo actualizado, pedido histórico conserva precio |
| PA-12A-18 | Administrador | Ajustar stock de prueba | Movimiento registrado y stock correcto |
| PA-12A-19 | Cliente | Cerrar sesión y recargar | Sesión protegida; no muestra datos privados |
| PA-12A-20 | Navegador | Navegar entre catálogo, pedidos y paneles | Sin errores críticos en consola |

**Criterio:** no aprobar un caso solo porque la interfaz mostró un mensaje. Confirmar también el estado de la API o de SQL Server cuando corresponda.

## 6. Consultas SQL de verificación (solo lectura)

Ejecutar en SQL Server Management Studio sobre la base **DulceHogar**. Sustituir `12345` por el ID real de tu pedido de prueba.

```sql
USE DulceHogar;
GO

-- Historial reciente de pedidos y estados
SELECT TOP (20)
  p.idPedido, p.idUsuario, p.idEstado, p.fechaPedido
FROM dbo.Pedidos AS p
ORDER BY p.idPedido DESC;

-- Líneas y subtotales de un pedido de prueba
DECLARE @idPedido INT = 12345;
SELECT
  d.idPedido, d.idProducto, d.cantidad, d.precioUnitario, d.subtotal
FROM dbo.DetallePedido AS d
WHERE d.idPedido = @idPedido;

-- Resumen histórico del pedido desde la vista usada en reportes
SELECT * FROM dbo.vwTotalesPedido WHERE idPedido = @idPedido;

-- Productos con stock disponible
SELECT TOP (20) idProducto, nombre, stock
FROM dbo.Productos
ORDER BY idProducto;

-- Movimientos recientes de inventario
SELECT TOP (20) * FROM dbo.MovimientosInventario
ORDER BY idMovimiento DESC;
```

**Importante:** las consultas se basan en los nombres del esquema utilizado en jornadas previas. Si tu tabla tiene columnas distintas, inspecciona primero su definición (`sp_help 'dbo.Productos'`, por ejemplo) y ajusta la consulta. No cambies el esquema sin una causa confirmada.

## 7. Evidencia y registro de anomalías

Crear **`pruebas/RESULTADOS_JORNADA_12_A.md`** con el siguiente contenido y completar los campos después de probar:

```md
# Resultados — Jornada 12-A

- Fecha:
- Versión / commit Git:
- Backend iniciado: Sí / No
- Frontend iniciado: Sí / No
- `npm run lint`: __ advertencias, __ errores
- `npm run build`: Correcto / Falló
- Pruebas automáticas: __ correctas / __ ejecutadas / __ omitidas
- Pruebas manuales: __ aprobadas / 20

## Casos con anomalías

| ID | Resultado esperado | Resultado obtenido | Severidad | Evidencia | Estado |
|---|---|---|---|---|---|
| | | | | | |

## Evidencias

- Captura de catálogo:
- Captura de pedido confirmado:
- Captura de carrito vacío:
- Captura de panel administrativo:
- Captura de panel de producción:
- Captura de reporte de ventas:
- Resultado de consultas SQL:

## Dictamen

Aprobado / Aprobado con observaciones / No aprobado

Justificación:
```

**Severidades:** Alta (seguridad, pedidos duplicados, stock incorrecto, pagos o datos de otros usuarios), Media (funcionalidad importante incorrecta), Baja (detalle visual o mensaje). Cualquier anomalía Alta impide el dictamen «Aprobado».

## 8. Criterios para cerrar 12-A

- `npm run lint` con 0 errores y, de preferencia, 0 advertencias.
- `npm run build` exitoso.
- Todas las pruebas automatizadas **ejecutadas** pasan; distinguir claramente las omitidas.
- Los 20 casos manuales se completan o se documenta por qué alguno no aplica.
- Se confirma la integridad del inventario y de los pedidos en SQL Server.
- No quedan anomalías de severidad Alta.
- Se guarda el dictamen y la evidencia en el proyecto.

## 9. Git

Desde la raíz del repositorio:

```bash
cd /c/6to/reposteria-web
mkdir -p pruebas docs
# Guardar este documento en docs/JORNADA_12_A.md
# Crear pruebas/prueba-integracion.mjs y pruebas/RESULTADOS_JORNADA_12_A.md

git status
git add pruebas/prueba-integracion.mjs pruebas/RESULTADOS_JORNADA_12_A.md docs/JORNADA_12_A.md
git commit -m "test: pruebas integrales y evidencias jornada 12-A"
git push origin main
```

**No incluir** `.env`, contraseñas, tokens, volcados de datos personales ni capturas con información sensible. Si todavía hay anomalías abiertas, es válido guardar los resultados como pendientes y corregirlas antes del dictamen final.

## 10. Próxima etapa

**Jornada 12-B:** auditoría de seguridad, validación de entradas, CORS, JWT, controles por rol, protección de datos y manejo de errores. Se trabajará sobre hallazgos concretos de esta jornada; no se alterarán rutas que ya funcionan sin evidencia de un problema.
