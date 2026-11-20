# Jornada 10 --- Autenticación real, pedidos e historial

**Objetivo:** RF01, RF02, RF08, RF09, RF17, RF18 y RF20. Conservar RF05--RF07.

## 1. Preparación

Desde Git Bash, en backend, ejecutar `npm install bcryptjs jsonwebtoken`. Generar un secreto con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` y agregarlo a backend/.env como `JWT_SECRET=valor_generado`. Agregar `JWT_SECRET=` a .env.example. No compartir el secreto. Mantener SQL Server y la configuración existente. No ejecutar nuevamente los scripts de creación de tablas.

La sesión usa JWT de una hora en sessionStorage; para producción se recomienda HTTPS, cookies HttpOnly y revocación de sesiones. El cierre local no revoca un token ya emitido. El carrito continúa siendo local por correo; las compras se validan en SQL Server.

### `backend/src/routes/authRutas.js`

Crear o reemplazar el archivo completo:

``` js
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
```

### `backend/src/routes/pedidoRutas.js`

Crear o reemplazar el archivo completo:

``` js
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
```

### `backend/src/app.js`

Crear o reemplazar el archivo completo:

``` js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: app.js
// Descripción: Configuración de Express y CORS.
// Requerimiento: RF03, RF04
// Fecha: 20 de noviembre de 2026
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRutas from './routes/authRutas.js';
import pedidoRutas from './routes/pedidoRutas.js';
import rutas from './routes/catalogoRutas.js';
import manejarError from './middleware/manejarError.js';
import { obtenerConexion } from './config/database.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json({ limit: '100kb' }));
app.get('/api/salud', async (req, res) => {
  const conexion = await obtenerConexion();
  await conexion.request().query('SELECT 1 AS prueba');
  res.json({ estado: 'ok', baseDatos: 'conectada' });
});
app.use('/api', rutas, authRutas, pedidoRutas);
app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));
app.use(manejarError);
export default app;
```

### `frontend/src/services/apiServicio.js`

Crear o reemplazar el archivo completo:

``` js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: apiServicio.js
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

const URL_API = 'http://localhost:3000/api';
export async function consultarApi(ruta,metodo='GET',datos,token) {
  const respuesta=await fetch(URL_API+ruta,{method:metodo,headers:{
    'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})
  },...(datos===undefined?{}:{body:JSON.stringify(datos)})});
  const resultado=await respuesta.json();
  if(!respuesta.ok) throw Object.assign(new Error(resultado.mensaje||'Error de API'),{estado:respuesta.status});
  return resultado;
}
```

### `frontend/src/context/AuthProvider.jsx`

Crear o reemplazar el archivo completo:

``` jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: AuthProvider.jsx
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

import { useState,useEffect } from 'react';
import { AuthContext } from './authContext';
import { consultarApi } from '../services/apiServicio';
const CLAVE='dulce-hogar-token-v1';
export default function AuthProvider({children}) {
  const [usuario,setUsuario]=useState(null);
  const [token,setToken]=useState(()=>sessionStorage.getItem(CLAVE));
  const [cargando,setCargando]=useState(Boolean(token));
  useEffect(()=>{
    let activo=true;
    if(token) consultarApi('/auth/me','GET',undefined,token).then(perfil=>{
      if(activo) setUsuario(perfil);
    }).catch(()=>{if(activo){sessionStorage.removeItem(CLAVE);setToken(null);setUsuario(null);}})
      .finally(()=>{if(activo)setCargando(false);});
    return ()=>{activo=false;};
  },[token]);
  async function iniciarSesion(correo,clave) {
    try { const r=await consultarApi('/auth/login','POST',{correo,clave});
      sessionStorage.setItem(CLAVE,r.token);setToken(r.token);setUsuario(r.usuario);return '';
    } catch(error){return error.message;}
  }
  async function registrar(nombre,correo,clave) {
    try {await consultarApi('/auth/registro','POST',{nombre,correo,clave});return '';}
    catch(error){return error.message;}
  }
  function cerrarSesion(){sessionStorage.removeItem(CLAVE);setToken(null);setUsuario(null);setCargando(false);}
  if(cargando) return <main role="status" className="p-8">Verificando sesión...</main>;
  return <AuthContext.Provider value={{usuario,token,iniciarSesion,registrar,cerrarSesion}}>
    {children}</AuthContext.Provider>;
}
```

### `frontend/src/pages/Login.jsx`

Crear o reemplazar el archivo completo:

``` jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Login.jsx
// Descripción: Formulario de acceso con mensajes y redirección por rol.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../data/usuariosDemo';

