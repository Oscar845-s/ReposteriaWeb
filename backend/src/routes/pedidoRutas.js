// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: pedidoRutas.js
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

import { Router } from 'express';
import { obtenerConexion, sql } from '../config/database.js';
import { autenticar } from './authRutas.js';
const router = Router();
router.use('/pedidos',autenticar,(req,res,next)=>{
  if (req.usuario.rol !== 'Cliente') return res.status(403).json({mensaje:'Solo clientes.'});
  next();
});
// Ejecuta una operación atómica y revierte cualquier cambio ante un error.
async function transaccion(operacion) {
  const tx = new sql.Transaction(await obtenerConexion());
  await tx.begin();
  try { const resultado = await operacion(tx); await tx.commit(); return resultado; }
  catch (error) { try { await tx.rollback(); } catch { /* Ya revertida. */ } throw error; }
}
function conflicto(mensaje) { return Object.assign(new Error(mensaje),{estado:409}); }
// Valida estructura, ordena IDs para reducir bloqueos y evita duplicados.
function validarItems(items) {
  return Array.isArray(items) && items.length > 0 && items.length <= 100 &&
    items.every(i=>i && Number.isInteger(i.idProducto) && i.idProducto > 0 &&
      i.idProducto <= 2147483647 && Number.isInteger(i.cantidad) &&
      i.cantidad > 0 && i.cantidad <= 2147483647) &&
    new Set(items.map(i=>i.idProducto)).size === items.length;
}
async function agregarDetalle(tx,idPedido,item,idUsuario) {
  const r = await new sql.Request(tx).input('p',sql.Int,item.idProducto)
    .input('c',sql.Int,item.cantidad).input('pedido',sql.Int,idPedido)
    .input('u',sql.Int,idUsuario).query(`
      UPDATE p SET stock=stock-@c FROM dbo.Productos p
      JOIN dbo.Categorias cat ON cat.idCategoria=p.idCategoria
      WHERE p.idProducto=@p AND p.esActivo=1 AND cat.esActiva=1 AND p.stock>=@c;
      IF @@ROWCOUNT=0 BEGIN SELECT 0 AS valido; RETURN; END;
      INSERT dbo.DetallePedido(idPedido,idProducto,nombreProducto,cantidad,precioUnitario)
      SELECT @pedido,idProducto,nombre,@c,precio FROM dbo.Productos WHERE idProducto=@p;
      INSERT dbo.MovimientosInventario(idProducto,idUsuario,idPedido,cambio,motivo)
      VALUES(@p,@u,@pedido,-@c,N'Pedido confirmado'); SELECT 1 AS valido;`);
  if (!r.recordset[0].valido) throw conflicto('Producto no disponible o stock insuficiente.');
}
router.post('/pedidos',async(req,res)=>{
  const items=req.body?.items;
  if (!validarItems(items)) return res.status(400).json({mensaje:'Carrito inválido.'});
  try {
    const pedido=await transaccion(async tx=>{
      const r=await new sql.Request(tx).input('u',sql.Int,req.usuario.idUsuario)
        .query(`INSERT dbo.Pedidos(idUsuario,idEstado) OUTPUT INSERTED.idPedido VALUES(@u,1)`);
      const id=r.recordset[0].idPedido;
      for(const item of [...items].sort((a,b)=>a.idProducto-b.idProducto)) {
        await agregarDetalle(tx,id,item,req.usuario.idUsuario);
      }
      return (await new sql.Request(tx).input('id',sql.Int,id)
        .query('SELECT * FROM dbo.vwTotalesPedido WHERE idPedido=@id')).recordset[0];
    });
    res.status(201).json(pedido);
  } catch(error) { if(error.estado===409) return res.status(409).json({mensaje:error.message}); throw error; }
});
router.get('/pedidos',async(req,res)=>{
  const db=await obtenerConexion();
  const r=await db.request().input('u',sql.Int,req.usuario.idUsuario).query(`
    SELECT v.*,e.nombre AS estado FROM dbo.vwTotalesPedido v
    JOIN dbo.EstadosPedido e ON e.idEstado=v.idEstado WHERE v.idUsuario=@u
    ORDER BY fechaPedido DESC,idPedido DESC;
    SELECT d.* FROM dbo.DetallePedido d JOIN dbo.Pedidos p ON p.idPedido=d.idPedido
    WHERE p.idUsuario=@u ORDER BY d.idProducto;`);
  res.json(r.recordsets[0].map(p=>({...p,detalles:r.recordsets[1].filter(d=>d.idPedido===p.idPedido)})));
});
router.patch('/pedidos/:id/cancelar',async(req,res)=>{
  const id=Number(req.params.id);
  if (!Number.isInteger(id)||id<1||id>2147483647) return res.status(400).json({mensaje:'ID inválido.'});
  try {
    await transaccion(async tx=>{
      const r=await new sql.Request(tx).input('id',sql.Int,id)
        .input('u',sql.Int,req.usuario.idUsuario).query(`
        UPDATE dbo.Pedidos SET idEstado=5 WHERE idPedido=@id AND idUsuario=@u AND idEstado=1;
        IF @@ROWCOUNT=0 BEGIN SELECT 0 AS valido; RETURN; END;
        UPDATE p SET stock=p.stock+d.cantidad FROM dbo.Productos p
        JOIN dbo.DetallePedido d ON d.idProducto=p.idProducto WHERE d.idPedido=@id;
        INSERT dbo.MovimientosInventario(idProducto,idUsuario,idPedido,cambio,motivo)
        SELECT idProducto,@u,@id,cantidad,N'Pedido cancelado' FROM dbo.DetallePedido WHERE idPedido=@id;
        SELECT 1 AS valido;`);
      if(!r.recordset[0].valido) throw conflicto('Pedido no cancelable o no disponible.');
    });
    res.json({mensaje:'Pedido cancelado.'});
  } catch(error) { if(error.estado===409) return res.status(409).json({mensaje:error.message}); throw error; }
});
export default router;