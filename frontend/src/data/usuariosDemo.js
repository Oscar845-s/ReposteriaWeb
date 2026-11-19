// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: usuariosDemo.js
// Descripción: Cuentas ficticias y roles.
// Requerimiento: RF01, RF02, RF18, RF05
// Fecha: 19 de noviembre de 2026

export const ROLES = Object.freeze({
  CLIENTE: 'Cliente',
  ADMIN: 'Administrador',
  PRODUCCION: 'Personal de Producción',
});

export const USUARIOS_DEMO = [
  { nombre: 'Cliente demo', correo: 'cliente@demo.mx', clave: 'Cliente123', rol: ROLES.CLIENTE },
  { nombre: 'Admin demo', correo: 'admin@demo.mx', clave: 'Admin1234', rol: ROLES.ADMIN },
  { nombre: 'Producción demo', correo: 'produccion@demo.mx', clave: 'Produccion123', rol: ROLES.PRODUCCION },
];