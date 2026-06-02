import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El manifest ya existe en public/manifest.json y se enlaza desde index.html.
      // Dejamos que el plugin solo genere el service worker, sin tocar el manifest.
      manifest: false,
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,jpg,jpeg,webp}'],
        // SPA: navegaciones sin caché caen al index.html cacheado (offline básico)
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  preview: {
    port: parseInt(process.env.PORT) || 4173,
    host: '0.0.0.0'
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