export default function Login() {
  const { usuario, iniciarSesion } = useAuth();
  const { state } = useLocation();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // Procesa el formulario sin recargar la página.
  async function enviar(evento) {
    evento.preventDefault();
    setOcupado(true);
    try { setError(await iniciarSesion(correo, clave)); } finally { setOcupado(false); }
  }

  if (usuario) {
    const destino = usuario.rol === ROLES.ADMIN ? '/admin' :
      usuario.rol === ROLES.PRODUCCION ? '/produccion' :
      ['/carrito','/pedidos'].includes(state?.desde) ? state.desde : '/catalogo';
    return <Navigate to={destino} replace />;
  }

  return (
    <section className="max-w-md mx-auto px-5 py-14">
      <form onSubmit={enviar} className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h1 className="text-3xl font-bold text-rose-900">Iniciar sesión</h1>
        <label className="block">Correo electrónico
          <input type="email" required value={correo} autoComplete="username"
            onChange={e => setCorreo(e.target.value)} className="border rounded p-3 w-full" />
        </label>
        <label className="block">Contraseña
          <input type="password" required value={clave} autoComplete="current-password"
            onChange={e => setClave(e.target.value)} className="border rounded p-3 w-full" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={ocupado} className="bg-rose-700 text-white rounded-lg p-3 w-full">Entrar</button>
        <Link to="/registro" className="text-rose-700 underline">Crear cuenta</Link>
      </form>
    </section>
  );
}
```

### `frontend/src/pages/Registro.jsx`

Crear o reemplazar el archivo completo:

``` jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Registro.jsx
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

import { useState } from 'react';
import { Link,Navigate,useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
export default function Registro(){
  const {usuario,registrar}=useAuth();const navegar=useNavigate();
  const [datos,setDatos]=useState({nombre:'',correo:'',clave:'',confirmar:''});
  const [error,setError]=useState('');const [ocupado,setOcupado]=useState(false);
  async function enviar(e){e.preventDefault();
    if(datos.clave!==datos.confirmar){setError('Las contraseñas no coinciden.');return;}
    setOcupado(true);try{const r=await registrar(datos.nombre,datos.correo,datos.clave);
      setError(r);if(!r)navegar('/login',{replace:true});}finally{setOcupado(false);}
  }
  if(usuario)return <Navigate to="/" replace/>;
  return <section className="max-w-md mx-auto px-5 py-14"><form onSubmit={enviar}
    className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
    <h1 className="text-3xl font-bold text-rose-900">Crear cuenta</h1>
    { [['nombre','Nombre','text'],['correo','Correo','email'],['clave','Contraseña','password'],
      ['confirmar','Confirmar contraseña','password']].map(([name,etiqueta,tipo])=>(
      <label key={name} className="block">{etiqueta}<input required name={name} type={tipo}
        value={datos[name]} onChange={e=>setDatos({...datos,[name]:e.target.value})}
        autoComplete={tipo==='password'?'new-password':name==='correo'?'email':'name'}
        className="border rounded p-3 w-full"/></label>))}
    <p className="text-sm">Mínimo 8 caracteres, una mayúscula y un número; máximo 72 bytes.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <button disabled={ocupado} className="bg-rose-700 text-white rounded-lg p-3 w-full">Registrarme</button>
    <Link to="/login" className="text-rose-700 underline">Ya tengo cuenta</Link>
  </form></section>;
}
```

### `frontend/src/pages/Carrito.jsx`

Crear o reemplazar el archivo completo:

``` jsx
// Nombre: Oscar Armando Medina Gutiérrez// Materia: Verificación y Validación de Software
// Programa: Carrito.jsx
// Descripción: Muestra productos, modifica cantidades y calcula importes.
// Requerimiento: RF06, RF07 / CU-08, CU-12
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { useState } from 'react';
import DetalleProducto from '../components/DetalleProducto';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Eye } from 'lucide-react';
import { consultarApi } from '../services/apiServicio';
import { useAuth } from '../hooks/useAuth';
import { useCatalogo } from '../hooks/useCatalogo';
import { useCarrito } from '../hooks/useCarrito';

