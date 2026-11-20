// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: adminRutas.js
// Descripción: Administración segura de productos, categorías e inventario.
// Requerimiento: RF10, RF11, RF13
// Fecha: 20 de noviembre de 2026

import { Router } from 'express';
import { obtenerConexion, sql } from '../config/database.js';
import { autenticar } from './authRutas.js';

const router = Router();
const LIMITE_MOVIMIENTOS = 100;

// Restringe las operaciones a usuarios con rol Administrador vigente en SQL.
function soloAdministrador(req, res, next) {
  if (req.usuario.rol !== 'Administrador') {
    return res.status(403).json({ mensaje: 'Solo administradores.' });
  }
  next();
}

// Captura rechazos de promesas sin exponer detalles SQL al cliente.
function ejecutar(manejador) {
  return (req, res, next) => Promise.resolve(manejador(req, res)).catch(next);
}

// Valida un ID entero positivo recibido como parámetro.
function idValido(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 && String(numero) === valor;
}

// Devuelve verdadero para un nombre con longitud y contenido válidos.
function nombreValido(valor, maximo) {
  return typeof valor === 'string' && valor.trim().length > 0 &&
    valor.trim().length <= maximo;
}

// Valida los datos del producto sin aceptar stock editable.
function validarProducto(datos) {
  if (!datos || !nombreValido(datos.nombre, 120) ||
      typeof datos.descripcion !== 'string' ||
      datos.descripcion.trim().length > 1000 ||
      !Number.isInteger(datos.idCategoria) || datos.idCategoria < 1 ||
      typeof datos.precio !== 'number' || !Number.isFinite(datos.precio) ||
      datos.precio <= 0 || datos.precio > 9999999999.99 ||
      Math.round(datos.precio * 100) !== datos.precio * 100 ||
      (datos.imagen !== null && datos.imagen !== undefined &&
        (typeof datos.imagen !== 'string' || datos.imagen.length > 500)) ||
      (datos.esActivo !== undefined && typeof datos.esActivo !== 'boolean')) {
    return false;
  }
  return true;
}

// Convierte errores de unicidad y referencias a respuestas claras.
function errorSql(error, res, next) {
  const numero = error.number ?? error.originalError?.info?.number;
  if ([2601, 2627].includes(numero)) {
    return res.status(409).json({ mensaje: 'Ya existe un registro con ese nombre.' });
  }
  if (numero === 547) {
    return res.status(409).json({ mensaje: 'Categoría inexistente o con referencias.' });
  }
  next(error);
}

router.use(autenticar, soloAdministrador);

router.get('/productos', ejecutar(async (req, res) => {
  const db = await obtenerConexion();
  const resultado = await db.request().query(`
    SELECT p.idProducto AS id, p.nombre, p.descripcion,
      p.idCategoria, c.nombre AS categoria, p.precio, p.stock,
      p.imagen, p.esActivo
    FROM dbo.Productos p
    JOIN dbo.Categorias c ON c.idCategoria = p.idCategoria
    ORDER BY p.idProducto`);
  res.json(resultado.recordset);
}));

router.post('/productos', ejecutar(async (req, res, next) => {
  const datos = req.body;
  if (!validarProducto(datos)) {
    return res.status(400).json({ mensaje: 'Datos de producto inválidos.' });
  }
  try {
    const db = await obtenerConexion();
    const resultado = await db.request()
      .input('categoria', sql.Int, datos.idCategoria)
      .input('nombre', sql.NVarChar(120), datos.nombre.trim())
      .input('descripcion', sql.NVarChar(1000), datos.descripcion.trim())
      .input('precio', sql.Decimal(12, 2), datos.precio)
      .input('imagen', sql.NVarChar(500), datos.imagen?.trim() || null)
      .input('activo', sql.Bit, datos.esActivo ?? true)
      .query(`INSERT dbo.Productos
        (idCategoria, nombre, descripcion, precio, imagen, stock, esActivo)
        OUTPUT INSERTED.idProducto AS id
        VALUES (@categoria, @nombre, @descripcion, @precio, @imagen, 0, @activo)`);
    res.status(201).json(resultado.recordset[0]);
  } catch (error) { errorSql(error, res, next); }
}));

router.put('/productos/:id', ejecutar(async (req, res, next) => {
  if (!idValido(req.params.id) || !validarProducto(req.body)) {
    return res.status(400).json({ mensaje: 'Producto inválido.' });
  }
  const datos = req.body;
  try {
    const db = await obtenerConexion();
    const resultado = await db.request()
      .input('id', sql.Int, Number(req.params.id))
      .input('categoria', sql.Int, datos.idCategoria)
      .input('nombre', sql.NVarChar(120), datos.nombre.trim())
      .input('descripcion', sql.NVarChar(1000), datos.descripcion.trim())
      .input('precio', sql.Decimal(12, 2), datos.precio)
      .input('imagen', sql.NVarChar(500), datos.imagen?.trim() || null)
      .input('activo', sql.Bit, datos.esActivo ?? true)
      .query(`UPDATE dbo.Productos SET idCategoria=@categoria, nombre=@nombre,
        descripcion=@descripcion, precio=@precio, imagen=@imagen, esActivo=@activo
        OUTPUT INSERTED.idProducto AS id
        WHERE idProducto=@id`);
    if (!resultado.recordset.length) {
      return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    }
    res.json(resultado.recordset[0]);
  } catch (error) { errorSql(error, res, next); }
}));

