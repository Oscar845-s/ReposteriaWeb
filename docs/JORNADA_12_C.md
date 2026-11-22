# JORNADA 12-C — Documentación final, evidencias y preparación de entrega

**Proyecto:** ReposteriaWeb / Dulce Hogar  
**Materia:** Verificación y Validación de Software  
**Responsable:** Oscar Armando Medina Gutiérrez  
**Fecha:** 21 de noviembre de 2026  
**Alcance:** cierre documental del prototipo local; preparación de despliegue, **no publicación automática**.

> **Punto de control:** la Jornada 12-B se entregó, pero todavía no se han compartido sus resultados de auditoría ni `npm audit`. Por ello, esta jornada **no considera aprobada** la auditoría de seguridad ni declara que el sistema está listo para producción. Registra esos resultados antes del dictamen final.

## 1. Objetivo

Consolidar documentación técnica y de usuario, una matriz de trazabilidad, evidencias de V&V, procedimientos de instalación y una lista de verificación previa a despliegue. No modificar el esquema de SQL Server ni rehacer las jornadas anteriores.

**Entregables:**

```text
reposteria-web/
├── README.md                       ACTUALIZAR (respaldar el anterior)
├── docs/
│   ├── JORNADA_12_C.md            NUEVO (copia de esta guía)
│   ├── MANUAL_USUARIO.md          NUEVO
│   ├── MANUAL_TECNICO.md          NUEVO
│   ├── MATRIZ_TRAZABILIDAD.md     NUEVO
│   ├── INFORME_FINAL_VV.md        NUEVO
│   └── CHECKLIST_DESPLIEGUE.md   NUEVO
└── pruebas/
    ├── prueba-integracion.mjs      EXISTENTE (12-A)
    └── auditoria-seguridad.mjs     EXISTENTE (12-B)
```

No se necesitan paquetes nuevos. **Los bloques siguientes son el contenido completo de cada archivo.** Crea las carpetas y copia cada bloque en la ruta indicada.

## 2. Preparación y respaldo

Desde Git Bash:

```bash
cd /c/6to/reposteria-web
git status
mkdir -p docs pruebas
cp README.md README_ANTERIOR_TEMP.md 2>/dev/null || true
node --version
npm --version
```

Si `git status` muestra modificaciones inesperadas, revísalas antes de continuar. El respaldo temporal `README_ANTERIOR_TEMP.md` **no debe incluirse en el commit**; elimínalo cuando hayas revisado el nuevo README.

## 3. Archivo completo: `README.md`

```markdown
# Dulce Hogar — Sistema web de repostería

Proyecto académico de Verificación y Validación de Software.

**Responsable:** Oscar Armando Medina Gutiérrez.

## Descripción

Aplicación web para consultar productos de repostería, registrarse, iniciar sesión, gestionar un carrito, confirmar y consultar pedidos, y administrar el catálogo, el inventario, la producción y los reportes de ventas según el rol.

## Tecnologías

- Frontend: React, Vite, React Router, Tailwind CSS y JavaScript.
- Backend: Node.js, Express y API REST.
- Base de datos: Microsoft SQL Server; conexión local configurada mediante variables de entorno.
- Autenticación: JWT; el cliente conserva el token de sesión en `sessionStorage`.

## Roles

- **Cliente:** catálogo, carrito, confirmación, historial y cancelación permitida.
- **Administrador:** productos, categorías, inventario, seguimiento de pedidos y reportes.
- **Personal de producción:** pedidos en preparación y marcado de pedidos listos.

## Requisitos de ejecución local

- Node.js compatible con los paquetes instalados (entorno de desarrollo utilizado: Node.js 24).
- npm.
- SQL Server disponible y base de datos `DulceHogar` creada mediante los scripts del proyecto.
- Variables de entorno del backend configuradas **localmente**, sin publicar secretos.

## Inicio local

En una terminal:

```bash
cd backend
npm install
npm run dev
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Los nombres de scripts disponibles se pueden verificar con `npm run` en cada carpeta. La URL del backend utilizada por el frontend en desarrollo es `http://localhost:3000/api`; ajustarla antes de cualquier despliegue remoto.

