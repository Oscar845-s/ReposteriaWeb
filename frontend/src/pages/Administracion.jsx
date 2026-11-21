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

  useEffect(() => {
    let activo = true;
    // Primera consulta: no invocar cargar() desde el efecto, pues establece
    // el estado de carga sincrónicamente. La recarga manual sigue usando cargar().
    Promise.all([
      consultarApi('/admin/productos', 'GET', undefined, token),
      consultarApi('/admin/categorias', 'GET', undefined, token),
      consultarApi('/admin/inventario/movimientos', 'GET', undefined, token),
    ]).then(([listaProductos, listaCategorias, listaMovimientos]) => {
      if (!activo) return;
      setProductos(listaProductos);
      setCategorias(listaCategorias);
      setMovimientos(listaMovimientos);
      setError('');
    }).catch(fallo => {
      if (!activo) return;
      setError(fallo.message);
      if (fallo.estado === 401) cerrarSesion();
    }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [token, cerrarSesion]);

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