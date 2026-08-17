import { useEffect, useLayoutEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Navbar } from './components/Navbar'
import { ScrollExperience } from './components/ScrollExperience'
import { CartaDinamica } from './components/CartaDinamica'
import { AdminCarta } from './components/AdminCarta'
import { ReservationBooking } from './components/ReservationBooking'
import { CartaStoreProvider } from './lib/carta-store'
import { ReservationStoreProvider } from './lib/reservation-store'
import { AnalyticsStoreProvider } from './lib/analytics-store'
import { SHOW_RESERVATIONS } from './lib/demo-flags'
import { publicUrl } from './lib/public-url'

gsap.registerPlugin(ScrollTrigger)

type View = 'home' | 'carta' | 'admin'

function readView(): View {
  const hash = window.location.hash
  if (hash === '#admin') return 'admin'
  if (hash === '#carta') return 'carta'
  return 'home'
}

function jumpToTop() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

function AppShell() {
  const [view, setView] = useState<View>(() =>
    typeof window === 'undefined' ? 'home' : readView(),
  )
  const [bookingOpen, setBookingOpen] = useState(false)

  useEffect(() => {
    history.scrollRestoration = 'manual'
    const sync = () => {
      setView(readView())
      if (SHOW_RESERVATIONS && window.location.hash === '#reservar') setBookingOpen(true)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useLayoutEffect(() => {
    document.documentElement.dataset.view = view
    if (view !== 'home') {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
    jumpToTop()
    const frame = requestAnimationFrame(() => {
      jumpToTop()
      requestAnimationFrame(jumpToTop)
    })
    const timer = window.setTimeout(jumpToTop, 50)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [view])

  const openBooking = () => {
    if (!SHOW_RESERVATIONS) return
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
      ) : view === 'carta' ? (
        <CartaDinamica />
      ) : (
        <ScrollExperience />
      )}

      <section className="seo-copy" data-sw-seo aria-label="Resumen de la experiencia">
        <h2>India Gate</h2>
        <p>
          Experiencia visual de India Gate — Tres Hermanos Boadilla: logo, camino de platos y
          sabores de la mesa.
        </p>
      </section>

      <footer className={`site-footer${view === 'home' ? '' : ' site-footer--compact'}`}>
        <img
          className="site-footer__logo"
          src={publicUrl('brand/wordmark.png?v=orig8k2')}
          alt="India Gate — Tres Hermanos Boadilla"
          width={280}
          height={255}
        />
        <span>Comida india · Tres Hermanos Boadilla</span>
        {SHOW_RESERVATIONS ? (
          <button type="button" className="site-footer__admin" onClick={openBooking}>
            Reservar mesa
          </button>
        ) : (
          <a className="site-footer__admin" href="#carta">
            Ver carta
          </a>
        )}
        <a className="site-footer__admin" href="#admin">
          Admin carta
        </a>
      </footer>

      {SHOW_RESERVATIONS ? (
        <ReservationBooking open={bookingOpen} onClose={closeBooking} />
      ) : null}
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
