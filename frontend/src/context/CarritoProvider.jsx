// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CarritoProvider.jsx
// Descripción: Centraliza las operaciones y el estado del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 16 de noviembre de 2026

// ===== Importaciones =====
import { useReducer, useEffect, useState } from 'react';
import { CarritoContext } from './carritoContext';
import {
  cargarCarrito, guardarCarrito, validarCantidad, obtenerDetalles,
} from '../services/carritoServicio';

// ===== Funciones =====
// Recibe estado y acción; devuelve el nuevo estado sin efectos secundarios.
function reducirCarrito(estado, accion) {
  const { items } = estado;
  const { tipo, idProducto, cantidad } = accion;
  if (tipo === 'VACIAR') {
    return { items: [], mensaje: 'Carrito vacío.' };
  }
  if (tipo === 'ELIMINAR') {
    return {
      items: items.filter(item => item.idProducto !== idProducto),
      mensaje: 'Producto eliminado.',
    };
  }
  const existente = items.find(item => item.idProducto === idProducto);
  if (tipo !== 'AGREGAR' && tipo !== 'MODIFICAR') {
    return estado;
  }
  const nuevaCantidad = tipo === 'AGREGAR'
    ? (existente?.cantidad ?? 0) + cantidad : cantidad;
  // RF05/RF06: validar tanto entrada como cantidad acumulada.
  if (!Number.isInteger(cantidad) || cantidad < 1 ||
      !validarCantidad(idProducto, nuevaCantidad)) {
    return { ...estado, mensaje: 'Cantidad inválida o existencias insuficientes.' };
  }
  if (tipo === 'MODIFICAR' && !existente) {
    return estado;
  }
  const nuevosItems = existente
    ? items.map(item => item.idProducto === idProducto
      ? { ...item, cantidad: nuevaCantidad } : item)
    : [...items, { idProducto, cantidad: nuevaCantidad }];
  return { items: nuevosItems, mensaje: 'Carrito actualizado.' };
}

// Recibe los componentes hijos; devuelve el proveedor con estado compartido.
export default function CarritoProvider({ children }) {
  const [estado, dispatch] = useReducer(reducirCarrito, null, () => ({
    items: cargarCarrito(), mensaje: '',
  }));
  const [hayErrorGuardado, setHayErrorGuardado] = useState(false);
  useEffect(() => {
    setHayErrorGuardado(!guardarCarrito(estado.items));
  }, [estado.items]);

  const detalles = obtenerDetalles(estado.items);
  const total = detalles.reduce((suma, item) => suma + item.subtotal, 0);
  const cantidadTotal = estado.items.reduce((suma, item) => suma + item.cantidad, 0);

  const valor = {
    detalles, total, cantidadTotal, mensaje: estado.mensaje, hayErrorGuardado,
    agregarAlCarrito: (idProducto, cantidad = 1) =>
      dispatch({ tipo: 'AGREGAR', idProducto, cantidad }),
    modificarCantidad: (idProducto, cantidad) =>
      dispatch({ tipo: 'MODIFICAR', idProducto, cantidad }),
    eliminarProducto: idProducto => dispatch({ tipo: 'ELIMINAR', idProducto }),
    vaciarCarrito: () => dispatch({ tipo: 'VACIAR' }),
  };
  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}