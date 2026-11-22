# JORNADA 12-A — Corrección de fechas en reportes de ventas

**Proyecto:** ReposteriaWeb / Dulce Hogar  
**Materia:** Verificación y Validación de Software  
**Responsable:** Oscar Armando Medina Gutiérrez  
**Fecha:** 21 de noviembre de 2026  
**Requerimientos:** RF16, RF18

## 1. Anomalía identificada

El pedido #17 se registró en SQL Server como `2026-11-22 00:18:21` UTC, que corresponde al **21 de noviembre a las 16:18** en Baja California. El reporte original comparaba directamente las fechas locales solicitadas con la columna UTC `fechaPedido`. Por ello, el pedido no aparecía al consultar únicamente el 21 de noviembre.

**Corrección:** convertir los límites del periodo local a UTC para filtrar y convertir `fechaPedido` a hora local para agrupar las ventas por día. Se conserva UTC en la base de datos. SQL Server reconoce `Pacific Standard Time` como identificador de zona horaria Windows y aplica el horario de verano cuando corresponda.

**Archivo a reemplazar:** `backend/src/routes/reportesRutas.js`.

## 2. Código completo de `backend/src/routes/reportesRutas.js`

Reemplaza **todo** el contenido del archivo por el siguiente código:

```javascript
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: reportesRutas.js
// Descripción: Reportes de ventas filtrados por fecha local de Baja California,
//              con almacenamiento UTC y acceso exclusivo para administradores.
// Requerimiento: RF16, RF18
// Fecha: 21 de noviembre de 2026

import { Router } from 'express';
import { obtenerConexion, sql } from '../config/database.js';
import { autenticar } from './authRutas.js';

const router = Router();

// Verifica que la fecha exista y tenga el formato AAAA-MM-DD.
function fechaValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor;
}

router.get('/reportes/ventas', autenticar, async (req, res) => {
  if (req.usuario.rol !== 'Administrador') {
    return res.status(403).json({
      mensaje: 'No tienes permiso para consultar reportes.',
    });
  }

  const { desde, hasta } = req.query;

  if (!fechaValida(desde) || !fechaValida(hasta)) {
    return res.status(400).json({
      mensaje: 'Indica fechas válidas con formato AAAA-MM-DD.',
    });
  }

  const inicio = new Date(`${desde}T00:00:00.000Z`);
  const fin = new Date(`${hasta}T00:00:00.000Z`);
  const dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000);

  if (dias < 0 || dias > 365) {
    return res.status(400).json({
      mensaje: 'El periodo debe estar ordenado y abarcar como máximo 366 días.',
    });
  }

  const conexion = await obtenerConexion();
  const resultado = await conexion.request()
    .input('desde', sql.Date, desde)
    .input('hasta', sql.Date, hasta)
    .query(`
      -- Las fechas del formulario son fechas LOCALES de Baja California.
      -- fechaPedido se almacena en UTC. Convertimos ambos límites a UTC.
      -- El límite final es exclusivo: medianoche del día posterior a @hasta.
      DECLARE @inicioUTC datetime2 = CAST(
        CAST(@desde AS datetime2)
        AT TIME ZONE 'Pacific Standard Time'
        AT TIME ZONE 'UTC'
        AS datetime2
      );

      DECLARE @finUTC datetime2 = CAST(
        CAST(DATEADD(day, 1, @hasta) AS datetime2)
        AT TIME ZONE 'Pacific Standard Time'
        AT TIME ZONE 'UTC'
        AS datetime2
      );

      -- 1. Resumen: únicamente pedidos entregados (idEstado = 4).
      SELECT
        COUNT(*) AS pedidosEntregados,
        COALESCE(SUM(v.total), 0) AS ingresos,
        COALESCE(AVG(CAST(v.total AS decimal(18, 2))), 0) AS ticketPromedio
      FROM dbo.vwTotalesPedido v
      WHERE v.idEstado = 4
        AND v.fechaPedido >= @inicioUTC
        AND v.fechaPedido < @finUTC;

      -- 2. Pedidos por estado: incluye todos los estados del periodo.
      SELECT
        e.idEstado,
        e.nombre AS estado,
        COUNT(p.idPedido) AS cantidad
      FROM dbo.EstadosPedido e
      LEFT JOIN dbo.Pedidos p
        ON p.idEstado = e.idEstado
        AND p.fechaPedido >= @inicioUTC
        AND p.fechaPedido < @finUTC
      GROUP BY e.idEstado, e.nombre
      ORDER BY e.idEstado;

      -- 3. Ventas por DÍA LOCAL, no por fecha UTC.
      SELECT
        CONVERT(char(10), local.fechaLocal, 23) AS fecha,
        COUNT(*) AS pedidos,
        COALESCE(SUM(v.total), 0) AS ingresos
      FROM dbo.vwTotalesPedido v
      CROSS APPLY (
        SELECT CAST(
          (v.fechaPedido AT TIME ZONE 'UTC')
          AT TIME ZONE 'Pacific Standard Time'
          AS datetime2
        ) AS fechaLocal
      ) local
      WHERE v.idEstado = 4
        AND v.fechaPedido >= @inicioUTC
        AND v.fechaPedido < @finUTC
      GROUP BY CONVERT(char(10), local.fechaLocal, 23)
      ORDER BY fecha;

      -- 4. Productos vendidos: únicamente pedidos entregados del periodo.
      SELECT TOP (20)
        d.idProducto,
        d.nombreProducto,
        SUM(d.cantidad) AS unidades,
        SUM(d.subtotal) AS ingresos
      FROM dbo.DetallePedido d
      INNER JOIN dbo.Pedidos p ON p.idPedido = d.idPedido
      WHERE p.idEstado = 4
        AND p.fechaPedido >= @inicioUTC
        AND p.fechaPedido < @finUTC
      GROUP BY d.idProducto, d.nombreProducto
      ORDER BY unidades DESC, ingresos DESC, d.idProducto;
    `);

  const [resumen, porEstado, porDia, productos] = resultado.recordsets;

  return res.json({
    periodo: {
      desde,
      hasta,
      criterio: 'Fecha local de creación (Baja California); ingresos solo de pedidos entregados',
    },
    resumen: resumen[0],
    porEstado,
    porDia,
    productos,
  });
});

export default router;
```