// ===== Constantes =====
const FORMATO_MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});
const CANTIDAD_MINIMA = 1;

// ===== Funciones =====
// Recibe un item; devuelve su fila con controles de modificación.
function FilaCarrito({ item, abrirDetalle }) {
  const { modificarCantidad, eliminarProducto } = useCarrito();
  const { producto, cantidad, subtotal, idProducto } = item;
  const [hayErrorImagen, setHayErrorImagen] = useState(false);
  return (
    <article className="rounded-xl bg-white border border-rose-100 p-4 flex flex-wrap gap-4
      items-center justify-between">
      <div className="w-24 h-24 rounded-lg bg-rose-100 overflow-hidden
        flex items-center justify-center shrink-0">
        {hayErrorImagen ? <span className="text-xs">{producto.categoria}</span> : (
          <img src={producto.imagen} alt={producto.nombre}
            className="w-full h-full object-cover" onError={() => setHayErrorImagen(true)} />
        )}
      </div>
      <div className="flex-1 min-w-40">
        <p className="text-sm text-rose-700">{producto.categoria}</p>
        <h2 className="font-bold text-rose-900">{producto.nombre}</h2>
        <p className="text-sm">{FORMATO_MONEDA.format(producto.precio)} MXN / unidad</p>
        <p className="text-sm text-stone-600">{producto.descripcion}</p>
        <p className="text-sm">Disponibles para agregar: {Math.max(0, producto.stock - cantidad)}</p>
        <button type="button" onClick={() => abrirDetalle(producto)}
          className="flex items-center gap-2 text-rose-700 underline mt-2">
          <Eye size={18} /> Ver detalle
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" disabled={cantidad <= CANTIDAD_MINIMA}
          aria-label={`Disminuir ${producto.nombre}`}
          onClick={() => modificarCantidad(idProducto, cantidad - 1)}
          className="border border-rose-200 rounded-lg p-2 disabled:opacity-40">
          <Minus size={18} />
        </button>
        <span aria-live="polite">{cantidad}</span>
        <button type="button" disabled={cantidad >= producto.stock}
          aria-label={`Aumentar ${producto.nombre}`}
          onClick={() => modificarCantidad(idProducto, cantidad + 1)}
          className="border border-rose-200 rounded-lg p-2 disabled:opacity-40">
          <Plus size={18} />
        </button>
      </div>
      <p className="font-bold">{FORMATO_MONEDA.format(subtotal)}</p>
      <button type="button" aria-label={`Eliminar ${producto.nombre}`}
        onClick={() => eliminarProducto(idProducto)} className="text-red-700 p-2">
        <Trash2 size={20} />
      </button>
    </article>
  );
}

