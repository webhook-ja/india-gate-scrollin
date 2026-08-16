import { useEffect, useState } from 'react'
import { Navbar } from './components/Navbar'
import { ScrollExperience } from './components/ScrollExperience'
import { CartaDinamica } from './components/CartaDinamica'
import { AdminCarta } from './components/AdminCarta'
import { ReservationBooking } from './components/ReservationBooking'
import { CartaStoreProvider } from './lib/carta-store'
import { ReservationStoreProvider } from './lib/reservation-store'
import { AnalyticsStoreProvider } from './lib/analytics-store'

type View = 'home' | 'admin'

function readView(): View {
  const hash = window.location.hash
  return hash === '#admin' ? 'admin' : 'home'
}

function AppShell() {
  const [view, setView] = useState<View>(() =>
    typeof window === 'undefined' ? 'home' : readView(),
  )
  const [bookingOpen, setBookingOpen] = useState(false)

  useEffect(() => {
    const sync = () => {
      setView(readView())
      if (window.location.hash === '#reservar') setBookingOpen(true)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const openBooking = () => {
    setBookingOpen(true)
    if (window.location.hash !== '#reservar') {
      window.history.replaceState(null, '', '#reservar')
    }
  }

  const closeBooking = () => {
    setBookingOpen(false)
    if (window.location.hash === '#reservar') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  return (
    <>
      <Navbar onReserve={openBooking} />
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
          Experiencia visual de India Gate — Tres Hermanos Boadilla: logo, camino de platos y
          sabores de la mesa.
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
        <button type="button" className="site-footer__admin" onClick={openBooking}>
          Reservar mesa
        </button>
        <a className="site-footer__admin" href="#admin">
          Admin carta
        </a>
      </footer>

      <ReservationBooking open={bookingOpen} onClose={closeBooking} />
    </>
  )
}

function App() {
  return (
    <CartaStoreProvider>
      <ReservationStoreProvider>
        <AnalyticsStoreProvider>
          <main>
            <AppShell />
          </main>
        </AnalyticsStoreProvider>
      </ReservationStoreProvider>
    </CartaStoreProvider>
  )
}

export default App
