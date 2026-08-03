import { Menu } from 'lucide-react'
import { BorderBeam } from './ui/BorderBeam'

const navItems = ['Historia', 'Experiencia', 'Carta']

export function Navbar() {
  return (
    <header className="navbar-shell">
      <nav className="navbar" aria-label="Navegación decorativa">
        <a className="wordmark" href="#inicio" aria-label="India Gate">
          <img
            className="wordmark__mark"
            src="/brand/nav-namaste.png?v=silver3"
            alt=""
            width={44}
            height={44}
            decoding="async"
          />
        </a>

        <div className="navbar__links" aria-hidden="true">
          {navItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <BorderBeam className="navbar__reservation" duration={9}>
          <span>Reservar mesa</span>
          <span className="navbar__dot" aria-hidden="true" />
        </BorderBeam>

        <button className="navbar__menu" type="button" aria-label="Abrir menú decorativo">
          <Menu aria-hidden="true" size={20} strokeWidth={1.5} />
        </button>
      </nav>
    </header>
  )
}
