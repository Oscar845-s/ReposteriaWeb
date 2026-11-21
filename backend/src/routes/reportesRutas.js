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