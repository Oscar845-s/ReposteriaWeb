# Bitácora de uso de inteligencia artificial — Dulce Hogar

**Proyecto:** Sistema web de venta y gestión de productos de repostería (Dulce Hogar)  
**Alumno:** Oscar Armando Medina Gutiérrez  
**Materia:** Aplicaciones Web  
**Estado:** Borrador basado en el trabajo realizado; revisar y completar fechas, evidencias y resultados antes de entregar.

## 1. Objetivo
Documentar cómo se utilizó una herramienta de IA como apoyo en el análisis, implementación, depuración y verificación del sistema. Las decisiones y pruebas finales corresponden al desarrollador.

## 2. Registro de interacciones y revisión

| Etapa | Necesidad o problema | Apoyo solicitado a la IA | Revisión y decisión del desarrollador | Evidencia por añadir |
|---|---|---|---|---|
| Análisis | Definir el alcance de un sistema de repostería | Organizar funcionalidades para clientes, administradores y producción | Se delimitó un catálogo, carrito, pedidos, inventario y gestión por roles | Documento de alcance y commits |
| Requerimientos | Formular RF01–RF20 y criterios de prueba | Redacción y revisión de requisitos | Verificar que cada requisito corresponda a una funcionalidad implementada | Matriz de trazabilidad |
| Autenticación | Integrar contexto de sesión en React | Revisión de `AuthProvider.jsx` y uso de `useCallback` | Se solicitó código para copiar, pegar y revisar en ejecución | Commit y prueba de inicio/cierre de sesión |
| Carrito | El carrito reaparecía después de finalizar un pedido | Analizar sincronización de estado y almacenamiento | Se corrigió el vaciado persistiendo el carrito vacío antes de actualizar el estado | Prueba de compra y recarga |
| Reportes | Pedidos de la tarde aparecían en el día siguiente | Investigar comparación entre hora local y UTC en SQL Server | Se verificó mediante una consulta SQL con `AT TIME ZONE 'Pacific Standard Time'`; se propuso aplicar el ajuste a las cuatro consultas del reporte | Captura SQL, commit y prueba de interfaz |
| Verificación | Comprobar endpoints sin modificar datos | Crear pruebas de integración y listas de verificación | Se reportaron 10 pruebas de integración no destructivas aprobadas; pruebas por rol pendientes de credenciales | Salida de consola |
| Seguridad | Revisar accesos y manejo de errores | Proponer auditoría no destructiva | **Pendiente de confirmar:** ejecutar auditoría y registrar hallazgos reales | Registro de auditoría |
| Documentación | Preparar entrega y manuales | Estructurar manual de usuario y documentación técnica | Revisar que rutas, pantallas y procedimientos coincidan con el código | Archivos de `docs/` |

> **Importante:** No marcar una corrección como aprobada hasta ejecutar su prueba correspondiente. El ajuste de fechas y la auditoría deben registrarse con su resultado real.

## 3. Ejemplo de uso responsable de IA

**Problema:** Una compra hecha en la tarde del 21 de noviembre aparecía al consultar el reporte del 22.  
**Hipótesis:** La base de datos guarda `fechaPedido` en UTC, mientras el usuario filtra por fecha local.  
**Comprobación:** Consulta SQL que convierte los límites del día local a UTC usando `AT TIME ZONE`.  
**Decisión:** Mantener los registros UTC y adaptar los filtros del reporte, en lugar de modificar los datos históricos.  
**Prueba pendiente de documentar:** Resultado final en la interfaz y evidencia del commit.

## 4. Cómo se verificaron las propuestas

1. Leer el código generado antes de integrarlo.
2. Comprobar rutas, nombres de funciones y contratos de la API.
3. Ejecutar la aplicación local y reproducir el problema.
4. Probar el caso normal y al menos un caso límite.
5. Revisar la consola y el estado de la base de datos.
6. Registrar en Git únicamente los cambios aceptados.

## 5. Preguntas para defender la bitácora

**¿Qué propuesta de IA no aceptarías sin revisión?** Un cambio que altere fechas almacenadas en SQL Server para que coincidan visualmente con la hora local: podría dañar el historial y producir nuevos errores. Es mejor convertir los límites de consulta.

**¿Cómo detectaste una falla?** Comparando el momento real de una compra con `fechaPedido` y comprobando el rango correcto mediante una consulta SQL.

**¿Cómo sabes que un cambio funciona?** Mediante una prueba reproducible, revisando respuesta de API, interfaz, consola y datos persistidos.
