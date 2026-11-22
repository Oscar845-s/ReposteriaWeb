# JORNADA 11-B — Administración de pedidos y panel de producción

**Proyecto:** Dulce Hogar / ReposteriaWeb  
**Fecha:** 20 de noviembre de 2026  
**Autor:** Oscar Armando Medina Gutiérrez  
**Materia:** Verificación y Validación de Software  
**Requerimientos:** RF14 (administración de pedidos), RF15 (producción), y regresión de RF08, RF09, RF13, RF17, RF18 y RF20.

## 1. Punto de partida y alcance

Se parte de la **Jornada 11-A aprobada**, con `backend/src/routes/adminRutas.js`, `frontend/src/pages/Administracion.jsx` y `/admin` ya funcionales. Se conservan los nombres reales de Jornada 10: `backend/src/routes/pedidoRutas.js` (singular) y `backend/src/routes/authRutas.js`. No existe ni se requiere `pedidosServicio.js`.

Esta jornada agrega una vista para que el **Administrador** consulte pedidos de todos los clientes y gestione el paso a preparación y entrega, y otra para que **Producción** consulte los pedidos activos y marque los preparados como listos. Los permisos se validan en el servidor contra el rol autenticado. El cliente conserva su historial y cancelación de pedidos pendientes.

**Flujo de estados autorizado:**

| Estado actual | Acción | Estado siguiente | Rol autorizado |
|---|---|---|---|
| 1 — Pendiente | Iniciar preparación | 2 — En preparación | Administrador |
| 2 — En preparación | Marcar listo | 3 — Listo para entrega | Producción |
| 3 — Listo para entrega | Entregar | 4 — Entregado | Administrador |
| 1 — Pendiente | Cancelar | 5 — Cancelado | Cliente propietario (ya implementado) |

Los estados 4 y 5 son terminales. **No se permite cancelar desde producción ni restaurar stock en cambios 1→2→3→4.** El stock ya fue descontado en la confirmación; solo se repone cuando el cliente cancela un pedido pendiente, mediante la lógica existente de Jornada 10.

## 2. Preparación y respaldo

```bash
cd /c/6to/reposteria-web
git status
# Debe indicar working tree clean; no continúes si tienes cambios sin revisar.
```

No ejecutes nuevamente los scripts de creación ni carga de datos SQL. No instales nuevas dependencias. Verifica que existen las tablas `Pedidos`, `DetallePedido`, `EstadosPedido`, `Usuarios`, `Roles` y la vista `vwTotalesPedido`.

## 3. Backend: API de operaciones de pedidos

Se crearán endpoints bajo `/api/operaciones`:

| Método | Ruta | Permiso | Resultado |
|---|---|---|---|
| GET | `/pedidos` | Administrador | Todos los pedidos, con cliente y detalle |
| GET | `/produccion` | Producción | Solo pedidos en preparación y listos |
| PATCH | `/pedidos/:id/iniciar` | Administrador | Pendiente → En preparación |
| PATCH | `/pedidos/:id/listo` | Producción | En preparación → Listo para entrega |
| PATCH | `/pedidos/:id/entregar` | Administrador | Listo para entrega → Entregado |

**Seguridad:** se usa el middleware `autenticar` de `authRutas.js`, que obtiene el usuario y su rol desde SQL Server. Las consultas están parametrizadas. Cada transición es un `UPDATE` condicional atómico: si otro operador cambió el estado, devuelve HTTP 409. No hay actualizaciones directas de inventario.

### `backend/src/routes/operacionesRutas.js`

**Crear el archivo completo:**