// No recibe argumentos; devuelve la página del carrito.
export default function Carrito() {
  const { detalles, total, vaciarCarrito } = useCarrito();
  const { token, cerrarSesion } = useAuth();
  const { actualizar } = useCatalogo();
  const [ocupado,setOcupado] = useState(false);
  const [mensaje,setMensaje] = useState('');
  async function confirmar() {
    if(ocupado || !detalles.length) return;
    setOcupado(true);setMensaje('');
    try {
      const pedido=await consultarApi('/pedidos','POST',{
        items:detalles.map(({idProducto,cantidad})=>({idProducto,cantidad}))
      },token);
      vaciarCarrito();setMensaje(`Pedido ${pedido.idPedido} confirmado.`);actualizar();
    } catch(error) {
      setMensaje(error.message+' Si hubo un fallo de red, revisa el historial antes de reintentar.');
      if(error.estado===401) cerrarSesion();
      if(error.estado===409) actualizar();
    } finally {setOcupado(false);}
  }
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  return (
    <section className="max-w-6xl mx-auto px-5 py-14 space-y-6">
      <h1 className="text-3xl font-bold text-rose-950">Carrito de compras</h1>
      {detalles.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center">Tu carrito está vacío.</div>
      ) : (
        <fieldset disabled={ocupado} className="space-y-4">
          {detalles.map(item => <FilaCarrito key={item.idProducto} item={item}
             abrirDetalle={setProductoSeleccionado} />)}
          <button type="button" onClick={vaciarCarrito} className="text-red-700 underline">
            Vaciar carrito
          </button>
        </fieldset>
      )}
      <div className="rounded-xl bg-white border border-rose-100 p-6 space-y-4">
        <p className="text-2xl font-bold text-rose-900" aria-live="polite">
          Total: {FORMATO_MONEDA.format(total)} MXN
        </p>
        <button type="button" disabled={ocupado || !detalles.length} onClick={confirmar} className="w-full rounded-lg bg-rose-700 text-white py-3 disabled:opacity-50">Confirmar pedido</button>
      </div>
      {mensaje && <p role="status">{mensaje}</p>}
      <Link to="/pedidos" className="text-rose-700 underline mr-4">Mis pedidos</Link>
      <Link to="/catalogo" className="text-rose-700 underline">Seguir comprando</Link>
      {productoSeleccionado && (
        <DetalleProducto key={productoSeleccionado.id} producto={productoSeleccionado}
          cerrarDetalle={() => setProductoSeleccionado(null)} />
      )}
    </section>
  );
}
```

### `frontend/src/pages/Pedidos.jsx`

Crear o reemplazar el archivo completo:

``` jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Pedidos.jsx
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCatalogo } from '../hooks/useCatalogo';
import { consultarApi } from '../services/apiServicio';
const moneda=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
export default function Pedidos(){
  const {token,cerrarSesion}=useAuth();const {actualizar}=useCatalogo();
  const [pedidos,setPedidos]=useState([]);const [error,setError]=useState('');
  const [ocupado,setOcupado]=useState(true);
  async function cargar(){setOcupado(true);setError('');try{
    setPedidos(await consultarApi('/pedidos','GET',undefined,token));
  }catch(e){setError(e.message);if(e.estado===401)cerrarSesion();}finally{setOcupado(false);}}
  useEffect(()=>{cargar();},[token]);
  async function cancelar(id){if(!window.confirm('¿Cancelar pedido?'))return;
    setOcupado(true);try{await consultarApi(`/pedidos/${id}/cancelar`,'PATCH',undefined,token);
      actualizar();await cargar();}catch(e){setError(e.message);if(e.estado===401)cerrarSesion();}
    finally{setOcupado(false);}}
  return <section className="max-w-6xl mx-auto p-8 space-y-4">
    <h1 className="text-3xl font-bold text-rose-900">Mis pedidos</h1>
    <Link to="/carrito" className="underline">Volver al carrito</Link>
    <button disabled={ocupado} onClick={cargar} className="ml-4 underline">Actualizar</button>
    {error&&<p role="alert">{error}</p>}{ocupado&&<p role="status">Cargando...</p>}
    {!ocupado&&!error&&!pedidos.length&&<p>No tienes pedidos.</p>}
    {pedidos.map(p=><article key={p.idPedido} className="bg-white rounded-xl p-5 space-y-2">
      <h2 className="font-bold">Pedido #{p.idPedido} — {p.estado}</h2>
      <p>{new Date(p.fechaPedido).toLocaleString('es-MX')}</p>
      {p.detalles.map(d=><p key={d.idProducto}>{d.nombreProducto} × {d.cantidad} — {moneda.format(d.subtotal)}</p>)}
      <p className="font-bold">Total: {moneda.format(p.total)}</p>
      {p.idEstado===1&&<button disabled={ocupado} onClick={()=>cancelar(p.idPedido)}
        className="text-red-700 underline">Cancelar pedido</button>}
    </article>)}
  </section>;
}
```

### `frontend/src/App.jsx`

Crear o reemplazar el archivo completo:

``` jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: App.jsx
// Descripción: Conserva las rutas existentes y agrega protección por rol.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { Routes, Route, Link } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Pedidos from './pages/Pedidos';
import Login from './pages/Login';
import Registro from './pages/Registro';
import NotFound from './pages/NotFound';
import PanelRol from './pages/PanelRol';
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
          <Route path="/admin" element={<PanelRol />} />
        </Route>
        <Route element={<RutaProtegida roles={[ROLES.PRODUCCION]} />}>
          <Route path="/produccion" element={<PanelRol />} />
        </Route>
        <Route path="/sin-acceso" element={<section className="p-10">
          <h1 className="text-2xl font-bold">Acceso no autorizado</h1>
          <Link to="/" className="underline">Volver al inicio</Link>
        </section>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
```

### `frontend/src/data/usuariosDemo.js`

Crear o reemplazar el archivo completo:

``` js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: usuariosDemo.js
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

export const ROLES = Object.freeze({
  CLIENTE: 'Cliente', ADMIN: 'Administrador', PRODUCCION: 'Personal de Producción',
});
```

## Cuentas de prueba y ejecución

Iniciar backend con `npm run dev` y frontend con `npm run dev` en terminales separadas. Registrar las tres cuentas de prueba desde la interfaz, con correos cliente@demo.mx, admin@demo.mx y produccion@demo.mx y contraseñas Cliente123, Admin1234 y Produccion123 respectivamente. Todas se crean como clientes. Solo en SSMS, como administrador de la base, ejecutar:

``` sql
USE DulceHogar;
UPDATE u SET idRol=r.idRol FROM dbo.Usuarios u CROSS JOIN dbo.Roles r
WHERE u.correo=N'admin@demo.mx' AND r.nombre=N'Administrador';
UPDATE u SET idRol=r.idRol FROM dbo.Usuarios u CROSS JOIN dbo.Roles r
WHERE u.correo=N'produccion@demo.mx' AND r.nombre=N'Personal de Producción';
SELECT u.correo,r.nombre FROM dbo.Usuarios u JOIN dbo.Roles r ON u.idRol=r.idRol;
```

No usar estas cuentas en producción. Las cuentas simuladas anteriores no se migran; los carritos locales por correo se conservan. Guardar el SQL como `database/04_roles_prueba.sql` si se desea reproducir la preparación local. No se altera el esquema.

## Pruebas de aceptación

  ------------------------------------------------------------------------------------------------------------------
  Prueba                                        Resultado esperado
  --------------------------------------------- --------------------------------------------------------------------
  Registro válido y duplicado                   201 y 409; contraseña almacenada como hash

  Contraseña débil                              400

  Login incorrecto                              401

  Login correcto y recarga                      Perfil real y rol correcto

  Cierre de sesión                              Acceso privado bloqueado

  GET /api/pedidos sin token mediante curl      401

  Cliente compra dos pasteles de chocolate      Pedido pendiente, total \$640 si precio \$320, stock disminuye dos

  Compra con stock insuficiente                 409, sin pedido ni cambios parciales

  Historial con dos clientes                    Cada uno solo ve sus compras

  Cancelar pendiente                            Estado cancelado, stock restaurado

  Repetir cancelación                           409, no restaura dos veces

  Administrador y producción                    Rutas propias, API de pedidos 403

  Cambiar precio en SQL y actualizar catálogo   Total usa precio nuevo en servidor

  Catálogo, imágenes y carrito                  Sin regresiones
  ------------------------------------------------------------------------------------------------------------------

Verificar en SSMS:

``` sql
USE DulceHogar;
SELECT * FROM dbo.vwTotalesPedido;
SELECT * FROM dbo.DetallePedido;
SELECT * FROM dbo.MovimientosInventario ORDER BY idMovimiento DESC;
SELECT idProducto,nombre,stock FROM dbo.Productos;
SELECT correo,LEN(contrasenaHash) AS longitudHash FROM dbo.Usuarios;
```

Para prueba de stock insuficiente, preparar carrito, reducir stock de ese producto en SSMS antes de confirmar y sin actualizar catálogo; restaurar el stock de prueba al finalizar. Probar también un carrito de dos productos donde el segundo falla: el primero no debe descontarse. La interfaz no permite confirmar dos veces mientras la solicitud está pendiente; todavía no existe una clave de idempotencia persistente, así que ante pérdida de red consultar historial antes de reintentar. No se ha ejecutado este código contra tu instancia SQL Server. No se incluye recuperación de contraseña RF19, expiración automática en pantalla ni limitación de intentos de inicio de sesión; añadir antes de producción. El inventario se refresca con el mecanismo de Jornada 9. No se registra pago electrónico.

## Git

Desde la raíz, guardar este documento en docs/JORNADA_10.md y ejecutar:

``` bash
git status
git add backend/package.json backend/package-lock.json backend/src backend/.env.example frontend/src docs/JORNADA_10.md
git diff --cached --stat
git commit -m "Implementar autenticacion real y pedidos (RF01 RF02 RF08 RF09 RF17 RF18 RF20)"
git push origin main
```

No incluir .env ni node_modules. Si guardaste el SQL opcional, agregarlo explícitamente antes del commit. Realizar todas las pruebas antes de confirmar la jornada.
