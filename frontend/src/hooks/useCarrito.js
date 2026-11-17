// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: useCarrito.js
// Descripción: Permite acceder al contexto compartido del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { useContext } from 'react';
import { CarritoContext } from '../context/carritoContext';

// ===== Funciones =====
// No recibe argumentos; devuelve el contexto del carrito.
export function useCarrito() {
  const contexto = useContext(CarritoContext);
  if (!contexto) {
    throw new Error('useCarrito requiere CarritoProvider.');
  }
  return contexto;
}