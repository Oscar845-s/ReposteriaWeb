import { CakeSlice, ShoppingCart, UserRound } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const linkClass = ({ isActive }) =>
  `hover:text-rose-700 ${isActive ? 'text-rose-700 font-semibold' : 'text-stone-700'}`;

export default function Header() {
  return (
    <header className="bg-white border-b border-rose-100">
      <nav className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap gap-4 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-rose-700">
          <CakeSlice aria-hidden="true" /> Dulce Hogar
        </Link>
        <div className="flex flex-wrap items-center gap-5">
          <NavLink to="/" end className={linkClass}>Inicio</NavLink>
          <NavLink to="/catalogo" className={linkClass}>Catálogo</NavLink>
          <NavLink to="/carrito" className={linkClass} aria-label="Carrito">
            <ShoppingCart aria-hidden="true" />
          </NavLink>
          <NavLink to="/login" className={linkClass} aria-label="Iniciar sesión">
            <UserRound aria-hidden="true" />
          </NavLink>
        </div>
      </nav>
    </header>
  );
}