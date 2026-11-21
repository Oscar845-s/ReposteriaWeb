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