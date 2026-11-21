# JORNADA 11-C — Reportes de ventas (RF16)

**Proyecto:** Dulce Hogar / ReposteriaWeb  
**Autor:** Oscar Armando Medina Gutiérrez  
**Materia:** Verificación y Validación de Software  
**Fecha:** 21 de noviembre de 2026  
**Punto de partida:** Jornadas 11-A y 11-B instaladas. Aplicar previamente las correcciones de lint de 11-B y verificar `npm run lint` y `npm run build`. Si aún no se han comprobado, hacerlo antes de integrar esta jornada.

## 1. Objetivo y criterios

Implementar **RF16: reportes de ventas** accesibles exclusivamente al **Administrador**, con filtros por fechas, resumen por estado, ingresos de pedidos entregados, ventas por día y productos vendidos. La fuente de verdad es SQL Server, no los precios actuales del catálogo. Los pedidos cancelados **no cuentan como ingresos ni como unidades vendidas**. Los pedidos pendientes/en preparación/listos se muestran en el desglose operativo, pero no como ventas realizadas.

**Criterio contable del prototipo:** se considera venta realizada un pedido con `idEstado = 4` (**Entregado**), atribuido a la **fecha de creación del pedido** (`fechaPedido`), porque el esquema actual no contiene fecha de entrega. Por tanto, el reporte **no equivale** a un informe contable por fecha de cobro o de entrega. No se calcula utilidad, impuestos ni devoluciones. Los importes históricos provienen de `DetallePedido.precioUnitario` y `subtotal` (vista `vwTotalesPedido`), no del precio vigente de `Productos`.

### Endpoints nuevos

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/reportes/ventas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | Solo Administrador |

- Ambos parámetros son obligatorios; el intervalo es **inclusivo**.
- Rango máximo de **366 días**, para evitar consultas excesivas.
- Respuesta: `resumen`, `porEstado`, `porDia`, `productos`, `periodo`.
- `401` sin sesión, `403` si el rol no es Administrador, `400` si las fechas no son válidas.
- No se agregan dependencias ni se modifican tablas.

## 2. Preparación

```bash
cd /c/6to/reposteria-web
git status
# Verificar que los cambios anteriores estén respaldados/confirmados.
# NO volver a ejecutar scripts de creación ni datos iniciales de SQL Server.
```

## 3. Backend — archivo nuevo completo

**Ruta:** `backend/src/routes/reportesRutas.js`

```js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: reportesRutas.js
// Descripción: Reportes históricos de ventas, restringidos a administradores.
// Requerimiento: RF16, RF18
// Fecha: 21 de noviembre de 2026

import { Router } from 'express';
import { obtenerConexion, sql } from '../config/database.js';
import { autenticar } from './authRutas.js';

const router = Router();

function fechaValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

router.get('/reportes/ventas', autenticar, async (req, res) => {
  if (req.usuario.rol !== 'Administrador') {
    return res.status(403).json({ mensaje: 'No tienes permiso para consultar reportes.' });
  }

  const { desde, hasta } = req.query;
  if (!fechaValida(desde) || !fechaValida(hasta)) {
    return res.status(400).json({ mensaje: 'Indica fechas válidas con formato AAAA-MM-DD.' });
  }

  const inicio = new Date(`${desde}T00:00:00.000Z`);
  const fin = new Date(`${hasta}T00:00:00.000Z`);
  const dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000);
  if (dias < 0 || dias > 365) {
    return res.status(400).json({ mensaje: 'El periodo debe estar ordenado y abarcar como máximo 366 días.' });
  }

  const conexion = await obtenerConexion();
  const resultado = await conexion.request()
    .input('desde', sql.Date, desde)
    .input('hasta', sql.Date, hasta)
    .query(`
      -- Una sola consulta con múltiples conjuntos de resultados.
      -- Comparar por fecha del pedido evita errores por horas en el límite superior.
      SELECT
        COUNT(*) AS pedidosEntregados,
        COALESCE(SUM(v.total), 0) AS ingresos,
        COALESCE(AVG(CAST(v.total AS decimal(18,2))), 0) AS ticketPromedio
      FROM dbo.vwTotalesPedido v
      WHERE v.idEstado = 4
        AND v.fechaPedido >= @desde
        AND v.fechaPedido < DATEADD(day, 1, @hasta);

      SELECT e.idEstado, e.nombre AS estado, COUNT(p.idPedido) AS cantidad
      FROM dbo.EstadosPedido e
      LEFT JOIN dbo.Pedidos p ON p.idEstado = e.idEstado
        AND p.fechaPedido >= @desde
        AND p.fechaPedido < DATEADD(day, 1, @hasta)
      GROUP BY e.idEstado, e.nombre
      ORDER BY e.idEstado;

      SELECT CONVERT(char(10), v.fechaPedido, 23) AS fecha,
             COUNT(*) AS pedidos, COALESCE(SUM(v.total), 0) AS ingresos
      FROM dbo.vwTotalesPedido v
      WHERE v.idEstado = 4
        AND v.fechaPedido >= @desde
        AND v.fechaPedido < DATEADD(day, 1, @hasta)
      GROUP BY CONVERT(char(10), v.fechaPedido, 23)
      ORDER BY fecha;

      SELECT TOP (20) d.idProducto, d.nombreProducto,
             SUM(d.cantidad) AS unidades,
             SUM(d.subtotal) AS ingresos
      FROM dbo.DetallePedido d
      INNER JOIN dbo.Pedidos p ON p.idPedido = d.idPedido
      WHERE p.idEstado = 4
        AND p.fechaPedido >= @desde
        AND p.fechaPedido < DATEADD(day, 1, @hasta)
      GROUP BY d.idProducto, d.nombreProducto
      ORDER BY unidades DESC, ingresos DESC, d.idProducto;
    `);

  const [resumen, porEstado, porDia, productos] = resultado.recordsets;
  res.json({
    periodo: { desde, hasta, criterio: 'Fecha de creación; solo pedidos entregados' },
    resumen: resumen[0],
    porEstado,
    porDia,
    productos,
  });
});

export default router;
```

