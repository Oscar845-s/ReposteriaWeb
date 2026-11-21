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