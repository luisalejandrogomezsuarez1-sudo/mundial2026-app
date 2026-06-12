import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// ── Service worker con actualización sin reinstalar ──
// Cuando subes un deploy nuevo a Railway, el SW lo detecta y muestra
// un banner "Actualizar". El usuario NO tiene que desinstalar la app.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    showUpdateBanner()
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // En móvil la PWA no se cierra del todo, solo se minimiza:
      // forzamos a buscar versión nueva cada 60s y al volver a foco.
      setInterval(() => {
        registration.update()
      }, 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
    }
  },
})

// Banner "Actualizar" — aparece solo cuando hay una versión nueva.
function showUpdateBanner() {
  if (document.getElementById('sw-update-banner')) return
  const bar = document.createElement('div')
  bar.id = 'sw-update-banner'
  bar.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
    'background:linear-gradient(135deg,#F0A500,#C8102E);color:#fff;' +
    'padding:14px 16px;display:flex;align-items:center;justify-content:space-between;' +
    'gap:12px;font-family:system-ui,sans-serif;font-size:14px;' +
    'box-shadow:0 -4px 16px rgba(0,0,0,.4)'

  const msg = document.createElement('span')
  msg.style.cssText = 'font-weight:600'
  msg.textContent = '✨ Hay una nueva versión disponible'

  const btn = document.createElement('button')
  btn.textContent = 'Actualizar'
  btn.style.cssText =
    'background:#fff;color:#C8102E;border:none;border-radius:8px;' +
    'padding:9px 18px;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap'
  btn.onclick = () => {
    btn.textContent = 'Actualizando…'
    btn.disabled = true
    updateSW(true) // activa el SW nuevo y recarga con el JS nuevo
  }

  bar.appendChild(msg)
  bar.appendChild(btn)
  document.body.appendChild(bar)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
