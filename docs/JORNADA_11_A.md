# JORNADA 11-A — Administración de productos, categorías e inventario

**Proyecto:** Dulce Hogar / ReposteriaWeb  
**Fecha:** 20 de noviembre de 2026  
**Materia:** Verificación y Validación de Software  
**Autor:** Oscar Armando Medina Gutiérrez  
**Requerimientos:** RF10, RF11, RF13. Conserva RF01–RF09, RF17, RF18 y RF20.

## 1. Estado inicial y alcance

Se verificó el listado compartido: `backend/src/routes/pedidoRutas.js` y `backend/src/routes/authRutas.js` ya existen; los nombres plurales `pedidosRutas.js` y `pedidosServicio.js` **no existen y no hay que crearlos**. `frontend/src/pages/PanelRol.jsx` sigue siendo una pantalla provisional; `/admin` apunta a ella. `git status` está limpio.

En esta parte construiremos una **pantalla administrativa** para crear, consultar, editar y desactivar productos y categorías; registrar ajustes de inventario con movimientos auditables; y proteger todas las operaciones por **rol Administrador comprobado en SQL Server**, no solo por React. Los pedidos, producción y reportes se desarrollarán en 11-B y 11-C. No se cambian imágenes existentes ni se reinstala SQL Server.

**Decisiones de integridad:** se utiliza baja lógica (`esActivo=0`) en vez de `DELETE`, para no romper las referencias de pedidos históricos. El stock se modifica **solo** por el endpoint de ajustes y dentro de una transacción. No se modifica el esquema de tablas; no hay script SQL nuevo. Las cuentas de administrador ya deben existir según Jornada 10.

## 2. Preparación

En Git Bash:

```bash
cd /c/6to/reposteria-web
git status
```

Verifica que el árbol esté limpio. Antes de reemplazar `app.js`, verifica que sus importaciones coincidan con el archivo compartido (se incluye su contenido completo abajo). No ejecutes `01_esquema.sql` ni `02_datos.sql` otra vez. No hay dependencias nuevas.

## 3. Backend: API administrativa

Endpoints protegidos (prefijo `/api/admin`):

| Método | Ruta | Acción |
|---|---|---|
| GET | `/productos` | Todos los productos, incluidos inactivos |
| POST | `/productos` | Crear producto |
| PUT | `/productos/:id` | Editar datos, categoría, precio, visibilidad |
| GET | `/categorias` | Todas las categorías |
| POST | `/categorias` | Crear categoría |
| PUT | `/categorias/:id` | Editar nombre y estado |
| POST | `/inventario/:id/ajustar` | Ajuste firmado y movimiento auditable |
| GET | `/inventario/movimientos` | Últimos 100 movimientos |

**Importante:** la API pública del catálogo sigue excluyendo los productos o categorías inactivos mediante `vwCatalogo`. El panel administrativo sí los muestra.

### `backend/src/routes/adminRutas.js`

**Crear**:

```js
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
```

### `backend/src/app.js`

**Reemplazar el archivo completo**:

```js
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: app.js
// Descripción: Configuración de Express, CORS y rutas.
// Requerimiento: RF03, RF04, RF08, RF10, RF11, RF13
// Fecha: 20 de noviembre de 2026

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRutas from './routes/authRutas.js';
import pedidoRutas from './routes/pedidoRutas.js';
import adminRutas from './routes/adminRutas.js';
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
app.use('/api/admin', adminRutas);
app.use('/api', rutas, authRutas, pedidoRutas);
app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));
app.use(manejarError);
export default app;
```

## 4. Frontend: panel administrativo

Se reutiliza `consultarApi(ruta, metodo, datos, token)` de `frontend/src/services/apiServicio.js`; no se modifica. La ruta `/admin` se sustituye por una pantalla funcional. El panel provisional de producción se conserva. Para evitar perder el carrito por cambios del catálogo, el botón **Actualizar catálogo** sigue disponible en la aplicación y el panel llama a `actualizar()` solo después de guardar cambios de productos/categorías o inventario.

