// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: useAuth.js
// Descripción: Devuelve el contexto y detecta un proveedor ausente.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import { useContext } from 'react';
import { AuthContext } from '../context/authContext';

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth requiere AuthProvider');
  }
  return contexto;
}