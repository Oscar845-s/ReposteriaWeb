# JORNADA 12-B — Auditoría de seguridad de Dulce Hogar

**Proyecto:** ReposteriaWeb / Dulce Hogar  
**Materia:** Verificación y Validación de Software  
**Responsable:** Oscar Armando Medina Gutiérrez  
**Fecha:** 21 de noviembre de 2026  
**Requerimientos:** RF01, RF02, RF08, RF09, RF10, RF11, RF13, RF14, RF15, RF16, RF17, RF18, RF20

> **Alcance:** revisión de seguridad de la versión local del proyecto. No constituye una auditoría de penetración profesional ni certifica seguridad de producción. No requiere reiniciar ni modificar la base de datos. Las pruebas automáticas de esta guía solo realizan solicitudes GET, sin operaciones de escritura.

## 1. Objetivo y criterios de aceptación

Verificar que las operaciones sensibles estén protegidas **en el backend**, no solo mediante rutas React. Comprobar rechazo de tokens ausentes o inválidos, autorización por rol, límites de entrada, tratamiento de secretos, exposición de errores y dependencias. Registrar evidencias y corregir únicamente hallazgos confirmados.

**Resultado esperado:** ninguna ruta protegida entrega datos sensibles sin token; un usuario con rol Cliente o Producción no puede consultar funciones de Administrador; los errores no revelan credenciales ni detalles internos; los secretos no están versionados.

## 2. Preparación y respaldo

Desde Git Bash:

```bash
cd /c/6to/reposteria-web
git status
mkdir -p pruebas docs
node --version
```

Conserva las terminales de backend y frontend abiertas. **No compartas el contenido de `.env`, tokens JWT ni contraseñas**. Si `git status` muestra cambios, revísalos y respáldalos antes de editar.

## 3. Script completo de comprobaciones HTTP (solo lectura)

**Crear:** `pruebas/auditoria-seguridad.mjs`

```javascript
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
```

**Ejecutar:**

```bash
cd /c/6to/reposteria-web
node pruebas/auditoria-seguridad.mjs
```

El script espera **16 verificaciones sin credenciales** (8 sin token y 8 con token inválido). Las verificaciones por rol son opcionales y solo deben ejecutarse con cuentas de prueba. Si el backend usa reglas de autorización distintas, un `FALLO` exige revisar la ruta y el rol real, no cambiar arbitrariamente el resultado esperado.

**Precaución con credenciales:** para las pruebas por rol, proporciona los tokens únicamente mediante variables de entorno temporales de la terminal y evita escribirlos en comandos que queden guardados en historial. No los copies en capturas, commits, chats ni documentos. Si no cuentas con un procedimiento seguro para obtenerlos, registra esos grupos como pendientes.

## 4. Revisión de rutas y autorización del backend

Revisa estos archivos, sin copiarlos al informe si contienen secretos:

```bash
cat backend/src/routes/authRutas.js
cat backend/src/routes/adminRutas.js
cat backend/src/routes/operacionesRutas.js
cat backend/src/routes/reportesRutas.js
cat backend/src/routes/pedidoRutas.js
cat backend/src/app.js
```

**Criterios de inspección:**

1. Las rutas administrativas llaman a `autenticar` y verifican `req.usuario.rol === 'Administrador'` antes de consultar o modificar datos.
2. Las rutas de producción verifican explícitamente el rol correspondiente. Una ruta React protegida no reemplaza el control del servidor.
3. El cliente solo puede consultar y cancelar sus propios pedidos; el backend debe filtrar por el identificador del usuario autenticado, nunca confiar en un `idUsuario` enviado por el navegador.
4. Las transiciones de pedidos verifican el estado actual en SQL Server y rechazan transiciones ilegales con un código adecuado, por ejemplo `409`.
5. Las actualizaciones de stock y estado se realizan con transacciones y validación de existencias.
6. Las consultas SQL que incorporan datos de entrada utilizan `.input(...)` con parámetros; no concatenan texto del usuario dentro del SQL.
7. `POST`, `PUT` y `PATCH` validan tipos, límites, rangos, identificadores y campos permitidos. Los permisos también deben aplicarse a operaciones de escritura, que **no** cubre el script de GET.
8. Los mensajes de error públicos no contienen trazas, consultas SQL, contraseñas, tokens ni detalles de conexión.

**No declares estas comprobaciones como aprobadas hasta inspeccionar el código y, cuando corresponda, realizar pruebas manuales con cuentas de prueba.**

## 5. Comprobaciones de configuración y dependencias

### 5.1 Exclusión de secretos de Git

```bash
cd /c/6to/reposteria-web
cat .gitignore
git ls-files | grep -E '(^|/)(\.env($|\.)|node_modules/|.*\.(pem|key|pfx)$)' || true
```

**Criterio:** no deben aparecer `.env` reales, claves privadas, certificados con clave ni carpetas `node_modules`. Un `.env.example` sin secretos reales sí es válido. Si se descubre un secreto versionado, retirar el archivo del control de versiones **no basta**: también se debe rotar la credencial expuesta.

### 5.2 Auditoría de dependencias

