# CLAUDE.md — Reglas permanentes del proyecto

## Reglas de modificación

1. **Modificar ÚNICAMENTE lo que se pide.** No tocar nada más.
   - Ningún refactor, limpieza ni mejora no solicitada.
   - Si algo colateral parece necesario, preguntar antes de hacerlo.

2. **Si un cambio puede afectar funcionalidad existente, avisar antes de modificarlo.**
   - Explicar qué puede romperse y esperar aprobación.

3. **Nunca hacer cambios en cascada sin aprobación explícita.**
   - Un cambio aprobado no autoriza cambios adicionales relacionados.

## Antes de cada commit

4. **Siempre ejecutar `npm run build` antes de hacer commit.**
   - Si el build falla, corregir todos los errores antes de continuar.
   - No hacer commit ni push con errores de compilación.

5. **Nunca hacer push si la app tiene errores.**
   - Build exitoso es condición obligatoria para cualquier push.
   - Las advertencias (warnings) son aceptables; los errores no.

6. **Verificar que la app no quede en pantalla en blanco después de cada cambio.**
   - Un `ReferenceError` o variable eliminada sin actualizar sus referencias causa pantalla blanca en React.
   - Antes de hacer push: buscar con `grep` cualquier variable eliminada que siga siendo referenciada.
   - Prestar especial atención a cambios que eliminan constantes globales (`AF_ON`, `AF_KEY`, etc.).
   - Si se usa `t.clave` en un componente, verificar que ese componente llame `useLang()`.

7. **Corregir errores antes de hacer push.**
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
  `API-Football → server.cjs (polling) → Firestore (colección 'live') → GET /api/live/<docId> → frontend (polling HTTP cada 60s vía window._fbSubscribeLive)`
- `window._fbSubscribeLive` (alias de `subscribeToLiveDoc`, `src/firebase.js` L444) NO usa onSnapshot: hace `fetch('/api/live/<docId>')` una vez al suscribirse y luego cada 60s con `setInterval`. Devuelve un unsubscribe que limpia el intervalo. Se expone en el bloque `import('./firebase.js').then(...)`.
- No exponer claves ni secrets en `src/` — todo lo que está en el frontend es público.

## Deploy

- **Ejecutar `railway up` automáticamente después de cada modificación** que amerite publicarse.
  - El hook en `settings.local.json` lo hace de forma automática al terminar cada respuesta con cambios.
  - No publicar si el build tiene errores (ver reglas 4–7 arriba).

## Contexto de conversación

- **Usar siempre contexto estándar** al iniciar una conversación — nunca el modo de 1M tokens.
  - El contexto grande es costoso e innecesario para este proyecto.
  - Si el archivo es muy largo, leer solo las secciones relevantes con `offset`/`limit`.

## Idioma

- Responder siempre en **español**.
