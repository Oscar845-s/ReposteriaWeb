# JORNADA 11-B — Correcciones de lint (React / Oxlint)

**Proyecto:** Dulce Hogar / ReposteriaWeb  
**Materia:** Verificación y Validación de Software  
**Autor:** Oscar Armando Medina Gutiérrez  
**Fecha:** 21 de noviembre de 2026

## Objetivo

Resolver las **7 advertencias** reportadas por `npm run lint` sin alterar las rutas de API, la base de datos, los roles, las imágenes ni la lógica de negocio ya validada. Las correcciones se basan en los **seis archivos actuales** compartidos por el estudiante. Se reemplazan seis archivos y se crea uno nuevo. No hay cambios en SQL Server ni en el backend.

### Diagnóstico

- `CarritoProvider.jsx`: persistir en `localStorage` dentro del efecto es válido, pero notificar con `setHayErrorGuardado` de forma sincrónica genera la advertencia. Se difiere únicamente la notificación y se mantiene el **guardado inmediato** en `vaciarCarrito()`.
- `Pedidos.jsx`: el efecto llamaba a `cargar()` que cambia estado sincrónicamente; además omitía una dependencia. Ahora la consulta inicial se realiza directamente y solo actualiza estado tras la respuesta asíncrona.
- `Produccion.jsx`, `AdministracionPedidos.jsx`, `Administracion.jsx`: la carga inicial usa directamente las promesas de la API y cancela las actualizaciones de estado cuando se desmonta el componente. Las funciones de actualización manual siguen intactas.
- `main.jsx`: se extrae `AplicacionConCarrito` a un archivo de componente independiente para permitir Fast Refresh.

> **Precaución:** Estas correcciones están preparadas sobre el código compartido; no se ha ejecutado `oxlint` contra tu instalación local. Si persiste alguna advertencia, comparte la nueva salida antes de modificar más archivos.

## Pasos

1. Guarda una copia de los archivos actuales o crea una rama de respaldo con Git.
2. Sustituye **cada archivo** por el contenido completo indicado en su sección. Crea el archivo nuevo `frontend/src/components/AplicacionConCarrito.jsx`.
3. Guarda todos los archivos y ejecuta `npm run lint` y `npm run build` desde `frontend`.
4. Repite las pruebas funcionales del final de este documento.

## Código completo

### `frontend/src/context/CarritoProvider.jsx` (REEMPLAZAR)

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CarritoProvider.jsx
// Descripción: Centraliza las operaciones y el estado del carrito.
// Requerimiento: RF05, RF06, RF07, RF08
// Fecha: 20 de noviembre de 2026

// ===== Importaciones =====
import { useReducer, useEffect, useState } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';
import { CarritoContext } from './carritoContext';
import {
  cargarCarrito, guardarCarrito, validarCantidad, obtenerDetalles,
} from '../services/carritoServicio';

// ===== Funciones =====
// Recibe estado y acción; devuelve el nuevo estado sin efectos secundarios.
function reducirCarrito(estado, accion) {
  if (accion.tipo === 'SINCRONIZAR') {
    return { ...estado, items: obtenerDetalles(estado.items, accion.productos)
      .map(({ idProducto, cantidad }) => ({ idProducto, cantidad })) };
  }
  const { items } = estado;
  const { tipo, idProducto, cantidad } = accion;
  if (tipo === 'VACIAR') {
    return { items: [], mensaje: 'Carrito vacío.' };
  }
  if (tipo === 'ELIMINAR') {
    return {
      items: items.filter(item => item.idProducto !== idProducto),
      mensaje: 'Producto eliminado.',
    };
  }
  const existente = items.find(item => item.idProducto === idProducto);
  if (tipo !== 'AGREGAR' && tipo !== 'MODIFICAR') {
    return estado;
  }
  const nuevaCantidad = tipo === 'AGREGAR'
    ? (existente?.cantidad ?? 0) + cantidad : cantidad;
  // RF05/RF06: validar tanto entrada como cantidad acumulada.
  if (!Number.isInteger(cantidad) || cantidad < 1 ||
      !validarCantidad(idProducto, nuevaCantidad, accion.productos)) {
    return { ...estado, mensaje: 'Cantidad inválida o existencias insuficientes.' };
  }
  if (tipo === 'MODIFICAR' && !existente) {
    return estado;
  }
  const nuevosItems = existente
    ? items.map(item => item.idProducto === idProducto
      ? { ...item, cantidad: nuevaCantidad } : item)
    : [...items, { idProducto, cantidad: nuevaCantidad }];
  return { items: nuevosItems, mensaje: 'Carrito actualizado.' };
}