**Importante:** SQL Server devuelve valores `decimal` que pueden serializarse como números; el frontend los convierte con `Number` para mostrar importes. La consulta utiliza parámetros, no concatena entradas del usuario.

## 4. Backend — modificar archivo existente

**Ruta:** `backend/src/app.js`. Mantén todos los middleware y rutas de las jornadas anteriores. Agrega únicamente esta importación:

```js
import reportesRutas from './routes/reportesRutas.js';
```

En el montaje existente de rutas `/api`, incorpora `reportesRutas` **una sola vez**, por ejemplo:

```js
app.use('/api/admin', adminRutas);
app.use('/api', rutas, authRutas, pedidoRutas, operacionesRutas, reportesRutas);
```

El ejemplo supone los nombres reales usados en Jornadas 11-A y 11-B. **No sustituyas `app.js` por un archivo reducido**: conserva `cors`, `/api/salud`, manejador 404 y `manejarError` en su orden original. `reportesRutas` debe montarse antes del 404.

## 5. Frontend — archivo nuevo completo

**Ruta:** `frontend/src/pages/ReportesVentas.jsx`

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: ReportesVentas.jsx
// Descripción: Reportes de ventas entregadas por periodo.
// Requerimiento: RF16, RF18
// Fecha: 21 de noviembre de 2026

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { consultarApi } from '../services/apiServicio';

const MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});
const ENTERO = new Intl.NumberFormat('es-MX');

function fechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function periodoInicial() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { desde: fechaLocal(inicio), hasta: fechaLocal(hoy) };
}

function importe(valor) {
  return MONEDA.format(Number(valor ?? 0));
}

function porcentaje(valor, total) {
  return total > 0 ? `${(100 * valor / total).toFixed(1)}%` : '0%';
}

