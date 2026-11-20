// Nombre: Oscar Armando Medina Gutiérrez
// Materia: Verificación y Validación de Software
// Programa: Registro.jsx
// Descripción: Implementación de autenticación y pedidos.
// Requerimiento: RF01, RF02, RF08, RF09, RF17, RF18, RF20
// Fecha: 20 de noviembre de 2026

import { useState } from 'react';
import { Link,Navigate,useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
export default function Registro(){
  const {usuario,registrar}=useAuth();const navegar=useNavigate();
  const [datos,setDatos]=useState({nombre:'',correo:'',clave:'',confirmar:''});
  const [error,setError]=useState('');const [ocupado,setOcupado]=useState(false);
  async function enviar(e){e.preventDefault();
    if(datos.clave!==datos.confirmar){setError('Las contraseñas no coinciden.');return;}
    setOcupado(true);try{const r=await registrar(datos.nombre,datos.correo,datos.clave);
      setError(r);if(!r)navegar('/login',{replace:true});}finally{setOcupado(false);}
  }
  if(usuario)return <Navigate to="/" replace/>;
  return <section className="max-w-md mx-auto px-5 py-14"><form onSubmit={enviar}
    className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
    <h1 className="text-3xl font-bold text-rose-900">Crear cuenta</h1>
    { [['nombre','Nombre','text'],['correo','Correo','email'],['clave','Contraseña','password'],
      ['confirmar','Confirmar contraseña','password']].map(([name,etiqueta,tipo])=>(
      <label key={name} className="block">{etiqueta}<input required name={name} type={tipo}
        value={datos[name]} onChange={e=>setDatos({...datos,[name]:e.target.value})}
        autoComplete={tipo==='password'?'new-password':name==='correo'?'email':'name'}
        className="border rounded p-3 w-full"/></label>))}
    <p className="text-sm">Mínimo 8 caracteres, una mayúscula y un número; máximo 72 bytes.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <button disabled={ocupado} className="bg-rose-700 text-white rounded-lg p-3 w-full">Registrarme</button>
    <Link to="/login" className="text-rose-700 underline">Ya tengo cuenta</Link>
  </form></section>;
}