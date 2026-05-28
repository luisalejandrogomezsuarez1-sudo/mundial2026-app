# CLAUDE.md — Reglas permanentes del proyecto

## Antes de cada commit

1. **Siempre ejecutar `npm run build` antes de hacer commit.**
   - Si el build falla, corregir todos los errores antes de continuar.
   - No hacer commit ni push con errores de compilación.

2. **Nunca hacer push si la app tiene errores.**
   - Build exitoso es condición obligatoria para cualquier push.
   - Las advertencias (warnings) son aceptables; los errores no.

3. **Verificar que la app no quede en pantalla en blanco después de cada cambio.**
   - Un `ReferenceError` o variable eliminada sin actualizar sus referencias causa pantalla blanca en React.
   - Antes de hacer push: buscar con `grep` cualquier variable eliminada que siga siendo referenciada.
   - Prestar especial atención a cambios que eliminan constantes globales (`AF_ON`, `AF_KEY`, etc.).

4. **Corregir errores antes de hacer push.**
   - Si un cambio introduce un bug en el flujo de login o navegación, arreglarlo en el mismo commit.

## Stack del proyecto

- **Frontend**: React 18 + Vite, todo en `src/App.jsx` (archivo único ~5000 líneas)
- **Backend**: Express en `server.cjs`, desplegado en Railway
- **DB**: Firebase Firestore + localStorage
- **Auth**: sistema propio con localStorage (`wc2026_users_db`)
- **API externa**: API-Football v3 — clave solo en el servidor (`process.env.AF_KEY`), nunca en el frontend
- **Deploy**: Railway (`railway.toml` → `node server.cjs`)

## Reglas de arquitectura

- La clave de API (`AF_KEY`) vive únicamente en variables de entorno del servidor. El frontend usa el proxy `/api/af/*`.
- Los datos en vivo (marcadores, clasificación, goleadores, fixtures) fluyen así:
  `API-Football → server.cjs (polling) → Firestore (colección 'live') → frontend (onSnapshot vía window._fbSubscribeLive)`
- `window._fbSubscribeLive` es la función para suscribirse a documentos en `live/`. Se expone en el bloque `import('./firebase.js').then(...)`.
- No exponer claves ni secrets en `src/` — todo lo que está en el frontend es público.

## Idioma

- Responder siempre en **español**.
