# MANUAL DE USUARIO
## Dulce Hogar — Sistema web de venta y gestión de repostería

**Responsable:** Oscar Armando Medina Gutiérrez  
**Materia:** Verificación y Validación de Software  
**Versión:** 1.0 — Prototipo académico  
**Fecha:** 21 de noviembre de 2026  
**Modalidad:** Aplicación web local

---

## 1. Presentación

**Dulce Hogar** es una aplicación web para consultar productos de repostería, gestionar un carrito de compras y realizar pedidos. También permite al personal autorizado administrar productos, categorías, existencias, producción, entregas y reportes de ventas.

Este manual está dirigido a los tres tipos de usuario: **Cliente**, **Administrador** y **Personal de producción**. Explica cómo utilizar las funciones disponibles desde el navegador, sin necesidad de conocer el código fuente.

### 1.1 Objetivo

Guiar al usuario en las operaciones habituales del sistema, explicar los resultados esperados y ofrecer soluciones a problemas comunes.

### 1.2 Alcance

El sistema cubre catálogo, registro e inicio de sesión, carrito, pedidos, administración de catálogo e inventario, seguimiento de producción y reportes. **No se documentan pagos electrónicos ni entregas a domicilio**, ya que no forman parte de las funciones confirmadas del prototipo.

## 2. Requisitos y acceso

Para usar el sistema se necesita un navegador web actualizado y acceso al entorno donde se encuentra ejecutándose Dulce Hogar. En el entorno de desarrollo, la dirección suele ser **http://localhost:5173**; si Vite muestra otra dirección, utiliza esa.

El backend y la base de datos SQL Server deben estar disponibles para consultar y actualizar información. Si no se muestra el catálogo, informa al responsable técnico.

### 2.1 Roles y permisos

| Función | Cliente | Administrador | Producción |
|---|:---:|:---:|:---:|
| Consultar catálogo | Sí | Sí | Sí |
| Comprar y consultar pedidos propios | Sí | No | No |
| Cancelar un pedido pendiente propio | Sí | No | No |
| Administrar productos y categorías | No | Sí | No |
| Ajustar inventario | No | Sí | No |
| Iniciar preparación y registrar entrega | No | Sí | No |
| Marcar pedidos como listos | No | No | Sí |
| Consultar reportes de ventas | No | Sí | No |

Las opciones protegidas requieren iniciar sesión con una cuenta del rol correspondiente.

## 3. Conocer la interfaz

La barra de navegación permite acceder a **Inicio** y **Catálogo**. Dependiendo de la sesión, también se muestran el carrito, el acceso a la cuenta, **Administración** o **Producción**. En el carrito se muestra un indicador con la cantidad de unidades seleccionadas.

**Inicio:** presenta el sitio y su propuesta de repostería.  
**Catálogo:** permite revisar productos, categorías, precios y disponibilidad.  
**Carrito:** muestra artículos elegidos, cantidades y total.  
**Mis pedidos:** muestra el historial del cliente y el estado de cada compra.  
**Administración:** contiene productos, categorías e inventario.  
**Administración de pedidos:** permite iniciar preparaciones y confirmar entregas.  
**Producción:** permite consultar pedidos en preparación y marcarlos como listos.  
**Reportes:** muestra estadísticas y ventas por fechas.

> **Captura sugerida 1:** pantalla de inicio con barra de navegación.  
> **Captura sugerida 2:** catálogo con productos y precios.

## 4. Guía del cliente

### 4.1 Registrarse

1. Abre **Registro** desde la pantalla de acceso.
2. Introduce tu nombre, correo electrónico y contraseña.
3. Completa los campos obligatorios y envía el formulario.
4. Si el registro es aceptado, inicia sesión con las credenciales creadas.

El sistema puede rechazar datos incompletos, un correo ya registrado o una contraseña que no cumpla los requisitos de validación.

> **Captura sugerida 3:** formulario de registro.

### 4.2 Iniciar y cerrar sesión

1. Selecciona el icono o enlace de acceso.
2. Escribe tu correo y contraseña.
3. Presiona el botón para iniciar sesión.
4. Comprueba que aparece tu nombre y que las opciones corresponden a tu rol.
5. Para finalizar, selecciona **Cerrar sesión**.

Si las credenciales no son correctas, revisa los datos ingresados. No compartas tu contraseña.

### 4.3 Consultar productos

1. Selecciona **Catálogo**.
2. Revisa el nombre, descripción, precio e imagen de cada producto.
3. Utiliza las categorías disponibles para localizar los productos de interés.
4. Comprueba su disponibilidad antes de agregar unidades al carrito.

Los precios se muestran en pesos mexicanos (MXN). La disponibilidad puede cambiar cuando otros pedidos consumen inventario.

### 4.4 Agregar productos al carrito

