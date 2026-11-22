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