## Comprobaciones

```bash
cd frontend
npm run lint
npm run build

cd ../
node pruebas/prueba-integracion.mjs
node pruebas/auditoria-seguridad.mjs
```

Para las pruebas HTTP, el backend debe estar en ejecución. Las comprobaciones opcionales con usuarios de prueba pueden aparecer como **OMITIDAS** y no cuentan como aprobadas.

## Documentación

- `docs/MANUAL_USUARIO.md`
- `docs/MANUAL_TECNICO.md`
- `docs/MATRIZ_TRAZABILIDAD.md`
- `docs/INFORME_FINAL_VV.md`
- `docs/CHECKLIST_DESPLIEGUE.md`

## Alcance y limitaciones

- El sistema es un **prototipo académico local**; su publicación requiere revisar seguridad, infraestructura, variables de entorno y acceso a SQL Server.
- Los ingresos de reportes incluyen **pedidos entregados**, atribuidos a la **fecha local de creación del pedido**, no a una fecha de cobro o entrega.
- No se presupone integración de pagos en línea ni envío a domicilio.
- No se deben publicar credenciales, tokens, archivos `.env` ni datos personales reales.

## Estado de validación

Consultar `docs/INFORME_FINAL_VV.md`. Las pruebas no ejecutadas o sin evidencia deben marcarse como **PENDIENTES**, nunca como aprobadas.
```

## 4. Archivo completo: `docs/MANUAL_USUARIO.md`

```markdown
# Manual de usuario — Dulce Hogar

**Versión:** prototipo académico. **Responsable:** Oscar Armando Medina Gutiérrez.

## 1. Acceso al sistema

Abrir la dirección que muestre Vite en la terminal (normalmente `http://localhost:5173`). La aplicación necesita el backend y SQL Server funcionando para cargar datos reales.

## 2. Cliente

1. Abrir **Catálogo** para consultar productos, categorías, precios y disponibilidad.
2. Seleccionar los productos y cantidades deseados.
3. Abrir **Carrito** y comprobar cantidades y total.
4. Iniciar sesión con una cuenta de Cliente; si no existe, usar **Registro**.
5. Confirmar el pedido. Comprobar que el carrito quede vacío después de la confirmación.
6. Abrir **Mis pedidos** para revisar el estado y los detalles.
7. La opción de cancelación solo se muestra cuando el pedido está en estado **Pendiente**.

## 3. Administrador

1. Iniciar sesión con una cuenta de **Administrador**.
2. Abrir **Administración** para crear o editar productos y categorías.
3. Ajustar inventario indicando producto, cantidad positiva o negativa y motivo.
4. Abrir **Administración de pedidos** para iniciar la preparación de pedidos pendientes y registrar la entrega de pedidos listos.
5. Abrir **Reportes de ventas**, seleccionar un intervalo de fechas y consultar indicadores, estados, ventas diarias y productos vendidos.

**Importante:** el reporte cuenta como ingresos únicamente los pedidos **Entregados**. La fecha usada para agrupar ventas es la fecha de creación del pedido expresada en hora local de Baja California.

## 4. Personal de producción

1. Iniciar sesión con el rol de producción.
2. Abrir **Producción**.
3. Consultar pedidos en preparación y los productos solicitados.
4. Al terminar la preparación, usar **Marcar como listo**.
5. La entrega final corresponde al administrador.

## 5. Estados de pedido

`Pendiente → En preparación → Listo para entrega → Entregado`.

La cancelación permitida para el cliente se realiza desde **Pendiente**; el sistema restaura inventario cuando corresponde.

## 6. Problemas frecuentes

