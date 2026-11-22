# Guía de presentación final — Dulce Hogar

**Duración:** 12 minutos de exposición y 2 minutos de cambio.  
**Restricción:** La IA se utiliza únicamente en el bloque de cambio en vivo.

## Preparación previa a la presentación

- [ ] SQL Server activo y base de datos `DulceHogar` disponible.
- [ ] Backend iniciado; endpoint de salud responde.
- [ ] Frontend iniciado y navegador abierto en localhost.
- [ ] Cuenta de cliente de prueba y cuenta de administrador disponibles, sin mostrar contraseñas.
- [ ] Editor abierto en la carpeta del proyecto.
- [ ] GitHub abierto en la pestaña de commits.
- [ ] Bitácora y diario de decisiones visibles en el repositorio.
- [ ] Herramienta de IA iniciada, pero **sin usarla** hasta el bloque 3.
- [ ] Datos de prueba conocidos y posibilidad de reiniciar sin perder información importante.

## Minutos 0–3: demo del flujo principal

1. Mostrar inicio y catálogo.
2. Abrir un producto y agregarlo al carrito.
3. Revisar cantidades y total.
4. Confirmar un pedido con una cuenta de prueba.
5. Mostrar historial del pedido.
6. Si queda tiempo, enseñar gestión de pedidos como administrador.

**Explicación breve:** «Dulce Hogar permite consultar productos, realizar pedidos y dar seguimiento a su estado; además, separa las funciones administrativas y de producción mediante roles».

## Minutos 3–5: mapa del sistema

| Pregunta probable | Archivo o carpeta a mostrar | Qué explicar |
|---|---|---|
| ¿Dónde están las pantallas y rutas? | `frontend/src/App.jsx` | Navegación entre vistas y acceso por rol |
| ¿Dónde se guarda la sesión? | `frontend/src/context/AuthProvider.jsx` | Usuario, token y funciones de sesión |
| ¿Dónde se maneja el carrito? | `frontend/src/context/CarritoProvider.jsx` | Estado y persistencia del carrito |
| ¿Dónde se llaman los endpoints? | `frontend/src/services/apiServicio.js` | Solicitudes HTTP y errores |
| ¿Dónde se crean pedidos? | `backend/src/routes/pedidoRutas.js` | Validación y persistencia |
| ¿Dónde están permisos y login? | `backend/src/routes/authRutas.js` | Autenticación y roles |
| ¿Dónde están los reportes? | `backend/src/routes/reportesRutas.js` | Consultas y fechas |
| ¿Dónde se conecta SQL Server? | `backend/src/config/database.js` | Configuración y conexión |

## Minutos 5–10: cambio pequeño con IA

**Plantilla de prompt:**

> Estoy trabajando en Dulce Hogar, un proyecto React/Vite con backend Express y SQL Server. Necesito un cambio pequeño: [petición exacta del profesor]. Antes de modificar, identifica el archivo responsable. Propón el cambio mínimo, conserva los contratos actuales y dime cómo probar un caso normal y uno límite. No cambies archivos no relacionados.

**Procedimiento visible:**
1. Repetir el cambio pedido con tus palabras.
2. Identificar archivo y mostrarlo.
3. Pedir a la IA un cambio acotado.
4. Leer el diff antes de aceptarlo.
5. Ejecutar prueba rápida y explicar resultado.
6. Si falla, describir causa y siguiente corrección; no ocultar errores.

**Ejemplo para ensayar, no asumir que será el cambio pedido:** mostrar un mensaje de «No se encontraron productos» cuando una búsqueda devuelva lista vacía.

## Minutos 10–12: criterio y decisiones

**Pregunta:** ¿En qué se equivocó la IA o qué decisión revisaste?  
**Respuesta posible:** «En los reportes detecté que comparar fechas locales con timestamps UTC desplazaba compras al día siguiente. Validé la causa con SQL y preferí convertir el rango de consulta a UTC en lugar de modificar datos históricos».

**Pregunta:** ¿Cómo compruebas una sugerencia?  
**Respuesta:** «Identifico los archivos afectados, reviso la lógica y ejecuto una prueba normal y otra límite; solo después considero aceptado el cambio».

## Casos límite para ensayar

| Caso | Comportamiento deseable | Qué verificar |
|---|---|---|
| Login vacío | Mensaje de validación, sin pantalla en blanco | Interfaz y consola |
| Producto inexistente | Mensaje claro o 404 controlado | API e interfaz |
| Cantidad cero o negativa | Rechazo de la operación | No altera inventario |
| Doble clic en confirmar pedido | No duplicar pedido | Número de pedidos en SQL |
| Recarga con carrito | Comportamiento coherente | Carrito y almacenamiento |
| Backend detenido | Mensaje de error recuperable | Sin pantalla en blanco |
| Cliente entra a ruta admin | Acceso denegado | Respuesta 403 desde API |
| Fecha inválida en reporte | Mensaje de validación | Respuesta 400 |

**No marques un caso como aprobado sin ejecutarlo.**

## Entrega en Classroom — antes del domingo 22 a las 23:59

- [ ] Repositorio GitHub accesible.
- [ ] `BITACORA_IA.md` y `DIARIO_DECISIONES.md` incluidos.
- [ ] Último commit realizado antes de la fecha límite.
- [ ] Enlace a despliegue solo si existe.
- [ ] Evidencias de pruebas y documentación revisadas.

Comandos sugeridos desde la raíz:

```bash
git status
git add BITACORA_IA.md DIARIO_DECISIONES.md docs/GUIA_PRESENTACION_DULCE_HOGAR.md
git commit -m "docs: agregar bitacora IA diario de decisiones y guia de presentacion"
git push origin main
git log -5 --oneline
```

Ajustar las rutas de `git add` según dónde se guarden los archivos.
