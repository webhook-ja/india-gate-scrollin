import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { publicUrl } from './lib/public-url'

document.documentElement.style.setProperty(
  '--namaste-mask',
  `url("${publicUrl('brand/namaste-white.png?v=silver4')}")`,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