| Síntoma | Revisión |
|---|---|
| El catálogo no carga | Verificar backend, SQL Server y conexión a la API. |
| No permite confirmar pedido | Revisar sesión, stock y mensajes del formulario. |
| No aparece una venta en ingresos | Verificar que el pedido esté **Entregado** y que el filtro incluya la fecha local de creación. |
| Acceso denegado | Verificar que la cuenta tenga el rol correcto. |
| Carrito conserva artículos tras confirmar | No volver a comprar sin revisar primero **Mis pedidos**; reportar anomalía. |

## 7. Buenas prácticas

No compartir contraseñas ni tokens. Cerrar sesión al terminar. Evitar usar datos personales reales durante las pruebas.
```

## 5. Archivo completo: `docs/MANUAL_TECNICO.md`

```markdown
# Manual técnico — Dulce Hogar

**Responsable:** Oscar Armando Medina Gutiérrez.

## 1. Arquitectura

- **Frontend (`frontend/`)**: React/Vite; páginas, componentes, contextos, hooks y servicios HTTP.
- **Backend (`backend/`)**: Express; rutas públicas y protegidas, servicios y conexión a SQL Server.
- **Persistencia (`database/`)**: SQL Server, tablas de usuarios, productos, categorías, pedidos, detalle, inventario y estados; vistas de consulta.

Flujo general: `Navegador React → HTTP /api → Express (JWT y rol) → SQL Server`.

## 2. Carpetas importantes

```text
frontend/src/pages/          Vistas de cliente, administrador, producción y reportes
frontend/src/context/        Contextos de autenticación, catálogo y carrito
frontend/src/services/       Cliente HTTP y servicios de presentación
backend/src/routes/          Endpoints de autenticación, catálogo, pedidos, administración,
                             operaciones y reportes
backend/src/config/          Conexión a base de datos
database/                    Scripts SQL del esquema y datos de prueba
pruebas/                     Scripts de integración y seguridad
docs/                        Documentación y evidencias
```

## 3. Configuración

Revisar `backend/.env` **solo en la máquina de desarrollo**. No copiar secretos al repositorio ni al informe. Verificar nombres de variables contra `backend/src/config/database.js`, `backend/src/routes/authRutas.js` y `backend/src/app.js`. Variables conocidas por su uso en el código: `FRONTEND_ORIGIN` y secreto de firma JWT (nombre exacto a confirmar en el backend).

La conexión de desarrollo ha utilizado SQL Server con autenticación integrada de Windows. **Esa modalidad no debe suponerse compatible con un hosting Linux o una base remota**; verificar controlador, credenciales y red antes de elegir proveedor.

## 4. Rutas API principales

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/salud` | Público |
| GET | `/api/productos` | Público |
| GET | `/api/categorias` | Público |
| POST | `/api/auth/registro` | Público |
| POST | `/api/auth/login` | Público |
| GET | `/api/auth/me` | Autenticado |
| GET / POST | `/api/pedidos` | Cliente autenticado |
| PATCH | `/api/pedidos/:id/cancelar` | Cliente propietario, según estado |
| GET | `/api/admin/productos` | Administrador |
| GET | `/api/operaciones/pedidos` | Administrador |
| GET | `/api/operaciones/produccion` | Producción |
| GET | `/api/reportes/ventas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | Administrador |

La tabla resume las rutas principales; para métodos y validaciones exactas, revisar los archivos de rutas correspondientes.

## 5. Reglas importantes

- La autorización debe verificarse en el backend, no solo en las rutas React.
- Las compras y cancelaciones deben mantener consistencia entre pedido, detalle e inventario mediante transacciones.
- El carrito se almacena por correo en `localStorage` y se vacía de forma sincrónica tras confirmar un pedido exitoso.
- Los reportes consideran entregados (`idEstado = 4`) y convierten el periodo local de Baja California a límites UTC. **Comprobar que la corrección de Jornada 12-A esté instalada**.
- Los importes históricos provienen del detalle del pedido, no de precios actuales del catálogo.

## 6. Comandos de verificación

```bash
cd frontend && npm run lint && npm run build
cd ../
node pruebas/prueba-integracion.mjs
node pruebas/auditoria-seguridad.mjs
cd backend && npm audit --omit=dev
cd ../frontend && npm audit
```