```js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: operacionesRutas.js
// Descripción: Consulta y transición segura de pedidos por rol.
// Requerimiento: RF14, RF15, RF18
// Fecha: 20 de noviembre de 2026

import { Router } from 'express';
import { obtenerConexion, sql } from '../config/database.js';
import { autenticar } from './authRutas.js';

const router = Router();
router.use('/operaciones', autenticar);

function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para esta operación.' });
    }
    next();
  };
}

function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647 ||
      String(id) !== req.params.id) {
    return res.status(400).json({ mensaje: 'Identificador de pedido inválido.' });
  }
  req.idPedidoValidado = id;
  next();
}

async function consultarPedidos(filtro) {
  const conexion = await obtenerConexion();
  const consulta = await conexion.request().query(`
    SELECT v.idPedido, v.idUsuario, v.idEstado, v.fechaPedido, v.total,
           u.nombre AS nombreCliente, u.correo AS correoCliente,
           e.nombre AS estado
    FROM dbo.vwTotalesPedido v
    INNER JOIN dbo.Usuarios u ON u.idUsuario = v.idUsuario
    INNER JOIN dbo.EstadosPedido e ON e.idEstado = v.idEstado
    ${filtro === 'produccion' ? 'WHERE v.idEstado IN (2, 3)' : ''}
    ORDER BY v.fechaPedido DESC, v.idPedido DESC;

    SELECT d.idPedido, d.idProducto, d.nombreProducto, d.cantidad,
           d.precioUnitario, d.subtotal
    FROM dbo.DetallePedido d
    INNER JOIN dbo.Pedidos p ON p.idPedido = d.idPedido
    ${filtro === 'produccion' ? 'WHERE p.idEstado IN (2, 3)' : ''}
    ORDER BY d.idPedido DESC, d.idProducto;
  `);

  const detallesPorPedido = new Map();
  for (const detalle of consulta.recordsets[1]) {
    const lista = detallesPorPedido.get(detalle.idPedido) ?? [];
    lista.push(detalle);
    detallesPorPedido.set(detalle.idPedido, lista);
  }
  return consulta.recordsets[0].map(pedido => ({
    ...pedido,
    detalles: detallesPorPedido.get(pedido.idPedido) ?? [],
  }));
}

router.get('/operaciones/pedidos', permitirRoles('Administrador'), async (req, res) => {
  res.json(await consultarPedidos('todos'));
});

router.get('/operaciones/produccion', permitirRoles('Personal de Producción'),
  async (req, res) => {
    res.json(await consultarPedidos('produccion'));
  });

// El estado anterior y el nuevo se definen en el servidor, nunca en el body.
async function cambiarEstado(req, res, estadoAnterior, estadoNuevo, accion) {
  const conexion = await obtenerConexion();
  const resultado = await conexion.request()
    .input('idPedido', sql.Int, req.idPedidoValidado)
    .input('estadoAnterior', sql.Int, estadoAnterior)
    .input('estadoNuevo', sql.Int, estadoNuevo)
    .query(`
      UPDATE dbo.Pedidos
      SET idEstado = @estadoNuevo
      OUTPUT INSERTED.idPedido, INSERTED.idEstado
      WHERE idPedido = @idPedido AND idEstado = @estadoAnterior;
    `);

  if (resultado.recordset.length === 0) {
    return res.status(409).json({
      mensaje: 'El pedido no existe o ya no está en el estado requerido. Actualiza la lista.',
    });
  }
  return res.json({
    mensaje: `Pedido ${accion} correctamente.`,
    ...resultado.recordset[0],
  });
}

router.patch('/operaciones/pedidos/:id/iniciar',
  permitirRoles('Administrador'), validarId,
  (req, res) => cambiarEstado(req, res, 1, 2, 'enviado a preparación'));

router.patch('/operaciones/pedidos/:id/listo',
  permitirRoles('Personal de Producción'), validarId,
  (req, res) => cambiarEstado(req, res, 2, 3, 'marcado como listo'));

router.patch('/operaciones/pedidos/:id/entregar',
  permitirRoles('Administrador'), validarId,
  (req, res) => cambiarEstado(req, res, 3, 4, 'entregado'));

export default router;
```

### `backend/src/app.js` — Modificación mínima

**Conserva el archivo de Jornada 11-A** y agrega una importación junto a las demás:

```js
import operacionesRutas from './routes/operacionesRutas.js';
```

En el bloque de montaje, conserva la ruta administrativa e incorpora operaciones:

```js
app.use('/api/admin', adminRutas);
app.use('/api', rutas, authRutas, pedidoRutas, operacionesRutas);
```

No dupliques el middleware de errores ni elimines ninguna ruta existente.

## 4. Frontend: pantallas y navegación

Ambas pantallas usan `consultarApi` de Jornada 10, `useAuth` y el token de sesión. Mantienen el estilo de Tailwind de Dulce Hogar. Los botones se bloquean mientras se procesa una transición y muestran errores legibles.