```bash
cd /c/6to/reposteria-web/backend
npm audit --omit=dev

cd /c/6to/reposteria-web/frontend
npm audit
```

Registrar vulnerabilidades, severidad, paquete afectado y recomendación. **No ejecutar `npm audit fix --force` automáticamente**: podría cambiar versiones mayores y romper el proyecto. Revisar cada hallazgo antes de actualizar.

### 5.3 Configuración HTTP

Comprobar en `backend/src/app.js`:

- CORS restringido al origen esperado mediante `FRONTEND_ORIGIN`, no `*` para operaciones sensibles.
- `express.json` con límite razonable (en la versión revisada se usa `100kb`).
- Ruta 404 y manejador central de errores.
- Cabecera `X-Powered-By` desactivada.
- Si el proyecto se publica: HTTPS, cabeceras de seguridad, limitación de intentos de inicio de sesión y configuración de proxy según el proveedor de alojamiento. **Estos controles no se dan por implementados solo por ejecutar la auditoría.**

### 5.4 JWT y sesión

Verificar que:

- El secreto JWT esté en variable de entorno, no en el repositorio.
- La firma se valide con algoritmo permitido y expiración.
- El token inválido o vencido responda 401.
- El rol se determine de forma confiable en el backend.
- `sessionStorage` se borre al cerrar sesión. Nota: `sessionStorage` no protege frente a XSS; evitar contenido HTML no confiable y mantener dependencias actualizadas.

## 6. Pruebas manuales de aceptación (12)

| ID | Prueba | Resultado esperado |
|---|---|---|
| SEG-01 | Consultar `/api/pedidos` sin token | HTTP 401 |
| SEG-02 | Consultar `/api/reportes/ventas` sin token | HTTP 401 |
| SEG-03 | Consultar `/api/admin/productos` sin token | HTTP 401 |
| SEG-04 | Consultar producción sin token | HTTP 401 |
| SEG-05 | Usar un token JWT inválido | HTTP 401 |
| SEG-06 | Cliente intenta consultar reportes | HTTP 403 |
| SEG-07 | Cliente intenta acceder a administración | HTTP 403 |
| SEG-08 | Producción intenta acceder a reportes | HTTP 403 |
| SEG-09 | Administrador consulta reporte con fecha imposible (`2026-02-30`) | HTTP 400 |
| SEG-10 | Administrador consulta fechas invertidas | HTTP 400 |
| SEG-11 | Cerrar sesión y regresar a ruta protegida | Se solicita autenticación |
| SEG-12 | Revisar Git y archivos de entorno | Ningún secreto real versionado |

Las pruebas SEG-06 a SEG-10 requieren cuentas o tokens de prueba con los roles adecuados. No usar credenciales de terceros. Las pruebas de cambios de estado y de autorización sobre pedidos ajenos deben realizarse en un entorno de prueba y registrarse por separado.

## 7. Registro de hallazgos

Crea `docs/RESULTADOS_SEGURIDAD.md` con esta plantilla:

```markdown
# Resultados de auditoría de seguridad — Dulce Hogar

Fecha de ejecución: __________
Entorno: Local / Desarrollo
Commit evaluado: __________

## Resultados automáticos
- Verificaciones aprobadas: ___
- Fallidas: ___
- Omitidas: ___

## Resultados manuales
| Prueba | Estado (Aprobada/Fallida/Pendiente) | Evidencia |
|---|---|---|
| SEG-01 a SEG-12 | Pendiente | |

## Hallazgos
| ID | Riesgo (Alto/Medio/Bajo) | Evidencia | Acción correctiva | Estado |
|---|---|---|---|---|

## Dictamen
Pendiente hasta completar las verificaciones y corregir hallazgos críticos.
```

**Clasificación sugerida:** Alto: exposición de datos, escalada de privilegios o escritura sin autorización. Medio: validaciones incompletas o dependencias vulnerables explotables. Bajo: mensajes de error poco claros o endurecimiento no crítico. La clasificación final depende de la evidencia.

## 8. Comprobación de regresión

```bash
cd /c/6to/reposteria-web
node pruebas/prueba-integracion.mjs
node pruebas/auditoria-seguridad.mjs

cd frontend
npm run lint
npm run build
```

Si alguna prueba falla, guarda el mensaje completo **sin secretos**. No avances a documentación final con fallas críticas sin resolver.

## 9. Git

```bash
cd /c/6to/reposteria-web
git status
git add pruebas/auditoria-seguridad.mjs docs/RESULTADOS_SEGURIDAD.md docs/JORNADA_12_B.md
git commit -m "test: agregar auditoria de seguridad de jornada 12-B"
git push origin main
```

**Importante:** el comando `git add` supone que copiaste esta guía a `docs/JORNADA_12_B.md` y creaste el archivo de resultados. Si aún no los creaste, ajusta la lista. Nunca agregues `.env` ni tokens al commit.

## 10. Cierre y siguiente jornada

La Jornada 12-B se considera concluida cuando el script pasa, se completan las pruebas aplicables por rol, se inspeccionan las operaciones de escritura y se registran los hallazgos. Después se prepara **JORNADA_12_C: documentación final, manual de usuario, manual técnico, matriz de trazabilidad y preparación del despliegue**.
