import { ShoppingCart, CakeSlice } from "lucide-react";

function App() {
  return (
    <div className="min-h-screen bg-rose-50">

      <header className="bg-white shadow-sm p-5">
        <nav className="max-w-6xl mx-auto flex justify-between items-center">

          <h1 className="text-2xl font-bold text-rose-700 flex items-center gap-2">
            <CakeSlice />
            Dulce Hogar
          </h1>

          <div className="flex items-center gap-6">
            <span>Inicio</span>
            <span>Catálogo</span>
            <ShoppingCart />
          </div>

        </nav>
      </header>

      <main className="max-w-6xl mx-auto text-center py-24 px-5">

        <h2 className="text-5xl font-bold text-rose-900 mb-6">
          Bienvenido a Dulce Hogar
        </h2>

        <p className="text-lg text-gray-600 mb-8">
          Descubre nuestros deliciosos pasteles,
          panes y postres preparados con amor.
        </p>

        <button className="bg-rose-600 text-white px-8 py-3 rounded-lg hover:bg-rose-700">
          Explorar productos
        </button>

      </main>

    </div>
  );
}

export default App;