// Recibe los componentes hijos; devuelve el proveedor con estado compartido.
export default function CarritoProvider({ children, correo }) {
  const { productos, listo } = useCatalogo();
  const [estado, dispatch] = useReducer(reducirCarrito, null, () => ({
    items: cargarCarrito(correo), mensaje: '',
  }));
  const [hayErrorGuardado, setHayErrorGuardado] = useState(false);
  useEffect(() => {
    if (listo) {
      dispatch({ tipo: 'SINCRONIZAR', productos });
    }
  }, [listo, productos]);
  useEffect(() => {
    let activo = true;
    if (listo) {
      const ajustados = obtenerDetalles(estado.items, productos)
        .map(({ idProducto, cantidad }) => ({ idProducto, cantidad }));
      // Guardar es una sincronización externa; diferimos la notificación de error.
      // El guardado inmediato en vaciarCarrito() permanece intacto.
      const guardado = guardarCarrito(ajustados, correo);
      Promise.resolve().then(() => {
        if (activo) setHayErrorGuardado(!guardado);
      });
    }
    return () => { activo = false; };
  }, [estado.items, correo, listo, productos]);

  const detalles = obtenerDetalles(estado.items, productos);
  const total = detalles.reduce((suma, item) => suma + item.subtotal, 0);
  const cantidadTotal = detalles.reduce((suma, item) => suma + item.cantidad, 0);

  // Persiste el carrito vacío antes de actualizar el catálogo o desmontar el proveedor.
  function vaciarCarrito() {
    if (!correo) {
      return true;
    }
    const guardado = guardarCarrito([], correo);
    setHayErrorGuardado(!guardado);
    dispatch({ tipo: 'VACIAR' });
    return guardado;
  }

  const valor = {
    detalles, total, cantidadTotal, mensaje: estado.mensaje, hayErrorGuardado,
    agregarAlCarrito: (idProducto, cantidad = 1) =>
      correo && listo && dispatch({ tipo: 'AGREGAR', idProducto, cantidad, productos }),
    modificarCantidad: (idProducto, cantidad) =>
      correo && listo && dispatch({ tipo: 'MODIFICAR', idProducto, cantidad, productos }),
    eliminarProducto: idProducto => correo && listo && dispatch({ tipo: 'ELIMINAR', idProducto }),
    vaciarCarrito,
  };
  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}
```

### `frontend/src/pages/Pedidos.jsx` (REEMPLAZAR)

```jsx
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
  useEffect(() => {
    let activo = true;
    // La carga inicial no llama a una función que cambie el estado sincrónicamente.
    consultarApi('/pedidos', 'GET', undefined, token)
      .then(datos => { if (activo) setPedidos(datos); })
      .catch(fallo => {
        if (activo) {
          setError(fallo.message);
          if (fallo.estado === 401) cerrarSesion();
        }
      })
      .finally(() => { if (activo) setOcupado(false); });
    return () => { activo = false; };
  }, [token, cerrarSesion]);
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

### `frontend/src/pages/Produccion.jsx` (REEMPLAZAR)

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Produccion.jsx
// Descripción: Consulta de pedidos en producción y marcado como listos.
// Requerimiento: RF15, RF18
// Fecha: 20 de noviembre de 2026

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { consultarApi } from '../services/apiServicio';

