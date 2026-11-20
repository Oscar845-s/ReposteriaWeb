// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: useCatalogo.js
// Descripción: Consultar contexto compartido.
// Requerimiento: RF03, RF04, RF05, RF06, RF07
// Fecha: 20 de noviembre de 2026
import { useContext } from 'react';
import { CatalogoContext } from '../context/catalogoContext';
export function useCatalogo() {
  return useContext(CatalogoContext);
}