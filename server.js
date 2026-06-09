// ═══════════════════════════════════════════════════════════════
// Mundial FIFA 2026 — Backend Server
// Función: poll API-Football cada 60s → guarda en Firestore
// Todos los usuarios leen de Firestore (1 API call para todos)
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();
app.use(express.json());

// ── Config ──────────────────────────────────────────────────────
const AF_KEY     = process.env.AF_KEY || '4469df9c23e73da2c728be5b093c2464';
const AF_BASE    = 'https://v3.football.api-sports.io';
const WC_ID      = 1;
const WC_SEASON  = 2026;
const PORT       = process.env.PORT || 3000;

// ── Firebase Admin ───────────────────────────────────────────────
// Necesita variable de entorno FIREBASE_ADMIN_KEY en Railway
let db = null;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || '{}');
  if (serviceAccount.project_id) {
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
    console.log('✅ Firebase Admin conectado');
  } else {
    console.warn('⚠️ FIREBASE_ADMIN_KEY no configurado — sin sincronización Firestore');
  }
} catch(e) {
  console.warn('Firebase Admin error:', e.message);
}

// ── API-Football fetch helper ────────────────────────────────────
async function afFetch(endpoint) {
  const res = await fetch(`${AF_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': AF_KEY }
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  const json = await res.json();
  return json.response || [];
}

// ── Save to Firestore ────────────────────────────────────────────
async function saveToFirestore(collection, docId, data) {
  if (!db) return;
  try {
    await db.collection(collection).doc(docId).set({
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch(e) {
    console.warn('Firestore save error:', e.message);
  }
}

// ── Poll live matches ────────────────────────────────────────────
async function pollLiveMatches() {
  try {
    const data = await afFetch(`/fixtures?live=all&league=${WC_ID}`);
    const matches = data.map(f => ({
      id:     f.fixture.id,
      home:   f.teams.home.name,
      away:   f.teams.away.name,
      hs:     f.goals.home ?? 0,
      as:     f.goals.away ?? 0,
      min:    f.fixture.status.elapsed ?? 0,
      phase:  f.league.round,
      venue:  f.fixture.venue.name,
      events: [],
    }));
    await saveToFirestore('live', 'matches', { matches });
    console.log(`[${new Date().toLocaleTimeString()}] Live matches: ${matches.length} en curso`);
    return matches;
  } catch(e) {
    console.warn('pollLiveMatches error:', e.message);
    return [];
  }
}

// ── Poll standings ───────────────────────────────────────────────
async function pollStandings() {
  try {
    const data = await afFetch(`/standings?league=${WC_ID}&season=${WC_SEASON}`);
    if (!data[0]?.league?.standings) return;
    const groups = data[0].league.standings.map(group => ({
      name: group[0]?.group || 'Grupo',
      teams: group.map(t => ({
        n:   t.team.name,
        pj:  t.all.played,
        g:   t.all.win,
        e:   t.all.draw,
        p:   t.all.lose,
        gf:  t.all.goals.for,
        gc:  t.all.goals.against,
        pts: t.points,
      }))
    }));
    await saveToFirestore('live', 'standings', { groups });
    console.log(`[${new Date().toLocaleTimeString()}] Standings: ${groups.length} grupos actualizados`);
  } catch(e) {
    console.warn('pollStandings error:', e.message);
  }
}

// ── Poll top scorers ─────────────────────────────────────────────
async function pollScorers() {
  try {
    const data = await afFetch(`/players/topscorers?league=${WC_ID}&season=${WC_SEASON}`);
    const list = data.slice(0, 12).map(p => ({
      n:    p.player.name,
      team: p.statistics[0]?.team?.name || '',
      g:    p.statistics[0]?.goals?.total || 0,
      a:    p.statistics[0]?.goals?.assists || 0,
      wiki: null,
    }));
    await saveToFirestore('live', 'scorers', { list });
    console.log(`[${new Date().toLocaleTimeString()}] Scorers: top ${list.length} actualizados`);
  } catch(e) {
    console.warn('pollScorers error:', e.message);
  }
}

// ── Polling schedule ─────────────────────────────────────────────
const WC_START = new Date('2026-06-11');
const WC_END   = new Date('2026-07-20');

function startPolling() {
  const now = new Date();
  const isWCActive = now >= WC_START && now <= WC_END;

  if (isWCActive) {
    // Live matches: every 60 seconds
    pollLiveMatches();
    setInterval(pollLiveMatches, 60 * 1000);

    // Standings: every 5 minutes
    pollStandings();
    setInterval(pollStandings, 5 * 60 * 1000);

    // Top scorers: every 10 minutes
    pollScorers();
    setInterval(pollScorers, 10 * 60 * 1000);

    console.log('⚽ Mundial activo — polling iniciado');
  } else {
    // Before WC: update standings/scorers daily
    pollStandings();
    pollScorers();
    setInterval(()=>{ pollStandings(); pollScorers(); }, 6 * 60 * 60 * 1000); // 6 hours
    console.log(`⏳ Mundial inicia ${WC_START.toLocaleDateString()} — polling reducido`);
  }
}

// ── REST endpoints ────────────────────────────────────────────────
// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Mundial FIFA 2026 Backend',
    wcActive: new Date() >= WC_START && new Date() <= WC_END,
    time: new Date().toISOString()
  });
});

// Manual trigger (admin use)
app.post('/poll', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const [matches] = await Promise.all([
    pollLiveMatches(), pollStandings(), pollScorers()
  ]);
  res.json({ ok: true, liveMatches: matches.length });
});

// ── MercadoPago ───────────────────────────────────────────────────
app.post('/api/mp/create-preference', async (req, res) => {
 const { userId, userEmail, userName } = req.body;
const nameParts = (userName || '').trim().split(' ');
const firstName = nameParts[0] || '';
const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

  const appUrl = process.env.APP_URL || 'https://mundial2026-app-production.up.railway.app';

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpToken}`
      },
      body: JSON.stringify({
        items: [{
  title: 'Mundial 2026 — Paquete de 1,000 monedas',
  description: 'Acceso premium Mundial 2026 App - 1000 monedas para pronósticos',
  quantity: 1,
  unit_price: 30,
  currency_id: 'MXN'
        payer: { email: userEmail || 'usuario@mundial2026.app', first_name: firstName, last_name: lastName },
        back_urls: {
          success: `${appUrl}/api/mp/success?userId=${userId}`,
          failure: `${appUrl}/api/mp/failure?userId=${userId}`,
          pending: `${appUrl}/api/mp/pending?userId=${userId}`
        },
        auto_return: 'approved',
        external_reference: userId,
        statement_descriptor: 'MUNDIAL2026'
      })
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.warn('[MP] create-preference error:', err);
      return res.status(502).json({ error: 'Error MercadoPago', detail: err });
    }

    const data = await mpRes.json();
    res.json({ checkoutUrl: data.init_point, preferenceId: data.id });
  } catch(e) {
    console.warn('[MP] create-preference exception:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Verificar pago con MercadoPago y acreditar si está aprobado
app.post('/api/mp/verify', async (req, res) => {
  const { paymentId, userId } = req.body;
  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (!mpToken) return res.status(500).json({ ok: false, error: 'MP_ACCESS_TOKEN no configurado' });
  if (!paymentId || !userId) return res.status(400).json({ ok: false, error: 'paymentId y userId requeridos' });

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpToken}` }
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.warn('[MP] verify error:', err);
      return res.json({ ok: false, status: 'error', detail: err });
    }

    const payment = await mpRes.json();
    console.log('[MP] verify — status:', payment.status, 'userId:', userId);

    if (payment.status === 'approved') {
      // Acreditar en Firestore
      if (db) {
        try {
          const userRef = db.collection('users').doc(userId);
          const snap = await userRef.get();
          if (snap.exists) {
            const current = snap.data();
            const newPaquetes = (current.paquetes || 0) + 1;
            await userRef.set({
              paquetes: newPaquetes,
              lastPayment: new Date().toISOString(),
              lastPaymentId: paymentId,
              totalPagado: newPaquetes * 30
            }, { merge: true });
            console.log('[MP] paquetes acreditados:', newPaquetes, '→ userId:', userId);
          }
        } catch(e) {
          console.warn('[MP] error acreditando en Firestore:', e.message);
        }
      }
      return res.json({ ok: true, status: 'approved', paymentId });
    }

    res.json({ ok: false, status: payment.status });
  } catch(e) {
    console.warn('[MP] verify exception:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});


app.get('/api/mp/success', async (req, res) => {
  const { userId, payment_id, status } = req.query;
  console.log('[MP] success — userId:', userId, 'payment_id:', payment_id, 'status:', status);

  if (userId && db) {
    try {
      const userRef = db.collection('users').doc(userId);
      const snap = await userRef.get();
      if (snap.exists) {
        const current = snap.data();
        const newPaquetes = (current.paquetes || 0) + 1;
        await userRef.set({
          paquetes: newPaquetes,
          lastPayment: new Date().toISOString(),
          lastPaymentId: payment_id || null,
          totalPagado: newPaquetes * 30
        }, { merge: true });
        console.log('[MP] paquetes acreditados:', newPaquetes, '→ userId:', userId);
      }
    } catch(e) {
      console.warn('[MP] error acreditando pago:', e.message);
    }
  }

  const appUrl = process.env.APP_URL || 'https://mundial2026-app-production.up.railway.app';
  res.redirect(`${appUrl}?payment_status=success&collection_id=${payment_id || ''}&userId=${userId}`);
});

app.get('/api/mp/failure', (req, res) => {
  const appUrl = process.env.APP_URL || 'https://mundial2026-app-production.up.railway.app';
  res.redirect(`${appUrl}?pago=error`);
});

app.get('/api/mp/pending', (req, res) => {
  const appUrl = process.env.APP_URL || 'https://mundial2026-app-production.up.railway.app';
  res.redirect(`${appUrl}?pago=pendiente`);
});

// Serve the React app (static files from dist/)
const path = require('path');
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startPolling();
});