1. En el catálogo, localiza el producto deseado.
2. Selecciona la cantidad permitida y agrégala al carrito.
3. Abre **Carrito** desde la barra de navegación.
4. Comprueba el nombre del producto, cantidad, subtotal y total.
5. Si lo necesitas, modifica la cantidad o elimina el producto.

El sistema valida que la cantidad sea positiva y no supere las existencias disponibles. El carrito se conserva por cuenta de cliente en el navegador utilizado.

> **Captura sugerida 4:** carrito con varios productos y total.

### 4.5 Confirmar una compra

1. Inicia sesión con una cuenta de **Cliente**.
2. Abre el carrito y verifica los productos y cantidades.
3. Selecciona la opción de **Confirmar pedido**.
4. Espera el mensaje de confirmación.
5. Comprueba que el carrito quede vacío.
6. Abre **Mis pedidos** para verificar que el pedido se haya registrado.

**Importante:** si la pantalla muestra un error o conserva los productos después de confirmar, **revisa primero Mis pedidos antes de intentar otra vez**, para evitar duplicar una compra que sí se haya registrado.

### 4.6 Consultar y cancelar pedidos

1. Accede a **Mis pedidos**.
2. Revisa el número de pedido, fecha, productos, cantidades, total y estado.
3. Usa **Actualizar** para consultar la información más reciente.
4. Si el pedido está en estado **Pendiente**, puedes seleccionar **Cancelar pedido** y confirmar la acción.

La opción de cancelación deja de estar disponible cuando el pedido avanza a preparación. Al cancelar un pedido permitido, el sistema restituye las existencias correspondientes.

> **Captura sugerida 5:** historial de pedidos con un pedido pendiente.

## 5. Estados de los pedidos

| Estado | Significado | Responsable de la siguiente acción |
|---|---|---|
| **Pendiente** | Pedido registrado, aún no preparado | Administrador |
| **En preparación** | El pedido está siendo elaborado | Producción |
| **Listo para entrega** | El pedido está preparado | Administrador |
| **Entregado** | Se registró la entrega | Proceso concluido |
| **Cancelado** | Pedido anulado según las reglas del sistema | Proceso concluido |

El flujo habitual es **Pendiente → En preparación → Listo para entrega → Entregado**. La cancelación del cliente está disponible únicamente mientras el pedido esté pendiente.

## 6. Guía del administrador

Para estas funciones es obligatorio iniciar sesión con una cuenta de **Administrador**.

### 6.1 Crear un producto

1. Entra a **Administración**.
2. Ubica el formulario **Nuevo producto**.
3. Escribe el nombre y la descripción.
4. Selecciona la categoría y captura el precio.
5. Agrega la ruta de imagen si corresponde y define si estará activo.
6. Presiona **Guardar producto**.

**Resultado esperado:** el producto se agrega a la lista administrativa. Los productos nuevos se crean con **existencias iniciales de cero**; debes registrar el inventario por separado.

### 6.2 Editar, activar o desactivar productos

1. En **Productos registrados**, localiza el producto.
2. Presiona **Editar** para cargar sus datos en el formulario.
3. Modifica la información y guarda los cambios.
4. Para ocultar un producto del catálogo, selecciona **Desactivar**; para habilitarlo nuevamente, **Activar**.

Desactivar un producto no elimina sus pedidos históricos. Las existencias se ajustan desde la sección de inventario, no desde el formulario del producto.

### 6.3 Administrar categorías

1. Entra a la sección **Categorías** del panel.
2. Para crear una categoría, escribe su nombre y selecciona **Crear**.
3. Para modificarla, utiliza **Editar**.
4. Cambia el nombre o la casilla **Activa** y selecciona **Guardar categoría**.

Una categoría inactiva puede dejar de estar disponible para seleccionar en nuevos productos.

### 6.4 Ajustar inventario

1. Abre **Ajuste de inventario**.
2. Selecciona el producto.
3. Introduce un número **positivo** para registrar una entrada o **negativo** para una salida.
4. Escribe el motivo del ajuste.
5. Selecciona **Registrar ajuste**.
6. Comprueba la nueva existencia y el movimiento en **Movimientos recientes**.

Ejemplo: para registrar diez unidades recibidas, escribe `10`; para registrar dos unidades retiradas, escribe `-2`. No se permiten operaciones que generen existencias negativas.

> **Captura sugerida 6:** formulario de productos y tabla administrativa.  
> **Captura sugerida 7:** ajuste de inventario e historial de movimientos.

### 6.5 Administrar pedidos

1. Abre **Administración de pedidos**.
2. Localiza un pedido en estado **Pendiente**.
3. Presiona **Iniciar preparación** para enviarlo al proceso de elaboración.
4. Espera a que producción lo marque como **Listo para entrega**.
5. Cuando se realice la entrega, selecciona **Marcar como entregado**.
6. Utiliza **Actualizar pedidos** para consultar los cambios recientes.

