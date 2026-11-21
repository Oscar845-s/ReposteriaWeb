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