export default function ReportesVentas() {
  const { token, cerrarSesion } = useAuth();
  const [filtros, setFiltros] = useState(periodoInicial);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  // La petición es asíncrona: no se actualiza el estado de forma síncrona
  // en el efecto. La bandera evita aplicar respuestas de peticiones obsoletas.
  useEffect(() => {
    let activo = true;
    const parametros = new URLSearchParams(filtros);
    consultarApi(`/reportes/ventas?${parametros.toString()}`, 'GET', undefined, token)
      .then(respuesta => {
        if (!activo) return;
        setDatos(respuesta);
        setError('');
        setCargando(false);
      })
      .catch(fallo => {
        if (!activo) return;
        setDatos(null);
        setError(fallo.message);
        setCargando(false);
        if (fallo.estado === 401) cerrarSesion();
      });
    return () => { activo = false; };
  }, [token, filtros, revision, cerrarSesion]);

  function consultar(evento) {
    evento.preventDefault();
    const desde = evento.currentTarget.elements.desde.value;
    const hasta = evento.currentTarget.elements.hasta.value;
    if (!desde || !hasta || desde > hasta) {
      setError('Selecciona un periodo válido.');
      return;
    }
    const dias = Math.round((new Date(`${hasta}T00:00:00Z`) -
      new Date(`${desde}T00:00:00Z`)) / 86400000);
    if (dias > 365) {
      setError('Selecciona como máximo 366 días.');
      return;
    }
    setCargando(true);
    setError('');
    setFiltros({ desde, hasta });
    setRevision(actual => actual + 1);
  }

  const totalEstados = datos?.porEstado.reduce((suma, e) => suma + Number(e.cantidad), 0) ?? 0;
  const maximoDiario = Math.max(1, ...(datos?.porDia.map(d => Number(d.ingresos)) ?? []));

  return (
    <section className="max-w-6xl mx-auto px-5 py-10 space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-rose-900">Reportes de ventas</h1>
          <p className="text-stone-600">RF16 · Ventas realizadas de pedidos entregados.</p>
        </div>
        <Link to="/admin" className="text-rose-700 underline">Volver a administración</Link>
      </div>

      <form onSubmit={consultar} className="bg-white rounded-xl p-5 flex flex-wrap gap-4 items-end">
        <label className="block font-medium">Desde
          <input name="desde" type="date" required defaultValue={filtros.desde}
            className="block border rounded-lg p-2 mt-1" />
        </label>
        <label className="block font-medium">Hasta
          <input name="hasta" type="date" required defaultValue={filtros.hasta}
            className="block border rounded-lg p-2 mt-1" />
        </label>
        <button disabled={cargando} type="submit"
          className="bg-rose-700 text-white rounded-lg px-5 py-2 disabled:opacity-50">
          Consultar reporte
        </button>
      </form>

      {cargando && <p role="status">Consultando reporte...</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!cargando && datos && (
        <>
          <p className="text-sm text-stone-600">
            Periodo: {datos.periodo.desde} a {datos.periodo.hasta} (ambos inclusive).
            Se agrupa por fecha de creación, no fecha de entrega.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-rose-100">
              <p className="text-stone-600">Ingresos realizados</p>
              <p className="text-2xl font-bold text-rose-900">{importe(datos.resumen.ingresos)}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-rose-100">
              <p className="text-stone-600">Pedidos entregados</p>
              <p className="text-2xl font-bold text-rose-900">
                {ENTERO.format(Number(datos.resumen.pedidosEntregados))}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-rose-100">
              <p className="text-stone-600">Ticket promedio entregado</p>
              <p className="text-2xl font-bold text-rose-900">{importe(datos.resumen.ticketPromedio)}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white p-5 rounded-xl space-y-3">
              <h2 className="text-xl font-bold text-rose-900">Pedidos por estado</h2>
              <p className="text-sm text-stone-600">Incluye pendientes y cancelados; no son ingresos.</p>
              {datos.porEstado.map(estado => (
                <div key={estado.idEstado}>
                  <div className="flex justify-between text-sm gap-2">
                    <span>{estado.estado}</span>
                    <span>{estado.cantidad} · {porcentaje(Number(estado.cantidad), totalEstados)}</span>
                  </div>
                  <div className="bg-rose-50 rounded-full h-3 overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full"
                      style={{ width: porcentaje(Number(estado.cantidad), totalEstados) }} />
                  </div>
                </div>
              ))}
            </section>
            <section className="bg-white p-5 rounded-xl space-y-3">
              <h2 className="text-xl font-bold text-rose-900">Ingresos por día</h2>
              {datos.porDia.length === 0 && <p>Sin entregas registradas en este periodo.</p>}
              <div className="max-h-80 overflow-y-auto space-y-3">
                {datos.porDia.map(dia => (
                  <div key={dia.fecha}>
                    <div className="flex justify-between text-sm gap-2">
                      <span>{dia.fecha} · {dia.pedidos} pedidos</span>
                      <span>{importe(dia.ingresos)}</span>
                    </div>
                    <div className="bg-rose-50 rounded-full h-3 overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full"
                        style={{ width: porcentaje(Number(dia.ingresos), maximoDiario) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="bg-white p-5 rounded-xl space-y-3">
            <h2 className="text-xl font-bold text-rose-900">20 productos más vendidos</h2>
            <p className="text-sm text-stone-600">Solo unidades e importes de pedidos entregados.</p>
            {datos.productos.length === 0 ? <p>No hay productos vendidos en este periodo.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b">
                    <th className="p-2">Producto</th>
                    <th className="p-2">Unidades</th>
                    <th className="p-2">Ingresos</th>
                  </tr></thead>
                  <tbody>{datos.productos.map(producto => (
                    <tr key={producto.idProducto} className="border-b">
                      <td className="p-2">{producto.nombreProducto}</td>
                      <td className="p-2">{ENTERO.format(Number(producto.unidades))}</td>
                      <td className="p-2">{importe(producto.ingresos)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
```

**Nota de compatibilidad React:** `cerrarSesion` proviene de `AuthProvider` y en el código actual es una función recreada por render. Eso puede causar recargas adicionales del efecto. Para evitarlo, en `AuthProvider.jsx` importa `useCallback` y declara `cerrarSesion` con `useCallback(() => { ... }, [])` manteniendo exactamente su lógica actual, o consulta el apartado de correcciones 11-B si ya estabilizaste esa función. La pantalla no requiere librerías de gráficas.

## 6. Frontend — modificar navegación existente

**Ruta:** `frontend/src/App.jsx`. Conserva todas las rutas actuales. Agrega la importación:

```jsx
import ReportesVentas from './pages/ReportesVentas';
```

Dentro del grupo existente protegido con `roles={[ROLES.ADMIN]}`, agrega:

```jsx
<Route path="/admin/reportes" element={<ReportesVentas />} />
```

**Ruta:** `frontend/src/components/Header.jsx`. En la navegación que solo ve el administrador, agrega junto a los enlaces de administración:

```jsx
{usuario.rol === ROLES.ADMIN && <Link to="/admin/reportes">Reportes</Link>}
```

No reemplaces el `Header.jsx` completo; conserva los enlaces de Administración, Pedidos, Producción y el carrito según corresponda.

**Ruta:** `frontend/src/pages/Administracion.jsx` (opcional, acceso más cómodo). Si quieres agregar un enlace dentro del panel, importa `Link` de `react-router-dom` y coloca debajo del título:

```jsx
<Link to="/admin/reportes" className="text-rose-700 underline">
  Consultar reportes de ventas
</Link>
```

## 7. Ajuste recomendado de estabilidad de sesión

En `frontend/src/context/AuthProvider.jsx`, modifica **solo** la importación y la declaración de `cerrarSesion`:

```jsx
import { useState, useEffect, useCallback } from 'react';
```

```jsx
const cerrarSesion = useCallback(() => {
  sessionStorage.removeItem(CLAVE);
  setToken(null);
  setUsuario(null);
  setCargando(false);
}, []);
```

Con ello el efecto del reporte no se ejecuta de nuevo únicamente porque cambió la identidad de la función `cerrarSesion`. Conserva el resto de `AuthProvider.jsx` y todas las propiedades de su contexto.

## 8. Pruebas de aceptación RF16

Antes de probar, inicia backend y frontend en terminales diferentes. Utiliza una cuenta Administrador válida. No edites pedidos históricos para fabricar ventas; crea pedidos de prueba por el flujo normal si hace falta.

| ID | Prueba | Resultado esperado |
|---|---|---|
| PA-11C-01 | Administrador abre `/admin/reportes` | Se muestra la pantalla y filtro mensual |
| PA-11C-02 | Cliente intenta entrar a `/admin/reportes` | Ruta protegida; no ve el reporte |
| PA-11C-03 | Producción intenta entrar | Ruta protegida; no ve el reporte |
| PA-11C-04 | GET sin token a `/api/reportes/ventas` | HTTP 401 |
| PA-11C-05 | GET con token Cliente | HTTP 403 |
| PA-11C-06 | Fechas inválidas (p. ej. 2026-02-30) | HTTP 400 |
| PA-11C-07 | `desde` posterior a `hasta` | HTTP 400 |
| PA-11C-08 | Rango superior a 366 días | HTTP 400 |
| PA-11C-09 | Periodo sin pedidos entregados | Ingresos y ticket promedio 0; tablas vacías sin error |
| PA-11C-10 | Pedido pendiente en periodo | Aumenta Pendiente; no aumenta ingresos |
| PA-11C-11 | Pedido cancelado en periodo | Aumenta Cancelado; no aumenta ingresos ni unidades |
| PA-11C-12 | Completar pedido hasta Entregado | Aumenta entregados e ingresos; aparece producto |
| PA-11C-13 | Cambiar precio del producto tras entrega | No cambia importe histórico |
| PA-11C-14 | Pedidos en dos días distintos | Barras diarias agrupadas por fecha de creación |
| PA-11C-15 | Filtro de un solo día | Incluye pedidos creados hasta las 23:59:59 de ese día |
| PA-11C-16 | Refrescar página del reporte | Sesión y reporte siguen funcionando |
| PA-11C-17 | `npm run lint` | 0 errores; objetivo 0 advertencias |
| PA-11C-18 | `npm run build` | Compilación exitosa |

### SQL para contrastar resultados

```sql
-- Sustituye fechas según el periodo probado.
DECLARE @desde date = '2026-11-01';
DECLARE @hasta date = '2026-11-30';

SELECT COUNT(*) AS pedidosEntregados,
       COALESCE(SUM(total), 0) AS ingresos
FROM dbo.vwTotalesPedido
WHERE idEstado = 4 AND fechaPedido >= @desde
  AND fechaPedido < DATEADD(day, 1, @hasta);

SELECT e.nombre, COUNT(p.idPedido) AS cantidad
FROM dbo.EstadosPedido e
LEFT JOIN dbo.Pedidos p ON p.idEstado = e.idEstado
  AND p.fechaPedido >= @desde AND p.fechaPedido < DATEADD(day, 1, @hasta)
GROUP BY e.nombre;

SELECT TOP (20) d.idProducto, d.nombreProducto,
       SUM(d.cantidad) AS unidades, SUM(d.subtotal) AS ingresos
FROM dbo.DetallePedido d
JOIN dbo.Pedidos p ON p.idPedido = d.idPedido
WHERE p.idEstado = 4 AND p.fechaPedido >= @desde
  AND p.fechaPedido < DATEADD(day, 1, @hasta)
GROUP BY d.idProducto, d.nombreProducto
ORDER BY unidades DESC, ingresos DESC;
```

### Comandos de comprobación

```bash
cd /c/6to/reposteria-web/frontend
npm run lint
npm run build

cd /c/6to/reposteria-web
git diff --check
git status
```

**Si `npm run lint` todavía muestra advertencias de la Jornada 11-B, resuélvelas primero**. No las atribuyas automáticamente a esta jornada. Verifica que el reporte no se recargue continuamente por la identidad de `cerrarSesion`.

## 9. Git

Cuando pasen las pruebas, copia este documento a `docs/JORNADA_11_C.md` si esa carpeta se utiliza para el seguimiento del proyecto y ejecuta:

```bash
cd /c/6to/reposteria-web
mkdir -p docs
# Copiar aquí JORNADA_11_C.md descargado antes del siguiente comando.
git add backend/src/routes/reportesRutas.js backend/src/app.js \
  frontend/src/pages/ReportesVentas.jsx frontend/src/App.jsx \
  frontend/src/components/Header.jsx frontend/src/context/AuthProvider.jsx \
  docs/JORNADA_11_C.md
# Si modificaste Administracion.jsx, agrégalo también.
git add frontend/src/pages/Administracion.jsx
git diff --cached --check
git commit -m "feat: reportes de ventas RF16 y filtros por periodo"
git push origin main
```

**No confirmes el commit hasta que las pruebas sean satisfactorias.** Si no agregaste el enlace opcional a `Administracion.jsx`, omite ese `git add`.

## 10. Cierre y próxima jornada

Con RF16 probado, quedarán cubiertos productos, categorías, inventario, pedidos, producción y reportes. La siguiente etapa será **Jornada 12: pruebas integrales, revisión de seguridad, documentación final y preparación del despliegue**. Antes de comenzar, comparte los resultados de las 18 pruebas y de `npm run lint` / `npm run build`.
