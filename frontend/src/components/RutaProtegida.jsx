// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: RutaProtegida.jsx
// Descripción: Comprueba sesión y rol antes de renderizar una ruta.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RutaProtegida({ roles }) {
  const { usuario } = useAuth();
  const ubicacion = useLocation();
  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }
  if (!roles.includes(usuario.rol)) {
    return <Navigate to="/sin-acceso" replace />;
  }
  return <Outlet />;
}