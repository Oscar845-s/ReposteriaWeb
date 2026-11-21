
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: AuthProvider.jsx
// Descripción: Gestión de autenticación, registro y sesiones de usuario.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 21 de noviembre de 2026

import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContext';
import { consultarApi } from '../services/apiServicio';

const CLAVE = 'dulce-hogar-token-v1';

export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(() =>
    sessionStorage.getItem(CLAVE)
  );
  const [cargando, setCargando] = useState(Boolean(token));

  // ===== Cerrar sesión =====
  const cerrarSesion = useCallback(() => {
    sessionStorage.removeItem(CLAVE);
    setToken(null);
    setUsuario(null);
    setCargando(false);
  }, []);

  // ===== Verificar sesión existente =====
  useEffect(() => {
    let activo = true;

    if (token) {
      consultarApi('/auth/me', 'GET', undefined, token)
        .then(perfil => {
          if (activo) {
            setUsuario(perfil);
          }
        })
        .catch(() => {
          if (activo) {
            cerrarSesion();
          }
        })
        .finally(() => {
          if (activo) {
            setCargando(false);
          }
        });
    }

    return () => {
      activo = false;
    };
  }, [token, cerrarSesion]);

  // ===== Iniciar sesión =====
  async function iniciarSesion(correo, clave) {
    try {
      const respuesta = await consultarApi(
        '/auth/login',
        'POST',
        { correo, clave }
      );

      sessionStorage.setItem(CLAVE, respuesta.token);
      setToken(respuesta.token);
      setUsuario(respuesta.usuario);
      setCargando(false);

      return '';
    } catch (error) {
      return error.message;
    }
  }

  // ===== Registrar usuario =====
  async function registrar(nombre, correo, clave) {
    try {
      await consultarApi(
        '/auth/registro',
        'POST',
        { nombre, correo, clave }
      );

      return '';
    } catch (error) {
      return error.message;
    }
  }

  // ===== Pantalla de carga =====
  if (cargando) {
    return (
      <main role="status" className="p-8">
        Verificando sesión...
      </main>
    );
  }

  // ===== Proveedor de autenticación =====
  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        iniciarSesion,
        registrar,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
