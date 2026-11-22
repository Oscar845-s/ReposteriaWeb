# Diario de decisiones técnicas — Dulce Hogar

**Proyecto:** Dulce Hogar  
**Alumno:** Oscar Armando Medina Gutiérrez  
**Materia:** Aplicaciones Web

Este documento explica decisiones de diseño e implementación. Las fechas exactas y los identificadores de commit deben completarse con el historial real del repositorio.

## D01. Separar frontend, backend y base de datos
- **Contexto:** El sistema necesita interfaz de usuario, reglas de negocio y persistencia.
- **Decisión:** React + Vite para interfaz; Node.js + Express para API; SQL Server para datos.
- **Motivo:** Separación de responsabilidades y posibilidad de probar cada capa.
- **Consecuencia:** Se debe mantener consistente el contrato de la API y configurar los servicios por separado.
- **Ubicación:** `frontend/src/`, `backend/src/routes/`, `backend/src/config/database.js`.

## D02. Controlar el acceso por roles
- **Contexto:** Clientes, administradores y personal de producción tienen funciones diferentes.
- **Decisión:** Proteger endpoints con autenticación y comprobar el rol del usuario en backend.
- **Motivo:** Ocultar botones en React no impide solicitudes HTTP directas.
- **Consecuencia:** Probar respuestas 401 y 403 y no depender exclusivamente de controles visuales.
- **Ubicación:** `backend/src/routes/authRutas.js` y rutas administrativas, operativas y de reportes.

## D03. Mantener el carrito coherente después de comprar
- **Contexto:** El carrito podía reaparecer tras completar un pedido.
- **Alternativas:** Limpiar solo el estado React o sincronizar inmediatamente el almacenamiento persistente.
- **Decisión:** Persistir el carrito vacío antes de actualizar el estado de la interfaz.
- **Motivo:** Evitar que una lectura posterior recupere datos antiguos.
- **Consecuencia:** Probar compra, navegación y recarga.
- **Ubicación:** `frontend/src/context/CarritoProvider.jsx`.

## D04. Manejar fechas de reportes según la zona horaria del usuario
- **Contexto:** SQL Server almacena `fechaPedido` en UTC; una compra local de la tarde podía figurar en el día UTC siguiente.
- **Alternativas:** Cambiar registros históricos, filtrar con fechas UTC sin conversión o convertir el rango local a UTC.
- **Decisión:** Conservar UTC y convertir el inicio y fin del día local mediante `AT TIME ZONE 'Pacific Standard Time'`.
- **Motivo:** Preservar la integridad del historial y contemplar cambios de horario.
- **Consecuencia:** Aplicar el rango en todas las consultas y agrupar los resultados diarios según fecha local.
- **Ubicación:** `backend/src/routes/reportesRutas.js`.
- **Estado:** Consulta SQL de diagnóstico comprobada; verificar y documentar la prueba final de interfaz.

## D05. Validar en el servidor, no solo en el navegador
- **Contexto:** Un usuario puede enviar peticiones directamente a la API.
- **Decisión:** Mantener validaciones de datos, permisos y errores HTTP en backend.
- **Motivo:** Las validaciones de interfaz ayudan a la experiencia, pero no son una barrera de seguridad.
- **Consecuencia:** Probar campos vacíos, formatos inválidos, recursos inexistentes y peticiones sin autorización.
- **Estado:** Revisar cada ruta y registrar evidencias reales.

## D06. No desplegar antes de asegurar el funcionamiento local
- **Contexto:** El backend utiliza conexión integrada de Windows con SQL Server local.
- **Decisión:** Priorizar una entrega reproducible en localhost y documentar el despliegue como opcional.
- **Motivo:** El despliegue público requiere resolver conexión a base de datos, secretos, disponibilidad y seguridad.
- **Consecuencia:** La demo depende de que el equipo local y SQL Server estén encendidos; preparar arranque y verificación antes de presentar.

## D07. Usar IA como apoyo y revisar sus cambios
- **Contexto:** Se solicitó apoyo de IA para implementar y depurar funciones.
- **Decisión:** Revisar el código generado, probarlo localmente y registrar las correcciones aceptadas.
- **Motivo:** La IA puede proponer soluciones incompatibles con el estado real del proyecto.
- **Consecuencia:** Cada cambio debe poder explicarse, ubicarse en archivos y validarse mediante una prueba.
