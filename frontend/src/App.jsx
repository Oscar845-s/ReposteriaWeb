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