// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Header.jsx
// Descripción: Navegación y contador de unidades del carrito.
// Requerimiento: RF05, RF06
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { CakeSlice, ShoppingCart, UserRound } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../data/usuariosDemo';
import { useCarrito } from '../hooks/useCarrito';

// ===== Funciones =====
// Recibe el estado de navegación; devuelve las clases del enlace.
const obtenerClaseEnlace = ({ isActive }) =>
  `hover:text-rose-700 ${isActive ? 'text-rose-700 font-semibold' : 'text-stone-700'}`;

// No recibe parámetros; devuelve el encabezado del sitio.
export default function Header() {
  const { cantidadTotal, mensaje, hayErrorGuardado } = useCarrito();
  const { usuario, cerrarSesion } = useAuth();
  return (
    <header className="bg-white border-b border-rose-100">
      <nav className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap gap-4
        items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-rose-700">
          <CakeSlice aria-hidden="true" /> Dulce Hogar
        </Link>
        <div className="flex flex-wrap items-center gap-5">
          <NavLink to="/" end className={obtenerClaseEnlace}>Inicio</NavLink>
          <NavLink to="/catalogo" className={obtenerClaseEnlace}>Catálogo</NavLink>
          {(!usuario || usuario.rol === ROLES.CLIENTE) && <NavLink to="/carrito" className={obtenerClaseEnlace}
            aria-label={`Carrito: ${cantidadTotal} unidades`}>
            <span className="relative inline-flex">
              <ShoppingCart aria-hidden="true" />
              <span className="absolute -top-2 -right-3 rounded-full bg-rose-700
                text-white text-xs px-1.5">{cantidadTotal}</span>
            </span>
          </NavLink>}
          {usuario ? <>
            {usuario.rol === ROLES.ADMIN && <>
            <Link to="/admin">Administración</Link>
            <Link to="/admin/pedidos">Pedidos</Link></>}
            {usuario.rol === ROLES.PRODUCCION && <Link to="/produccion">Producción</Link>}
            <span className="text-sm">{usuario.nombre}</span>
            <Link to="/" onClick={cerrarSesion} className="text-rose-700">Cerrar sesión</Link>
          </> : <NavLink to="/login" className={obtenerClaseEnlace} aria-label="Iniciar sesión">
            <UserRound aria-hidden="true" />
          </NavLink>}
        </div>
      </nav>
      {mensaje && <p role="status" className="px-5 pb-2 text-sm text-center">{mensaje}</p>}
      {hayErrorGuardado && <p role="alert" className="px-5 text-red-700 text-sm">
        No fue posible guardar el carrito en este navegador.
      </p>}
    </header>
  );
}