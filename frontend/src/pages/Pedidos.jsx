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