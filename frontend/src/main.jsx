// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: main.jsx
// Descripción: Inicializa autenticación antes del carrito; el cambio de cuenta reinicia el proveedor.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import AuthProvider from './context/AuthProvider';
import CarritoProvider from './context/CarritoProvider';
import { useAuth } from './hooks/useAuth';
import { ROLES } from './data/usuariosDemo';
import './index.css';

// Monta un carrito independiente para cada cliente.
function AplicacionConCarrito() {
  const { usuario } = useAuth();
  const correo = usuario?.rol === ROLES.CLIENTE ? usuario.correo : null;
  return (
    <CarritoProvider key={correo ?? 'sin-cliente'} correo={correo}>
      <App />
    </CarritoProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><AplicacionConCarrito /></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);