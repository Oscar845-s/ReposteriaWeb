// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Login.jsx
// Descripción: Formulario de acceso con mensajes y redirección por rol.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../data/usuariosDemo';

export default function Login() {
  const { usuario, iniciarSesion } = useAuth();
  const { state } = useLocation();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  // Procesa el formulario sin recargar la página.
  function enviar(evento) {
    evento.preventDefault();
    setError(iniciarSesion(correo, clave));
  }

  if (usuario) {
    const destino = usuario.rol === ROLES.ADMIN ? '/admin' :
      usuario.rol === ROLES.PRODUCCION ? '/produccion' :
      state?.desde === '/carrito' ? '/carrito' : '/catalogo';
    return <Navigate to={destino} replace />;
  }

  return (
    <section className="max-w-md mx-auto px-5 py-14">
      <form onSubmit={enviar} className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h1 className="text-3xl font-bold text-rose-900">Iniciar sesión</h1>
        <label className="block">Correo electrónico
          <input type="email" required value={correo} autoComplete="username"
            onChange={e => setCorreo(e.target.value)} className="border rounded p-3 w-full" />
        </label>
        <label className="block">Contraseña
          <input type="password" required value={clave} autoComplete="current-password"
            onChange={e => setClave(e.target.value)} className="border rounded p-3 w-full" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button className="bg-rose-700 text-white rounded-lg p-3 w-full">Entrar</button>
        <Link to="/registro" className="text-rose-700 underline">Crear cuenta</Link>
      </form>
    </section>
  );
}