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

// ── Scheduling ──────────────────────────────────────────
const WC_START = new Date('2026-06-11');
const WC_END   = new Date('2026-07-20');
const isActive = ()=> new Date()>=WC_START && new Date()<=WC_END;

function startPolling(){
  if(isActive()){
    console.log('⚽ Mundial ACTIVO — polling cada 60s');
    pollLive(); setInterval(pollLive, 60000);
    pollStandings(); setInterval(pollStandings, 5*60000);
    pollScorers(); setInterval(pollScorers, 10*60000);
  } else {
    console.log('⏳ Pre-Mundial — actualizando cada 6h');
    pollStandings(); pollScorers();
    setInterval(()=>{ pollStandings(); pollScorers(); }, 6*60*60000);
  }
}

// ── Routes ──────────────────────────────────────────────
app.get('/api/health', (req,res)=>{
  res.json({ status:'ok', wcActive:isActive(), time:new Date().toISOString() });
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