router.get('/categorias', ejecutar(async (req, res) => {
  const db = await obtenerConexion();
  const resultado = await db.request().query(`
    SELECT idCategoria AS id, nombre, esActiva
    FROM dbo.Categorias ORDER BY nombre`);
  res.json(resultado.recordset);
}));

router.post('/categorias', ejecutar(async (req, res, next) => {
  const { nombre } = req.body ?? {};
  if (!nombreValido(nombre, 100)) {
    return res.status(400).json({ mensaje: 'Nombre inválido.' });
  }
  try {
    const db = await obtenerConexion();
    const resultado = await db.request()
      .input('nombre', sql.NVarChar(100), nombre.trim())
      .query(`INSERT dbo.Categorias(nombre)
        OUTPUT INSERTED.idCategoria AS id VALUES(@nombre)`);
    res.status(201).json(resultado.recordset[0]);
  } catch (error) { errorSql(error, res, next); }
}));

router.put('/categorias/:id', ejecutar(async (req, res, next) => {
  const { nombre, esActiva } = req.body ?? {};
  if (!idValido(req.params.id) || !nombreValido(nombre, 100) ||
      typeof esActiva !== 'boolean') {
    return res.status(400).json({ mensaje: 'Categoría inválida.' });
  }
  try {
    const db = await obtenerConexion();
    const resultado = await db.request()
      .input('id', sql.Int, Number(req.params.id))
      .input('nombre', sql.NVarChar(100), nombre.trim())
      .input('activo', sql.Bit, esActiva)
      .query(`UPDATE dbo.Categorias SET nombre=@nombre, esActiva=@activo
        OUTPUT INSERTED.idCategoria AS id WHERE idCategoria=@id`);
    if (!resultado.recordset.length) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada.' });
    }
    res.json(resultado.recordset[0]);
  } catch (error) { errorSql(error, res, next); }
}));

router.post('/inventario/:id/ajustar', ejecutar(async (req, res) => {
  const { cambio, motivo } = req.body ?? {};
  if (!idValido(req.params.id) || !Number.isSafeInteger(cambio) ||
      cambio === 0 || Math.abs(cambio) > 1000000 || !nombreValido(motivo, 200)) {
    return res.status(400).json({ mensaje: 'Ajuste inválido.' });
  }
  const db = await obtenerConexion();
  const transaccion = new sql.Transaction(db);
  await transaccion.begin();
  try {
    const resultado = await new sql.Request(transaccion)
      .input('id', sql.Int, Number(req.params.id))
      .input('cambio', sql.Int, cambio)
      .query(`UPDATE dbo.Productos SET stock=stock+@cambio
        OUTPUT INSERTED.stock AS stock
        WHERE idProducto=@id AND stock+@cambio>=0`);
    if (!resultado.recordset.length) {
      await transaccion.rollback();
      return res.status(409).json({
        mensaje: 'Producto inexistente o inventario insuficiente.',
      });
    }
    await new sql.Request(transaccion)
      .input('id', sql.Int, Number(req.params.id))
      .input('usuario', sql.Int, req.usuario.idUsuario)
      .input('cambio', sql.Int, cambio)
      .input('motivo', sql.NVarChar(200), motivo.trim())
      .query(`INSERT dbo.MovimientosInventario
        (idProducto, idUsuario, cambio, motivo)
        VALUES (@id, @usuario, @cambio, @motivo)`);
    await transaccion.commit();
    res.json({ idProducto: Number(req.params.id), stock: resultado.recordset[0].stock });
  } catch (error) {
    await transaccion.rollback();
    throw error;
  }
}));

router.get('/inventario/movimientos', ejecutar(async (req, res) => {
  const db = await obtenerConexion();
  const resultado = await db.request().query(`
    SELECT TOP (${LIMITE_MOVIMIENTOS}) m.idMovimiento,
      m.idProducto, p.nombre AS producto, m.cambio, m.motivo,
      m.fechaMovimiento, u.nombre AS usuario
    FROM dbo.MovimientosInventario m
    JOIN dbo.Productos p ON p.idProducto=m.idProducto
    LEFT JOIN dbo.Usuarios u ON u.idUsuario=m.idUsuario
    ORDER BY m.idMovimiento DESC`);
  res.json(resultado.recordset);
}));

export default router;