**No ejecutar** `npm audit fix --force` sin revisar cambios de dependencias. No volver a ejecutar scripts destructivos o de reinicialización de la base con datos reales.

## 7. Incidencias conocidas y seguimiento

- **Carrito:** se detectó persistencia incorrecta después de confirmar; se corrigió guardando `[]` antes de desmontar el proveedor. Revalidar con prueba de regresión.
- **Reportes:** se detectó desfase de fechas UTC frente a Baja California. Se propuso y probó conversión de límites locales a UTC; verificar su aplicación final en backend y agrupación por día.
- **Auditoría 12-B:** resultados todavía no aportados al cierre de esta guía. Mantener estado pendiente hasta disponer de evidencias.
```

## 6. Archivo completo: `docs/MATRIZ_TRAZABILIDAD.md`

```markdown
# Matriz de trazabilidad de requerimientos — Dulce Hogar

**Criterio:** la columna de estado no equivale a aprobación de V&V. Marcar **APROBADO** solo tras adjuntar evidencia de ejecución.

| RF | Función | Evidencia de implementación | Prueba / evidencia a registrar | Estado V&V |
|---|---|---|---|---|
| RF01 | Registro de usuario | `backend/src/routes/authRutas.js`, `frontend/src/pages/Registro.jsx` | Registro válido e inválido | PENDIENTE DE EVIDENCIA |
| RF02 | Inicio y cierre de sesión | `authRutas.js`, `AuthProvider.jsx`, `Login.jsx` | Sesión válida, incorrecta, cierre | PENDIENTE DE EVIDENCIA |
| RF03 | Catálogo por categoría | `catalogoRutas.js`, `Catalogo.jsx` | Consulta y filtrado | PENDIENTE DE EVIDENCIA |
| RF04 | Detalle del producto | `DetalleProducto.jsx`, catálogo | Imagen, precio, stock, descripción | PENDIENTE DE EVIDENCIA |
| RF05 | Agregar al carrito | `CarritoProvider.jsx`, `Carrito.jsx` | Agregar producto | PENDIENTE DE EVIDENCIA |
| RF06 | Modificar cantidades | `CarritoProvider.jsx` | Aumentar/disminuir, límites | PENDIENTE DE EVIDENCIA |
| RF07 | Persistencia de carrito | `carritoServicio.js` | Recarga y cambio de sesión | PENDIENTE DE EVIDENCIA |
| RF08 | Confirmar pedido | `pedidoRutas.js`, `Carrito.jsx` | Confirmación, stock, carrito vacío | PENDIENTE DE EVIDENCIA |
| RF09 | Historial de pedidos | `pedidoRutas.js`, `Pedidos.jsx` | Consulta por cliente | PENDIENTE DE EVIDENCIA |
| RF10 | Administración de productos | `adminRutas.js`, `Administracion.jsx` | Crear, editar, activar | PENDIENTE DE EVIDENCIA |
| RF11 | Administración de categorías | `adminRutas.js`, `Administracion.jsx` | Crear, editar, desactivar | PENDIENTE DE EVIDENCIA |
| RF12 | **Revisar definición original** | No verificado en el material consultado | Recuperar SRS y definir caso | PENDIENTE DE DEFINICIÓN |
| RF13 | Ajustes de inventario | `adminRutas.js`, `Administracion.jsx` | Entrada, salida y movimientos | PENDIENTE DE EVIDENCIA |
| RF14 | Seguimiento administrativo | `operacionesRutas.js`, `AdministracionPedidos.jsx` | Pendiente → preparación → entrega | PENDIENTE DE EVIDENCIA |
| RF15 | Gestión de producción | `operacionesRutas.js`, `Produccion.jsx` | Preparación → listo | PENDIENTE DE EVIDENCIA |
| RF16 | Reportes de ventas | `reportesRutas.js`, vista de reportes | Fechas locales, ingresos, estados | PENDIENTE DE EVIDENCIA |
| RF17 | Cancelación y restauración | `pedidoRutas.js`, `Pedidos.jsx` | Cancelación válida, stock restaurado | PENDIENTE DE EVIDENCIA |
| RF18 | Roles y autorización | `authRutas.js`, `RutaProtegida.jsx` | 401, 403 y accesos permitidos | PENDIENTE DE EVIDENCIA |
| RF19 | Recuperación de contraseña | **No verificada / pendiente de alcance** | Confirmar alcance y diseñar prueba | PENDIENTE |
| RF20 | Validaciones de pedidos | `pedidoRutas.js`, `Carrito.jsx` | Cantidades, inventario y errores | PENDIENTE DE EVIDENCIA |

