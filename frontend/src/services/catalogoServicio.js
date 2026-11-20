// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: catalogoServicio.js
// Descripción: Consultar API REST.
// Requerimiento: RF03, RF04, RF05, RF06, RF07
// Fecha: 20 de noviembre de 2026
import { products } from '../data/products';

const URL_API = 'http://localhost:3000/api';

// Recibe ruta y señal; devuelve JSON o lanza un error.
async function consultar(ruta, signal) {
  const respuesta = await fetch(`${URL_API}${ruta}`, { signal });
  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }
  return respuesta.json();
}

// Recibe una señal; devuelve productos y categorías de la API.
export async function consultarCatalogo(signal) {
  const [productos, categorias] = await Promise.all([
    consultar('/productos', signal), consultar('/categorias', signal),
  ]);
  return [productos.map(producto => ({
    ...producto,
    imagen: producto.imagen || products.find(local => local.id === producto.id)?.imagen,
  })), categorias];
}
