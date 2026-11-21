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
    cargarPedidos(() => activo);
    return () => { activo = false; };
  }, [cargarPedidos]);

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