**Nota:** completar o ajustar la descripción de RF12, RF19 y cualquier numeración con el documento SRS oficial. No declarar cobertura total mientras haya requisitos sin definición o sin prueba.
```

## 7. Archivo completo: `docs/INFORME_FINAL_VV.md`

```markdown
# Informe final de verificación y validación — Dulce Hogar

**Responsable:** Oscar Armando Medina Gutiérrez  
**Materia:** Verificación y Validación de Software  
**Fecha del corte:** 21 de noviembre de 2026  
**Versión / commit:** PENDIENTE DE REGISTRAR (`git rev-parse --short HEAD`)

## 1. Objetivo

Evaluar la conformidad del prototipo con los requisitos y registrar pruebas, anomalías, correcciones y riesgos pendientes.

## 2. Ambiente de prueba

- SO de desarrollo: Windows.
- Frontend: React/Vite.
- Backend: Node.js/Express.
- BD: SQL Server (`DulceHogar`).
- Fecha y hora de ejecución: PENDIENTE DE REGISTRAR.
- Versiones Node/npm: PENDIENTE DE REGISTRAR.

## 3. Evidencias ya comunicadas

| Identificador | Actividad | Resultado reportado | Limitación |
|---|---|---|---|
| INT-12A | `node pruebas/prueba-integracion.mjs` | **10/10 correctas, 0 fallidas** | 3 inicios de sesión por rol **omitidos** por falta de credenciales. |
| REG-CARRITO | Corrección de vaciado tras compra | Usuario indicó continuidad tras aplicar corrección | Conservar captura o registro de repetición de prueba. |
| REG-FECHAS | Consulta SQL de fecha local Baja California | Pedido #17 incluido correctamente en el 21/11/2026 | Comprobar respuesta del endpoint y UI tras instalar corrección. |
| SEG-12B | Auditoría HTTP de seguridad | **PENDIENTE DE RESULTADO** | No declarar aprobada. |
| DEP | `npm audit` frontend y backend | **PENDIENTE DE RESULTADO** | No declarar ausencia de vulnerabilidades. |
| LINT | `npm run lint` | **PENDIENTE DE RESULTADO FINAL** | Existieron advertencias; se propusieron correcciones. |
| BUILD | `npm run build` | **PENDIENTE DE RESULTADO FINAL** | No se ha recibido evidencia de la ejecución final. |

## 4. Registro de casos de prueba

| ID | Requisito | Acción | Esperado | Real | Estado | Evidencia |
|---|---|---|---|---|---|---|
| VV-01 | RF01-RF02 | Registro y sesión | Usuario autenticado | POR REGISTRAR | PENDIENTE | — |
| VV-02 | RF03-RF04 | Catálogo y detalle | Datos correctos | POR REGISTRAR | PENDIENTE | — |
| VV-03 | RF05-RF08 | Compra | Pedido creado, carrito vacío | POR REGISTRAR | PENDIENTE | — |
| VV-04 | RF09,RF17 | Historial/cancelación | Estado y stock consistentes | POR REGISTRAR | PENDIENTE | — |
| VV-05 | RF10-RF13 | Administración | CRUD y movimientos correctos | POR REGISTRAR | PENDIENTE | — |
| VV-06 | RF14-RF15 | Producción/entrega | Transiciones autorizadas | POR REGISTRAR | PENDIENTE | — |
| VV-07 | RF16 | Reportes | Datos correctos por día local | POR REGISTRAR | PENDIENTE | — |
| VV-08 | RF18 | Seguridad por rol | 401/403 correctos | POR REGISTRAR | PENDIENTE | — |

