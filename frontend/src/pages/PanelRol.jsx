// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: PanelRol.jsx
// Descripción: Página provisional para verificar permisos.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useAuth } from '../hooks/useAuth';
export default function PanelRol() {
  const { usuario } = useAuth();
  return (
    <section className="max-w-6xl mx-auto px-5 py-14">
      <h1 className="text-3xl font-bold text-rose-900">Panel: {usuario.rol}</h1>
      <p>Bienvenido, {usuario.nombre}. Las operaciones se implementarán posteriormente.</p>
    </section>
  );
}