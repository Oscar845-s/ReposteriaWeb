# JORNADA 10 — Corrección del carrito después de confirmar pedido

## 1. Problema y causa

En `Carrito.jsx`, la confirmación exitosa ya llama a `vaciarCarrito()` y luego a `actualizar()`. El proveedor del carrito solo ejecuta `dispatch` al vaciar y guarda los datos mediante `useEffect`. `actualizar()` cambia la versión del catálogo, `listo` pasa a falso y `main.jsx` desmonta el proveedor del carrito. React puede agrupar ambas actualizaciones; el efecto de persistencia del carrito vacío no llega a ejecutarse. Al remontar, `cargarCarrito(correo)` recupera los productos anteriores. Esta es la causa que explica el comportamiento observado; falta comprobarla en ejecución.

## 2. Corrección

Solo se modifica `frontend/src/context/CarritoProvider.jsx`. La función `vaciarCarrito` guarda inmediatamente `[]` en la clave del cliente antes de solicitar el cambio de estado. `localStorage.setItem` es síncrono. No se modifica el backend, SQL Server, las imágenes ni las dependencias. Se conserva el flujo de confirmación original.

Reemplaza el archivo completo por:

```jsx
// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CarritoProvider.jsx
// Descripción: Centraliza las operaciones y el estado del carrito.
// Requerimiento: RF05, RF06, RF07, RF08
// Fecha: 20 de noviembre de 2026

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

  // Persiste el carrito vacío antes de actualizar el catálogo o desmontar el proveedor.
  function vaciarCarrito() {
    if (!correo) {
      return true;
    }
    const guardado = guardarCarrito([], correo);
    setHayErrorGuardado(!guardado);
    dispatch({ tipo: 'VACIAR' });
    return guardado;
  }

  const valor = {
    detalles, total, cantidadTotal, mensaje: estado.mensaje, hayErrorGuardado,
    agregarAlCarrito: (idProducto, cantidad = 1) =>
      correo && listo && dispatch({ tipo: 'AGREGAR', idProducto, cantidad, productos }),
    modificarCantidad: (idProducto, cantidad) =>
      correo && listo && dispatch({ tipo: 'MODIFICAR', idProducto, cantidad, productos }),
    eliminarProducto: idProducto => correo && listo && dispatch({ tipo: 'ELIMINAR', idProducto }),
    vaciarCarrito,
  };
  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}
```

## 3. Explicación

- `guardarCarrito([], correo)` persiste el arreglo vacío antes de que se desmonte el proveedor.
- `dispatch({ tipo: 'VACIAR' })` limpia también el estado React y sus importes derivados.
- `setHayErrorGuardado` conserva el indicador de error existente; si el navegador bloquea el almacenamiento, la persistencia no está garantizada. Esta corrección presupone almacenamiento local disponible.
- No se vacía el carrito antes de que el POST de pedidos sea exitoso. El botón manual sigue utilizando la misma función.
- El mensaje de éxito de la página puede desaparecer durante la recarga del catálogo porque la página se desmonta; no implica que el pedido haya fallado. Consulta Mis pedidos antes de repetir una compra.

## 4. Pruebas de aceptación

Con backend y frontend activos (`npm run dev` en sus respectivas carpetas):

1. Inicia sesión como cliente. Revisa el historial para no repetir inadvertidamente un pedido ya registrado.
2. Vacía manualmente los restos del carrito anterior. Agrega dos unidades de un producto con stock suficiente. Anota el stock actual y el total.
3. Confirma una sola vez. Espera a que termine la actualización del catálogo.
4. Comprueba que aparece «Tu carrito está vacío», total $0 y contador de encabezado 0.
5. En DevTools > Application > Local Storage > http://localhost:5173, verifica que `dulce-hogar-carrito-v1:cliente@demo.mx` contiene `[]` (usa el correo de tu cuenta si es diferente).
6. Recarga con F5, confirma que sigue vacío. Cierra sesión y vuelve a entrar; debe seguir vacío.
7. Consulta `/pedidos`: debe existir exactamente un pedido nuevo, pendiente, por las cantidades compradas. Verifica que el stock disminuyó una sola vez.
8. Repite con dos productos distintos y comprueba que ambos desaparecen.
9. Prueba el botón Vaciar carrito sin comprar: el carrito debe permanecer vacío después de recargar.
10. Repite PA-08 con inventario insuficiente (anota y restaura el stock de prueba). No debe crearse un pedido; la sincronización puede reducir cantidades al stock vigente, pero no debe ejecutar el vaciado de una compra exitosa.
11. Comprueba que el carrito de otro cliente no se altera.

```sql
USE DulceHogar;
SELECT * FROM dbo.vwTotalesPedido ORDER BY idPedido DESC;
SELECT * FROM dbo.DetallePedido ORDER BY idPedido DESC;
SELECT idProducto, nombre, stock FROM dbo.Productos;
SELECT * FROM dbo.MovimientosInventario ORDER BY idMovimiento DESC;
```

## 5. Git

Desde la raíz del proyecto:

```bash
cd /c/6to/reposteria-web
cd frontend
npm run build
npm run lint
cd ..
git status
git add frontend/src/context/CarritoProvider.jsx docs/JORNADA_10_CORRECCIONES.md
git diff --cached --stat
git commit -m "Corregir persistencia del carrito al confirmar pedido (RF08)"
git push origin main
```

Guarda este documento en `docs/JORNADA_10_CORRECCIONES.md` antes de ejecutar `git add`. Si hay cambios pendientes de Jornada 10, revísalos y guárdalos también en un commit apropiado, sin incluir secretos ni node_modules.

## 6. Cierre

La Jornada 10 se considera completa cuando PA-07 y las pruebas de regresión anteriores se superen. El código se ha revisado estáticamente contra los archivos compartidos; no se ha ejecutado en tu instalación.