## 5. Anomalías y seguimiento

| ID | Descripción | Causa identificada | Acción correctiva | Estado |
|---|---|---|---|---|
| AN-01 | Carrito no se vaciaba tras confirmar | Desmontaje del proveedor antes de persistir el estado vacío | Guardar `[]` sincrónicamente antes del `dispatch` | CORREGIDA; REVALIDAR |
| AN-02 | Ventas de la tarde aparecían al filtrar día siguiente | Tiempos UTC interpretados como fechas locales | Convertir límites locales a UTC y agrupar por fecha local | CORRECCIÓN ENTREGADA; REVALIDAR UI/API |
| AN-03 | Advertencias de hooks React | Efectos con cambios sincrónicos y dependencias | Refactorización de componentes | CORRECCIÓN ENTREGADA; VERIFICAR LINT |

## 6. Riesgos pendientes

- Falta evidencia de auditoría 12-B y resultados de `npm audit`.
- Faltan pruebas autenticadas de los tres roles en el script de integración.
- Verificar RF12 y RF19 contra el SRS definitivo.
- Despliegue remoto no validado: conexión SQL Server integrada de Windows, HTTPS, secretos, CORS, límites de intentos, copias de seguridad.

## 7. Dictamen provisional

**DICTAMEN: APROBACIÓN FINAL PENDIENTE.** El prototipo tiene funcionalidad implementada y pruebas parciales satisfactorias, pero faltan evidencias de seguridad, compilación final y cobertura de requisitos. No se certifica preparación para producción.

**Fecha y firma del responsable:** __________________________

**Fecha y firma de quien valida:** __________________________
```

## 8. Archivo completo: `docs/CHECKLIST_DESPLIEGUE.md`

```markdown
# Lista de verificación previa al despliegue — Dulce Hogar

**Estado actual:** PROTOTIPO LOCAL. Marcar cada casilla únicamente después de verificarla.

## 1. Calidad y cobertura

- [ ] `npm run lint` del frontend sin errores ni advertencias.
- [ ] `npm run build` del frontend correcto.
- [ ] Pruebas de integración sin fallos; omisiones justificadas.
- [ ] Auditoría 12-B ejecutada y hallazgos registrados.
- [ ] `npm audit` revisado en backend y frontend.
- [ ] Casos críticos de compra, cancelación, inventario y roles comprobados.
- [ ] Reportes correctos para fechas locales de Baja California y cambios de horario.
- [ ] SRS, RF12 y RF19 revisados; pendientes documentados.

## 2. Infraestructura

- [ ] Elegir hosting compatible con Node.js/Express y SQL Server.
- [ ] Verificar compatibilidad del controlador SQL con el SO del servidor.
- [ ] No asumir que la autenticación integrada de Windows funcionará en un hosting Linux.
- [ ] Configurar acceso a BD con permisos mínimos y conexión cifrada.
- [ ] Definir estrategia de migración y respaldo de SQL Server; probar restauración.
- [ ] Establecer variables de entorno y secreto JWT robusto en el proveedor, sin Git.
- [ ] Configurar `FRONTEND_ORIGIN` para el dominio definitivo.
- [ ] Reemplazar la URL fija `http://localhost:3000/api` del frontend por configuración de entorno de Vite o proxy de despliegue, sin incluir secretos en variables `VITE_*`.
- [ ] Configurar HTTPS, encabezados de seguridad y políticas de caché.
- [ ] Implementar o verificar limitación de intentos en autenticación.
- [ ] Definir registros, monitoreo y respuesta ante errores sin exponer datos personales.
- [ ] Verificar políticas de privacidad, retención y borrado de datos.

## 3. Publicación y reversión

