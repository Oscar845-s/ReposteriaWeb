// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: ReportesVentas.jsx
// Descripción: Reportes de ventas entregadas por periodo.
// Requerimiento: RF16, RF18
// Fecha: 21 de noviembre de 2026

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { consultarApi } from '../services/apiServicio';

const MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
});
const ENTERO = new Intl.NumberFormat('es-MX');

function fechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function periodoInicial() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { desde: fechaLocal(inicio), hasta: fechaLocal(hoy) };
}

function importe(valor) {
  return MONEDA.format(Number(valor ?? 0));
}

function porcentaje(valor, total) {
  return total > 0 ? `${(100 * valor / total).toFixed(1)}%` : '0%';
}

export default function ReportesVentas() {
  const { token, cerrarSesion } = useAuth();
  const [filtros, setFiltros] = useState(periodoInicial);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  // La petición es asíncrona: no se actualiza el estado de forma síncrona
  // en el efecto. La bandera evita aplicar respuestas de peticiones obsoletas.
  useEffect(() => {
    let activo = true;
    const parametros = new URLSearchParams(filtros);
    consultarApi(`/reportes/ventas?${parametros.toString()}`, 'GET', undefined, token)
      .then(respuesta => {
        if (!activo) return;
        setDatos(respuesta);
        setError('');
        setCargando(false);
      })
      .catch(fallo => {
        if (!activo) return;
        setDatos(null);
        setError(fallo.message);
        setCargando(false);
        if (fallo.estado === 401) cerrarSesion();
      });
    return () => { activo = false; };
  }, [token, filtros, revision, cerrarSesion]);

  function consultar(evento) {
    evento.preventDefault();
    const desde = evento.currentTarget.elements.desde.value;
    const hasta = evento.currentTarget.elements.hasta.value;
    if (!desde || !hasta || desde > hasta) {
      setError('Selecciona un periodo válido.');
      return;
    }
    const dias = Math.round((new Date(`${hasta}T00:00:00Z`) -
      new Date(`${desde}T00:00:00Z`)) / 86400000);
    if (dias > 365) {
      setError('Selecciona como máximo 366 días.');
      return;
    }
    setCargando(true);
    setError('');
    setFiltros({ desde, hasta });
    setRevision(actual => actual + 1);
  }

  const totalEstados = datos?.porEstado.reduce((suma, e) => suma + Number(e.cantidad), 0) ?? 0;
  const maximoDiario = Math.max(1, ...(datos?.porDia.map(d => Number(d.ingresos)) ?? []));

  return (
    <section className="max-w-6xl mx-auto px-5 py-10 space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-rose-900">Reportes de ventas</h1>
          <p className="text-stone-600">RF16 · Ventas realizadas de pedidos entregados.</p>
        </div>
        <Link to="/admin" className="text-rose-700 underline">Volver a administración</Link>
      </div>

      <form onSubmit={consultar} className="bg-white rounded-xl p-5 flex flex-wrap gap-4 items-end">
        <label className="block font-medium">Desde
          <input name="desde" type="date" required defaultValue={filtros.desde}
            className="block border rounded-lg p-2 mt-1" />
        </label>
        <label className="block font-medium">Hasta
          <input name="hasta" type="date" required defaultValue={filtros.hasta}
            className="block border rounded-lg p-2 mt-1" />
        </label>
        <button disabled={cargando} type="submit"
          className="bg-rose-700 text-white rounded-lg px-5 py-2 disabled:opacity-50">
          Consultar reporte
        </button>
      </form>

      {cargando && <p role="status">Consultando reporte...</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!cargando && datos && (
        <>
          <p className="text-sm text-stone-600">
            Periodo: {datos.periodo.desde} a {datos.periodo.hasta} (ambos inclusive).
            Se agrupa por fecha de creación, no fecha de entrega.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-rose-100">
              <p className="text-stone-600">Ingresos realizados</p>
              <p className="text-2xl font-bold text-rose-900">{importe(datos.resumen.ingresos)}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-rose-100">
              <p className="text-stone-600">Pedidos entregados</p>
              <p className="text-2xl font-bold text-rose-900">
                {ENTERO.format(Number(datos.resumen.pedidosEntregados))}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-rose-100">
              <p className="text-stone-600">Ticket promedio entregado</p>
              <p className="text-2xl font-bold text-rose-900">{importe(datos.resumen.ticketPromedio)}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white p-5 rounded-xl space-y-3">
              <h2 className="text-xl font-bold text-rose-900">Pedidos por estado</h2>
              <p className="text-sm text-stone-600">Incluye pendientes y cancelados; no son ingresos.</p>
              {datos.porEstado.map(estado => (
                <div key={estado.idEstado}>
                  <div className="flex justify-between text-sm gap-2">
                    <span>{estado.estado}</span>
                    <span>{estado.cantidad} · {porcentaje(Number(estado.cantidad), totalEstados)}</span>
                  </div>
                  <div className="bg-rose-50 rounded-full h-3 overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full"
                      style={{ width: porcentaje(Number(estado.cantidad), totalEstados) }} />
                  </div>
                </div>
              ))}
            </section>
            <section className="bg-white p-5 rounded-xl space-y-3">
              <h2 className="text-xl font-bold text-rose-900">Ingresos por día</h2>
              {datos.porDia.length === 0 && <p>Sin entregas registradas en este periodo.</p>}
              <div className="max-h-80 overflow-y-auto space-y-3">
                {datos.porDia.map(dia => (
                  <div key={dia.fecha}>
                    <div className="flex justify-between text-sm gap-2">
                      <span>{dia.fecha} · {dia.pedidos} pedidos</span>
                      <span>{importe(dia.ingresos)}</span>
                    </div>
                    <div className="bg-rose-50 rounded-full h-3 overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full"
                        style={{ width: porcentaje(Number(dia.ingresos), maximoDiario) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="bg-white p-5 rounded-xl space-y-3">
            <h2 className="text-xl font-bold text-rose-900">20 productos más vendidos</h2>
            <p className="text-sm text-stone-600">Solo unidades e importes de pedidos entregados.</p>
            {datos.productos.length === 0 ? <p>No hay productos vendidos en este periodo.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b">
                    <th className="p-2">Producto</th>
                    <th className="p-2">Unidades</th>
                    <th className="p-2">Ingresos</th>
                  </tr></thead>
                  <tbody>{datos.productos.map(producto => (
                    <tr key={producto.idProducto} className="border-b">
                      <td className="p-2">{producto.nombreProducto}</td>
                      <td className="p-2">{ENTERO.format(Number(producto.unidades))}</td>
                      <td className="p-2">{importe(producto.ingresos)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}