// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: main.jsx
// Descripción: Inicializa React, navegación y contexto del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import CarritoProvider from './context/CarritoProvider';
import './index.css';

// ===== Inicialización =====
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CarritoProvider>
        <App />
      </CarritoProvider>
    </BrowserRouter>
  </React.StrictMode>
);