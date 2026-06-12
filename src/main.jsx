import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// ── Service worker: actualización forzada sin reinstalar ──
// El problema clásico de PWA: el SW nuevo se queda "esperando" y el
// usuario sigue con el JS viejo aunque cierre la app. Aquí forzamos
// que el SW nuevo tome control y recargue UNA vez automáticamente.

let refreshing = false

// Cuando el SW nuevo toma control, recargamos la página (una sola vez).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Hay versión nueva: activarla de inmediato (skipWaiting) y recargar.
    // El controllerchange de arriba dispara el reload automático.
    updateSW(true)
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // En móvil la PWA no se cierra del todo: revisamos versión nueva
      // periódicamente y cada vez que el usuario vuelve a la app.
      setInterval(() => {
        registration.update()
      }, 30 * 1000) // cada 30s
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
      // Chequeo inmediato al arrancar
      registration.update()
    }
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
