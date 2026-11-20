// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: CatalogoProvider.jsx
// Descripción: Compartir catálogo remoto.
// Requerimiento: RF03, RF04, RF05, RF06, RF07
// Fecha: 20 de noviembre de 2026
import { useEffect, useState } from 'react';
import { CatalogoContext } from './catalogoContext';
import { consultarCatalogo } from '../services/catalogoServicio';

export default function CatalogoProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState({ productos: [], categorias: [], version: -1, error: '' });
  useEffect(() => {
    const controlador = new AbortController();
    consultarCatalogo(controlador.signal).then(([productos, categorias]) => {
      if (!controlador.signal.aborted) {
        setDatos({ productos, categorias, version, error: '' });
      }
    }).catch(() => {
      if (!controlador.signal.aborted) {
        setDatos(anterior => ({ ...anterior, version, error: 'No se pudo consultar la API.' }));
      }
    });
    return () => controlador.abort();
  }, [version]);
  const cargando = datos.version !== version;
  const listo = !cargando && !datos.error;
  return <CatalogoContext.Provider value={{ ...datos, cargando, listo,
    actualizar: () => setVersion(v => v + 1) }}>{children}</CatalogoContext.Provider>;
}