### `frontend/src/pages/AdministracionPedidos.jsx`

**Crear el archivo completo:**

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: AdministracionPedidos.jsx
// Descripción: Seguimiento general y entrega de pedidos por el administrador.
// Requerimiento: RF14, RF18
// Fecha: 20 de noviembre de 2026

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { consultarApi } from '../services/apiServicio';

const moneda = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});

export default function AdministracionPedidos() {
  const { token, cerrarSesion } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarPedidos = useCallback(async (signalActivo) => {
    setCargando(true);
    setError('');
    try {
      const datos = await consultarApi('/operaciones/pedidos', 'GET', undefined, token);
      if (!signalActivo || signalActivo()) setPedidos(datos);
    } catch (fallo) {
      if (!signalActivo || signalActivo()) {
        setError(fallo.message);
        if (fallo.estado === 401) cerrarSesion();
      }
    } finally {
      if (!signalActivo || signalActivo()) setCargando(false);
    }
  }, [token, cerrarSesion]);

  useEffect(() => {
    let activo = true;
    cargarPedidos(() => activo);
    return () => { activo = false; };
  }, [cargarPedidos]);

  async function ejecutarAccion(idPedido, accion) {
    if (procesando !== null) return;
    setProcesando(idPedido);
    setError('');
    setMensaje('');
    try {
      const respuesta = await consultarApi(
        `/operaciones/pedidos/${idPedido}/${accion}`, 'PATCH', undefined, token,
      );
      setMensaje(respuesta.mensaje);
      await cargarPedidos();
    } catch (fallo) {
      setError(fallo.message);
      if (fallo.estado === 401) cerrarSesion();
      if (fallo.estado === 409) await cargarPedidos();
    } finally {
      setProcesando(null);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-5 py-12 space-y-5">
      <h1 className="text-3xl font-bold text-rose-900">Administración de pedidos</h1>
      <div className="flex flex-wrap gap-4">
        <Link className="text-rose-700 underline" to="/admin">Productos e inventario</Link>
        <button type="button" onClick={() => cargarPedidos()}
          disabled={cargando || procesando !== null} className="text-rose-700 underline">
          Actualizar pedidos
        </button>
      </div>
      {mensaje && <p role="status" className="text-green-800">{mensaje}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {cargando && <p role="status">Consultando pedidos...</p>}
      {!cargando && pedidos.length === 0 && <p>No hay pedidos registrados.</p>}
      <div className="space-y-4">
        {pedidos.map(pedido => (
          <article key={pedido.idPedido} className="bg-white border border-rose-100 rounded-xl p-5 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-bold text-rose-900">Pedido #{pedido.idPedido}</h2>
              <strong>{pedido.estado}</strong>
            </div>
            <p className="text-sm">Cliente: {pedido.nombreCliente} ({pedido.correoCliente})</p>
            <p className="text-sm">{new Date(pedido.fechaPedido).toLocaleString('es-MX')}</p>
            <ul className="list-disc pl-5">
              {pedido.detalles.map(detalle => (
                <li key={detalle.idProducto}>
                  {detalle.nombreProducto} × {detalle.cantidad} — {moneda.format(detalle.subtotal)}
                </li>
              ))}
            </ul>
            <p className="font-bold">Total: {moneda.format(pedido.total)}</p>
            {pedido.idEstado === 1 && (
              <button type="button" disabled={procesando !== null || cargando}
                onClick={() => ejecutarAccion(pedido.idPedido, 'iniciar')}
                className="bg-rose-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                Iniciar preparación
              </button>
            )}
            {pedido.idEstado === 3 && (
              <button type="button" disabled={procesando !== null || cargando}
                onClick={() => ejecutarAccion(pedido.idPedido, 'entregar')}
                className="bg-rose-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                Marcar como entregado
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
```

### `frontend/src/pages/Produccion.jsx`

**Crear el archivo completo:**

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Produccion.jsx
// Descripción: Consulta de pedidos en producción y marcado como listos.
// Requerimiento: RF15, RF18
// Fecha: 20 de noviembre de 2026

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { consultarApi } from '../services/apiServicio';

export default function Produccion() {
  const { token, cerrarSesion } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarPedidos = useCallback(async (sigueActivo) => {
    setCargando(true);
    setError('');
    try {
      const datos = await consultarApi('/operaciones/produccion', 'GET', undefined, token);
      if (!sigueActivo || sigueActivo()) setPedidos(datos);
    } catch (fallo) {
      if (!sigueActivo || sigueActivo()) {
        setError(fallo.message);
        if (fallo.estado === 401) cerrarSesion();
      }
    } finally {
      if (!sigueActivo || sigueActivo()) setCargando(false);
    }
  }, [token, cerrarSesion]);

  useEffect(() => {
    let activo = true;
    cargarPedidos(() => activo);
    return () => { activo = false; };
  }, [cargarPedidos]);

  async function marcarListo(idPedido) {
    if (procesando !== null) return;
    setProcesando(idPedido);
    setError('');
    setMensaje('');
    try {
      const respuesta = await consultarApi(
        `/operaciones/pedidos/${idPedido}/listo`, 'PATCH', undefined, token,
      );
      setMensaje(respuesta.mensaje);
      await cargarPedidos();
    } catch (fallo) {
      setError(fallo.message);
      if (fallo.estado === 401) cerrarSesion();
      if (fallo.estado === 409) await cargarPedidos();
    } finally {
      setProcesando(null);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-5 py-12 space-y-5">
      <h1 className="text-3xl font-bold text-rose-900">Panel de producción</h1>
      <p className="text-stone-600">Pedidos en preparación y listos para entrega.</p>
      <button type="button" onClick={() => cargarPedidos()}
        disabled={cargando || procesando !== null} className="text-rose-700 underline">
        Actualizar pedidos
      </button>
      {mensaje && <p role="status" className="text-green-800">{mensaje}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {cargando && <p role="status">Consultando producción...</p>}
      {!cargando && pedidos.length === 0 && <p>No hay pedidos en producción.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {pedidos.map(pedido => (
          <article key={pedido.idPedido} className="bg-white border border-rose-100 rounded-xl p-5 space-y-3">
            <div className="flex justify-between gap-3">
              <h2 className="font-bold text-rose-900">Pedido #{pedido.idPedido}</h2>
              <strong>{pedido.estado}</strong>
            </div>
            <p>Cliente: {pedido.nombreCliente}</p>
            <ul className="list-disc pl-5">
              {pedido.detalles.map(detalle => (
                <li key={detalle.idProducto}>
                  {detalle.nombreProducto} × {detalle.cantidad}
                </li>
              ))}
            </ul>
            {pedido.idEstado === 2 && (
              <button type="button" disabled={procesando !== null || cargando}
                onClick={() => marcarListo(pedido.idPedido)}
                className="bg-rose-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                Marcar como listo
              </button>
            )}
            {pedido.idEstado === 3 && (
              <p className="font-medium text-green-800">Esperando entrega por administración.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
```

### `frontend/src/App.jsx`

**Reemplazar el archivo completo:**

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: App.jsx
// Descripción: Rutas públicas y protegidas, administración y producción.
// Requerimiento: RF01, RF02, RF05, RF08, RF10, RF11, RF13, RF14, RF15, RF18
// Fecha: 20 de noviembre de 2026

import { Routes, Route, Link } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Pedidos from './pages/Pedidos';
import Login from './pages/Login';
import Registro from './pages/Registro';
import NotFound from './pages/NotFound';
import Administracion from './pages/Administracion';
import AdministracionPedidos from './pages/AdministracionPedidos';
import Produccion from './pages/Produccion';
import RutaProtegida from './components/RutaProtegida';
import { ROLES } from './data/usuariosDemo';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route element={<RutaProtegida roles={[ROLES.CLIENTE]} />}>
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/pedidos" element={<Pedidos />} />
        </Route>
        <Route element={<RutaProtegida roles={[ROLES.ADMIN]} />}>
          <Route path="/admin" element={<Administracion />} />
          <Route path="/admin/pedidos" element={<AdministracionPedidos />} />
        </Route>
        <Route element={<RutaProtegida roles={[ROLES.PRODUCCION]} />}>
          <Route path="/produccion" element={<Produccion />} />
        </Route>
        <Route path="/sin-acceso" element={
          <section className="p-10">
            <h1 className="text-2xl font-bold">Acceso no autorizado</h1>
            <Link to="/" className="underline">Volver al inicio</Link>
          </section>
        } />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
```

### `frontend/src/components/Header.jsx` — Modificación mínima

**Conserva el archivo actual.** Dentro de la condición de administrador, reemplaza el enlace único existente:

```jsx
{usuario.rol === ROLES.ADMIN && <Link to="/admin">Administración</Link>}
```

por los dos enlaces siguientes:

```jsx
{usuario.rol === ROLES.ADMIN && <>
  <Link to="/admin">Administración</Link>
  <Link to="/admin/pedidos">Pedidos</Link>
</>}
```

El enlace de producción ya apunta a `/produccion` y no requiere modificación. No cambies los enlaces de cliente ni el contador del carrito.

## 5. Ejecución

En dos terminales distintas:

**Terminal backend:**

```bash
cd /c/6to/reposteria-web/backend
npm run dev
```

**Terminal frontend:**

```bash
cd /c/6to/reposteria-web/frontend
npm run dev
```

En el navegador, inicia sesión con cuentas **reales de SQL Server** con los roles Administrador y Personal de Producción. La cuenta de producción no es `Producción` abreviado; debe tener exactamente el rol que se sembró en `Roles` y que utiliza `ROLES.PRODUCCION`.

**Verificación del nombre real de roles:**

```sql
USE DulceHogar;
SELECT idRol, nombre FROM dbo.Roles ORDER BY idRol;
```

Si el nombre del rol de producción **no es** `Personal de Producción`, ajusta **únicamente** la cadena del middleware `permitirRoles(...)` en `operacionesRutas.js` para que coincida exactamente con la base de datos y con `ROLES.PRODUCCION`. No renombres roles de la base de datos sin revisar sus dependencias.

## 6. Pruebas de aceptación — PA-11B

**Precondición:** al menos un pedido nuevo con estado Pendiente. Crea uno como Cliente desde el carrito antes de iniciar las pruebas. Anota su `idPedido`, stock y total. Evita reutilizar un pedido cancelado o entregado.

| ID | Procedimiento | Resultado esperado |
|---|---|---|
| PA-11B-01 | Administrador abre `/admin/pedidos` | Lista todos los pedidos, cliente, detalle, estado y total |
| PA-11B-02 | Administrador pulsa **Iniciar preparación** en pedido Pendiente | Estado cambia de 1 a 2 |
| PA-11B-03 | Producción abre `/produccion` | Ve el pedido en preparación con productos y cantidades |
| PA-11B-04 | Producción pulsa **Marcar como listo** | Estado cambia de 2 a 3 |
| PA-11B-05 | Administrador pulsa **Marcar como entregado** | Estado cambia de 3 a 4 |
| PA-11B-06 | Cliente revisa `/pedidos` | Observa estado actualizado y detalle original |
| PA-11B-07 | Cliente intenta cancelar pedido en preparación | No puede cancelarlo; API devuelve 409 si fuerza la solicitud |
| PA-11B-08 | Administrador intenta marcar listo directamente | API devuelve 403 |
| PA-11B-09 | Producción intenta entregar un pedido | API devuelve 403 |
| PA-11B-10 | Cliente intenta consultar `/api/operaciones/pedidos` | API devuelve 403 |
| PA-11B-11 | Solicitud sin token a `/api/operaciones/produccion` | API devuelve 401 |
| PA-11B-12 | Repetir una transición ya ejecutada | API devuelve 409; estado no se altera |
| PA-11B-13 | Intentar iniciar un pedido inexistente o cancelado | API devuelve 409 |
| PA-11B-14 | Intentar ID inválido (`abc`, `0`) | API devuelve 400 |
| PA-11B-15 | Completar 1→2→3→4 y revisar stock/movimientos | No se descuenta ni repone inventario durante las transiciones |
| PA-11B-16 | Revisar `/admin` tras los cambios | CRUD de productos, categorías e inventario de 11-A sigue funcionando |
| PA-11B-17 | Recargar `/produccion` y `/admin/pedidos` | Los estados se conservan en SQL Server |
| PA-11B-18 | Probar acceso directo a rutas de otro rol | React bloquea acceso y backend también lo impide |

### Verificación SQL

```sql
USE DulceHogar;

-- Estado de pedidos (usa el ID real de la prueba)
SELECT p.idPedido, p.idUsuario, p.idEstado, e.nombre AS estado, p.fechaPedido
FROM dbo.Pedidos p
JOIN dbo.EstadosPedido e ON e.idEstado = p.idEstado
ORDER BY p.idPedido DESC;

-- Total y detalle, sin perder el precio histórico
SELECT TOP (20) * FROM dbo.vwTotalesPedido ORDER BY idPedido DESC;
SELECT TOP (50) * FROM dbo.DetallePedido ORDER BY idPedido DESC;

-- Inventario y movimientos; transiciones de estado NO generan movimientos
SELECT idProducto, nombre, stock FROM dbo.Productos ORDER BY idProducto;
SELECT TOP (50) * FROM dbo.MovimientosInventario ORDER BY idMovimiento DESC;
```

### Prueba manual de API con token real

Puedes obtener el token desde la sesión iniciada en el navegador, en Herramientas de desarrollador → Aplicación → Session Storage, clave `dulce-hogar-token-v1`. No compartas el token ni lo subas a Git.

En Git Bash (sustituye el texto de ejemplo por el token de la cuenta con rol adecuado):

```bash
TOKEN='PEGA_AQUI_TU_TOKEN_REAL'
ID=1  # Reemplaza por un pedido real pendiente
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/operaciones/pedidos
curl -i -X PATCH -H "Authorization: Bearer $TOKEN"   "http://localhost:3000/api/operaciones/pedidos/$ID/iniciar"
```

**No repitas esta solicitud con el mismo pedido esperando otro éxito**: la segunda respuesta debe ser 409. Para probar producción, usa un token diferente, correspondiente al rol de producción.

## 7. Comprobaciones técnicas

```bash
cd /c/6to/reposteria-web/backend
node --check src/routes/operacionesRutas.js
node --check src/app.js

cd /c/6to/reposteria-web/frontend
npm run lint
npm run build
```

Si el lint marca reglas de React Hooks, corrige las advertencias antes de continuar. No deshabilites globalmente reglas para hacer que el proyecto pase. Ejecuta las pruebas de aceptación antes de realizar el commit.

## 8. Git — guardar únicamente después de aprobar pruebas

```bash
cd /c/6to/reposteria-web
git status
git add backend/src/routes/operacionesRutas.js backend/src/app.js   frontend/src/pages/AdministracionPedidos.jsx frontend/src/pages/Produccion.jsx   frontend/src/App.jsx frontend/src/components/Header.jsx
# Si guardaste este documento en docs/, añádelo también:
# git add docs/JORNADA_11_B.md
git commit -m "feat: administrar pedidos y gestionar produccion"
git push origin main
```

## 9. Alcance y límites conocidos

- **No** se permite al administrador cancelar pedidos en esta etapa. El cliente mantiene su cancelación de pendientes y la restauración de stock implementadas en Jornada 10.
- **No** se modifican importes, cantidades ni precios históricos al cambiar el estado.
- Los datos de producción incluyen el nombre del cliente, pero no requieren su correo ni precios para preparar el pedido; el endpoint de producción actualmente devuelve campos adicionales para reutilizar la consulta. Si se exige minimización estricta, crea un DTO exclusivo de producción.
- Las operaciones son atómicas por pedido, pero la lista puede quedar temporalmente desactualizada entre operadores. El backend resuelve esto con condiciones sobre el estado y HTTP 409.
- Los reportes de ventas, indicadores y filtros por fechas se implementarán en **Jornada 11-C**.
- Si `npm run lint` falla por una regla de hooks en `useCallback` debido a `cerrarSesion` no memoizado, estabiliza `cerrarSesion` con `useCallback` en `AuthProvider` o usa un efecto con manejo local de errores. La aplicación no debe depender de silenciar el lint.

**Criterio de cierre:** PA-11B-01 a PA-11B-18 aprobadas, `npm run build` correcto, roles comprobados en API, y regresión de Jornada 11-A sin fallos.