Los botones disponibles dependen del estado del pedido. No es posible registrar directamente una entrega de un pedido que aún está pendiente o en preparación.

### 6.6 Consultar reportes de ventas

1. Entra a **Reportes** desde la sección administrativa.
2. Selecciona las fechas **Desde** y **Hasta**.
3. Ejecuta la consulta de reporte.
4. Revisa el resumen de ingresos, cantidad de pedidos entregados y ticket promedio.
5. Consulta el desglose de pedidos por estado, ventas por día y productos más vendidos.

**Criterio del reporte:** los ingresos y las unidades vendidas incluyen **únicamente pedidos Entregados**. El periodo corresponde a la **fecha de creación del pedido en horario local de Baja California**, no a la fecha de entrega. Los pedidos pendientes, en preparación, listos o cancelados pueden figurar en el resumen por estado, pero no cuentan como ingresos realizados.

Ejemplo: una compra creada el 21 de noviembre a las 16:18, aunque se almacene como 22 de noviembre a las 00:18 UTC, debe aparecer en el reporte local del **21 de noviembre**.

> **Captura sugerida 8:** reporte con filtro de fechas, indicadores y estadísticas.

## 7. Guía del personal de producción

1. Inicia sesión con una cuenta de **Personal de producción**.
2. Selecciona **Producción**.
3. Consulta los pedidos en preparación y los productos y cantidades solicitados.
4. Cuando termines un pedido en estado **En preparación**, selecciona **Marcar como listo**.
5. Comprueba que el estado cambie a **Listo para entrega**.
6. La entrega final la registra el administrador.

Si un pedido no aparece, utiliza **Actualizar pedidos** y verifica con administración que ya se haya iniciado su preparación.

> **Captura sugerida 9:** panel de producción y botón «Marcar como listo».

## 8. Problemas frecuentes

| Situación | Posible causa | Qué hacer |
|---|---|---|
| No carga el catálogo | Backend o SQL Server no disponible | Reintentar y avisar al responsable técnico |
| No puedo iniciar sesión | Credenciales incorrectas o sesión no válida | Revisar correo y contraseña; volver a ingresar |
| Acceso no autorizado | La cuenta no tiene el rol requerido | Entrar con la cuenta autorizada |
| No puedo agregar cierta cantidad | Existencias insuficientes | Reducir la cantidad o elegir otro producto |
| No puedo confirmar un pedido | Sesión, stock o error de conexión | Revisar el mensaje; antes de reintentar, comprobar **Mis pedidos** |
| No puedo cancelar un pedido | Ya salió de estado Pendiente | Consultar el estado actualizado |
| No veo ingresos de una compra | El pedido todavía no está Entregado | Revisar estado y filtro de fechas |
| La fecha del reporte parece incorrecta | Diferencia entre UTC y hora local | Confirmar que el filtro corresponde al día local de Baja California |
| No aparece un pedido en producción | Todavía está Pendiente o la lista no se actualizó | Pedir al administrador que inicie preparación y actualizar |
| No puedo registrar una salida de inventario | La salida supera las existencias | Revisar stock y corregir cantidad |

## 9. Recomendaciones de seguridad y uso

- No compartas contraseñas ni datos de acceso.
- Cierra sesión al terminar, especialmente en equipos compartidos.
- Verifica cantidades, precios y totales antes de confirmar pedidos.
- No repitas una confirmación sin comprobar si el pedido ya fue creado.
- Registra motivos claros al modificar inventario.
- Usa cuentas de prueba y datos ficticios durante la evaluación académica.
- Reporta mensajes de error junto con la pantalla y la acción que los provocó; evita incluir contraseñas o tokens en las capturas.

## 10. Glosario

**Carrito:** selección temporal de productos y cantidades antes de confirmar una compra.  
**Stock o existencias:** unidades disponibles de un producto.  
**Pedido:** registro de una compra confirmada por el cliente.  
**Rol:** conjunto de permisos asignado a una cuenta.  
**Inventario:** control de entradas, salidas y existencias de productos.  
**Ticket promedio:** importe promedio de los pedidos entregados incluidos en el reporte.  
**UTC:** referencia horaria utilizada para almacenar fechas; el reporte interpreta los periodos según la hora local de Baja California.

## 11. Evidencias para la entrega académica

Para acompañar el manual con capturas reales, se recomienda incluir imágenes de: inicio, registro, inicio de sesión, catálogo, carrito, historial de pedidos, administración de productos, ajuste de inventario, administración de pedidos, producción y reportes. **Sustituye los marcadores «Captura sugerida» por capturas de tu aplicación; no utilices imágenes de referencia como si fueran pantallas reales.**

---

**Fin del manual de usuario — Dulce Hogar.**
