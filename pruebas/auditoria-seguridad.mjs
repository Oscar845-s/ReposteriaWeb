// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: auditoria-seguridad.mjs
// Descripción: Verificaciones HTTP no destructivas de autenticación y permisos.
// Requerimiento: RF02, RF17, RF18
// Fecha: 21 de noviembre de 2026

const BASE = (process.env.API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const FECHA = '2026-11-21';

const rutasProtegidas = [
  ['/auth/me', 'Perfil autenticado'],
  ['/pedidos', 'Pedidos del cliente'],
  ['/admin/productos', 'Productos administrativos'],
  ['/admin/categorias', 'Categorías administrativas'],
  ['/admin/inventario/movimientos', 'Movimientos de inventario'],
  ['/operaciones/pedidos', 'Pedidos administrativos'],
  ['/operaciones/produccion', 'Pedidos de producción'],
  [`/reportes/ventas?desde=${FECHA}&hasta=${FECHA}`, 'Reporte de ventas'],
];

let aprobadas = 0;
let fallidas = 0;
let omitidas = 0;

async function verificar(nombre, ruta, token, estadosEsperados) {
  const encabezados = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const respuesta = await fetch(BASE + ruta, { method: 'GET', headers: encabezados });
    const correcto = estadosEsperados.includes(respuesta.status);
    const prefijo = correcto ? 'OK' : 'FALLO';
    console.log(`${prefijo} | ${nombre} | HTTP ${respuesta.status} | esperado: ${estadosEsperados.join('/')}`);
    if (correcto) aprobadas++;
    else fallidas++;
  } catch (error) {
    fallidas++;
    console.log(`FALLO | ${nombre} | ${error.message}`);
  }
}

console.log(`Auditoría HTTP no destructiva: ${BASE}`);

for (const [ruta, nombre] of rutasProtegidas) {
  await verificar(`${nombre}: sin token`, ruta, null, [401]);
}

for (const [ruta, nombre] of rutasProtegidas) {
  await verificar(`${nombre}: token inválido`, ruta, 'token.invalido.de.prueba', [401]);
}

// Tokens de prueba opcionales. No se imprimen ni se guardan en el proyecto.
const roles = [
  { variable: 'TOKEN_CLIENTE', rol: 'Cliente', permitidas: ['/auth/me', '/pedidos'] },
  { variable: 'TOKEN_ADMIN', rol: 'Administrador', permitidas: [
    '/auth/me', '/admin/productos', '/admin/categorias',
    '/admin/inventario/movimientos', '/operaciones/pedidos', '/reportes/ventas',
  ] },
  { variable: 'TOKEN_PRODUCCION', rol: 'Producción', permitidas: ['/auth/me', '/operaciones/produccion'] },
];

for (const configuracion of roles) {
  const token = process.env[configuracion.variable];
  if (!token) {
    omitidas++;
    console.log(`OMITIDO | ${configuracion.rol}: no se proporcionó ${configuracion.variable}`);
    continue;
  }
  for (const [ruta, nombre] of rutasProtegidas) {
    const rutaBase = ruta.split('?')[0];
    // Una ruta permitida puede devolver un error de validación (400) según los datos,
    // pero las rutas GET de este listado normalmente responden 200.
    const estados = configuracion.permitidas.includes(rutaBase) ? [200] : [403];
    await verificar(`${configuracion.rol}: ${nombre}`, ruta, token, estados);
  }
}

console.log(`\nRESULTADO: ${aprobadas} aprobadas, ${fallidas} fallidas, ${omitidas} grupos por rol omitidos.`);
console.log('Las pruebas omitidas no cuentan como aprobadas.');
if (fallidas > 0) process.exitCode = 1;