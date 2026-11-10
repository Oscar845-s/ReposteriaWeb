import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-20 text-center">
      <h1 className="text-4xl font-bold">Página no encontrada</h1>
      <p className="my-5">La dirección solicitada no existe.</p>
      <Link to="/" className="text-rose-700 underline">Volver al inicio</Link>
    </section>
  );
}