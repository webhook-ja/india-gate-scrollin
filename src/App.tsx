import { useEffect, useState } from 'react'
import { Navbar } from './components/Navbar'
import { ScrollExperience } from './components/ScrollExperience'
import { CartaDinamica } from './components/CartaDinamica'
import { AdminCarta } from './components/AdminCarta'
import { CartaStoreProvider } from './lib/carta-store'

type View = 'home' | 'admin'

function readView(): View {
  return window.location.hash === '#admin' ? 'admin' : 'home'
}

function App() {
  const [view, setView] = useState<View>(() =>
    typeof window === 'undefined' ? 'home' : readView(),
  )

  useEffect(() => {
    const onHash = () => setView(readView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <CartaStoreProvider>
      <main>
        <Navbar />
        {view === 'admin' ? (
          <AdminCarta />
        ) : (
          <>
            <ScrollExperience />
            <CartaDinamica />
          </>
        )}

        <section className="seo-copy" data-sw-seo aria-label="Resumen de la experiencia">
          <h2>India Gate</h2>
          <p>
            Experiencia visual de India Gate — Tres Hermanos Boadilla: logo, camino de
            platos y sabores de la mesa.
          </p>
        </section>

        <footer className="site-footer">
          <img
            className="site-footer__logo"
            src="/brand/wordmark.png?v=orig8k2"
            alt="India Gate — Tres Hermanos Boadilla"
            width={280}
            height={255}
          />
          <span>Comida india · Tres Hermanos Boadilla</span>
          <a className="site-footer__admin" href="#admin">
            Admin carta
          </a>
        </footer>
      </main>
    </CartaStoreProvider>
  )
}

export default App
