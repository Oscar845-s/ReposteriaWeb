// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: main.jsx
// Descripción: Inicializa autenticación antes del carrito; el cambio de cuenta reinicia el proveedor.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CatalogoProvider from './context/CatalogoProvider';
import AuthProvider from './context/AuthProvider';
import AplicacionConCarrito from './components/AplicacionConCarrito';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><CatalogoProvider><AplicacionConCarrito />
      </CatalogoProvider></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);