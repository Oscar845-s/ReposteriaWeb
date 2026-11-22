# Lista de verificación previa al despliegue — Dulce Hogar

**Estado actual:** PROTOTIPO LOCAL. Marcar cada casilla únicamente después de verificarla.

## 1. Calidad y cobertura

- [ ] `npm run lint` del frontend sin errores ni advertencias.
- [ ] `npm run build` del frontend correcto.
- [ ] Pruebas de integración sin fallos; omisiones justificadas.
- [ ] Auditoría 12-B ejecutada y hallazgos registrados.
- [ ] `npm audit` revisado en backend y frontend.
- [ ] Casos críticos de compra, cancelación, inventario y roles comprobados.
- [ ] Reportes correctos para fechas locales de Baja California y cambios de horario.
- [ ] SRS, RF12 y RF19 revisados; pendientes documentados.

## 2. Infraestructura

- [ ] Elegir hosting compatible con Node.js/Express y SQL Server.
- [ ] Verificar compatibilidad del controlador SQL con el SO del servidor.
- [ ] No asumir que la autenticación integrada de Windows funcionará en un hosting Linux.
- [ ] Configurar acceso a BD con permisos mínimos y conexión cifrada.
- [ ] Definir estrategia de migración y respaldo de SQL Server; probar restauración.
- [ ] Establecer variables de entorno y secreto JWT robusto en el proveedor, sin Git.
- [ ] Configurar `FRONTEND_ORIGIN` para el dominio definitivo.
- [ ] Reemplazar la URL fija `http://localhost:3000/api` del frontend por configuración de entorno de Vite o proxy de despliegue, sin incluir secretos en variables `VITE_*`.
- [ ] Configurar HTTPS, encabezados de seguridad y políticas de caché.
- [ ] Implementar o verificar limitación de intentos en autenticación.
- [ ] Definir registros, monitoreo y respuesta ante errores sin exponer datos personales.
- [ ] Verificar políticas de privacidad, retención y borrado de datos.

## 3. Publicación y reversión

- [ ] Crear respaldo verificado de BD antes del despliegue.
- [ ] Probar frontend y backend en entorno de pruebas equivalente al definitivo.
- [ ] Confirmar que `/api/salud` responda con conexión a BD.
- [ ] Probar cliente, administrador y producción con cuentas de prueba.
- [ ] Confirmar creación de pedido, inventario y reportes.
- [ ] Definir procedimiento de reversión del código y restauración de BD.
- [ ] Documentar fecha, versión y responsable de la publicación.

**No publicar datos de prueba con información personal real ni credenciales de desarrollo.**