// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: authRutas.js
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { obtenerConexion, sql } from '../config/database.js';
const router = Router();
const secreto = process.env.JWT_SECRET;
if (!secreto || secreto.length < 32) throw new Error('Configura JWT_SECRET.');
const consulta = `SELECT u.idUsuario,u.nombre,u.correo,u.contrasenaHash,r.nombre AS rol
 FROM dbo.Usuarios u JOIN dbo.Roles r ON r.idRol=u.idRol WHERE u.esActivo=1`;
// Obtiene el perfil activo desde SQL; nunca devuelve el hash al cliente.
export async function autenticar(req,res,next) {
  let datos;
  try {
    datos = jwt.verify(req.headers.authorization?.split(' ')[1] || '', secreto,
      { algorithms: ['HS256'] });
    if (!req.headers.authorization?.startsWith('Bearer ')) throw new Error();
  } catch { return res.status(401).json({mensaje:'Sesión inválida o vencida.'}); }
  const db = await obtenerConexion();
  const resultado = await db.request().input('id',sql.Int,Number(datos.sub))
    .query(consulta + ' AND u.idUsuario=@id');
  const usuario = resultado.recordset[0];
  if (!usuario) return res.status(401).json({mensaje:'Usuario no disponible.'});
  const { contrasenaHash, ...perfil } = usuario;
  req.usuario = perfil;
  next();
}
router.post('/auth/registro', async (req,res) => {
  const { nombre, correo, clave } = req.body || {};
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 120 ||
      typeof correo !== 'string' || correo.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) ||
      typeof clave !== 'string' || !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(clave) ||
      Buffer.byteLength(clave,'utf8') > 72) {
    return res.status(400).json({mensaje:'Datos inválidos. Contraseña de 8 a 72 bytes, mayúscula y número.'});
  }
  const db = await obtenerConexion();
  const hash = await bcrypt.hash(clave,12);
  try {
    await db.request().input('nombre',sql.NVarChar(120),nombre.trim())
      .input('correo',sql.NVarChar(254),correo.trim().toLowerCase())
      .input('hash',sql.NVarChar(255),hash).query(`INSERT dbo.Usuarios
      (idRol,nombre,correo,contrasenaHash) VALUES
      ((SELECT idRol FROM dbo.Roles WHERE nombre=N'Cliente'),@nombre,@correo,@hash)`);
  } catch (error) {
    if ([2601,2627].includes(error.number)) return res.status(409).json({mensaje:'Correo ya registrado.'});
    throw error;
  }
  res.status(201).json({mensaje:'Cuenta creada.'});
});
router.post('/auth/login', async (req,res) => {
  const { correo, clave } = req.body || {};
  if (typeof correo !== 'string' || correo.length > 254 || typeof clave !== 'string' ||
      Buffer.byteLength(clave,'utf8') > 72) return res.status(400).json({mensaje:'Credenciales inválidas.'});
  const db = await obtenerConexion();
  const resultado = await db.request().input('correo',sql.NVarChar(254),correo.trim().toLowerCase())
    .query(consulta + ' AND u.correo=@correo');
  const cuenta = resultado.recordset[0];
  if (!cuenta || !await bcrypt.compare(clave,cuenta.contrasenaHash)) {
    return res.status(401).json({mensaje:'Correo o contraseña incorrectos.'});
  }
  const { contrasenaHash, ...usuario } = cuenta;
  const token = jwt.sign({},secreto,{subject:String(usuario.idUsuario),expiresIn:'1h'});
  res.json({usuario,token});
});
router.get('/auth/me',autenticar,(req,res)=>res.json(req.usuario));
export default router;