## 3. Pasos para aplicar el cambio

1. Abre `backend/src/routes/reportesRutas.js` en VS Code.
2. Reemplaza su contenido por el código completo anterior.
3. Guarda el archivo.
4. Reinicia el servidor backend (si no utiliza recarga automática).
5. Inicia sesión como **Administrador** y abre el reporte de ventas.
6. Selecciona `desde = 2026-11-21` y `hasta = 2026-11-21`.

No cambies `fechaPedido` ni ejecutes actualizaciones masivas sobre `dbo.Pedidos`.

## 4. Pruebas de aceptación

| ID | Prueba | Resultado esperado |
|---|---|---|
| F01 | Consultar 21/11/2026 a 21/11/2026 | Incluye pedidos #16 y #17 si siguen entregados |
| F02 | Revisar pedidos por estado | Cuenta también pendientes y cancelados dentro del día local |
| F03 | Revisar ventas por día | El registro de la venta #17 se agrupa en `2026-11-21` |
| F04 | Revisar resumen de ingresos | Incluye los totales de pedidos entregados del día local |
| F05 | Revisar productos más vendidos | Incluye unidades de pedidos entregados del día local |
| F06 | Consultar un periodo de varios días | No duplica pedidos ni omite el día final |
| F07 | Consultar 22/11/2026 a 22/11/2026 | No incluye #17, porque corresponde al día local 21 |
| F08 | Consultar sin token | HTTP 401 |
| F09 | Consultar como Cliente o Producción | HTTP 403 |
| F10 | Fechas inválidas o invertidas | HTTP 400 |
| F11 | Consultar un periodo mayor de 366 días | HTTP 400 |
| F12 | Verificar datos históricos | Las fechas almacenadas en SQL Server permanecen sin cambios |

**Importante:** el resumen de ingresos y las ventas diarias solo consideran `idEstado = 4` (Entregado). Una compra pendiente no aumenta los ingresos hasta que se marca como entregada. En cambio, el conjunto `porEstado` sí incluye los pedidos pendientes.

### Consulta SQL de referencia

```sql
USE DulceHogar;
GO

DECLARE @desde date = '2026-11-21';
DECLARE @hasta date = '2026-11-21';

DECLARE @inicioUTC datetime2 = CAST(
  CAST(@desde AS datetime2)
  AT TIME ZONE 'Pacific Standard Time'
  AT TIME ZONE 'UTC' AS datetime2
);

DECLARE @finUTC datetime2 = CAST(
  CAST(DATEADD(day, 1, @hasta) AS datetime2)
  AT TIME ZONE 'Pacific Standard Time'
  AT TIME ZONE 'UTC' AS datetime2
);

SELECT idPedido, fechaPedido, idEstado
FROM dbo.Pedidos
WHERE fechaPedido >= @inicioUTC
  AND fechaPedido < @finUTC
ORDER BY idPedido DESC;
```

Esta consulta debe mostrar, entre otros, los pedidos #16 y #17 según la evidencia compartida. El reporte debe coincidir con los pedidos correspondientes a cada estado y, para ingresos, con los entregados.

## 5. Verificación técnica

Desde la raíz del proyecto:

```bash
cd /c/6to/reposteria-web
node --check backend/src/routes/reportesRutas.js
node pruebas/prueba-integracion.mjs

cd frontend
npm run lint
npm run build
```

Las pruebas automatizadas que requieren credenciales pueden seguir apareciendo como **OMITIDAS** hasta configurar cuentas de prueba; no cuentan como aprobadas.

## 6. Registro de anomalía V&V

| Campo | Registro |
|---|---|
| Identificador | ANO-RF16-001 |
| Requerimiento | RF16 — Reportes de ventas |
| Severidad | Media |
| Síntoma | Pedidos creados por la tarde se muestran en el día siguiente |
| Causa | Filtro de fechas locales comparado directamente con marcas UTC |
| Corrección | Límites locales convertidos a UTC y agrupación por fecha local |
| Evidencia | Pedido #17: 22/11/2026 00:18 UTC = 21/11/2026 16:18 local |
| Criterio de cierre | F01–F12 aprobadas; revisión del reporte con administrador |
| Estado | Pendiente de verificar después de aplicar el cambio |

## 7. Git

Después de verificar las pruebas:

```bash
cd /c/6to/reposteria-web
mkdir -p docs
# Copia este documento descargado a docs/JORNADA_12_A_CORRECCION_FECHAS.md

git status
git add backend/src/routes/reportesRutas.js docs/JORNADA_12_A_CORRECCION_FECHAS.md
git commit -m "fix: corregir zona horaria de reportes de ventas RF16"
git push origin main
```

**Siguiente etapa:** una vez confirmadas las pruebas F01–F12, continuar con la Jornada 12-B (auditoría de seguridad).
