# Informe final de verificación y validación — Dulce Hogar

**Responsable:** Oscar Armando Medina Gutiérrez  
**Materia:** Verificación y Validación de Software  
**Fecha del corte:** 21 de noviembre de 2026  
**Versión / commit:** PENDIENTE DE REGISTRAR (`git rev-parse --short HEAD`)

## 1. Objetivo

Evaluar la conformidad del prototipo con los requisitos y registrar pruebas, anomalías, correcciones y riesgos pendientes.

## 2. Ambiente de prueba

- SO de desarrollo: Windows.
- Frontend: React/Vite.
- Backend: Node.js/Express.
- BD: SQL Server (`DulceHogar`).
- Fecha y hora de ejecución: PENDIENTE DE REGISTRAR.
- Versiones Node/npm: PENDIENTE DE REGISTRAR.

## 3. Evidencias ya comunicadas

| Identificador | Actividad | Resultado reportado | Limitación |
|---|---|---|---|
| INT-12A | `node pruebas/prueba-integracion.mjs` | **10/10 correctas, 0 fallidas** | 3 inicios de sesión por rol **omitidos** por falta de credenciales. |
| REG-CARRITO | Corrección de vaciado tras compra | Usuario indicó continuidad tras aplicar corrección | Conservar captura o registro de repetición de prueba. |
| REG-FECHAS | Consulta SQL de fecha local Baja California | Pedido #17 incluido correctamente en el 21/11/2026 | Comprobar respuesta del endpoint y UI tras instalar corrección. |
| SEG-12B | Auditoría HTTP de seguridad | **PENDIENTE DE RESULTADO** | No declarar aprobada. |
| DEP | `npm audit` frontend y backend | **PENDIENTE DE RESULTADO** | No declarar ausencia de vulnerabilidades. |
| LINT | `npm run lint` | **PENDIENTE DE RESULTADO FINAL** | Existieron advertencias; se propusieron correcciones. |
| BUILD | `npm run build` | **PENDIENTE DE RESULTADO FINAL** | No se ha recibido evidencia de la ejecución final. |

## 4. Registro de casos de prueba

| ID | Requisito | Acción | Esperado | Real | Estado | Evidencia |
|---|---|---|---|---|---|---|
| VV-01 | RF01-RF02 | Registro y sesión | Usuario autenticado | POR REGISTRAR | PENDIENTE | — |
| VV-02 | RF03-RF04 | Catálogo y detalle | Datos correctos | POR REGISTRAR | PENDIENTE | — |
| VV-03 | RF05-RF08 | Compra | Pedido creado, carrito vacío | POR REGISTRAR | PENDIENTE | — |
| VV-04 | RF09,RF17 | Historial/cancelación | Estado y stock consistentes | POR REGISTRAR | PENDIENTE | — |
| VV-05 | RF10-RF13 | Administración | CRUD y movimientos correctos | POR REGISTRAR | PENDIENTE | — |
| VV-06 | RF14-RF15 | Producción/entrega | Transiciones autorizadas | POR REGISTRAR | PENDIENTE | — |
| VV-07 | RF16 | Reportes | Datos correctos por día local | POR REGISTRAR | PENDIENTE | — |
| VV-08 | RF18 | Seguridad por rol | 401/403 correctos | POR REGISTRAR | PENDIENTE | — |

## 5. Anomalías y seguimiento

| ID | Descripción | Causa identificada | Acción correctiva | Estado |
|---|---|---|---|---|
| AN-01 | Carrito no se vaciaba tras confirmar | Desmontaje del proveedor antes de persistir el estado vacío | Guardar `[]` sincrónicamente antes del `dispatch` | CORREGIDA; REVALIDAR |
| AN-02 | Ventas de la tarde aparecían al filtrar día siguiente | Tiempos UTC interpretados como fechas locales | Convertir límites locales a UTC y agrupar por fecha local | CORRECCIÓN ENTREGADA; REVALIDAR UI/API |
| AN-03 | Advertencias de hooks React | Efectos con cambios sincrónicos y dependencias | Refactorización de componentes | CORRECCIÓN ENTREGADA; VERIFICAR LINT |

## 6. Riesgos pendientes

- Falta evidencia de auditoría 12-B y resultados de `npm audit`.
- Faltan pruebas autenticadas de los tres roles en el script de integración.
- Verificar RF12 y RF19 contra el SRS definitivo.
- Despliegue remoto no validado: conexión SQL Server integrada de Windows, HTTPS, secretos, CORS, límites de intentos, copias de seguridad.

## 7. Dictamen provisional

**DICTAMEN: APROBACIÓN FINAL PENDIENTE.** El prototipo tiene funcionalidad implementada y pruebas parciales satisfactorias, pero faltan evidencias de seguridad, compilación final y cobertura de requisitos. No se certifica preparación para producción.

**Fecha y firma del responsable:** __________________________

**Fecha y firma de quien valida:** __________________________