export default function Produccion() {
  const { token, cerrarSesion } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarPedidos = useCallback(async (sigueActivo) => {
    setCargando(true);
    setError('');
    try {
      const datos = await consultarApi('/operaciones/produccion', 'GET', undefined, token);
      if (!sigueActivo || sigueActivo()) setPedidos(datos);
    } catch (fallo) {
      if (!sigueActivo || sigueActivo()) {
        setError(fallo.message);
        if (fallo.estado === 401) cerrarSesion();
      }
    } finally {
      if (!sigueActivo || sigueActivo()) setCargando(false);
    }
  }, [token, cerrarSesion]);

  useEffect(() => {
    let activo = true;
    // La petición es asíncrona y evita actualizar estado al desmontar.
    consultarApi('/operaciones/produccion', 'GET', undefined, token)
      .then(datos => { if (activo) setPedidos(datos); })
      .catch(fallo => {
        if (activo) {
          setError(fallo.message);
          if (fallo.estado === 401) cerrarSesion();
        }
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [token, cerrarSesion]);

  async function marcarListo(idPedido) {
    if (procesando !== null) return;
    setProcesando(idPedido);
    setError('');
    setMensaje('');
    try {
      const respuesta = await consultarApi(
        `/operaciones/pedidos/${idPedido}/listo`, 'PATCH', undefined, token,
      );
      setMensaje(respuesta.mensaje);
      await cargarPedidos();
    } catch (fallo) {
      setError(fallo.message);
      if (fallo.estado === 401) cerrarSesion();
      if (fallo.estado === 409) await cargarPedidos();
    } finally {
      setProcesando(null);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-5 py-12 space-y-5">
      <h1 className="text-3xl font-bold text-rose-900">Panel de producción</h1>
      <p className="text-stone-600">Pedidos en preparación y listos para entrega.</p>
      <button type="button" onClick={() => cargarPedidos()}
        disabled={cargando || procesando !== null} className="text-rose-700 underline">
        Actualizar pedidos
      </button>
      {mensaje && <p role="status" className="text-green-800">{mensaje}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {cargando && <p role="status">Consultando producción...</p>}
      {!cargando && pedidos.length === 0 && <p>No hay pedidos en producción.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {pedidos.map(pedido => (
          <article key={pedido.idPedido} className="bg-white border border-rose-100 rounded-xl p-5 space-y-3">
            <div className="flex justify-between gap-3">
              <h2 className="font-bold text-rose-900">Pedido #{pedido.idPedido}</h2>
              <strong>{pedido.estado}</strong>
            </div>
            <p>Cliente: {pedido.nombreCliente}</p>
            <ul className="list-disc pl-5">
              {pedido.detalles.map(detalle => (
                <li key={detalle.idProducto}>
                  {detalle.nombreProducto} × {detalle.cantidad}
                </li>
              ))}
            </ul>
            {pedido.idEstado === 2 && (
              <button type="button" disabled={procesando !== null || cargando}
                onClick={() => marcarListo(pedido.idPedido)}
                className="bg-rose-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                Marcar como listo
              </button>
            )}
            {pedido.idEstado === 3 && (
              <p className="font-medium text-green-800">Esperando entrega por administración.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
```

### `frontend/src/pages/AdministracionPedidos.jsx` (REEMPLAZAR)

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: AdministracionPedidos.jsx
// Descripción: Seguimiento general y entrega de pedidos por el administrador.
// Requerimiento: RF14, RF18
// Fecha: 20 de noviembre de 2026

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { consultarApi } from '../services/apiServicio';

const moneda = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});

export default function AdministracionPedidos() {
  const { token, cerrarSesion } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarPedidos = useCallback(async (signalActivo) => {
    setCargando(true);
    setError('');
    try {
      const datos = await consultarApi('/operaciones/pedidos', 'GET', undefined, token);
      if (!signalActivo || signalActivo()) setPedidos(datos);
    } catch (fallo) {
      if (!signalActivo || signalActivo()) {
        setError(fallo.message);
        if (fallo.estado === 401) cerrarSesion();
      }
    } finally {
      if (!signalActivo || signalActivo()) setCargando(false);
    }
  }, [token, cerrarSesion]);

  useEffect(() => {
    let activo = true;
    // La petición es asíncrona y evita actualizar estado al desmontar.
    consultarApi('/operaciones/pedidos', 'GET', undefined, token)
      .then(datos => { if (activo) setPedidos(datos); })
      .catch(fallo => {
        if (activo) {
          setError(fallo.message);
          if (fallo.estado === 401) cerrarSesion();
        }
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [token, cerrarSesion]);

  async function ejecutarAccion(idPedido, accion) {
    if (procesando !== null) return;
    setProcesando(idPedido);
    setError('');
    setMensaje('');
    try {
      const respuesta = await consultarApi(
        `/operaciones/pedidos/${idPedido}/${accion}`, 'PATCH', undefined, token,
      );
      setMensaje(respuesta.mensaje);
      await cargarPedidos();
    } catch (fallo) {
      setError(fallo.message);
      if (fallo.estado === 401) cerrarSesion();
      if (fallo.estado === 409) await cargarPedidos();
    } finally {
      setProcesando(null);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-5 py-12 space-y-5">
      <h1 className="text-3xl font-bold text-rose-900">Administración de pedidos</h1>
      <div className="flex flex-wrap gap-4">
        <Link className="text-rose-700 underline" to="/admin">Productos e inventario</Link>
        <button type="button" onClick={() => cargarPedidos()}
          disabled={cargando || procesando !== null} className="text-rose-700 underline">
          Actualizar pedidos
        </button>
      </div>
      {mensaje && <p role="status" className="text-green-800">{mensaje}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {cargando && <p role="status">Consultando pedidos...</p>}
      {!cargando && pedidos.length === 0 && <p>No hay pedidos registrados.</p>}
      <div className="space-y-4">
        {pedidos.map(pedido => (
          <article key={pedido.idPedido} className="bg-white border border-rose-100 rounded-xl p-5 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-bold text-rose-900">Pedido #{pedido.idPedido}</h2>
              <strong>{pedido.estado}</strong>
            </div>
            <p className="text-sm">Cliente: {pedido.nombreCliente} ({pedido.correoCliente})</p>
            <p className="text-sm">{new Date(pedido.fechaPedido).toLocaleString('es-MX')}</p>
            <ul className="list-disc pl-5">
              {pedido.detalles.map(detalle => (
                <li key={detalle.idProducto}>
                  {detalle.nombreProducto} × {detalle.cantidad} — {moneda.format(detalle.subtotal)}
                </li>
              ))}
            </ul>
            <p className="font-bold">Total: {moneda.format(pedido.total)}</p>
            {pedido.idEstado === 1 && (
              <button type="button" disabled={procesando !== null || cargando}
                onClick={() => ejecutarAccion(pedido.idPedido, 'iniciar')}
                className="bg-rose-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                Iniciar preparación
              </button>
            )}
            {pedido.idEstado === 3 && (
              <button type="button" disabled={procesando !== null || cargando}
                onClick={() => ejecutarAccion(pedido.idPedido, 'entregar')}
                className="bg-rose-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                Marcar como entregado
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
```

### `frontend/src/pages/Administracion.jsx` (REEMPLAZAR)

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
```

### `frontend/src/components/AplicacionConCarrito.jsx` (NUEVO)

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: AplicacionConCarrito.jsx
// Descripción: Inicializa un carrito independiente para cada cliente.
// Requerimiento: RF05, RF06, RF08, RF18
// Fecha: 21 de noviembre de 2026

import App from '../App.jsx';
import CarritoProvider from '../context/CarritoProvider';
import { useCatalogo } from '../hooks/useCatalogo';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../data/usuariosDemo';

// Monta un carrito independiente para cada cliente.
export default function AplicacionConCarrito() {
  const { usuario } = useAuth();
  const { listo, cargando, error, actualizar } = useCatalogo();
  if (!listo) {
    return <main className="p-8" role="status">
      {cargando ? 'Cargando catálogo...' : error}
      {!cargando && <button className="ml-4 underline" onClick={actualizar}>Reintentar</button>}
    </main>;
  }
  const correo = usuario?.rol === ROLES.CLIENTE ? usuario.correo : null;
  return (
    <CarritoProvider key={correo ?? 'sin-cliente'} correo={correo}>
      <button type="button" className="m-2 text-sm underline" onClick={actualizar}>
        Actualizar catálogo e inventario
      </button>
      <App />
    </CarritoProvider>
  );
}
```

### `frontend/src/main.jsx` (REEMPLAZAR)

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: main.jsx
// Descripción: Inicializa autenticación antes del carrito; el cambio de cuenta reinicia el proveedor.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CatalogoProvider from './context/CatalogoProvider';
import AuthProvider from './context/AuthProvider';
import AplicacionConCarrito from './components/AplicacionConCarrito';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><CatalogoProvider><AplicacionConCarrito />
      </CatalogoProvider></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

## Verificaciones técnicas

Desde Git Bash:

```bash
cd /c/6to/reposteria-web/frontend
npm run lint
npm run build
```

**Resultado esperado:** 0 errores y 0 advertencias en `oxlint`; compilación Vite exitosa. Si el resultado difiere, copia el mensaje exacto.

## Pruebas de aceptación / regresión

| ID | Pasos | Resultado esperado |
|---|---|---|
| LINT-01 | Ejecutar `npm run lint` | 0 advertencias, 0 errores |
| LINT-02 | Ejecutar `npm run build` | Compilación exitosa |
| REG-01 | Cliente agrega productos, confirma pedido y recarga | Carrito vacío, total $0 y contador 0; pedido en historial |
| REG-02 | Simular confirmación fallida | El carrito se conserva |
| REG-03 | Cambiar de cliente y regresar | Carritos independientes |
| REG-04 | Abrir `/pedidos`, recargar, actualizar y cancelar pendiente | Historial correcto; cancelación y restitución de stock solo una vez |
| REG-05 | Administrador abre `/admin`, actualiza, edita producto, categoría e inventario | Panel funcional y datos correctos |
| REG-06 | Administrador abre `/admin/pedidos`, inicia preparación y marca entregado cuando corresponda | Estados válidos; sin movimientos duplicados de stock |
| REG-07 | Producción abre `/produccion`, actualiza y marca pedido como listo | Se actualiza el estado correctamente |
| REG-08 | Cambiar sesión y recargar durante consultas | Sin datos de otro usuario ni errores de estado |
| REG-09 | Actualizar catálogo e inventario desde el encabezado | Catálogo y carrito siguen funcionando |

**Nota:** `CarritoProvider` conserva la lógica de `SINCRONIZAR` que recorta cantidades al stock disponible. No se altera el contrato de `consultarApi` ni el control de roles.

## Git (solo después de aprobar las pruebas)

```bash
cd /c/6to/reposteria-web
git status
git diff --check
git add frontend/src/context/CarritoProvider.jsx frontend/src/pages/Pedidos.jsx frontend/src/pages/Produccion.jsx frontend/src/pages/AdministracionPedidos.jsx frontend/src/pages/Administracion.jsx frontend/src/components/AplicacionConCarrito.jsx frontend/src/main.jsx
git commit -m "fix: resolver advertencias de oxlint en paneles y carrito"
git push origin main
```

## Cierre

Si las pruebas pasan, la **Jornada 11-B** puede cerrarse y se continúa con **Jornada 11-C: reportes de ventas**. No avances al siguiente módulo si las pruebas de carrito, pedidos o inventario fallan.
