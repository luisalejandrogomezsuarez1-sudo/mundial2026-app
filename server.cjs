// Mundial FIFA 2026 — Backend Server (CommonJS)
const express    = require('express');
const path       = require('path');
const https      = require('https');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Config ──────────────────────────────────────────────
const AF_KEY      = process.env.AF_KEY      || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASS  = process.env.ADMIN_PASS  || '';
const AF_BASE   = 'v3.football.api-sports.io';
const WC_ID     = 1;
const WC_SEASON = 2026;

// ── Firebase Admin ──────────────────────────────────────
let db = null;
try{
  const admin = require('firebase-admin');
  const key   = JSON.parse(process.env.FIREBASE_ADMIN_KEY || '{}');
  if(key.project_id){
    admin.initializeApp({ credential: admin.credential.cert(key) });
    db = admin.firestore();
    console.log('✅ Firebase Admin OK — proyecto:', key.project_id);
  }
}catch(e){ console.warn('Firebase Admin error:', e.message); }

// ── API-Football fetch ──────────────────────────────────
function afFetch(endpoint){
  return new Promise((resolve,reject)=>{
    const options={
      hostname: AF_BASE,
      path: endpoint,
      headers: { 'x-apisports-key': AF_KEY }
    };
    https.get(options, res=>{
      let data='';
      res.on('data', c=>data+=c);
      res.on('end', ()=>{
        try{ resolve(JSON.parse(data).response||[]); }
        catch(e){ reject(e); }
      });
    }).on('error', reject);
  });
}

// ── Datos en vivo: whitelist de documentos y copia en memoria ────
// liveCache guarda la última versión de cada doc para servirla por HTTP
// (GET /api/live/:docId) sin que cada usuario abra un onSnapshot a Firestore.
const LIVE_DOCS    = ['matches','standings','scorers','fixtures','bracket','banner','livemanual'];
const ALWAYS_FRESH = ['banner','livemanual'];   // se leen de Firestore en cada request (editables a mano, sin polling)
const liveCache  = {};

