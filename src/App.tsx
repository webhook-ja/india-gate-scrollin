import { Navbar } from './components/Navbar'
import { ScrollExperience } from './components/ScrollExperience'

function App() {
  return (
    <main>
      <Navbar />
      <ScrollExperience />

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
      </footer>
    </main>
  )
}

export default App
