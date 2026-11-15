# Jornada 4 — Detalle de productos

**Proyecto:** ReposteriaWeb / Dulce Hogar  
**Autor:** Oscar Armando Medina Gutiérrez  
**Materia:** Verificación y Validación de Software  
**Tecnologías:** React, Vite, Tailwind CSS, Lucide React  
**Requerimiento principal:** RF04 / CU-06  
**Estado:** Funcionamiento general confirmado por el desarrollador; pruebas individuales y compilación pendientes de registro.

## 1. Objetivo

Implementar la consulta detallada de productos mediante una ventana modal sobre el catálogo, conservando la búsqueda y los filtros existentes y siguiendo el prototipo A7, página 4.

## 2. Alcance

- Mostrar imagen, nombre, descripción, categoría, precio y disponibilidad.
- Abrir y cerrar el detalle sin cambiar de ruta.
- Seleccionar cantidades dentro de las existencias locales.
- Calcular el subtotal de referencia automáticamente.
- Deshabilitar la selección de compra para productos agotados.
- Manejar imágenes no disponibles y productos inexistentes.
- Mantener deshabilitado el botón de agregar al carrito hasta su implementación.

No incluye autenticación, persistencia, API, conexión con SQL Server ni descuento de inventario.

## 3. Archivos

```text
reposteria-web/
├── docs/
│   └── JORNADA_04.md                 (nuevo)
└── frontend/src/
    ├── components/
    │   ├── DetalleProducto.jsx       (nuevo)
    │   └── ProductCard.jsx           (modificado)
    ├── data/
    │   └── products.js               (reutilizado)
    └── pages/
        └── Catalogo.jsx              (modificado)
```

No se requieren nuevas dependencias ni cambios en App.jsx.

## 4. Implementación

### 4.1 ProductCard.jsx

Se incorpora la propiedad `abrirDetalle`, recibida desde el catálogo. El botón Ver detalle envía el identificador del producto seleccionado:

```jsx
<button type="button" onClick={() => abrirDetalle(product.id)}>
  Ver detalle
</button>
```

La consulta permanece habilitada incluso cuando el producto está agotado.

### 4.2 Catalogo.jsx

Se incorpora el estado del producto seleccionado y el mensaje de error:

```jsx
const [productoSeleccionado, setProductoSeleccionado] = useState(null);
const [mensajeError, setMensajeError] = useState('');
```

La función `abrirDetalle` localiza el producto por su identificador mediante `find`:

```jsx
function abrirDetalle(idProducto) {
  setMensajeError('');
  const productoEncontrado = products.find(
    producto => producto.id === idProducto
  );

  if (!productoEncontrado) {
    setProductoSeleccionado(null);
    setMensajeError('El producto seleccionado ya no está disponible.');
    return;
  }

  setProductoSeleccionado(productoEncontrado);
}

function cerrarDetalle() {
  setProductoSeleccionado(null);
}
```

El renderizado condicional permite montar el detalle únicamente cuando se selecciona un producto:

```jsx
{productoSeleccionado !== null && (
  <DetalleProducto
    key={productoSeleccionado.id}
    producto={productoSeleccionado}
    cerrarDetalle={cerrarDetalle}
  />
)}
```

Los estados de búsqueda y categoría se conservan en el catálogo.

### 4.3 DetalleProducto.jsx

Componente que utiliza el elemento HTML `dialog`, `useRef` para acceder al elemento y `useEffect` para gestionar su apertura y limpieza:

```jsx
const dialogo = useRef(null);

useEffect(() => {
  const elemento = dialogo.current;

  if (elemento && !elemento.open) {
    elemento.showModal();
  }

  return () => {
    if (elemento?.open) {
      elemento.close();
    }
  };
}, []);
```

La cantidad se inicializa en una unidad si hay existencias y en cero si el producto está agotado:

```jsx
const CANTIDAD_MINIMA = 1;
const hayExistencias = producto.stock > 0;
const [cantidad, setCantidad] = useState(
  hayExistencias ? CANTIDAD_MINIMA : 0
);
const subtotal = producto.precio * cantidad;
```

Los botones se deshabilitan en los límites de cantidad. Las funciones utilizan `Math.min` y `Math.max` para limitar los cambios:

```jsx
function aumentarCantidad() {
  setCantidad(cantidadActual =>
    Math.min(cantidadActual + 1, producto.stock)
  );
}

function disminuirCantidad() {
  setCantidad(cantidadActual =>
    Math.max(cantidadActual - 1, CANTIDAD_MINIMA)
  );
}
```

El cierre mediante X o Escape desmonta el componente. Al abrir otro producto se reinicia la cantidad. El precio se presenta mediante `Intl.NumberFormat` con moneda MXN. Se conserva un texto alternativo visual si la imagen falla.

## 5. Flujo de funcionamiento

