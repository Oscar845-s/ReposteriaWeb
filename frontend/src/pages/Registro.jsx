// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Registro.jsx
// Descripción: Registro de clientes con confirmación de contraseña.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Registro() {
  const { usuario, registrar } = useAuth();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ nombre: '', correo: '', clave: '', confirmar: '' });
  const [error, setError] = useState('');

  // Actualiza un campo del formulario.
  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos(actuales => ({ ...actuales, [name]: value }));
  }

  // Comprueba confirmación y solicita registro al contexto.
  function enviar(evento) {
    evento.preventDefault();
    if (datos.clave !== datos.confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    const resultado = registrar(datos.nombre, datos.correo, datos.clave);
    setError(resultado);
    if (!resultado) {
      navegar('/login', { replace: true });
    }
  }

  if (usuario) {
    return <Navigate to="/" replace />;
  }
  const campos = [ ['nombre', 'Nombre', 'text'], ['correo', 'Correo', 'email'],
    ['clave', 'Contraseña', 'password'], ['confirmar', 'Confirmar contraseña', 'password'] ];
  return (
    <section className="max-w-md mx-auto px-5 py-14">
      <form onSubmit={enviar} className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h1 className="text-3xl font-bold text-rose-900">Crear cuenta</h1>
        {campos.map(([name, etiqueta, tipo]) => (
          <label key={name} className="block">{etiqueta}
            <input name={name} type={tipo} required value={datos[name]} onChange={cambiar}
              autoComplete={tipo === 'password' ? 'new-password' : name === 'correo' ? 'email' : 'name'}
              className="border rounded p-3 w-full" />
          </label>
        ))}
        <p className="text-sm">Usa datos ficticios. Mínimo 8 caracteres, una mayúscula y un número.</p>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button className="bg-rose-700 text-white rounded-lg p-3 w-full">Registrarme</button>
        <Link to="/login" className="text-rose-700 underline">Ya tengo cuenta</Link>
      </form>
    </section>
  );
}