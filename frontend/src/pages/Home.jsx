import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-24 text-center">
      <p className="uppercase tracking-widest text-rose-700 font-semibold mb-4">Repostería artesanal</p>
      <h1 className="text-4xl md:text-6xl font-bold text-rose-950 mb-6">Un detalle dulce para cada ocasión</h1>
      <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-9">
        Descubre nuestros pasteles, panes y postres preparados con cariño.
      </p>
      <Link to="/catalogo" className="inline-block bg-rose-700 hover:bg-rose-800 text-white px-7 py-3 rounded-lg">
        Explorar productos
      </Link>
    </section>
  );
}