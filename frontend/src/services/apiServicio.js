// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: apiServicio.js
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

const URL_API = 'http://localhost:3000/api';
export async function consultarApi(ruta,metodo='GET',datos,token) {
  const respuesta=await fetch(URL_API+ruta,{method:metodo,headers:{
    'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})
  },...(datos===undefined?{}:{body:JSON.stringify(datos)})});
  const resultado=await respuesta.json();
  if(!respuesta.ok) throw Object.assign(new Error(resultado.mensaje||'Error de API'),{estado:respuesta.status});
  return resultado;
}