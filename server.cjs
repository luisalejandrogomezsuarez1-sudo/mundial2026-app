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

// ── Save to Firestore ───────────────────────────────────
async function save(docId, data){
  if(!db) return;
  try{
    await db.collection('live').doc(docId).set({
      ...data, updatedAt: new Date().toISOString()
    });
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
    pollLive();      setInterval(pollLive,      60000);
    pollStandings(); setInterval(pollStandings, 5*60000);
    pollScorers();   setInterval(pollScorers,   10*60000);
    setInterval(pollFixtures, 30*60000);   // cada 30min durante el Mundial
    pollBracket();   setInterval(pollBracket, 2*60*60000); // llave cada 2h
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
      if(g.code && !serverGroups[g.code]){
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
  if(!db) return;
  try {
    await db.collection('groups').doc(g.code).set({
      ...g, createdAt: new Date().toISOString()
    });
  } catch(e) { console.warn('Group Firestore backup error:', e.message); }
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

app.get('/api/groups/:code', async(req,res)=>{
  const code = (req.params.code||'').toUpperCase().trim();
  if(!code) return res.status(400).json({error:'Falta code'});

  // 1. Encontrado en memoria → respuesta inmediata
  if(serverGroups[code])
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

  // Cache en memoria: máx 50
  if(!serverGroups[code]) serverGroups[code] = {};
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
  <div class="sub">FIFA WORLD CUP · USA · MÉXICO · CANADÁ</div>
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

// ── MercadoPago Checkout Pro ─────────────────────────────────────────────────
app.post('/api/mp/create-preference', async (req, res) => {
  const { userId, userEmail } = req.body;
  try {
    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [{ title: 'Paquete 1000 monedas', quantity: 1, unit_price: 30, currency_id: 'MXN' }],
        payer: { email: userEmail },
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