// ── Save to Firestore ───────────────────────────────────
async function save(docId, data){
  const payload = { ...data, updatedAt: new Date().toISOString() };
  liveCache[docId] = payload;          // copia en memoria (ADEMÁS de Firestore)
  if(!db) return;
  try{
    await db.collection('live').doc(docId).set(payload);
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Firestore: live/${docId} updated`);
  }catch(e){ console.warn('Firestore save error:', e.message); }
}

// ── Polling functions ───────────────────────────────────
async function pollLive(){
  if(!AF_KEY){ console.log('⚠ AF_KEY not set'); return []; }
  try{
    const data = await afFetch(`/fixtures?live=all&league=${WC_ID}`);
    const matches = data.map(f=>({
      id:   f.fixture.id,
      home: f.teams.home.name,
      away: f.teams.away.name,
      hs:   f.goals.home??0,
      as:   f.goals.away??0,
      min:  f.fixture.status.elapsed??0,
      phase:f.league.round,
      venue:f.fixture.venue.name,
    }));
    await save('matches', { matches });
    console.log(`[${new Date().toLocaleTimeString()}] ⚽ ${matches.length} partidos en vivo`);
    return matches;
  }catch(e){ console.warn('pollLive error:', e.message); return []; }
}

async function pollStandings(){
  if(!AF_KEY) return;
  try{
    const data = await afFetch(`/standings?league=${WC_ID}&season=${WC_SEASON}`);
    if(!data[0]?.league?.standings) return;
    const groups = data[0].league.standings.map(g=>({
      name: g[0]?.group||'Grupo',
      teams: g.map(t=>({
        n:t.team.name, pj:t.all.played,
        g:t.all.win, e:t.all.draw, p:t.all.lose,
        gf:t.all.goals.for, gc:t.all.goals.against, pts:t.points
      }))
    }));
    await save('standings', { groups });
  }catch(e){ console.warn('pollStandings error:', e.message); }
}

async function pollScorers(){
  if(!AF_KEY) return;
  try{
    const data = await afFetch(`/players/topscorers?league=${WC_ID}&season=${WC_SEASON}`);
    const list = data.slice(0,12).map(p=>({
      n:   p.player.name,
      team:p.statistics[0]?.team?.name||'',
      g:   p.statistics[0]?.goals?.total||0,
      a:   p.statistics[0]?.goals?.assists||0,
    }));
    await save('scorers', { list });
  }catch(e){ console.warn('pollScorers error:', e.message); }
}

// ── Poll fixtures (horarios confirmados por FIFA) ────────
async function pollFixtures(){
  if(!AF_KEY) return;
  try{
    const data=await afFetch(`/fixtures?league=${WC_ID}&season=${WC_SEASON}`);
    if(!data||!data.length) return;
    const fixtures=data.map(f=>({
      id:      f.fixture.id,
      home:    f.teams.home.name,
      away:    f.teams.away.name,
      isoDate: (f.fixture.date||'').slice(0,10),
      date:    f.fixture.date
        ?new Date(f.fixture.date).toLocaleDateString('es',{day:'numeric',month:'short'})
        :'--',
      time:    f.fixture.date
        ?new Date(f.fixture.date).toLocaleTimeString('es',{
            hour:'2-digit',minute:'2-digit',timeZone:'America/Mexico_City'
          })
        :'--:--',
      phase:   f.league.round,
      venue:   f.fixture.venue.name,
      city:    f.fixture.venue.city,
      status:  f.fixture.status.short,
      hs:      f.goals.home??null,
      as:      f.goals.away??null,
    }));
    await save('fixtures',{fixtures});
    console.log(`[${new Date().toLocaleTimeString()}] 📅 ${fixtures.length} fixtures sincronizados`);
  }catch(e){ console.warn('pollFixtures error:',e.message); }
}

// ── Poll bracket (llave eliminatoria) ───────────────────
async function pollBracket(){
  if(!AF_KEY) return;
  try{
    const data=await afFetch(`/fixtures?league=${WC_ID}&season=${WC_SEASON}`);
    if(!data||!data.length) return;

    const toSlot=f=>({
      label: `${f.teams.home.name||'?'} vs ${f.teams.away.name||'?'}`,
      date:  f.fixture.date
        ?new Date(f.fixture.date).toLocaleDateString('es',{day:'numeric',month:'short'})
        :'--',
      venue: f.fixture.venue?.name||'',
      home:  f.teams.home.name||null,
      away:  f.teams.away.name||null,
      hs:    f.goals.home??null,
      as:    f.goals.away??null,
      winner:f.teams.home.winner?f.teams.home.name
             :f.teams.away.winner?f.teams.away.name
             :null,
    });

    const r32=[],r16=[],qf=[],sf=[];
    let tercero=null,final=null;

    for(const f of data){
      const r=(f.league.round||'').toLowerCase();
      if     (r.includes('round of 32'))  r32.push(toSlot(f));
      else if(r.includes('round of 16'))  r16.push(toSlot(f));
      else if(r.includes('quarter'))      qf.push(toSlot(f));
      else if(r.includes('semi'))         sf.push(toSlot(f));
      else if(r.includes('third')||r.includes('3rd')) tercero=toSlot(f);
      else if(r.includes('final')&&!r.includes('semi')&&!r.includes('quarter')
              &&!r.includes('third')&&!r.includes('3rd'))
        final=toSlot(f);
    }

    // No escribir si aún no hay partidos eliminatorios (fase de grupos activa)
    if(!r32.length&&!r16.length&&!qf.length&&!sf.length&&!tercero&&!final) return;

    await save('bracket',{r32,r16,qf,sf,tercero,final});
    console.log(`[${new Date().toLocaleTimeString()}] 🏆 Bracket actualizado`);
  }catch(e){console.warn('pollBracket error:',e.message);}
}

// ── Scheduling ──────────────────────────────────────────
const WC_START = new Date('2026-06-11');
const WC_END   = new Date('2026-07-20');
const isActive = ()=> new Date()>=WC_START && new Date()<=WC_END;

function startPolling(){
  pollFixtures(); // llamada inicial siempre
  if(isActive()){
    console.log('⚽ Mundial ACTIVO — polling cada 60s');
  // Plan Free 100 llamadas/dia: live×72 + resto×14 = 86/dia
pollLive();      setInterval(pollLive,      20*60000);    // cada 20min
pollStandings(); setInterval(pollStandings, 6*60*60000);  // cada 6h
pollScorers();   setInterval(pollScorers,   12*60*60000); // cada 12h
setInterval(pollFixtures, 6*60*60000);                    // cada 6h
pollBracket();   setInterval(pollBracket,   6*60*60000);  // cada 6h
  } else {
    console.log('⏳ Pre-Mundial — clasificación y fixtures cada 6h');
    pollStandings(); pollScorers();
    setInterval(()=>{ pollStandings(); pollScorers(); }, 6*60*60000);
    setInterval(pollFixtures, 6*60*60000); // cada 6h fuera del Mundial
  }
}

// ── Routes ──────────────────────────────────────────────
app.use(express.json());

app.get('/api/health', (req,res)=>{
  res.json({ status:'ok', firebase:!!db, wcActive:isActive(), afKey:!!AF_KEY, time:new Date().toISOString() });
});

// ── Proxy API-Football (clave solo en servidor) ─────────────────────────────
app.get('/api/af/*', async(req,res)=>{
  if(!AF_KEY) return res.status(503).json({error:'AF_KEY no configurada en el servidor'});
  try{
    const path='/'+req.params[0];
    const qs=Object.keys(req.query).length?'?'+new URLSearchParams(req.query).toString():'';
    const data=await afFetch(path+qs);
    res.json({response:data||[]});
  }catch(e){ res.status(500).json({error:e.message}); }
});

// ── GRUPOS ────────────────────────────────────────────────────────────────
const fs = require('fs');
const GROUPS_FILE = '/tmp/wc2026_groups.json';

// Load groups from /tmp file at startup
let serverGroups = {};
try {
  serverGroups = JSON.parse(fs.readFileSync(GROUPS_FILE,'utf8'));
  console.log(`📂 ${Object.keys(serverGroups).length} grupos cargados desde /tmp`);
} catch(e) { serverGroups = {}; }

// Restore groups from Firestore on startup (in case /tmp was cleared on restart)
async function restoreGroupsFromFirestore(){
  if(!db) return;
  try{
    const snap = await db.collection('groups').get();
    let restored = 0;
    snap.docs.forEach(d=>{
      const g = d.data();
      const mem = serverGroups[g.code];
      // Restaurar si NO está en memoria, o si solo hay un stub de chat (sin members)
      if(g.code && (!mem || !Array.isArray(mem.members))){
        if(mem?._msgs) g._msgs = mem._msgs;   // preservar cache de mensajes del stub
        serverGroups[g.code] = g;
        restored++;
      }
    });
    if(restored>0){
      persistGroups();
      console.log(`♻️  ${restored} grupos restaurados desde Firestore`);
    }
  }catch(e){ console.warn('restoreGroups error:', e.message); }
}
// Run after Firebase Admin is initialized (slight delay to ensure db is ready)
setTimeout(restoreGroupsFromFirestore, 3000);

function persistGroups() {
  try { fs.writeFileSync(GROUPS_FILE, JSON.stringify(serverGroups)); }
  catch(e) { console.warn('persistGroups error:', e.message); }
}

// Also save to Firestore as backup (if available)
async function backupGroupToFirestore(g) {
  if(!db || !g?.code) return false;   // sin code no se puede respaldar (evita .doc(undefined))
  try {
    // merge:true → NUNCA borra campos que no vengan en el payload (p. ej. members).
    await db.collection('groups').doc(g.code).set({
      ...g, createdAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch(e) { console.warn('Group Firestore backup error:', e.message); return false; }
}

app.post('/api/groups', (req,res)=>{
  const g = req.body;
  if(!g?.code) return res.status(400).json({error:'Falta code'});
  // Save in memory + file immediately (no async, always works)
  serverGroups[g.code] = {
    id:        g.id        || 'g_unknown',
    name:      g.name      || 'Grupo',
    desc:      g.desc      || '',
    code:      g.code,
    created:   g.created   || Date.now(),
    members:   (g.members  || []).map(m=>({
      id:     m.id     || 'anon',
      name:   m.name   || 'Usuario',
      ini:    m.ini    || 'U',
      joined: m.joined || Date.now(),
    })),
    ownerId:   g.ownerId   || '',
    savedAt:   Date.now(),
  };
  persistGroups();
  backupGroupToFirestore(serverGroups[g.code]); // async backup, don't wait
  console.log('✅ Grupo guardado:', g.code);
  res.json({ok:true, code:g.code}); // respond immediately
});

// Caché negativo: códigos confirmados inexistentes (evita hits innecesarios a Firestore)
const notFoundCache = new Set();
const NOT_FOUND_TTL = 5 * 60 * 1000; // 5 min

// ── Grupos donde el usuario es miembro (fallback del cliente al guardar bets) ─
// DEBE ir ANTES de /api/groups/:code o ":code" capturaría "user".
app.get('/api/groups/user/:uid', async(req,res)=>{
  const uid = req.params.uid;
  if(!uid) return res.status(400).json({error:'Falta uid'});
  const found = {};
  // 1. En memoria
  for(const code of Object.keys(serverGroups)){
    const g = serverGroups[code];
    if(g?.code && Array.isArray(g.members) && g.members.some(m=>m.id===uid)) found[g.code]=g;
  }
  // 2. Firestore (cubre grupos no cargados en memoria)
  if(db){
    try{
      const snap = await db.collection('groups').get();
      snap.docs.forEach(d=>{
        const g = d.data();
        if(g?.code && !found[g.code] && Array.isArray(g.members) && g.members.some(m=>m.id===uid))
          found[g.code] = g;
      });
    }catch(e){ console.warn('groups/user error:', e.message); }
  }
  const groups = Object.values(found).map(g=>({ id:g.id, code:g.code, name:g.name }));
  res.json({ ok:true, groups });
});

app.get('/api/groups/:code', async(req,res)=>{
  const code = (req.params.code||'').toUpperCase().trim();
  if(!code) return res.status(400).json({error:'Falta code'});

  // 1. En memoria Y COMPLETO (no un stub de chat sin members) → respuesta inmediata
  if(serverGroups[code] && Array.isArray(serverGroups[code].members))
    return res.json({found:true, group:serverGroups[code]});

  // 2. Ya confirmado inexistente → respuesta inmediata sin tocar Firestore
  if(notFoundCache.has(code))
    return res.json({found:false});

  // 3. Buscar en Firestore con timeout de 3s
  if(db){
    try{
      const snap = await Promise.race([
        db.collection('groups').doc(code).get(),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),3000)),
      ]);
      if(snap.exists){
        const g = snap.data();
        if(serverGroups[code]?._msgs) g._msgs = serverGroups[code]._msgs; // preservar mensajes del stub
        serverGroups[code] = g;
        return res.json({found:true, group:g});
      }
    }catch(e){ /* timeout o error → caer a not found */ }
  }

  // Cachear como inexistente para evitar repetir la consulta
  notFoundCache.add(code);
  setTimeout(()=>notFoundCache.delete(code), NOT_FOUND_TTL);
  res.json({found:false});
});

// ── Agregar miembro a grupo ──────────────────────────────────────────────────
app.post('/api/groups/:code/members', (req,res)=>{
  const code = (req.params.code||'').toUpperCase().trim();
  const member = req.body;
  if(!code || !member?.id) return res.status(400).json({error:'Faltan datos'});
  if(!serverGroups[code]) return res.status(404).json({error:'Grupo no encontrado'});

  const g = serverGroups[code];
  // Evitar duplicados
  const exists = (g.members||[]).find(m=>m.id===member.id);
  if(!exists){
    g.members = [...(g.members||[]), {
      id:     member.id,
      name:   member.name   || 'Usuario',
      ini:    member.ini    || 'U',
      col:    member.col    || '#4F8EF7',
      joined: Date.now(),
      pts:    0,
      locked: false,
    }];
    persistGroups();
    backupGroupToFirestore(g);
    console.log(`👤 ${member.name} se unió a ${code}`);
  }
  res.json({ok:true, group:g});
});

// ── Bloquear pronósticos de un miembro (persistir bets) ──────────────────────
// Paso 1 del ranking: guarda en el servidor (memoria + archivo + Firestore) los
// pronósticos que el usuario bloquea, para que el resto del grupo pueda verlos.
// NO calcula puntos (eso es otro paso): solo persiste bets + locked + lockedAt.
app.post('/api/groups/:code/lock', async (req,res)=>{
  const code = (req.params.code||'').toUpperCase().trim();
  const { id, name, ini, col, bets, lockedAt } = req.body || {};
  if(!code || !id) return res.status(400).json({error:'Faltan datos'});
  // Rehidratar el grupo real desde Firestore si no está en memoria o solo hay un
  // stub de chat (sin members). Evita 404 por /tmp efímero y evita escribir los
  // bets en un stub que luego no se puede respaldar.
  if(!serverGroups[code] || !Array.isArray(serverGroups[code].members)){
    if(db){
      try{
        const snap = await db.collection('groups').doc(code).get();
        if(snap.exists){
          const g0 = snap.data();
          if(serverGroups[code]?._msgs) g0._msgs = serverGroups[code]._msgs;
          serverGroups[code] = g0;
        }
      }catch(e){}
    }
  }
  if(!serverGroups[code]) return res.status(404).json({error:'Grupo no encontrado'});

  const g = serverGroups[code];
  const lockData = {
    bets:     Array.isArray(bets) ? bets : [],
    locked:   true,
    lockedAt: lockedAt || Date.now(),
  };
  const idx = (g.members||[]).findIndex(m=>m.id===id);
  if(idx>=0){
    g.members[idx] = { ...g.members[idx], ...lockData };
  } else {
    // El usuario podría bloquear sin haberse registrado antes como miembro
    g.members = [...(g.members||[]), {
      id, name: name||'Usuario', ini: ini||'U', col: col||'#4F8EF7',
      joined: Date.now(), pts: 0, ...lockData,
    }];
  }
  persistGroups();
  const backupOk = await backupGroupToFirestore(g);
  console.log(`🔒 ${id} bloqueó ${lockData.bets.length} pronósticos en ${code}`);
  res.json({ok:true, group:g, backup:backupOk});
});

// ── Limpieza de mensajes: solo cuando supera el límite, no en cada mensaje ───
const MSG_LIMIT = 50;
// Contador por grupo: cuántos mensajes se han acumulado desde la última limpieza
const msgCounter = {};

async function cleanupMessages(code){
  if(!db) return;
  try{
    const snap = await db.collection('groups').doc(code)
      .collection('messages').orderBy('ts','asc').get();
    if(snap.size > MSG_LIMIT){
      const toDelete = snap.docs.slice(0, snap.size - MSG_LIMIT);
      const batch = db.batch();
      toDelete.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`🧹 ${code}: ${toDelete.length} mensajes eliminados, ${MSG_LIMIT} conservados`);
    }
    msgCounter[code] = 0; // reset contador tras limpiar
  }catch(e){ /* silent */ }
}

// Limpieza solo cuando el contador supera el límite (no en cada mensaje)
function maybeCleanup(code){
  msgCounter[code] = (msgCounter[code]||0) + 1;
  // Solo limpiar cuando acumulamos más mensajes que el límite (aprox cada 50 mensajes)
  if(msgCounter[code] >= MSG_LIMIT) cleanupMessages(code);
}

// Limpieza global cada hora — respaldo por si el servidor se reinicia con grupos viejos
async function cleanupAllGroups(){
  if(!db) return;
  try{
    const snap = await db.collection('groups').get();
    for(const g of snap.docs) await cleanupMessages(g.id);
  }catch(e){ console.warn('cleanupAllGroups error:', e.message); }
}
setInterval(cleanupAllGroups, 60*60*1000); // cada hora
setTimeout(cleanupAllGroups, 10000);       // al arrancar (+10s)

// ── CHAT API — Firebase Admin for persistence + scalability ────
app.post('/api/chat/:code', async(req,res)=>{
  const code = req.params.code.toUpperCase();
  const {id, uid, name, text, ts} = req.body||{};
  if(!text?.trim()) return res.status(400).json({error:'Empty message'});

  const msg = {
    id:   id   || 'cm_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
    uid:  uid  || 'anon',
    name: name || 'Usuario',
    ini:  (name||'?')[0].toUpperCase(),
    text: text.trim(),
    ts:   ts   || Date.now(),
  };

  if(db){
    try{
      await db.collection('groups').doc(code)
              .collection('messages').add({...msg, timestamp: new Date()});
      // Solo limpia cada ~50 mensajes (no en cada mensaje)
      maybeCleanup(code);
    }catch(e){ console.warn('chat save FB error:', e.message); }
  }

  // Cache en memoria: máx 50. Antes de tocar el grupo, asegurarlo desde Firestore
  // para NO crear un stub sin members (que envenenaba GET/restore/backup).
  if(!serverGroups[code] && db){
    try{
      const gsnap = await db.collection('groups').doc(code).get();
      if(gsnap.exists) serverGroups[code] = gsnap.data();
    }catch(e){}
  }
  if(!serverGroups[code]) serverGroups[code] = { code }; // stub mínimo PERO con code
  if(!serverGroups[code]._msgs) serverGroups[code]._msgs = [];
  serverGroups[code]._msgs.push(msg);
  if(serverGroups[code]._msgs.length > MSG_LIMIT)
    serverGroups[code]._msgs = serverGroups[code]._msgs.slice(-MSG_LIMIT);

  res.json({ok:true, msg});
});

app.get('/api/chat/:code', async(req,res)=>{
  const code  = req.params.code.toUpperCase();
  const since = parseInt(req.query.since)||0;

  // Usar caché en memoria primero (O(1), no toca Firestore)
  const cached = (serverGroups[code]?._msgs)||[];
  if(cached.length > 0){
    const filtered = since>0 ? cached.filter(m=>m.ts>since) : cached;
    return res.json({ok:true, msgs:filtered, source:'cache'});
  }

  // Fallback Firestore solo si no hay caché (primera carga del grupo en este servidor)
  if(db){
    try{
      let q = db.collection('groups').doc(code)
                .collection('messages')
                .orderBy('ts','asc').limit(MSG_LIMIT);
      if(since>0) q = q.where('ts','>',since);
      const snap = await q.get();
      const msgs = snap.docs.map(d=>d.data());
      // Poblar caché
      if(!serverGroups[code]) serverGroups[code]={};
      serverGroups[code]._msgs = msgs;
      return res.json({ok:true, msgs, source:'firestore'});
    }catch(e){
      return res.json({ok:true, msgs:[], source:'error'});
    }
  }
  res.json({ok:true, msgs:[], source:'empty'});
});

// ── DELETE GROUP ─────────────────────────────────────────────────
app.delete('/api/groups/:code', async(req,res)=>{
  const code = req.params.code.toUpperCase();
  if(!code) return res.status(400).json({error:'Falta code'});

  // Delete from memory + file
  delete serverGroups[code];
  persistGroups();

  // Delete from Firestore
  if(db){
    try{
      await db.collection('groups').doc(code).delete();
      // Also delete messages subcollection
      const msgsSnap = await db.collection('groups').doc(code)
                                .collection('messages').get();
      const batch = db.batch();
      msgsSnap.docs.forEach(d => batch.delete(d.ref));
      if(msgsSnap.docs.length > 0) await batch.commit();
    }catch(e){ console.warn('delete group FB error:', e.message); }
  }

  console.log('🗑 Grupo eliminado:', code);
  res.json({ok:true});
});

// ── ADMIN AUTH — valida credenciales sin exponerlas al frontend ──────────────
app.post('/api/admin/auth', (req,res)=>{
  const { email, pass } = req.body || {};
  if(!ADMIN_EMAIL || !ADMIN_PASS)
    return res.status(503).json({ ok:false, reason:'not_configured' });
  const ok = email === ADMIN_EMAIL && pass === ADMIN_PASS;
  res.json({ ok });
});

// ── ADMIN: listar y borrar grupos por nombre (protegido con clave) ──────────
const ADMIN_KEY = process.env.ADMIN_KEY || '';

app.get('/api/admin/groups', (req,res)=>{
  if(!ADMIN_KEY || req.query.key !== ADMIN_KEY) return res.status(403).json({error:'Forbidden'});
  const list = Object.values(serverGroups).map(g=>({
    code:    g.code,
    name:    g.name,
    owner:   g.ownerId||'',
    members: (g.members||[]).length,
    savedAt: g.savedAt,
  }));
  res.json({total:list.length, groups:list});
});

app.delete('/api/admin/groups/by-name/:name', async(req,res)=>{
  if(!ADMIN_KEY || req.query.key !== ADMIN_KEY) return res.status(403).json({error:'Forbidden'});
  const name = decodeURIComponent(req.params.name).toLowerCase().trim();
  const matches = Object.values(serverGroups).filter(g=>(g.name||'').toLowerCase()===name);
  if(!matches.length) return res.json({ok:false, msg:'No encontrado'});
  let deleted = 0;
  for(const g of matches){
    delete serverGroups[g.code];
    persistGroups();
    if(db){
      try{
        await db.collection('groups').doc(g.code).delete();
        const snap = await db.collection('groups').doc(g.code).collection('messages').get();
        const batch = db.batch();
        snap.docs.forEach(d=>batch.delete(d.ref));
        if(snap.docs.length) await batch.commit();
      }catch(e){ console.warn('admin delete FB error:',e.message); }
    }
    console.log(`🗑 [ADMIN] Grupo eliminado: ${g.name} (${g.code})`);
    deleted++;
  }
  res.json({ok:true, deleted, names:matches.map(g=>g.name)});
});

// ── WELCOME EMAIL — Brevo REST API ─────────────────────────────────────────
const BREVO_KEY    = process.env.BREVO_API_KEY || '';
const APP_URL      = process.env.APP_URL        || 'https://mundial2026-app.up.railway.app';
const EMAIL_FROM   = process.env.EMAIL_FROM     || 'noreply@mundial2026.app';
const EMAIL_NAME   = 'Mundial 2026';

app.post('/api/welcome-email', async(req,res)=>{
  const { email, name } = req.body || {};
  if(!email) return res.status(400).json({ok:false, error:'Falta email'});
  if(!BREVO_KEY){
    console.warn('⚠ BREVO_API_KEY no configurada — email no enviado');
    return res.json({ok:false, error:'Email no configurado'});
  }
  const displayName = (name||'').split(' ')[0] || 'futbolero';
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bienvenido a Mundial 2026</title>
<style>
  body{margin:0;padding:0;background:#0A1628;font-family:'Segoe UI',Arial,sans-serif;color:#fff}
  .wrap{max-width:560px;margin:0 auto;padding:32px 16px}
  .logo{text-align:center;font-size:28px;font-weight:900;letter-spacing:3px;color:#FFD700;margin-bottom:4px}
  .sub{text-align:center;font-size:12px;color:#8899AA;letter-spacing:2px;margin-bottom:32px}
  .card{background:#0D2040;border-radius:16px;padding:32px;border:1px solid #1B3A60}
  h1{font-size:22px;margin:0 0 8px;color:#fff}
  p{font-size:15px;line-height:1.6;color:#C8D8E8;margin:12px 0}
  .divider{border:none;border-top:1px solid #1B3A60;margin:24px 0}
  .benefits-title{font-size:13px;font-weight:700;color:#FFD700;letter-spacing:1px;margin-bottom:12px;text-transform:uppercase}
  .benefit{display:flex;align-items:flex-start;gap:10px;margin:10px 0;font-size:14px;color:#C8D8E8}
  .benefit-icon{font-size:18px;flex-shrink:0;margin-top:1px}
  .price-box{background:#0A2240;border:2px solid #FFD700;border-radius:12px;padding:16px 20px;margin:20px 0;text-align:center}
  .price{font-size:32px;font-weight:900;color:#FFD700;line-height:1}
  .price-label{font-size:12px;color:#8899AA;margin-top:4px}
  .cta{display:block;background:#FFD700;color:#000;text-decoration:none;font-weight:900;font-size:15px;letter-spacing:1px;text-align:center;padding:14px 24px;border-radius:10px;margin-top:24px}
  .footer{text-align:center;font-size:11px;color:#445566;margin-top:24px;line-height:1.6}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo">⚽ MUNDIAL 2026</div>
  <div class="sub">MUNDIAL DE FÚTBOL · USA · MÉXICO · CANADÁ</div>
  <div class="card">
    <h1>¡Bienvenido, ${displayName}! 🎉</h1>
    <p>Gracias por unirte a <strong>Mundial 2026</strong>, la app para vivir el torneo más grande del mundo en tiempo real.</p>
    <p>Tu cuenta ya está activa. Puedes seguir los partidos en vivo, consultar la tabla de posiciones, ver los máximos goleadores y mucho más — completamente gratis.</p>
    <hr class="divider">
    <div class="benefits-title">Desbloquea la experiencia completa</div>
    <div class="benefit"><span class="benefit-icon">🔮</span><span><strong>Pronósticos premium</strong> — Predice resultados antes de cada partido y compite con otros usuarios.</span></div>
    <div class="benefit"><span class="benefit-icon">💬</span><span><strong>Grupos privados de chat</strong> — Crea o únete a grupos exclusivos para ver el Mundial con tus amigos.</span></div>
    <div class="benefit"><span class="benefit-icon">🏆</span><span><strong>Tabla de líderes</strong> — Sube posiciones según la precisión de tus pronósticos.</span></div>
    <div class="price-box">
      <div class="price">$20 MXN</div>
      <div class="price-label">pago único · acceso completo todo el torneo</div>
    </div>
    <a href="${APP_URL}" class="cta">ABRIR LA APP →</a>
  </div>
  <div class="footer">
    Recibiste este correo porque te registraste en Mundial 2026.<br>
    Si no fuiste tú, puedes ignorar este mensaje.
  </div>
</div>
</body>
</html>`;

  try{
    const r = await fetch('https://api.brevo.com/v3/smtp/email',{
      method:'POST',
      headers:{
        'api-key': BREVO_KEY,
        'Content-Type':'application/json',
        'Accept':'application/json',
      },
      body: JSON.stringify({
        sender:  { name: EMAIL_NAME, email: EMAIL_FROM },
        to:      [{ email, name: name||'' }],
        subject: '⚽ ¡Bienvenido a Mundial 2026!',
        htmlContent: html,
      }),
    });
    if(r.ok){
      console.log(`📧 Bienvenida enviada a ${email}`);
      res.json({ok:true});
    }else{
      const err = await r.text();
      console.warn(`⚠ Brevo error ${r.status}:`, err);
      res.json({ok:false, error:`Brevo ${r.status}`});
    }
  }catch(e){
    console.warn('welcome-email error:', e.message);
    res.json({ok:false, error:e.message});
  }
});