- [ ] Crear respaldo verificado de BD antes del despliegue.
- [ ] Probar frontend y backend en entorno de pruebas equivalente al definitivo.
- [ ] Confirmar que `/api/salud` responda con conexión a BD.
- [ ] Probar cliente, administrador y producción con cuentas de prueba.
- [ ] Confirmar creación de pedido, inventario y reportes.
- [ ] Definir procedimiento de reversión del código y restauración de BD.
- [ ] Documentar fecha, versión y responsable de la publicación.

**No publicar datos de prueba con información personal real ni credenciales de desarrollo.**
```

## 9. Pruebas de aceptación documental (12)

| ID | Comprobación | Esperado |
|---|---|---|
| DOC-01 | `README.md` existe y describe el proyecto | Sí |
| DOC-02 | `MANUAL_USUARIO.md` incluye los tres roles | Sí |
| DOC-03 | `MANUAL_TECNICO.md` explica frontend/backend/BD | Sí |
| DOC-04 | `MATRIZ_TRAZABILIDAD.md` cubre RF01–RF20 | Sí, con pendientes identificados |
| DOC-05 | `INFORME_FINAL_VV.md` registra INT-12A | 10/10, 3 omitidas |
| DOC-06 | Auditoría 12-B no se declara aprobada sin resultados | PENDIENTE |
| DOC-07 | Corrección de zona horaria documentada | Sí |
| DOC-08 | Anomalía del carrito documentada | Sí |
| DOC-09 | `CHECKLIST_DESPLIEGUE.md` distingue local de producción | Sí |
| DOC-10 | No se publican secretos en los documentos | Sí |
| DOC-11 | Archivos Markdown versionables | Sí |
| DOC-12 | Git limpio después de commit | Sí |

Comprobar archivos:

```bash
cd /c/6to/reposteria-web
ls -lh README.md docs/MANUAL_USUARIO.md docs/MANUAL_TECNICO.md \
  docs/MATRIZ_TRAZABILIDAD.md docs/INFORME_FINAL_VV.md docs/CHECKLIST_DESPLIEGUE.md

git diff --check
```

**Reejecutar comprobaciones técnicas** (con backend activo para HTTP):

```bash
cd /c/6to/reposteria-web/frontend
npm run lint
npm run build

cd ../
node pruebas/prueba-integracion.mjs
node pruebas/auditoria-seguridad.mjs

cd backend
npm audit --omit=dev
cd ../frontend
npm audit
```

**Registrar resultados reales** en `docs/INFORME_FINAL_VV.md`; no inventar aprobaciones. Si una prueba falla, abrir incidencia y no cerrar la V&V hasta corregir o documentar el riesgo.

## 10. Git y cierre

```bash
cd /c/6to/reposteria-web
# Copiar esta guía a docs/JORNADA_12_C.md si aún no está allí.
rm -f README_ANTERIOR_TEMP.md
git status
git diff --check

git add README.md docs/JORNADA_12_C.md docs/MANUAL_USUARIO.md \
  docs/MANUAL_TECNICO.md docs/MATRIZ_TRAZABILIDAD.md \
  docs/INFORME_FINAL_VV.md docs/CHECKLIST_DESPLIEGUE.md

git commit -m "docs: documentar entrega y verificacion final de Dulce Hogar"
git push origin main
git status
```

Si aún no se ha agregado `docs/JORNADA_12_C.md`, cópialo primero o quita esa ruta del comando `git add`. Antes del commit, comprobar `git diff --cached --stat` y `git diff --cached --check`.

## 11. Qué enviar para cerrar el proyecto

Comparte **solo** la salida (sin tokens ni contraseñas) de:

1. `npm run lint` y `npm run build`.
2. `node pruebas/prueba-integracion.mjs`.
3. `node pruebas/auditoria-seguridad.mjs`.
4. Resumen de `npm audit` de backend y frontend.
5. `git status` y el número de casos DOC aprobados.

Con esos datos se podrá redactar un **dictamen final basado en evidencias**. Hasta entonces el estado permanece **pendiente de cierre**, aunque la documentación esté creada.
