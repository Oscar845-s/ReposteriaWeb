// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: AuthProvider.jsx
// Descripción: Gestiona cuentas temporales, sesión y validaciones.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useState } from 'react';
import { AuthContext } from './authContext';
import { ROLES, USUARIOS_DEMO } from '../data/usuariosDemo';

const CLAVE_SESION = 'dulce-hogar-sesion-demo-v1';
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLAVE_VALIDA = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

// Recupera solamente el perfil ficticio, nunca la contraseña.
function cargarSesion() {
  try {
    const perfil = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null');
    if (perfil && typeof perfil.nombre === 'string' &&
        typeof perfil.correo === 'string' && Object.values(ROLES).includes(perfil.rol)) {
      return perfil;
    }
  } catch { /* La sesión no está disponible. */ }
  return null;
}

// Persiste un perfil de demostración o elimina la sesión.
function guardarSesion(perfil) {
  try {
    if (perfil) {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(perfil));
    } else {
      sessionStorage.removeItem(CLAVE_SESION);
    }
  } catch { /* La sesión sigue funcionando en memoria. */ }
}

export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(cargarSesion);
  const [cuentas, setCuentas] = useState(USUARIOS_DEMO);

  // Recibe credenciales; devuelve un mensaje de error o cadena vacía.
  function iniciarSesion(correo, clave) {
    const cuenta = cuentas.find(item =>
      item.correo === correo.trim().toLowerCase() && item.clave === clave);
    if (!cuenta) {
      return 'Correo o contraseña incorrectos.';
    }
    const perfil = { nombre: cuenta.nombre, correo: cuenta.correo, rol: cuenta.rol };
    guardarSesion(perfil);
    setUsuario(perfil);
    return '';
  }

  // Valida datos ficticios y crea una cuenta cliente en memoria.
  function registrar(nombre, correo, clave) {
    const correoNormalizado = correo.trim().toLowerCase();
    if (!nombre.trim() || !CORREO_VALIDO.test(correoNormalizado)) {
      return 'Introduce un nombre y correo válido.';
    }
    if (!CLAVE_VALIDA.test(clave)) {
      return 'La contraseña requiere 8 caracteres, una mayúscula y un número.';
    }
    if (cuentas.some(item => item.correo === correoNormalizado)) {
      return 'El correo ya está registrado.';
    }
    setCuentas(actuales => [...actuales, {
      nombre: nombre.trim(), correo: correoNormalizado, clave, rol: ROLES.CLIENTE,
    }]);
    return '';
  }

  // Elimina la sesión sin borrar el carrito privado.
  function cerrarSesion() {
    guardarSesion(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, iniciarSesion, registrar, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}