### `frontend/src/pages/Administracion.jsx`

**Crear**:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Administracion.jsx
// Descripción: CRUD de productos, categorías y ajustes de inventario.
// Requerimiento: RF10, RF11, RF13
// Fecha: 20 de noviembre de 2026

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCatalogo } from '../hooks/useCatalogo';
import { consultarApi } from '../services/apiServicio';

const MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const VACIO = {
  nombre: '', descripcion: '', idCategoria: '', precio: '', imagen: '', esActivo: true,
};
const CAMPO = 'w-full border border-rose-200 rounded-lg p-2 bg-white';

// Convierte un producto de la API a valores editables del formulario.
function datosFormulario(producto) {
  return producto ? {
    nombre: producto.nombre, descripcion: producto.descripcion,
    idCategoria: String(producto.idCategoria), precio: String(producto.precio),
    imagen: producto.imagen || '', esActivo: Boolean(producto.esActivo),
  } : { ...VACIO };
}

export default function Administracion() {
  const { token, cerrarSesion } = useAuth();
  const { actualizar } = useCatalogo();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [productoId, setProductoId] = useState(null);
  const [formulario, setFormulario] = useState({ ...VACIO });
  const [categoriaNueva, setCategoriaNueva] = useState('');
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [categoriaNombre, setCategoriaNombre] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState(true);
  const [inventarioId, setInventarioId] = useState('');
  const [cambio, setCambio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Consulta todas las tablas necesarias para el panel.
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaProductos, listaCategorias, listaMovimientos] = await Promise.all([
        consultarApi('/admin/productos', 'GET', undefined, token),
        consultarApi('/admin/categorias', 'GET', undefined, token),
        consultarApi('/admin/inventario/movimientos', 'GET', undefined, token),
      ]);
      setProductos(listaProductos);
      setCategorias(listaCategorias);
      setMovimientos(listaMovimientos);
      setError('');
    } catch (fallo) {
      setError(fallo.message);
      if (fallo.estado === 401) cerrarSesion();
    } finally {
      setCargando(false);
    }
  }, [token, cerrarSesion]);

  useEffect(() => { cargar(); }, [cargar]);

  // Ejecuta una operación, refresca datos y notifica al usuario.
  async function ejecutarOperacion(operacion, descripcion, refrescarCatalogo = false) {
    setOcupado(true);
    setError('');
    setMensaje('');
    try {
      await operacion();
      await cargar();
      setMensaje(descripcion);
      if (refrescarCatalogo) actualizar();
      return true;
    } catch (fallo) {
      setError(fallo.message);
      if (fallo.estado === 401) cerrarSesion();
      return false;
    } finally {
      setOcupado(false);
    }
  }

  // Prepara el formulario de producto nuevo o existente.
  function editarProducto(producto = null) {
    setProductoId(producto?.id ?? null);
    setFormulario(datosFormulario(producto));
    setError('');
  }

  // Actualiza el formulario de producto.
  function cambiarProducto(evento) {
    const { name, value, type, checked } = evento.target;
    setFormulario(actual => ({
      ...actual, [name]: type === 'checkbox' ? checked : value,
    }));
  }

  // Crea o actualiza un producto; el stock no forma parte del formulario.
  async function guardarProducto(evento) {
    evento.preventDefault();
    const datos = {
      ...formulario, idCategoria: Number(formulario.idCategoria),
      precio: Number(formulario.precio), imagen: formulario.imagen.trim() || null,
    };
    const ruta = productoId ? `/admin/productos/${productoId}` : '/admin/productos';
    const metodo = productoId ? 'PUT' : 'POST';
    const exito = await ejecutarOperacion(
      () => consultarApi(ruta, metodo, datos, token),
      productoId ? 'Producto actualizado.' : 'Producto creado con stock inicial cero.',
      true,
    );
    if (exito) editarProducto();
  }

  // Cambia el estado visible de un producto sin eliminar su historial.
  async function cambiarEstadoProducto(producto) {
    await ejecutarOperacion(() => consultarApi(`/admin/productos/${producto.id}`, 'PUT', {
      nombre: producto.nombre, descripcion: producto.descripcion,
      idCategoria: producto.idCategoria, precio: Number(producto.precio),
      imagen: producto.imagen, esActivo: !producto.esActivo,
    }, token), 'Visibilidad del producto actualizada.', true);
  }

  // Registra una categoría nueva.
  async function crearCategoria(evento) {
    evento.preventDefault();
    const exito = await ejecutarOperacion(
      () => consultarApi('/admin/categorias', 'POST', { nombre: categoriaNueva }, token),
      'Categoría creada.', true,
    );
    if (exito) setCategoriaNueva('');
  }

  // Guarda cambios de nombre y visibilidad de una categoría.
  async function guardarCategoria(evento) {
    evento.preventDefault();
    const exito = await ejecutarOperacion(
      () => consultarApi(`/admin/categorias/${categoriaEditando}`, 'PUT', {
        nombre: categoriaNombre, esActiva: categoriaActiva,
      }, token), 'Categoría actualizada.', true,
    );
    if (exito) setCategoriaEditando(null);
  }

  // Registra una entrada o salida de inventario.
  async function ajustarInventario(evento) {
    evento.preventDefault();
    const exito = await ejecutarOperacion(
      () => consultarApi(`/admin/inventario/${inventarioId}/ajustar`, 'POST', {
        cambio: Number(cambio), motivo,
      }, token), 'Inventario actualizado y movimiento registrado.', true,
    );
    if (exito) { setCambio(''); setMotivo(''); }
  }

  return (
    <section className="max-w-6xl mx-auto px-5 py-10 space-y-8">
      <h1 className="text-3xl font-bold text-rose-900">Administración de Dulce Hogar</h1>
      <p className="text-stone-600">Productos, categorías e inventario — RF10, RF11 y RF13.</p>
      <button type="button" disabled={cargando || ocupado} onClick={cargar}
        className="underline text-rose-700">Actualizar datos del panel</button>
      {cargando && <p role="status">Cargando datos administrativos...</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {mensaje && <p role="status" className="text-green-800">{mensaje}</p>}

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={guardarProducto} className="bg-white rounded-xl p-5 space-y-3">
          <h2 className="text-xl font-bold text-rose-900">
            {productoId ? `Editar producto #${productoId}` : 'Nuevo producto'}
          </h2>
          <label className="block">Nombre
            <input className={CAMPO} name="nombre" required maxLength={120}
              value={formulario.nombre} onChange={cambiarProducto} />
          </label>
          <label className="block">Descripción
            <textarea className={CAMPO} name="descripcion" maxLength={1000}
              value={formulario.descripcion} onChange={cambiarProducto} />
          </label>
          <label className="block">Categoría
            <select className={CAMPO} name="idCategoria" required
              value={formulario.idCategoria} onChange={cambiarProducto}>
              <option value="">Selecciona una categoría</option>
              {categorias.filter(c => c.esActiva).map(c =>
                <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className="block">Precio (MXN)
            <input className={CAMPO} name="precio" type="number" required min="0.01"
              step="0.01" value={formulario.precio} onChange={cambiarProducto} />
          </label>
          <label className="block">Ruta de imagen (opcional)
            <input className={CAMPO} name="imagen" maxLength={500}
              placeholder="/images/nombre.jpg" value={formulario.imagen}
              onChange={cambiarProducto} />
          </label>
          <label className="flex gap-2 items-center">
            <input name="esActivo" type="checkbox" checked={formulario.esActivo}
              onChange={cambiarProducto} /> Producto activo
          </label>
          <p className="text-sm text-stone-600">El stock inicial es 0. Se ajusta por separado.</p>
          <div className="flex gap-3">
            <button disabled={ocupado || cargando} className="bg-rose-700 text-white px-4 py-2 rounded-lg">
              Guardar producto
            </button>
            <button type="button" onClick={() => editarProducto()}
              className="underline">Nuevo / limpiar</button>
          </div>
        </form>

        <div className="bg-white rounded-xl p-5 space-y-4">
          <h2 className="text-xl font-bold text-rose-900">Categorías</h2>
          <form onSubmit={crearCategoria} className="flex gap-2">
            <input aria-label="Nueva categoría" className={CAMPO} required maxLength={100}
              value={categoriaNueva} onChange={e => setCategoriaNueva(e.target.value)} />
            <button disabled={ocupado || cargando} className="bg-rose-700 text-white px-3 rounded-lg">
              Crear
            </button>
          </form>
          <ul className="space-y-2">
            {categorias.map(c => <li key={c.id} className="flex justify-between gap-2 border-b pb-2">
              <span>{c.nombre} {!c.esActiva && '(inactiva)'}</span>
              <button type="button" className="underline text-rose-700"
                onClick={() => { setCategoriaEditando(c.id); setCategoriaNombre(c.nombre);
                  setCategoriaActiva(Boolean(c.esActiva)); }}>Editar</button>
            </li>)}
          </ul>
          {categoriaEditando !== null && <form onSubmit={guardarCategoria}
            className="border border-rose-200 rounded-lg p-3 space-y-3">
            <h3 className="font-semibold">Editar categoría #{categoriaEditando}</h3>
            <input className={CAMPO} required maxLength={100} value={categoriaNombre}
              onChange={e => setCategoriaNombre(e.target.value)} />
            <label className="flex gap-2"><input type="checkbox" checked={categoriaActiva}
              onChange={e => setCategoriaActiva(e.target.checked)} /> Activa</label>
            <button disabled={ocupado || cargando} className="bg-rose-700 text-white px-3 py-2 rounded">
              Guardar categoría
            </button>
            <button type="button" onClick={() => setCategoriaEditando(null)}
              className="ml-3 underline">Cancelar</button>
          </form>}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 space-y-3">
        <h2 className="text-xl font-bold text-rose-900">Productos registrados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">ID</th>
              <th className="p-2">Nombre</th><th className="p-2">Categoría</th>
              <th className="p-2">Precio</th><th className="p-2">Stock</th>
              <th className="p-2">Estado</th><th className="p-2">Acciones</th></tr></thead>
            <tbody>{productos.map(p => <tr key={p.id} className="border-b">
              <td className="p-2">{p.id}</td><td className="p-2">{p.nombre}</td>
              <td className="p-2">{p.categoria}</td>
              <td className="p-2">{MONEDA.format(p.precio)}</td>
              <td className="p-2">{p.stock}</td>
              <td className="p-2">{p.esActivo ? 'Activo' : 'Inactivo'}</td>
              <td className="p-2 space-x-3">
                <button type="button" className="underline text-rose-700"
                  onClick={() => editarProducto(p)}>Editar</button>
                <button type="button" disabled={ocupado} className="underline text-rose-700"
                  onClick={() => cambiarEstadoProducto(p)}>
                  {p.esActivo ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={ajustarInventario} className="bg-white rounded-xl p-5 space-y-3">
          <h2 className="text-xl font-bold text-rose-900">Ajuste de inventario</h2>
          <label className="block">Producto
            <select className={CAMPO} required value={inventarioId}
              onChange={e => setInventarioId(e.target.value)}>
              <option value="">Selecciona un producto</option>
              {productos.map(p => <option key={p.id} value={p.id}>
                #{p.id} {p.nombre} — stock {p.stock}
              </option>)}
            </select>
          </label>
          <label className="block">Cambio (+ entrada / - salida)
            <input className={CAMPO} type="number" required step="1" min="-1000000"
              max="1000000" value={cambio} onChange={e => setCambio(e.target.value)} />
          </label>
          <label className="block">Motivo
            <input className={CAMPO} required maxLength={200} value={motivo}
              onChange={e => setMotivo(e.target.value)} />
          </label>
          <button disabled={ocupado || cargando} className="bg-rose-700 text-white px-4 py-2 rounded-lg">
            Registrar ajuste
          </button>
        </form>
        <div className="bg-white rounded-xl p-5 space-y-3">
          <h2 className="text-xl font-bold text-rose-900">Movimientos recientes</h2>
          <div className="max-h-96 overflow-auto space-y-2 text-sm">
            {movimientos.map(m => <div key={m.idMovimiento} className="border-b pb-2">
              <strong>{m.producto}</strong> ({m.cambio > 0 ? '+' : ''}{m.cambio})
              <p>{m.motivo}</p>
              <p className="text-stone-500">{m.usuario || 'Sistema'} —
                {' '}{new Date(m.fechaMovimiento).toLocaleString('es-MX')}</p>
            </div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
```

### `frontend/src/App.jsx`

**Reemplazar el archivo completo**:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: App.jsx
// Descripción: Rutas públicas y privadas por rol, incluido panel administrativo.
// Requerimiento: RF01, RF02, RF05, RF08, RF10, RF11, RF13, RF18
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
import PanelRol from './pages/PanelRol';
import Administracion from './pages/Administracion';
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

## 5. Arranque y comprobación

Abre dos terminales distintas (no necesitas reinstalar dependencias):

**Terminal 1**

```bash
cd /c/6to/reposteria-web/backend
npm run dev
```

**Terminal 2**

```bash
cd /c/6to/reposteria-web/frontend
npm run dev
```

En el navegador entra a `http://localhost:5173/login` con la cuenta **administrador** creada en Jornada 10; luego abre `/admin`. Si el servidor devuelve 401, revisa que tu sesión siga vigente; si devuelve 403, verifica el rol asignado en SQL Server. **No conviertas un cliente en administrador desde el frontend**.

## 6. Pruebas de aceptación (PA-11A)

Antes de probar cambios destructivos, anota valores originales y utiliza nombres temporales. Evita modificar categorías/productos usados por clientes activos. **No borres pedidos ni ejecutes nuevamente los scripts de carga inicial.**

| Prueba | Pasos | Resultado esperado |
|---|---|---|
| PA-11A-01 | Iniciar sesión como administrador y entrar a `/admin` | Carga productos, categorías y movimientos |
| PA-11A-02 | Abrir `/admin` como cliente y producción | Redirección a `/sin-acceso` |
| PA-11A-03 | Consultar `/api/admin/productos` sin token | HTTP 401, no revela datos |
| PA-11A-04 | Consultar API admin con JWT de cliente | HTTP 403 |
| PA-11A-05 | Crear categoría `Temporal 11A` | HTTP 201, aparece en lista |
| PA-11A-06 | Crear producto `Producto temporal 11A`, precio 35.50, categoría temporal | Aparece con stock 0 |
| PA-11A-07 | Editar descripción y precio a 40.00 | Se reflejan los cambios en SQL y panel |
| PA-11A-08 | Registrar ajuste `+5` motivo `Prueba 11A` | Stock pasa de 0 a 5 y existe movimiento positivo |
| PA-11A-09 | Registrar ajuste `-2` | Stock pasa de 5 a 3, existe movimiento negativo |
| PA-11A-10 | Intentar ajuste `-10` | HTTP 409, stock queda en 3 y sin movimiento nuevo |
| PA-11A-11 | Desactivar y reactivar el producto | Desaparece y reaparece en catálogo público |
| PA-11A-12 | Desactivar y reactivar la categoría temporal | Productos asociados se ocultan/restauran en catálogo |
| PA-11A-13 | Crear categoría con nombre duplicado | HTTP 409; no crea duplicado |
| PA-11A-14 | Enviar precio negativo o `stock` en edición de producto | Precio inválido: HTTP 400; el stock extra no se aplica |
| PA-11A-15 | Repetir catálogo, carrito, login, pedidos e historial | No hay regresiones |

### Consultas SQL de verificación

```sql
USE DulceHogar;

SELECT p.idProducto, p.nombre, p.precio, p.stock, p.esActivo,
       c.nombre AS categoria, c.esActiva
FROM dbo.Productos p
JOIN dbo.Categorias c ON c.idCategoria = p.idCategoria
WHERE p.nombre LIKE N'%11A%';

SELECT idCategoria, nombre, esActiva
FROM dbo.Categorias WHERE nombre LIKE N'%11A%';

SELECT TOP (20) idMovimiento, idProducto, idUsuario, cambio,
       motivo, fechaMovimiento
FROM dbo.MovimientosInventario
ORDER BY idMovimiento DESC;

SELECT * FROM dbo.vwCatalogo WHERE nombre LIKE N'%11A%';
```

**Limpieza:** desactiva el producto temporal y la categoría temporal desde el panel; **no los elimines físicamente**, porque pueden tener movimientos de inventario. Las pruebas de inventario no deben ejecutarse sobre productos vendidos. Los movimientos de prueba quedan como historial de auditoría.

### Prueba API con sesión real

La API administrativa usa el token de la cuenta administradora. Puedes comprobar los códigos 401/403 desde DevTools → Red o desde Git Bash. Para 401:

```bash
curl -i http://localhost:3000/api/admin/productos
```

Para 403, utiliza **solo** un token de cliente de prueba obtenido de tu propio inicio de sesión:

```bash
curl -i -H 'Authorization: Bearer TOKEN_CLIENTE'   http://localhost:3000/api/admin/productos
```

No compartas tokens ni archivos `.env` en el chat o GitHub.

## 7. Verificación técnica y Git

Desde la raíz:

```bash
cd /c/6to/reposteria-web
cd frontend
npm run build
cd ../backend
node --check src/routes/adminRutas.js
node --check src/app.js
cd ..
git diff --check
git status
```

Si todo funciona y las 15 pruebas pasan, guarda este documento en `docs/JORNADA_11_A.md` y registra:

```bash
git add backend/src/routes/adminRutas.js backend/src/app.js   frontend/src/pages/Administracion.jsx frontend/src/App.jsx   docs/JORNADA_11_A.md
git diff --cached --stat
git commit -m "Implementar administración de productos e inventario (RF10, RF11, RF13)"
git push origin main
```

## 8. Notas de diseño y límites

- El backend comprueba el rol a partir del usuario activo de SQL Server mediante `autenticar` de Jornada 10. Una ruta protegida en React **no sustituye** este control.
- La baja lógica mantiene integridad referencial de pedidos y movimientos.
- La categoría seleccionada debe estar activa para aparecer en el selector de productos. Si editas un producto perteneciente a una categoría desactivada, reactívala antes de guardar o selecciona otra.
- El campo imagen es opcional. Para los ocho productos iniciales, el frontend conserva el mapeo de imágenes ya implementado. Para productos nuevos, escribe una ruta de imagen **que ya exista** en `frontend/public/images/` o deja el campo vacío; no se implementa subida de archivos.
- La API valida `esActivo` y `esActiva` como booleanos. SQL Server devuelve valores `bit` que el driver convierte a booleanos.
- Los ajustes de inventario requieren motivo y generan una fila en `MovimientosInventario` dentro de la misma transacción.
- **Limitación conocida:** la validación de existencia/estado de la categoría se apoya en la clave foránea; la API permite asociar productos a categorías inactivas si se solicita directamente. No se publicarán en el catálogo por el filtro de la vista. Tampoco hay paginación administrativa ni historial de edición de precios, funciones que podrían agregarse después.
- **Siguiente documento:** `JORNADA_11_B.md` — administración de pedidos y panel de producción. Espera a confirmar las pruebas 11-A antes de avanzar.

