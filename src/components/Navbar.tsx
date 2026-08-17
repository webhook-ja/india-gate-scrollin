import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SHOW_RESERVATIONS } from '../lib/demo-flags'
import { publicUrl } from '../lib/public-url'
import { BorderBeam } from './ui/BorderBeam'

const navItems = [
  { label: 'Historia', href: '#inicio' },
  { label: 'Experiencia', href: '#inicio' },
  { label: 'Carta', href: '#carta' },
  ...(SHOW_RESERVATIONS ? [{ label: 'Reservar', href: '#reservar' }] : []),
  { label: 'Admin', href: '#admin' },
]

type NavbarProps = {
  onReserve?: () => void
}

export function Navbar({ onReserve }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const goReserve = () => {
    closeMenu()
    onReserve?.()
  }

  const goCarta = () => {
    closeMenu()
    window.location.hash = '#carta'
  }

  return (
    <header className="navbar-shell">
      <nav className="navbar" aria-label="Navegación">
        <a className="wordmark" href="#inicio" aria-label="India Gate" onClick={closeMenu}>
          <img
            className="wordmark__mark"
            src={publicUrl('brand/nav-namaste.png?v=silver3')}
            alt=""
            width={44}
            height={44}
            decoding="async"
          />
        </a>

        <div className="navbar__links">
          {navItems.map((item) =>
            item.href === '#reservar' ? (
              <button
                key={item.label}
                type="button"
                className="navbar__text-btn"
                onClick={goReserve}
              >
                {item.label}
              </button>
            ) : (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ),
          )}
        </div>

        <div className="navbar__end">
          {SHOW_RESERVATIONS ? (
            <BorderBeam
              className="navbar__reservation"
              duration={9}
              role="button"
              tabIndex={0}
              aria-label="Reservar mesa"
              onClick={goReserve}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  goReserve()
                }
              }}
            >
              <span>Reservar mesa</span>
              <span className="navbar__dot" aria-hidden="true" />
            </BorderBeam>
          ) : (
            <BorderBeam
              className="navbar__reservation"
              duration={9}
              role="button"
              tabIndex={0}
              aria-label="Ver carta"
              onClick={goCarta}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  goCarta()
                }
              }}
            >
              <span>Ver carta</span>
              <span className="navbar__dot" aria-hidden="true" />
            </BorderBeam>
          )}

          <button
            className="navbar__menu"
            type="button"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X aria-hidden="true" size={20} strokeWidth={1.5} />
            ) : (
              <Menu aria-hidden="true" size={20} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="navbar-drawer" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="navbar-drawer__scrim" onClick={closeMenu} />
          <div className="navbar-drawer__panel">
            {navItems.map((item) =>
              item.href === '#reservar' ? (
                <button key={item.label} type="button" onClick={goReserve}>
                  {item.label}
                </button>
              ) : (
                <a key={item.label} href={item.href} onClick={closeMenu}>
                  {item.label}
                </a>
              ),
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
