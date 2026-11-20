// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: AuthProvider.jsx
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

import { useState,useEffect } from 'react';
import { AuthContext } from './authContext';
import { consultarApi } from '../services/apiServicio';
const CLAVE='dulce-hogar-token-v1';
export default function AuthProvider({children}) {
  const [usuario,setUsuario]=useState(null);
  const [token,setToken]=useState(()=>sessionStorage.getItem(CLAVE));
  const [cargando,setCargando]=useState(Boolean(token));
  useEffect(()=>{
    let activo=true;
    if(token) consultarApi('/auth/me','GET',undefined,token).then(perfil=>{
      if(activo) setUsuario(perfil);
    }).catch(()=>{if(activo){sessionStorage.removeItem(CLAVE);setToken(null);setUsuario(null);}})
      .finally(()=>{if(activo)setCargando(false);});
    return ()=>{activo=false;};
  },[token]);
  async function iniciarSesion(correo,clave) {
    try { const r=await consultarApi('/auth/login','POST',{correo,clave});
      sessionStorage.setItem(CLAVE,r.token);setToken(r.token);setUsuario(r.usuario);return '';
    } catch(error){return error.message;}
  }
  async function registrar(nombre,correo,clave) {
    try {await consultarApi('/auth/registro','POST',{nombre,correo,clave});return '';}
    catch(error){return error.message;}
  }
  function cerrarSesion(){sessionStorage.removeItem(CLAVE);setToken(null);setUsuario(null);setCargando(false);}
  if(cargando) return <main role="status" className="p-8">Verificando sesión...</main>;
  return <AuthContext.Provider value={{usuario,token,iniciarSesion,registrar,cerrarSesion}}>
    {children}</AuthContext.Provider>;
}