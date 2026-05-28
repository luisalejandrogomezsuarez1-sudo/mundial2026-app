// Mundial FIFA 2026 — Backend Server (CommonJS)
const express    = require('express');
const path       = require('path');
const https      = require('https');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Config ──────────────────────────────────────────────
const AF_KEY    = process.env.AF_KEY || '';
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

// ── Scheduling ──────────────────────────────────────────
const WC_START = new Date('2026-06-11');
const WC_END   = new Date('2026-07-20');
const isActive = ()=> new Date()>=WC_START && new Date()<=WC_END;

function startPolling(){
  // Siempre sincronizar fixtures (horarios confirmados por FIFA)
  pollFixtures();
  setInterval(pollFixtures, 6*60*60000); // cada 6h
  if(isActive()){
    console.log('⚽ Mundial ACTIVO — polling cada 60s');
    pollLive();      setInterval(pollLive,      60000);
    pollStandings(); setInterval(pollStandings, 5*60000);
    pollScorers();   setInterval(pollScorers,   10*60000);
    setInterval(pollFixtures, 30*60000); // fixtures también cada 30min
  } else {
    console.log('⏳ Pre-Mundial — clasificación y fixtures cada 6h');
    pollStandings(); pollScorers();
    setInterval(()=>{ pollStandings(); pollScorers(); }, 6*60*60000);
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

// ── GRUPOS — almacenamiento en servidor (sin Firebase, sin permisos) ──
const fs = require('fs');
const GROUPS_FILE = '/tmp/wc2026_groups.json';

// Load groups from file at startup
let serverGroups = {};
try {
  serverGroups = JSON.parse(fs.readFileSync(GROUPS_FILE,'utf8'));
  console.log(`📂 ${Object.keys(serverGroups).length} grupos cargados`);
} catch(e) { serverGroups = {}; }

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

app.get('/api/groups/:code', (req,res)=>{
  const code = (req.params.code||'').toUpperCase().trim();
  if(!code) return res.status(400).json({error:'Falta code'});
  const g = serverGroups[code];
  if(g) {
    console.log('✅ Grupo encontrado:', code);
    res.json({found:true, group:g});
  } else {
    console.log('❌ Grupo no encontrado:', code);
    res.json({found:false});
  }
});

// ── CHAT API — Firebase Admin for persistence + scalability ────
app.post('/api/chat/:code', async(req,res)=>{
  const code = req.params.code.toUpperCase();
  const {id, uid, name, text, ts} = req.body||{};
  if(!text?.trim()) return res.status(400).json({error:'Empty message'});

  // Use client-provided id+ts so polling doesn't create duplicates
  const msg = {
    id:   id   || 'cm_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
    uid:  uid  || 'anon',
    name: name || 'Usuario',
    ini:  (name||'?')[0].toUpperCase(),
    text: text.trim(),
    ts:   ts   || Date.now(),
  };

  // Save to Firestore via Admin (guaranteed to work)
  if(db){
    try{
      await db.collection('groups').doc(code)
              .collection('messages').add({...msg, timestamp: new Date()});
    }catch(e){ console.warn('chat save FB error:', e.message); }
  }

  // Also cache in memory for fast polling
  if(!serverGroups[code]) serverGroups[code] = {};
  if(!serverGroups[code]._msgs) serverGroups[code]._msgs = [];
  serverGroups[code]._msgs.push(msg);
  // Keep only last 500 messages in memory
  if(serverGroups[code]._msgs.length > 500)
    serverGroups[code]._msgs = serverGroups[code]._msgs.slice(-500);

  res.json({ok:true, msg});
});

app.get('/api/chat/:code', async(req,res)=>{
  const code  = req.params.code.toUpperCase();
  const since = parseInt(req.query.since)||0;

  let msgs = [];

  // Try Firestore first (authoritative source)
  if(db){
    try{
      const snap = await db.collection('groups').doc(code)
                           .collection('messages')
                           .orderBy('ts','asc').get();
      msgs = snap.docs.map(d=>d.data());
    }catch(e){
      // Fallback to memory cache
      msgs = (serverGroups[code]?._msgs)||[];
    }
  } else {
    msgs = (serverGroups[code]?._msgs)||[];
  }

  // Return only messages newer than 'since'
  const filtered = since>0 ? msgs.filter(m=>m.ts>since) : msgs;
  res.json({ok:true, msgs:filtered});
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

// ── ADMIN: listar y borrar grupos por nombre (protegido con clave) ──────────
const ADMIN_KEY = process.env.ADMIN_KEY || 'wc2026-admin-local';

app.get('/api/admin/groups', (req,res)=>{
  if(req.query.key !== ADMIN_KEY) return res.status(403).json({error:'Forbidden'});
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
  if(req.query.key !== ADMIN_KEY) return res.status(403).json({error:'Forbidden'});
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
