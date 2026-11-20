// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CarritoProvider.jsx
// Descripción: Centraliza las operaciones y el estado del carrito.
// Requerimiento: RF05, RF06, RF07
// Fecha: 19 de noviembre de 2026

// ===== Importaciones =====
import { useReducer, useEffect, useState } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';
import { CarritoContext } from './carritoContext';
import {
  cargarCarrito, guardarCarrito, validarCantidad, obtenerDetalles,
} from '../services/carritoServicio';

// ===== Funciones =====
// Recibe estado y acción; devuelve el nuevo estado sin efectos secundarios.
function reducirCarrito(estado, accion) {
  if (accion.tipo === 'SINCRONIZAR') {
    return { ...estado, items: obtenerDetalles(estado.items, accion.productos)
      .map(({ idProducto, cantidad }) => ({ idProducto, cantidad })) };
  }
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
      !validarCantidad(idProducto, nuevaCantidad, accion.productos)) {
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
export default function CarritoProvider({ children, correo }) {
  const { productos, listo } = useCatalogo();
  const [estado, dispatch] = useReducer(reducirCarrito, null, () => ({
    items: cargarCarrito(correo), mensaje: '',
  }));
  const [hayErrorGuardado, setHayErrorGuardado] = useState(false);
  useEffect(() => {
    if (listo) {
      dispatch({ tipo: 'SINCRONIZAR', productos });
    }
  }, [listo, productos]);
  useEffect(() => {
    if (listo) {
      const ajustados = obtenerDetalles(estado.items, productos)
        .map(({ idProducto, cantidad }) => ({ idProducto, cantidad }));
      setHayErrorGuardado(!guardarCarrito(ajustados, correo));
    }
  }, [estado.items, correo, listo, productos]);

  const detalles = obtenerDetalles(estado.items, productos);
  const total = detalles.reduce((suma, item) => suma + item.subtotal, 0);
  const cantidadTotal = detalles.reduce((suma, item) => suma + item.cantidad, 0);

  const valor = {
    detalles, total, cantidadTotal, mensaje: estado.mensaje, hayErrorGuardado,
    agregarAlCarrito: (idProducto, cantidad = 1) =>
      correo && listo && dispatch({ tipo: 'AGREGAR', idProducto, cantidad, productos }),
    modificarCantidad: (idProducto, cantidad) =>
      correo && listo && dispatch({ tipo: 'MODIFICAR', idProducto, cantidad, productos }),
    eliminarProducto: idProducto => correo && listo && dispatch({ tipo: 'ELIMINAR', idProducto }),
    vaciarCarrito: () => correo && listo && dispatch({ tipo: 'VACIAR' }),
  };
  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}