1. El cliente consulta el catálogo.
2. Selecciona Ver detalle.
3. Catalogo.jsx recupera el producto por ID.
4. Si existe, monta DetalleProducto.jsx; si no, muestra un error.
5. La ventana presenta los datos y permite seleccionar una cantidad válida cuando hay existencias.
6. El subtotal se actualiza conforme cambia la cantidad.
7. El cliente cierra la ventana y continúa consultando el catálogo.

## 6. Matriz de trazabilidad

| Requerimiento | Caso de uso | Implementación | Alcance |
|---|---|---|---|
| RF03 | CU-05 | Catalogo.jsx, ProductCard.jsx | Catálogo y filtros conservados |
| RF04 | CU-06 | DetalleProducto.jsx, Catalogo.jsx, ProductCard.jsx | Consulta detallada y manejo de ID inexistente |
| RF05 | CU-07, CU-11 | DetalleProducto.jsx | Preparación y límites de cantidad en interfaz; carrito y validación de servidor pendientes |
| RF07 | CU-12 | DetalleProducto.jsx | Subtotal de referencia; total del carrito pendiente |

## 7. Pruebas de verificación y validación

El desarrollador confirmó que el funcionamiento general es correcto. No se dispone de resultados individuales ni de evidencia de compilación, por lo que no se marcan automáticamente como aprobadas las siguientes pruebas.

| ID | Acción | Resultado esperado | Resultado observado |
|---|---|---|---|
| CP04-01 | Abrir pastel de chocolate | Precio $320 y stock 8 | Pendiente de registrar |
| CP04-02 | Abrir pastel de fresa | Precio $350 y stock 5 | Pendiente de registrar |
| CP04-03 | Aumentar cantidad del pastel de chocolate | Máximo 8 | Pendiente de registrar |
| CP04-04 | Disminuir cantidad de producto disponible | Mínimo 1 | Pendiente de registrar |
| CP04-05 | Seleccionar 3 pasteles de chocolate | Subtotal $960 | Pendiente de registrar |
| CP04-06 | Abrir Brownie | Agotado, cantidad 0 y controles deshabilitados | Pendiente de registrar |
| CP04-07 | Presionar X | Cerrar modal | Pendiente de registrar |
| CP04-08 | Presionar Escape | Cerrar modal | Pendiente de registrar |
| CP04-09 | Cerrar y abrir otro producto | Reiniciar cantidad y mostrar datos correctos | Pendiente de registrar |
| CP04-10 | Abrir detalle con filtros activos | Conservar búsqueda y categoría | Pendiente de registrar |
| CP04-11 | Probar pantalla pequeña | Modal adaptable y desplazable | Pendiente de registrar |
| CP04-12 | Invocar abrirDetalle con un ID inexistente en prueba controlada | Mensaje de error y permanencia en catálogo | Pendiente de registrar |
| CP04-13 | Ejecutar npm run build | Compilación exitosa | Pendiente de registrar |
| CP04-14 | Simular imagen no disponible | Mostrar categoría como alternativa | Pendiente de registrar |

Para CP04-12 y CP04-14, realizar modificaciones temporales únicamente en el entorno de desarrollo y restaurarlas antes del commit.

## 8. Estándar de codificación A8

Se incorporaron encabezados con referencias RF/CU, comentarios, identificadores descriptivos, constantes y sangría de dos espacios. Se conservaron nombres existentes como `ProductCard` y `product` por compatibilidad. Queda pendiente una revisión formal de conformidad, incluyendo longitud de líneas, tamaño recomendado de funciones y documentación de todos los archivos. Las validaciones del servidor se realizarán cuando exista el backend.

## 9. Ejecución y compilación

```bash
cd /c/6to/reposteria-web/frontend
npm run dev
```

Consultar http://localhost:5173/catalogo. Detener el servidor con Ctrl+C antes de ejecutar:

```bash
npm run build
```

## 10. Control de versiones

Después de guardar los archivos y verificar la compilación:

```bash
cd /c/6to/reposteria-web
git status
git add frontend/src/components/DetalleProducto.jsx
git add frontend/src/components/ProductCard.jsx
git add frontend/src/pages/Catalogo.jsx
git add docs/JORNADA_04.md
git diff --cached --stat
git commit -m "Implementar detalle de productos (RF04)"
git push origin main
```

Registrar el resultado de compilación y el identificador del commit una vez realizados.

## 11. Conclusión y siguiente jornada

Se implementó la consulta detallada mediante un modal reutilizable, con selección de cantidades y subtotal de referencia. El funcionamiento general fue confirmado por el desarrollador. La siguiente jornada corresponde al carrito de compras (RF05, RF06 y RF07), inicialmente con datos locales y estado compartido. La autenticación y la validación definitiva del inventario en el servidor quedan pendientes; CU-07 requiere una sesión iniciada y RF17 establece el descuento de inventario al confirmar el pedido, no al agregar al carrito.

## 12. Referencias internas

- A5_Completa: RF03–RF07, RF17, CU-05, CU-06, CU-07, CU-08, CU-11 y CU-12.
- A7. Prototipo proyecto: página 4 (detalle de producto).
- A8. Estándar de codificación: encabezados, identificadores, comentarios, validaciones y control de versiones.