// ── Limpiar documentos duplicados para un email (Admin) ──────────────────────
app.post('/api/admin/cleanup-user-email', async (req, res) => {
  if (!ADMIN_KEY || req.body.key !== ADMIN_KEY)
    return res.status(403).json({ error: 'Forbidden' });
  const { email, keepId } = req.body;
  if (!email || !keepId || !db)
    return res.status(400).json({ error: 'Faltan email, keepId o DB no disponible' });
  try {
    const snap = await db.collection('users').where('email', '==', email).get();
    const toDelete = snap.docs.filter(d => d.id !== keepId);
    if (toDelete.length > 0) {
      const batch = db.batch();
      toDelete.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`[cleanup-user-email] email=${email} kept=${keepId} deleted=${toDelete.length}`);
    res.json({ ok: true, total: snap.docs.length, deleted: toDelete.length, kept: keepId,
               deletedIds: toDelete.map(d => d.id) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Limpiar TODOS los duplicados en la colección users ───────────────────────
// Readiness: confirma que esta versión (auth-aware + dryRun) está desplegada,
// para llamar al cleanup con seguridad (la versión vieja ignoraba dryRun).
app.get('/api/admin/cleanup-duplicates-ready', (req,res)=>{
  res.json({ ready:true, version:'auth-aware-dryrun-v1' });
});

app.post('/api/admin/cleanup-all-duplicates', async (req, res) => {
  if (!ADMIN_KEY || req.body.key !== ADMIN_KEY)
    return res.status(403).json({ error: 'Forbidden' });
  if (!db) return res.status(503).json({ error: 'DB no disponible' });
  const dryRun = req.body.dryRun === true;
  try {
    const snap = await db.collection('users').get();
    const all = snap.docs.map(d => ({ _id: d.id, _ref: d.ref, ...d.data() }));

    // Agrupar por email
    const byEmail = {};
    for (const u of all) {
      const key = (u.email || '').toLowerCase().trim();
      if (!key) continue;
      (byEmail[key] = byEmail[key] || []).push(u);
    }

    // Doc de Auth = id NO empieza con "u_" (uid de Firebase). Legacy = empieza con "u_".
    const isAuth = d => !String(d._id).startsWith('u_');
    const scoreDoc = d => (Number(d.paquetes)>0 ? 1000 : 0)
                        + (d.gifted ? 100 : 0)
                        + (Number(d.giftedCoins)>0 ? 50 : 0)
                        + (d.updatedAt ? Math.min(10, (new Date(d.updatedAt) - new Date('2024-01-01')) / 1e10) : 0);

    const summary = [];
    const batch = db.batch();
    let totalDeleted = 0;
    let totalConsolidated = 0;

    for (const [email, docs] of Object.entries(byEmail)) {
      if (docs.length <= 1) continue;

      // 1. Si existe doc de Auth → conservarlo SIEMPRE (si hay varios, el de mejor score).
      //    Si no hay → criterio actual (paquetes > regalo > reciente).
      const authDocs = docs.filter(isAuth);
      const pool = authDocs.length ? authDocs : docs;
      const keep = pool.slice().sort((a,b)=>scoreDoc(b)-scoreDoc(a))[0];
      const toDelete = docs.filter(d => d._id !== keep._id);

      // 2. Consolidar al conservado ANTES de borrar: paquetes = MAX; gifted/giftedCoins
      //    si algún doc los tiene y el conservado no.
      const maxPaquetes    = Math.max(0, ...docs.map(d => Number(d.paquetes)||0));
      const giftedAny      = docs.some(d => d.gifted);
      const giftedCoinsMax = Math.max(0, ...docs.map(d => Number(d.giftedCoins)||0));
      const consolidate = {};
      if (maxPaquetes > (Number(keep.paquetes)||0)) consolidate.paquetes = maxPaquetes;
      if (giftedAny && !keep.gifted) {
        consolidate.gifted = true;
        if (giftedCoinsMax > 0 && !(Number(keep.giftedCoins)>0)) consolidate.giftedCoins = giftedCoinsMax;
      }
      const willConsolidate = Object.keys(consolidate).length > 0;

      if (!dryRun) {
        if (willConsolidate) { batch.set(keep._ref, consolidate, { merge: true }); totalConsolidated++; }
        toDelete.forEach(d => batch.delete(d._ref));
      } else if (willConsolidate) {
        totalConsolidated++;
      }
      totalDeleted += toDelete.length;

      summary.push({
        email,
        total: docs.length,
        kept: keep._id,
        kept_is_auth: isAuth(keep),
        kept_paquetes_before: Number(keep.paquetes)||0,
        consolidate: willConsolidate ? consolidate : null,
        deleted: toDelete.map(d => ({ id: d._id, is_auth: isAuth(d), paquetes: Number(d.paquetes)||0, gifted: !!d.gifted }))
      });
    }

    if (!dryRun && totalDeleted + totalConsolidated > 0) await batch.commit();

    console.log(`[cleanup-all-duplicates]${dryRun?' DRYRUN':''} ${summary.length} emails dup · ${totalDeleted} a borrar · ${totalConsolidated} consolidados`);
    res.json({ ok: true, dryRun, version:'auth-aware-dryrun-v1', duplicateEmails: summary.length, totalDeleted, totalConsolidated, summary });
  } catch(e) {
    console.error('[cleanup-all-duplicates] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── MercadoPago Checkout Pro ─────────────────────────────────────────────────
app.post('/api/mp/create-preference', async (req, res) => {
  const { userId, userEmail, userName } = req.body;
  const nameParts = (userName || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
  try {
    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [{ title: 'Paquete 1000 monedas', quantity: 1, unit_price: 30, currency_id: 'MXN', description: 'Acceso premium Mundial 2026 App - 1000 monedas para pronósticos' }],
        payer: { email: userEmail, first_name: firstName, last_name: lastName },
        external_reference: userId,
        back_urls: {
          success: `${process.env.APP_URL}/?payment_status=success`,
          failure: `${process.env.APP_URL}/?payment_status=failure`,
          pending: `${process.env.APP_URL}/?payment_status=pending`
        },
        auto_return: 'approved',
        notification_url: `${process.env.APP_URL}/api/mp/webhook`
      }
    });
    res.json({ checkoutUrl: result.init_point });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
 

// Diagnóstico: ver datos de un pago en MP y Firestore (protegido con ADMIN_KEY)
app.get('/api/admin/mp-payment/:id', async (req, res) => {
  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY)
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const payment = new Payment(mpClient);
    const data = await payment.get({ id: Number(req.params.id) });
    let fsPayment = null, fsUser = null;
    if (db) {
      const pdoc = await db.collection('payments').doc(String(req.params.id)).get();
      fsPayment = pdoc.exists ? pdoc.data() : null;
      if (data.external_reference) {
        const udoc = await db.collection('users').doc(data.external_reference).get();
        fsUser = udoc.exists ? udoc.data() : null;
      }
    }
    res.json({
      mp: {
        id: data.id, status: data.status, amount: data.transaction_amount,
        external_reference: data.external_reference, email: data.payer?.email,
        date: data.date_approved
      },
      firestore: { payment: fsPayment, user_paquetes: fsUser?.paquetes ?? 'doc no existe' }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Acreditar manualmente un pago aprobado (protegido con ADMIN_KEY)
app.post('/api/admin/mp-credit', async (req, res) => {
  if (!ADMIN_KEY || req.body.key !== ADMIN_KEY)
    return res.status(403).json({ error: 'Forbidden' });
  const { paymentId, userId } = req.body;
  if (!paymentId || !userId || !db)
    return res.status(400).json({ error: 'Faltan datos o DB no disponible' });
  try {
    const paid = await db.collection('payments').doc(String(paymentId)).get();
    if (paid.exists) return res.json({ ok: true, msg: 'Ya estaba acreditado', data: paid.data() });
    const admin = require('firebase-admin');
    await db.collection('users').doc(userId).set(
      { paquetes: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    );
    await db.collection('payments').doc(String(paymentId)).set({
      userId, creditedAt: new Date().toISOString(), manual: true
    });
    console.log(`[MP admin-credit] ✅ acreditado manualmente: paymentId=${paymentId} userId=${userId}`);
    res.json({ ok: true, msg: 'Acreditado correctamente' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/mp/verify', async (req, res) => {
  const { paymentId, userId } = req.body;
  console.log(`[MP verify] paymentId=${paymentId} (type:${typeof paymentId}) userId=${userId}`);
  if (!db) return res.status(503).json({ error: 'DB no disponible' });
  if (!paymentId || paymentId === '{{payment_id}}') {
    console.error('[MP verify] paymentId inválido:', paymentId);
    return res.status(400).json({ error: 'paymentId inválido' });
  }
  try {
    const paid = await db.collection('payments').doc(String(paymentId)).get();
    if (paid.exists) {
      console.log('[MP verify] ya acreditado:', paymentId);
      return res.json({ ok: true, alreadyCredited: true });
    }
    const payment = new Payment(mpClient);
    // Pasar como número — el SDK de MP v3 requiere número, no string
    const data = await payment.get({ id: Number(paymentId) });
    const extRef = String(data.external_reference || '').trim();
    const userIdStr = String(userId || '').trim();
    console.log(`[MP verify] estado=${data.status} ext_ref="${extRef}" userId="${userIdStr}" match=${extRef===userIdStr}`);
    if (data.status === 'approved' && extRef === userIdStr) {
      const admin = require('firebase-admin');
      await db.collection('users').doc(userId).set(
        { paquetes: admin.firestore.FieldValue.increment(1) },
        { merge: true }
      );
      await db.collection('payments').doc(String(paymentId)).set({
        userId, creditedAt: new Date().toISOString(), amount: data.transaction_amount
      });
      console.log(`[MP verify] ✅ acreditado: paymentId=${paymentId} userId=${userId}`);
      res.json({ ok: true });
    } else {
      console.warn(`[MP verify] ❌ no acreditado: status="${data.status}" ext_ref="${extRef}" userId="${userIdStr}"`);
      res.json({ ok: false, status: data.status, ext_ref: extRef, userId: userIdStr });
    }
  } catch (e) {
    console.error('[MP verify] error:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/mp/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const { type, data } = req.body;
    if (type === 'payment' && data?.id) {
      const payment = new Payment(mpClient);
      const info = await payment.get({ id: data.id });
      if (info.status === 'approved' && db) {
        const userId = info.external_reference;
        const paid = await db.collection('payments').doc(String(data.id)).get();
        if (!paid.exists) {
          const admin = require('firebase-admin');
          await db.collection('users').doc(userId).set(
            { paquetes: admin.firestore.FieldValue.increment(1) },
            { merge: true }
          );
          await db.collection('payments').doc(String(data.id)).set({
            userId, creditedAt: new Date().toISOString()
          });
          console.log(`[MP webhook] ✅ acreditado: paymentId=${data.id} userId=${userId}`);
        }
      }
    }
  } catch (e) {
    console.error('Webhook error:', e.message);
  }
});

// ── MOTOR DE PUNTOS (Paso 2) ─────────────────────────────
// El admin sube los RESULTADOS reales y este endpoint recalcula los puntos
// de TODOS los usuarios. Fórmula: puntosBase[categoria] × cuota(odds del bet),
// redondeado a 1 decimal, sumando solo los bets ACERTADOS.
//
// Puntos base por categoría (id del bet):
//   <match>-1x2   = 3   |  <match>-btts = 2
//   grp-<X>       = 5   |  campeon      = 20
//   bota-oro      = 15  |  balon-oro    = 12
//   goleador-1    = 15  |  goleador-2   = 4   |  goleador-3 = 5
//
// Body: { key, results, dryRun }
//   results = { "<betId>": "<seleccionGanadora>", ... }
//   (ej: { "42-1x2":"Local", "42-btts":"Sí", "campeon":"España", "grp-A":"México" })
function basePointsFor(betId){
  if(!betId) return 0;
  if(betId.endsWith('-1x2'))  return 3;
  if(betId.endsWith('-btts')) return 2;
  if(betId.startsWith('grp-')) return 5;
  if(betId==='campeon')   return 20;
  if(betId==='bota-oro')  return 15;
  if(betId==='balon-oro') return 12;
  if(betId==='goleador-1') return 15;
  if(betId==='goleador-2') return 4;
  if(betId==='goleador-3') return 5;
  return 0;
}
function norm(s){ return String(s==null?'':s).trim().toLowerCase(); }

app.post('/api/admin/calcular-puntos', async (req,res)=>{
  if(!ADMIN_KEY || req.body.key !== ADMIN_KEY)
    return res.status(403).json({error:'Forbidden'});
  if(!db) return res.status(503).json({error:'DB no disponible'});
  const results = req.body.results || {};
  const dryRun  = req.body.dryRun === true;
  if(!results || typeof results!=='object' || Array.isArray(results))
    return res.status(400).json({error:'results debe ser un objeto { betId: seleccionGanadora }'});

  try{
    const snap = await db.collection('users').get();
    const summary = [];
    let batch = db.batch(), pending = 0, written = 0;

    for(const docSnap of snap.docs){
      const u = docSnap.data();
      const bets = Array.isArray(u.bets) ? u.bets : [];
      if(bets.length===0) continue;

      let pts = 0;
      const hits = [];
      for(const b of bets){
        const winner = results[b.id];
        if(winner==null) continue;                 // ese bet aún no tiene resultado
        if(norm(b.selection)===norm(winner)){      // ACIERTO
          const base = basePointsFor(b.id);
          const odds = Number(b.odds)||0;
          const gained = Math.round(base*odds*10)/10; // 1 decimal
          pts += gained;
          hits.push({id:b.id, sel:b.selection, odds, gained});
        }
      }
      pts = Math.round(pts*10)/10;
      summary.push({ uid: docSnap.id, name: u.name||'', bets: bets.length, hits: hits.length, pts });

      if(!dryRun){
        batch.update(docSnap.ref, { pts, ptsUpdatedAt: new Date().toISOString() });
        if(++pending >= 400){ await batch.commit(); written += pending; batch = db.batch(); pending = 0; }
      }
    }
    if(!dryRun && pending>0){ await batch.commit(); written += pending; }

    summary.sort((a,b)=>b.pts-a.pts);
    res.json({ ok:true, dryRun, usuariosConBets: summary.length, escritos: dryRun?0:written, ranking: summary });
  }catch(e){
    console.warn('calcular-puntos error:', e.message);
    res.status(500).json({error:e.message});
  }
});

// ═══════════════════════════════════════════════════════════════
// PANEL ADMIN — RESULTADOS MANUALES (tabla · goles · puntos)
// ═══════════════════════════════════════════════════════════════

// ── 1) TABLA / STANDINGS ──────────────────────────────────
// La app (que tiene NEXT_MATCHES y GROUPS) envía los marcadores ya resueltos.
// Body: { key, matches:[{match_id, group, home, away, gh, ga}] }
// Calcula PJ/G/E/P/GF/GC/DG/PTS por equipo y guarda live/standings.
app.post('/api/admin/tabla', async (req,res)=>{
  if(!ADMIN_KEY || req.body.key !== ADMIN_KEY)
    return res.status(403).json({error:'Forbidden'});
  const matches = Array.isArray(req.body.matches) ? req.body.matches : [];
  const groupsDef = req.body.groupsDef || null; // { "Grupo A":["México","Corea del Sur",...], ... }
  if(!groupsDef) return res.status(400).json({error:'Falta groupsDef (equipos por grupo)'});

  try{
    // Inicializar tabla con todos los equipos en 0
    const groups = Object.entries(groupsDef).map(([name,teams])=>({
      name,
      teams: teams.map(n=>({n, pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0})),
    }));
    const findTeam=(teamName)=>{
      for(const grp of groups){
        const tm=grp.teams.find(x=>x.n===teamName);
        if(tm) return tm;
      }
      return null;
    };
    // Aplicar cada marcador FINALIZADO
    for(const m of matches){
      if(m.gh==null || m.ga==null) continue; // sin marcador → no jugado
      const gh=Number(m.gh), ga=Number(m.ga);
      const home=findTeam(m.home), away=findTeam(m.away);
      if(!home || !away) continue;
      home.pj++; away.pj++;
      home.gf+=gh; home.gc+=ga;
      away.gf+=ga; away.gc+=gh;
      if(gh>ga){ home.g++; home.pts+=3; away.p++; }
      else if(gh<ga){ away.g++; away.pts+=3; home.p++; }
      else { home.e++; away.e++; home.pts++; away.pts++; }
    }
    groups.forEach(grp=>grp.teams.forEach(tm=>{ tm.dg=tm.gf-tm.gc; }));
    // Ordenar cada grupo: pts, dg, gf
    groups.forEach(grp=>grp.teams.sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf));
    await save('standings', { groups });
    res.json({ ok:true, groups });
  }catch(e){ console.warn('admin/tabla error:', e.message); res.status(500).json({error:e.message}); }
});

// ── 2) GOLES / SCORERS ────────────────────────────────────
// Body: { key, scorers:[{n, team, g, a?}] }  (total acumulado por jugador)
// Guarda live/scorers ordenado por goles.
app.post('/api/admin/goles', async (req,res)=>{
  if(!ADMIN_KEY || req.body.key !== ADMIN_KEY)
    return res.status(403).json({error:'Forbidden'});
  const scorers = Array.isArray(req.body.scorers) ? req.body.scorers : [];
  try{
    const list = scorers
      .map(s=>({ n:String(s.n||'').trim(), team:String(s.team||'').trim(),
                 g:Number(s.g)||0, a:Number(s.a)||0 }))
      .filter(s=>s.n)
      .sort((x,y)=>y.g-x.g || y.a-x.a);
    await save('scorers', { list });
    res.json({ ok:true, count:list.length, list });
  }catch(e){ console.warn('admin/goles error:', e.message); res.status(500).json({error:e.message}); }
});

// ── 3) PUNTOS (con resultados de partidos) ────────────────
// Calcula puntos de cada usuario y los escribe en users/{uid}.pts
// Y en groups/{code}.members[].pts (para que el ranking del grupo los muestre).
// Body: { key, results, dryRun }
//   results = { "<betId>": "<seleccionGanadora>", ... }
app.post('/api/admin/puntos', async (req,res)=>{
  if(!ADMIN_KEY || req.body.key !== ADMIN_KEY)
    return res.status(403).json({error:'Forbidden'});
  if(!db) return res.status(503).json({error:'DB no disponible'});
  const results = req.body.results || {};
  const dryRun  = req.body.dryRun === true;
  if(!results || typeof results!=='object' || Array.isArray(results))
    return res.status(400).json({error:'results debe ser { betId: seleccionGanadora }'});

  try{
    const snap = await db.collection('users').get();
    const ptsByUid = {};       // uid -> pts (para actualizar grupos)
    const summary = [];
    let batch = db.batch(), pending = 0, written = 0;

    for(const docSnap of snap.docs){
      const u = docSnap.data();
      const bets = Array.isArray(u.bets) ? u.bets : [];
      if(bets.length===0) continue;
      let pts = 0, hits = 0;
      for(const b of bets){
        const winner = results[b.id];
        if(winner==null) continue;
        if(norm(b.selection)===norm(winner)){
          pts += Math.round(basePointsFor(b.id)*(Number(b.odds)||0)*10)/10;
          hits++;
        }
      }
      pts = Math.round(pts*10)/10;
      ptsByUid[docSnap.id] = pts;
      summary.push({ uid: docSnap.id, name: u.name||'', bets: bets.length, hits, pts });
      if(!dryRun){
        batch.update(docSnap.ref, { pts, ptsUpdatedAt: new Date().toISOString() });
        if(++pending >= 400){ await batch.commit(); written += pending; batch = db.batch(); pending = 0; }
      }
    }
    if(!dryRun && pending>0){ await batch.commit(); written += pending; }

    // Propagar los puntos a los miembros de cada grupo (ranking del grupo)
    let gruposActualizados = 0;
    if(!dryRun){
      const gsnap = await db.collection('groups').get();
      let gbatch = db.batch(), gpending = 0;
      for(const gdoc of gsnap.docs){
        const g = gdoc.data();
        if(!Array.isArray(g.members)) continue;
        let changed = false;
        const members = g.members.map(m=>{
          if(m && m.id!=null && ptsByUid[m.id]!=null && m.pts!==ptsByUid[m.id]){
            changed = true;
            return { ...m, pts: ptsByUid[m.id] };
          }
          return m;
        });
        if(changed){
          gbatch.update(gdoc.ref, { members });
          gruposActualizados++;
          // refrescar memoria del servidor para que GET /api/groups lo sirva al instante
          if(serverGroups[gdoc.id]) serverGroups[gdoc.id].members = members;
          if(++gpending >= 400){ await gbatch.commit(); gbatch = db.batch(); gpending = 0; }
        }
      }
      if(gpending>0) await gbatch.commit();
      persistGroups();
    }

    summary.sort((a,b)=>b.pts-a.pts);
    res.json({ ok:true, dryRun, usuariosConBets: summary.length,
               escritos: dryRun?0:written, gruposActualizados, ranking: summary });
  }catch(e){ console.warn('admin/puntos error:', e.message); res.status(500).json({error:e.message}); }
});

// ── Datos en vivo servidos desde el servidor ────────────
// Evita que cada usuario lea Firestore: el servidor mantiene los datos en
// memoria (vía save() durante el polling) y aquí los entrega por HTTP.
// DEBE ir ANTES del catch-all app.get('*') o lo interceptaría el index.html.
app.get('/api/live/:docId', async (req,res)=>{
  const { docId } = req.params;
  if(!LIVE_DOCS.includes(docId)) return res.status(404).json({ error:'not found' });
  const fresh = ALWAYS_FRESH.includes(docId);
  res.set('Cache-Control', fresh ? 'no-store' : 'public, max-age=30');
  // Vía normal: copia en memoria mantenida por el polling (los "fresh" la omiten)
  if(!fresh && liveCache[docId]) return res.json(liveCache[docId]);
  // Leer Firestore: los "fresh" (banner) en cada request; el resto solo en frío
  // como fallback cuando aún no hay copia en memoria.
  if(db){
    try{
      const snap = await db.collection('live').doc(docId).get();
      if(snap.exists){
        if(!fresh) liveCache[docId] = snap.data();  // cachear solo los no-fresh
        return res.json(snap.data());
      }
    }catch(e){ console.warn('live fallback read error:', e.message); }
  }
  return res.json({});                              // aún no hay datos
});
// Servir manifest e íconos explícitamente (antes del catch-all)
app.get('/manifest.json', (req,res)=>res.sendFile(path.join(__dirname,'dist','manifest.json')));
app.get('/icon-512.png',  (req,res)=>res.sendFile(path.join(__dirname,'dist','icon-512.png')));
app.get('/icon-192.png',  (req,res)=>res.sendFile(path.join(__dirname,'dist','icon-192.png')));
app.get('/.well-known/assetlinks.json', (req,res)=>res.sendFile(path.join(__dirname,'dist','.well-known','assetlinks.json')));
// Serve React app

app.use(express.static(path.join(__dirname,'dist')));
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname,'dist','index.html'));
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, ()=>{
  console.log(`🚀 Mundial 2026 server en puerto ${PORT}`);
  startPolling();
});
