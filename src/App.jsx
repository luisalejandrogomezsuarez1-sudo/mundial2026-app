import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ── Firebase ACTIVO ─────────────────────────────────────────────
let fbSendMsg = null, fbSubscribeChat = null, fbSaveUser = null, fbGetAllUsers = null, fbGiftCoins = null, fbGiftCoinsByEmail = null, fbFindUserByEmail = null, fbSaveGroup = null, fbGetGroupByCode = null, fbDeleteUser = null;
import('./firebase.js').then(fb => {
  fbSendMsg         = fb.sendChatMessage;
  fbSubscribeChat   = fb.subscribeToChatMessages;
  fbSaveUser        = fb.saveUserToFirestore;
  fbGetAllUsers     = fb.getAllUsersFromFirestore;
  fbGiftCoins       = fb.giftCoinsInFirestore;
  fbGiftCoinsByEmail= fb.giftCoinsByEmail;
  fbFindUserByEmail = fb.findUserByEmail;
  fbDeleteUser      = fb.deleteUserFromFirestore;
  fbSaveGroup       = fb.saveGroupToFirestore;
  fbGetGroupByCode  = fb.getGroupByCode;
  // Expose globally
  window._fbGetAllUsers     = fb.getAllUsersFromFirestore;
  window._fbSaveUser        = fb.saveUserToFirestore;
  window._fbSaveGroup       = fb.saveGroupToFirestore;
  window._fbGetGroupByCode  = fb.getGroupByCode;
  window._fbSendMsg         = fb.sendChatMessage;
  window._fbSubscribeChat   = fb.subscribeToChatMessages;
  window._fbReady           = true;
  window._fbSubscribeLive   = fb.subscribeToLiveDoc;
  window._fbGetUser         = fb.getUserFromFirestore;
  window._fbSubscribeUser   = fb.subscribeToUserDoc;
  window._fbFindUserByEmail = fb.findUserByEmail;
  window._fbGiftCoinsByEmail= fb.giftCoinsByEmail;
  // Auth nativo (Fase 2)
  window._fbAuthRegister    = fb.authRegister;
  window._fbAuthLogin       = fb.authLogin;
  window._fbAuthLogout      = fb.authLogout;
  window._fbAuthOnChange    = fb.authOnChange;
  window._fbSaveAuthUser    = fb.saveAuthUserToFirestore;
  window._fbMigrateUser     = fb.migrateUserDataToUid;
  // uid autoritativo de Firebase Auth (la fuente real tras la migración a Auth)
  window._fbCurrentUid      = () => { try{ return fb.auth?.currentUser?.uid || null; }catch(_){ return null; } };
  console.log('🔥 Firebase conectado — mundial2026-15686');
}).catch(e => console.warn('Firebase error:', e));

// ── Caches globales para minimizar lecturas Firestore ────────────────────────
// Cache de datos en vivo (onSnapshot): evita re-leer al cambiar de tab
const _liveCache = {};
const _liveTTL = { matches:60e3, standings:10*60e3, scorers:10*60e3, fixtures:30*60e3, bracket:10*60e3 };
const getCachedLive = id => {
  const e = _liveCache[id]; if(!e) return null;
  return Date.now()-e.ts < (_liveTTL[id]||5*60e3) ? e.data : null;
};
const setCachedLive = (id,data) => { _liveCache[id]={data,ts:Date.now()}; };

// ── Migración de pronósticos bloqueados al servidor ─────────────
// Sube los locks de localStorage a /api/groups/:code/lock para que el resto del
// grupo los vea. v2: re-sync forzado ÚNICO que ignora las banderas
// wc2026_synced_* viejas (algunas quedaron puestas por el bug del stub aunque los
// bets nunca llegaron a Firestore). Tras v2, vuelve a la lógica por-grupo normal.
// Corre al abrir la app y al entrar a Grupos. Reentrante-seguro con un guard.
const LOCK_MIGRATION_VERSION = 'v2';
let _lockSyncRunning = false;
async function syncLockedBets(user){
  if(!user?.id || _lockSyncRunning) return;
  _lockSyncRunning = true;
  try{
    let savedLocks={};
    try{ savedLocks=JSON.parse(localStorage.getItem('wc2026_locks_'+user.id)||'{}'); }catch{ return; }
    let groups=[];
    try{ const g=JSON.parse(localStorage.getItem('wc2026_groups_'+user.id)||'[]'); if(Array.isArray(g)) groups=g; }catch{}
    // locks se indexa por id de grupo; el endpoint usa code → mapear id→code
    const codeByGid={};
    groups.forEach(g=>{ if(g?.id) codeByGid[g.id]=g.code; if(g?.code) codeByGid[g.code]=g.code; });

    const forced = localStorage.getItem('wc2026_migration_version')!==LOCK_MIGRATION_VERSION;
    let allAttemptsOk=true;

    for(const [gid,lockData] of Object.entries(savedLocks)){
      const bets=lockData?.bets;
      if(!Array.isArray(bets)||bets.length===0) continue;
      const code=codeByGid[gid];
      if(!code||code==='WC26-AMIGOS') continue; // sin code conocido o grupo demo → omitir
      const syncedKey='wc2026_synced_'+user.id+'_'+gid;
      // Modo normal: saltar los ya sincronizados. Modo forzado (v2): ignorar la bandera.
      if(!forced && localStorage.getItem(syncedKey)) continue;
      try{
        await fetch('/api/groups/'+encodeURIComponent(code)).catch(()=>{}); // rehidrata el grupo en el server
        const res=await fetch('/api/groups/'+encodeURIComponent(code)+'/lock',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            id:user.id, name:user.name||'Usuario',
            ini:(user.name||'U')[0].toUpperCase(), col:'#4F8EF7',
            bets:bets.map(b=>({id:b.id,category:b.category||b.cat,selection:b.selection||b.sel,odds:b.odds,ts:b.ts})),
            lockedAt:lockData.lockedAt||Date.now(),
          }),
        });
        if(res.ok) localStorage.setItem(syncedKey,'1');
        else allAttemptsOk=false;
      }catch(e){ allAttemptsOk=false; }
    }
    // Marcar v2 solo si no falló ninguna subida intentada (los omitidos por falta de
    // code no cuentan: reintentar no los arreglaría). Evita repetir el re-sync forzado.
    if(forced && allAttemptsOk) localStorage.setItem('wc2026_migration_version',LOCK_MIGRATION_VERSION);
  } finally {
    _lockSyncRunning=false;
  }
}

// ── Subir los pronósticos actuales a TODOS los grupos del usuario ───────────
// Lo usa el "Guardar" de la pestaña Pronóstico (Flujo A) para que los bets
// lleguen al ranking de cada grupo, no solo a localStorage. Reusa /lock (no
// crea endpoints nuevos). Devuelve {ok, fail, total}.
async function uploadBetsToAllGroups(user, bets){
  // uid AUTORITATIVO: Firebase Auth currentUser → user.uid → user.id (legacy).
  // Tras la migración a Auth, el uid real es el de Auth, no el id del localStorage viejo.
  const uid = (typeof window!=='undefined' && window._fbCurrentUid && window._fbCurrentUid())
            || user?.uid || user?.id || null;
  if(!uid){ console.warn('[uploadBets] sin uid (auth no listo)'); return {ok:0, fail:0, total:0}; }

  const readLS=key=>{ try{ const g=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(g)?g:[]; }catch{ return []; } };
  // Grupos del usuario: localStorage (clave por uid; probar user.id si difiere)
  let groups=readLS('wc2026_groups_'+uid);
  if(groups.length===0 && user?.id && user.id!==uid) groups=readLS('wc2026_groups_'+user.id);
  // Fallback al servidor si localStorage no los tiene (GruposScreen no montado, otro dispositivo)
  if(groups.length===0){
    try{
      const r=await fetch('/api/groups/user/'+encodeURIComponent(uid));
      if(r.ok){ const d=await r.json(); if(Array.isArray(d.groups)) groups=d.groups; }
    }catch(e){}
  }
  const real=groups.filter(g=>g?.code && g.code!=='WC26-AMIGOS'); // excluir grupo demo
  console.log('[uploadBets] uid=',uid,'· grupos=',real.map(g=>g.code));
  const lockedAt=Date.now();
  const payloadBets=(bets||[]).map(b=>({
    id:b.id, category:b.category||b.cat, selection:b.selection||b.sel,
    odds:b.odds, ts:b.ts||Date.now(),
  }));
  // Reflejar el bloqueo en localStorage (locks por id de grupo) para que la UI de
  // Grupos lo muestre como bloqueado y la migración quede consistente con el server.
  try{
    const locks=JSON.parse(localStorage.getItem('wc2026_locks_'+uid)||'{}');
    real.forEach(g=>{ if(g.id) locks[g.id]={bets:[...(bets||[])],lockedAt}; });
    localStorage.setItem('wc2026_locks_'+uid,JSON.stringify(locks));
  }catch{}
  let ok=0, fail=0;
  for(const g of real){
    try{
      await fetch('/api/groups/'+encodeURIComponent(g.code)).catch(()=>{}); // rehidrata el grupo en el server
      const res=await fetch('/api/groups/'+encodeURIComponent(g.code)+'/lock',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          id:uid, name:user?.name||user?.displayName||'Usuario',
          ini:user?.ini||(user?.name||'U').charAt(0).toUpperCase(), col:'#4F8EF7',
          bets:payloadBets, lockedAt,
        }),
      });
      if(res.ok){ ok++; try{localStorage.setItem('wc2026_synced_'+uid+'_'+g.id,'1');}catch{} }
      else fail++;
    }catch(e){ fail++; }
  }
  return {ok, fail, total:real.length};
}

// Cache de allUsers: evita múltiples llamadas getAllUsers en el mismo login
let _allUsersCache = null, _allUsersCacheTs = 0;
const getAllUsersCached = async (getFn, maxAge=5*60e3) => {
  if(_allUsersCache && Date.now()-_allUsersCacheTs < maxAge) return _allUsersCache;
  const data = await getFn();
  _allUsersCache = data; _allUsersCacheTs = Date.now();
  return data;
};



// ── Multi-language support — lightweight, no external packages ──
const TRANSLATIONS={
  es:{
    // Nav
    nav_home:'Inicio',nav_matches:'Partidos',nav_table:'Tabla',
    nav_goals:'Goles',nav_bets:'Pronóstico',nav_groups:'Grupos',nav_profile:'Perfil',
    // Auth
    login:'Iniciar Sesión',register:'Registrarse',logout:'Cerrar sesión',
    email:'Correo electrónico',password:'Contraseña',name:'Nombre completo',
    birthdate:'Fecha de nacimiento',nationality:'Nacionalidad',gender:'Género',
    have_account:'¿Ya tienes cuenta?',no_account:'¿No tienes cuenta?',
    language:'Idioma',
    login_subtitle:'Inicia sesión para vivir el Mundial',
    register_subtitle:'Crea tu cuenta · Es gratis',
    select_gender:'Selecciona tu género',
    gender_male:'Masculino',gender_female:'Femenino',gender_other:'Otro',gender_prefer_not:'Prefiero no decir',
    continue_with:'o continúa con',
    sign_in:'INICIAR SESIÓN',sign_up:'CREAR CUENTA',
    // Home
    live_matches:'Partidos en Vivo',next_matches:'Próximos Partidos',
    see_all:'Ver todos →',countdown_title:'Cuenta Regresiva',
    days:'días',hours:'horas',minutes:'minutos',seconds:'segundos',
    wc_starts:'El Mundial comienza',live_soon:'Los marcadores en vivo aparecerán aquí',
    live_now:'EN VIVO',updated_at:'Actualizado:',auto_refresh:'Auto-refresh 30s',
    live_info:'Los goles, tarjetas y estadísticas se actualizarán en tiempo real.',
    wc_date:'El Mundial 2026 comienza el 11 de junio de 2026',
    wc_opening:'📍 Apertura: Estadio Azteca · Ciudad de México',
    // Matches
    matches_title:'PARTIDOS',all:'Todos',today:'Hoy',tomorrow:'Mañana',
    venues:'Sedes Oficiales',
    calendar_title:'CALENDARIO',
    no_matches_today:'No hay partidos hoy',no_matches_tomorrow:'No hay partidos mañana',
    no_matches:'No hay partidos en este período',
    today_live:'HOY · PARTIDOS EN CURSO',
    // Table
    table_title:'CLASIFICACIÓN',group_stage:'Fase de grupos',
    top_goals:'Más goles',best_defense:'Mejor defensa',leader:'Líder',
    bracket_title:'LLAVE ELIMINATORIA',auto_flags:'Las banderas aparecen conforme avanza el torneo',
    champion:'CAMPEÓN DEL MUNDO',
    team_col:'Equipo',advancing:'ADV',top_2_qualify:'Top 2 clasifican a octavos',
    round_32:'RONDA DE 32',round_16:'OCTAVOS',quarterfinals:'CUARTOS',semifinals:'SEMIFINALES',
    // Goals
    goals_title:'GOLEADORES',golden_boot:'Candidatos a la Bota de Oro del Mundial 2026',
    fourth_onwards:'4° EN ADELANTE',
    // Bets
    bets_title:'MIS PRONÓSTICOS',long_term:'Partidos Mundial',
    per_match:'Por Partido',specials:'Especiales',stats:'Estadísticas',
    world_champion:'Campeón del Mundo',golden_ball:'Balón de Oro',
    buy_package:'Comprar Paquete de Pronósticos',price:'$30 MXN',
    pay_card:'Tarjeta',pay_oxxo:'OXXO',pay_transfer:'Transferencia',
    pay_btn:'Pagar $30 MXN',payment_success:'¡PAGO EXITOSO!',
    coins_added:'monedas añadidas a tu cuenta',
    world_champion_q:'¿Qué selección levantará la Copa?',
    top_scorer_q:'Máximo goleador del torneo',
    best_player_q:'Mejor jugador del Mundial',
    group_winners:'GANADORES DE GRUPO',
    draw:'Empate',goals_label:'GOLES',over:'Más +2.5',under:'Menos -2.5',
    btts:'BTTS',both_score:'✓ Ambos anotan',not_both_score:'✗ No ambos',
    double_chance:'DOBLE OPORT.',exact_score:'MARCADOR EXACTO',
    first_scorer:'PRIMER GOLEADOR',handicap:'HÁNDICAP',
    save_prediction:'GUARDAR PRONÓSTICO',prediction_saved:'PRONÓSTICO GUARDADO',
    coins_enough:'Te alcanzan las monedas para todos tus pronósticos',
    insufficient_balance:'Saldo insuficiente · Compra otro paquete',
    cancel:'Cancelar',change:'Cambiar',
    predictions_ready:'PRONÓSTICO LISTO PARA GUARDAR',predictions_incomplete:'COMPLETA TUS PRONÓSTICOS',
    best_scorers:'MEJORES GOLEADORES DEL MUNDIAL',
    // Groups
    groups_title:'MIS GRUPOS',create_group:'Crear Grupo',join_group:'Unirse',
    join_code:'Código del grupo',group_name:'Nombre del grupo',
    ranking:'Ranking',predictions:'Pronósticos',members:'Miembros',
    report:'Reporte',chat:'Chat',lock:'Bloquear',
    group_code:'Código',copy:'Copiar',share_group:'Compartir grupo',
    invite_friends:'Invita a tus amigos',copied:'¡Copiado!',
    no_members:'Sin miembros aún',you:'TÚ',points:'PUNTOS',
    delete_group:'ELIMINAR GRUPO',delete:'Eliminar',
    locked_state:'🔒 Bloqueado',open_state:'⚡ Abierto',view_group:'Ver →',
    write_message:'Escribe un mensaje...',
    // Profile
    profile_title:'MI PERFIL',share_app:'Compartir la App',
    admin_panel:'PANEL ADMIN',registered:'Registrados',with_package:'Con paquete',
    gift_coins:'Monedas regalo',no_package:'Sin paquete',
    income:'Ingresos',share_link:'Compartir enlace',
    active_session:'Sesión activa',my_account:'MI CUENTA',
    // Common
    loading:'Cargando...', error:'Error', retry:'Reintentar',
    tbd:'Por definir',active:'Activo',
  },
  en:{
    nav_home:'Home',nav_matches:'Matches',nav_table:'Table',
    nav_goals:'Scorers',nav_bets:'Predictions',nav_groups:'Groups',nav_profile:'Profile',
    login:'Sign In',register:'Sign Up',logout:'Sign Out',
    email:'Email',password:'Password',name:'Full name',
    birthdate:'Date of birth',nationality:'Nationality',gender:'Gender',
    have_account:'Already have an account?',no_account:"Don't have an account?",
    language:'Language',
    login_subtitle:'Sign in to experience the World Cup',
    register_subtitle:'Create your account · It\'s free',
    select_gender:'Select gender',
    gender_male:'Male',gender_female:'Female',gender_other:'Other',gender_prefer_not:'Prefer not to say',
    continue_with:'or continue with',
    sign_in:'SIGN IN',sign_up:'CREATE ACCOUNT',
    live_matches:'Live Matches',next_matches:'Upcoming Matches',
    see_all:'See all →',countdown_title:'Countdown',
    days:'days',hours:'hours',minutes:'minutes',seconds:'seconds',
    wc_starts:'The World Cup starts',live_soon:'Live scores will appear here',
    live_now:'LIVE',updated_at:'Updated:',auto_refresh:'Auto-refresh 30s',
    live_info:'Goals, cards and stats will update in real time.',
    wc_date:'World Cup 2026 begins June 11, 2026',
    wc_opening:'📍 Opening: Estadio Azteca · Mexico City',
    matches_title:'MATCHES',all:'All',today:'Today',tomorrow:'Tomorrow',
    venues:'Official Venues',
    calendar_title:'CALENDAR',
    no_matches_today:'No matches today',no_matches_tomorrow:'No matches tomorrow',
    no_matches:'No matches in this period',
    today_live:'TODAY · LIVE MATCHES',
    table_title:'STANDINGS',group_stage:'Group Stage',
    top_goals:'Top scorer',best_defense:'Best defense',leader:'Leader',
    bracket_title:'KNOCKOUT BRACKET',auto_flags:'Flags update automatically as teams advance',
    champion:'WORLD CHAMPION',
    team_col:'Team',advancing:'ADV',top_2_qualify:'Top 2 qualify to round of 16',
    round_32:'ROUND OF 32',round_16:'ROUND OF 16',quarterfinals:'QUARTERFINALS',semifinals:'SEMIFINALS',
    goals_title:'SCORERS',golden_boot:'Golden Boot Candidates',
    fourth_onwards:'4th ONWARDS',
    bets_title:'MY PREDICTIONS',long_term:'World Cup Matches',
    per_match:'Per Match',specials:'Specials',stats:'Statistics',
    world_champion:'World Champion',golden_ball:'Golden Ball',
    buy_package:'Buy Predictions Package',price:'$30 MXN',
    pay_card:'Card',pay_oxxo:'OXXO',pay_transfer:'Transfer',
    pay_btn:'Pay $30 MXN',payment_success:'PAYMENT SUCCESSFUL!',
    coins_added:'coins added to your account',
    world_champion_q:'Which team will lift the Cup?',
    top_scorer_q:'Top scorer of the tournament',
    best_player_q:'Best player of the World Cup',
    group_winners:'GROUP WINNERS',
    draw:'Draw',goals_label:'GOALS',over:'Over +2.5',under:'Under -2.5',
    btts:'BTTS',both_score:'✓ Both score',not_both_score:'✗ Not both',
    double_chance:'DOUBLE CHANCE',exact_score:'EXACT SCORE',
    first_scorer:'FIRST SCORER',handicap:'HANDICAP',
    save_prediction:'SAVE PREDICTION',prediction_saved:'PREDICTION SAVED',
    coins_enough:'You have enough coins for all your predictions',
    insufficient_balance:'Insufficient balance · Buy another package',
    cancel:'Cancel',change:'Change',
    predictions_ready:'PREDICTION READY TO SAVE',predictions_incomplete:'COMPLETE YOUR PREDICTIONS',
    best_scorers:'BEST WORLD CUP SCORERS',
    groups_title:'MY GROUPS',create_group:'Create Group',join_group:'Join',
    join_code:'Group code',group_name:'Group name',
    ranking:'Ranking',predictions:'Predictions',members:'Members',
    report:'Report',chat:'Chat',lock:'Lock',
    group_code:'Code',copy:'Copy',share_group:'Share group',
    invite_friends:'Invite your friends',copied:'Copied!',
    no_members:'No members yet',you:'YOU',points:'POINTS',
    delete_group:'DELETE GROUP',delete:'Delete',
    locked_state:'🔒 Locked',open_state:'⚡ Open',view_group:'View →',
    write_message:'Write a message...',
    profile_title:'MY PROFILE',share_app:'Share the App',
    admin_panel:'ADMIN PANEL',registered:'Registered',with_package:'With package',
    gift_coins:'Gift coins',no_package:'No package',income:'Income',share_link:'Share link',
    active_session:'Active session',my_account:'MY ACCOUNT',
    loading:'Loading...',error:'Error',retry:'Retry',
    tbd:'TBD',active:'Active',
  },
  pt:{
    nav_home:'Início',nav_matches:'Jogos',nav_table:'Tabela',
    nav_goals:'Artilheiros',nav_bets:'Palpites',nav_groups:'Grupos',nav_profile:'Perfil',
    login:'Entrar',register:'Cadastrar',logout:'Sair',
    email:'E-mail',password:'Senha',name:'Nome completo',
    birthdate:'Data de nascimento',nationality:'Nacionalidade',gender:'Gênero',
    have_account:'Já tem conta?',no_account:'Não tem conta?',
    language:'Idioma',
    login_subtitle:'Entre para viver a Copa do Mundo',
    register_subtitle:'Crie sua conta · É grátis',
    select_gender:'Selecione o gênero',
    gender_male:'Masculino',gender_female:'Feminino',gender_other:'Outro',gender_prefer_not:'Prefiro não dizer',
    continue_with:'ou continue com',
    sign_in:'ENTRAR',sign_up:'CRIAR CONTA',
    live_matches:'Jogos ao Vivo',next_matches:'Próximos Jogos',
    see_all:'Ver todos →',countdown_title:'Contagem Regressiva',
    days:'dias',hours:'horas',minutes:'minutos',seconds:'segundos',
    wc_starts:'A Copa começa',live_soon:'Os placares ao vivo aparecerão aqui',
    live_now:'AO VIVO',updated_at:'Atualizado:',auto_refresh:'Atualização 30s',
    live_info:'Gols, cartões e estatísticas serão atualizados em tempo real.',
    wc_date:'A Copa do Mundo 2026 começa em 11 de junho de 2026',
    wc_opening:'📍 Abertura: Estadio Azteca · Cidade do México',
    matches_title:'JOGOS',all:'Todos',today:'Hoje',tomorrow:'Amanhã',
    venues:'Estádios Oficiais',
    calendar_title:'CALENDÁRIO',
    no_matches_today:'Sem jogos hoje',no_matches_tomorrow:'Sem jogos amanhã',
    no_matches:'Sem jogos neste período',
    today_live:'HOJE · JOGOS AO VIVO',
    table_title:'CLASSIFICAÇÃO',group_stage:'Fase de grupos',
    top_goals:'Mais gols',best_defense:'Melhor defesa',leader:'Líder',
    bracket_title:'CHAVES ELIMINATÓRIAS',auto_flags:'As bandeiras aparecem conforme o torneio avança',
    champion:'CAMPEÃO MUNDIAL',
    team_col:'Equipe',advancing:'CLF',top_2_qualify:'Top 2 classificam para oitavas',
    round_32:'RODADA DE 32',round_16:'OITAVAS',quarterfinals:'QUARTAS',semifinals:'SEMIFINAIS',
    goals_title:'ARTILHEIROS',golden_boot:'Candidatos à Chuteira de Ouro da Copa 2026',
    fourth_onwards:'4° EM DIANTE',
    bets_title:'MEUS PALPITES',long_term:'Jogos da Copa',
    per_match:'Por Jogo',specials:'Especiais',stats:'Estatísticas',
    world_champion:'Campeão Mundial',golden_ball:'Bola de Ouro',
    buy_package:'Comprar Pacote de Palpites',price:'$30 MXN',
    pay_card:'Cartão',pay_oxxo:'OXXO',pay_transfer:'Transferência',
    pay_btn:'Pagar $30 MXN',payment_success:'PAGAMENTO REALIZADO!',
    coins_added:'moedas adicionadas à sua conta',
    world_champion_q:'Qual seleção vai levantar a Taça?',
    top_scorer_q:'Artilheiro máximo do torneio',
    best_player_q:'Melhor jogador da Copa',
    group_winners:'CAMPEÕES DE GRUPO',
    draw:'Empate',goals_label:'GOLS',over:'Mais +2.5',under:'Menos -2.5',
    btts:'BTTS',both_score:'✓ Ambos marcam',not_both_score:'✗ Não ambos',
    double_chance:'DUPLA CHANCE',exact_score:'PLACAR EXATO',
    first_scorer:'PRIMEIRO GOLEADOR',handicap:'HANDICAP',
    save_prediction:'SALVAR PALPITE',prediction_saved:'PALPITE SALVO',
    coins_enough:'Você tem moedas suficientes para todos os palpites',
    insufficient_balance:'Saldo insuficiente · Compre outro pacote',
    cancel:'Cancelar',change:'Alterar',
    predictions_ready:'PALPITE PRONTO PARA SALVAR',predictions_incomplete:'COMPLETE SEUS PALPITES',
    best_scorers:'MELHORES ARTILHEIROS DA COPA',
    groups_title:'MEUS GRUPOS',create_group:'Criar Grupo',join_group:'Entrar',
    join_code:'Código do grupo',group_name:'Nome do grupo',
    ranking:'Classificação',predictions:'Palpites',members:'Membros',
    report:'Relatório',chat:'Chat',lock:'Bloquear',
    group_code:'Código',copy:'Copiar',share_group:'Compartilhar grupo',
    invite_friends:'Convide seus amigos',copied:'Copiado!',
    no_members:'Sem membros ainda',you:'VOCÊ',points:'PONTOS',
    delete_group:'EXCLUIR GRUPO',delete:'Excluir',
    locked_state:'🔒 Bloqueado',open_state:'⚡ Aberto',view_group:'Ver →',
    write_message:'Escreva uma mensagem...',
    profile_title:'MEU PERFIL',share_app:'Compartilhar o App',
    admin_panel:'PAINEL ADMIN',registered:'Cadastrados',with_package:'Com pacote',
    gift_coins:'Moedas presente',no_package:'Sem pacote',income:'Receita',share_link:'Compartilhar link',
    active_session:'Sessão ativa',my_account:'MINHA CONTA',
    loading:'Carregando...',error:'Erro',retry:'Tentar novamente',
    tbd:'A definir',active:'Ativo',
  },
  zh:{
    nav_home:'首页',nav_matches:'赛程',nav_table:'积分榜',
    nav_goals:'射手榜',nav_bets:'预测',nav_groups:'小组',nav_profile:'我的',
    login:'登录',register:'注册',logout:'退出',
    email:'邮箱',password:'密码',name:'全名',
    birthdate:'出生日期',nationality:'国籍',gender:'性别',
    have_account:'已有账号？',no_account:'没有账号？',
    language:'语言',
    login_subtitle:'登录体验世界杯',
    register_subtitle:'创建账号 · 免费',
    select_gender:'选择性别',
    gender_male:'男',gender_female:'女',gender_other:'其他',gender_prefer_not:'不愿透露',
    continue_with:'或使用以下方式继续',
    sign_in:'登录',sign_up:'创建账号',
    live_matches:'直播赛事',next_matches:'即将开始',
    see_all:'查看全部 →',countdown_title:'倒计时',
    days:'天',hours:'小时',minutes:'分钟',seconds:'秒',
    wc_starts:'世界杯开幕',live_soon:'实时比分将显示在这里',
    live_now:'直播',updated_at:'更新于:',auto_refresh:'30秒自动刷新',
    live_info:'进球、黄牌和统计数据将实时更新。',
    wc_date:'2026年世界杯将于2026年6月11日开幕',
    wc_opening:'📍 开幕：阿兹特克球场 · 墨西哥城',
    matches_title:'赛程',all:'全部',today:'今天',tomorrow:'明天',
    venues:'官方球场',
    calendar_title:'赛程表',
    no_matches_today:'今天没有比赛',no_matches_tomorrow:'明天没有比赛',
    no_matches:'此期间没有比赛',
    today_live:'今天 · 进行中',
    table_title:'积分榜',group_stage:'小组赛阶段',
    top_goals:'进球最多',best_defense:'最佳防守',leader:'榜首',
    bracket_title:'淘汰赛对阵',auto_flags:'随着赛事推进自动显示国旗',
    champion:'世界冠军',
    team_col:'球队',advancing:'晋级',top_2_qualify:'前2名晋级16强',
    round_32:'32强',round_16:'16强',quarterfinals:'四分之一决赛',semifinals:'半决赛',
    goals_title:'射手榜',golden_boot:'2026世界杯金靴奖候选人',
    fourth_onwards:'第4名及以后',
    bets_title:'我的预测',long_term:'世界杯赛事',
    per_match:'按场次',specials:'特别预测',stats:'统计',
    world_champion:'世界冠军',golden_ball:'金球奖',
    buy_package:'购买预测套餐',price:'$30 MXN',
    pay_card:'银行卡',pay_oxxo:'OXXO',pay_transfer:'转账',
    pay_btn:'支付 $30 MXN',payment_success:'支付成功！',
    coins_added:'金币已添加到您的账户',
    world_champion_q:'哪支球队将举起奖杯？',
    top_scorer_q:'本届赛事最佳射手',
    best_player_q:'世界杯最佳球员',
    group_winners:'小组冠军',
    draw:'平局',goals_label:'进球',over:'大 +2.5',under:'小 -2.5',
    btts:'双方进球',both_score:'✓ 双方均进',not_both_score:'✗ 非双方',
    double_chance:'双重机会',exact_score:'精确比分',
    first_scorer:'首个进球者',handicap:'让球',
    save_prediction:'保存预测',prediction_saved:'预测已保存',
    coins_enough:'您的金币足以支付所有预测',
    insufficient_balance:'余额不足 · 购买另一个套餐',
    cancel:'取消',change:'更改',
    predictions_ready:'预测准备好保存',predictions_incomplete:'完成您的预测',
    best_scorers:'世界杯最佳射手',
    groups_title:'我的小组',create_group:'创建小组',join_group:'加入',
    join_code:'小组代码',group_name:'小组名称',
    ranking:'排名',predictions:'预测',members:'成员',
    report:'报告',chat:'聊天',lock:'锁定',
    group_code:'代码',copy:'复制',share_group:'分享小组',
    invite_friends:'邀请你的朋友',copied:'已复制！',
    no_members:'暂无成员',you:'你',points:'积分',
    delete_group:'删除小组',delete:'删除',
    locked_state:'🔒 已锁定',open_state:'⚡ 开放',view_group:'查看 →',
    write_message:'输入消息...',
    profile_title:'我的档案',share_app:'分享应用',
    admin_panel:'管理面板',registered:'已注册',with_package:'有套餐',
    gift_coins:'赠送金币',no_package:'无套餐',income:'收入',share_link:'分享链接',
    active_session:'会话活跃',my_account:'我的账户',
    loading:'加载中...',error:'错误',retry:'重试',
    tbd:'待定',active:'活跃',
  },
  ko:{
    nav_home:'홈',nav_matches:'경기',nav_table:'순위',
    nav_goals:'득점왕',nav_bets:'예측',nav_groups:'그룹',nav_profile:'프로필',
    login:'로그인',register:'회원가입',logout:'로그아웃',
    email:'이메일',password:'비밀번호',name:'이름',
    birthdate:'생년월일',nationality:'국적',gender:'성별',
    have_account:'계정이 있으신가요?',no_account:'계정이 없으신가요?',
    language:'언어',
    login_subtitle:'월드컵을 함께 즐기려면 로그인하세요',
    register_subtitle:'계정 만들기 · 무료',
    select_gender:'성별 선택',
    gender_male:'남성',gender_female:'여성',gender_other:'기타',gender_prefer_not:'말하고 싶지 않음',
    continue_with:'또는 계속하기',
    sign_in:'로그인',sign_up:'계정 만들기',
    live_matches:'실시간 경기',next_matches:'예정 경기',
    see_all:'전체 보기 →',countdown_title:'카운트다운',
    days:'일',hours:'시간',minutes:'분',seconds:'초',
    wc_starts:'월드컵 시작',live_soon:'실시간 점수가 여기에 표시됩니다',
    live_now:'생중계',updated_at:'업데이트:',auto_refresh:'30초 자동 새로고침',
    live_info:'골, 카드, 통계가 실시간으로 업데이트됩니다.',
    wc_date:'2026 월드컵은 2026년 6월 11일 시작됩니다',
    wc_opening:'📍 개막: 에스타디오 아스테카 · 멕시코시티',
    matches_title:'경기',all:'전체',today:'오늘',tomorrow:'내일',
    venues:'공식 경기장',
    calendar_title:'일정',
    no_matches_today:'오늘 경기 없음',no_matches_tomorrow:'내일 경기 없음',
    no_matches:'이 기간에 경기 없음',
    today_live:'오늘 · 진행 중',
    table_title:'순위표',group_stage:'조별 리그',
    top_goals:'최다 득점',best_defense:'최고 수비',leader:'선두',
    bracket_title:'토너먼트 대진표',auto_flags:'경기 진행에 따라 국기가 자동으로 표시됩니다',
    champion:'월드컵 우승팀',
    team_col:'팀',advancing:'진출',top_2_qualify:'상위 2팀이 16강 진출',
    round_32:'32강',round_16:'16강',quarterfinals:'8강',semifinals:'4강',
    goals_title:'득점왕',golden_boot:'2026 월드컵 골든 부트 후보',
    fourth_onwards:'4위 이후',
    bets_title:'내 예측',long_term:'월드컵 경기',
    per_match:'경기별',specials:'특별 예측',stats:'통계',
    world_champion:'월드 챔피언',golden_ball:'골든 볼',
    buy_package:'예측 패키지 구매',price:'$30 MXN',
    pay_card:'카드',pay_oxxo:'OXXO',pay_transfer:'이체',
    pay_btn:'$30 MXN 결제',payment_success:'결제 완료!',
    coins_added:'코인이 계정에 추가되었습니다',
    world_champion_q:'어떤 팀이 우승컵을 들어올릴까요?',
    top_scorer_q:'대회 최다 득점자',
    best_player_q:'월드컵 최우수 선수',
    group_winners:'조 우승팀',
    draw:'무승부',goals_label:'골',over:'오버 +2.5',under:'언더 -2.5',
    btts:'양팀 득점',both_score:'✓ 양팀 득점',not_both_score:'✗ 양팀 미득점',
    double_chance:'더블 찬스',exact_score:'정확한 스코어',
    first_scorer:'첫 번째 득점자',handicap:'핸디캡',
    save_prediction:'예측 저장',prediction_saved:'예측 저장됨',
    coins_enough:'모든 예측에 충분한 코인이 있습니다',
    insufficient_balance:'잔액 부족 · 패키지 추가 구매',
    cancel:'취소',change:'변경',
    predictions_ready:'저장 준비 완료',predictions_incomplete:'예측을 완료하세요',
    best_scorers:'월드컵 최다 득점자',
    groups_title:'내 그룹',create_group:'그룹 만들기',join_group:'참가',
    join_code:'그룹 코드',group_name:'그룹 이름',
    ranking:'순위',predictions:'예측',members:'멤버',
    report:'보고서',chat:'채팅',lock:'잠금',
    group_code:'코드',copy:'복사',share_group:'그룹 공유',
    invite_friends:'친구를 초대하세요',copied:'복사됨!',
    no_members:'아직 멤버 없음',you:'나',points:'점수',
    delete_group:'그룹 삭제',delete:'삭제',
    locked_state:'🔒 잠김',open_state:'⚡ 열림',view_group:'보기 →',
    write_message:'메시지를 입력하세요...',
    profile_title:'내 프로필',share_app:'앱 공유',
    admin_panel:'관리자 패널',registered:'등록됨',with_package:'패키지 보유',
    gift_coins:'코인 선물',no_package:'패키지 없음',income:'수입',share_link:'링크 공유',
    active_session:'세션 활성',my_account:'내 계정',
    loading:'로딩 중...',error:'오류',retry:'다시 시도',
    tbd:'미정',active:'활성',
  },
  fr:{
    nav_home:'Accueil',nav_matches:'Matchs',nav_table:'Classement',
    nav_goals:'Buteurs',nav_bets:'Pronostics',nav_groups:'Groupes',nav_profile:'Profil',
    login:'Se connecter',register:"S'inscrire",logout:'Se déconnecter',
    email:'Email',password:'Mot de passe',name:'Nom complet',
    birthdate:'Date de naissance',nationality:'Nationalité',gender:'Genre',
    have_account:'Déjà un compte?',no_account:'Pas de compte?',
    language:'Langue',
    login_subtitle:'Connectez-vous pour vivre la Coupe du Monde',
    register_subtitle:'Créez votre compte · Gratuit',
    select_gender:'Sélectionnez votre genre',
    gender_male:'Masculin',gender_female:'Féminin',gender_other:'Autre',gender_prefer_not:'Préfère ne pas dire',
    continue_with:'ou continuer avec',
    sign_in:'SE CONNECTER',sign_up:'CRÉER UN COMPTE',
    live_matches:'Matchs en Direct',next_matches:'Prochains Matchs',
    see_all:'Voir tout →',countdown_title:'Compte à Rebours',
    days:'jours',hours:'heures',minutes:'minutes',seconds:'secondes',
    wc_starts:'La Coupe du Monde commence',live_soon:'Les scores en direct apparaîtront ici',
    live_now:'EN DIRECT',updated_at:'Mis à jour:',auto_refresh:'Actualisation 30s',
    live_info:'Les buts, cartons et statistiques seront mis à jour en temps réel.',
    wc_date:'La Coupe du Monde 2026 commence le 11 juin 2026',
    wc_opening:'📍 Ouverture: Estadio Azteca · Mexico',
    matches_title:'MATCHS',all:'Tous',today:"Aujourd'hui",tomorrow:'Demain',
    venues:'Stades Officiels',
    calendar_title:'CALENDRIER',
    no_matches_today:"Pas de matchs aujourd'hui",no_matches_tomorrow:'Pas de matchs demain',
    no_matches:'Pas de matchs sur cette période',
    today_live:"AUJOURD'HUI · MATCHS EN COURS",
    table_title:'CLASSEMENT',group_stage:'Phase de groupes',
    top_goals:'Meilleur buteur',best_defense:'Meilleure défense',leader:'Leader',
    bracket_title:'TABLEAU ÉLIMINATOIRE',auto_flags:'Les drapeaux se mettent à jour automatiquement',
    champion:'CHAMPION DU MONDE',
    team_col:'Équipe',advancing:'QUAL',top_2_qualify:'Les 2 premiers se qualifient',
    round_32:'TOUR DE 32',round_16:'HUITIÈMES',quarterfinals:'QUARTS',semifinals:'DEMIS',
    goals_title:'BUTEURS',golden_boot:"Candidats au Soulier d'Or de la Coupe 2026",
    fourth_onwards:'4e ET PLUS',
    bets_title:'MES PRONOSTICS',long_term:'Matchs Coupe du Monde',
    per_match:'Par Match',specials:'Spéciaux',stats:'Statistiques',
    world_champion:'Champion du Monde',golden_ball:"Ballon d'Or",
    buy_package:'Acheter un Pack de Pronostics',price:'$30 MXN',
    pay_card:'Carte',pay_oxxo:'OXXO',pay_transfer:'Virement',
    pay_btn:'Payer $30 MXN',payment_success:'PAIEMENT RÉUSSI!',
    coins_added:'pièces ajoutées à votre compte',
    world_champion_q:'Quelle équipe soulèvera le trophée?',
    top_scorer_q:'Meilleur buteur du tournoi',
    best_player_q:'Meilleur joueur de la Coupe du Monde',
    group_winners:'VAINQUEURS DE GROUPE',
    draw:'Match nul',goals_label:'BUTS',over:'Plus +2.5',under:'Moins -2.5',
    btts:'Les deux marquent',both_score:'✓ Les deux marquent',not_both_score:'✗ Pas les deux',
    double_chance:'DOUBLE CHANCE',exact_score:'SCORE EXACT',
    first_scorer:'PREMIER BUTEUR',handicap:'HANDICAP',
    save_prediction:'ENREGISTRER LE PRONOSTIC',prediction_saved:'PRONOSTIC ENREGISTRÉ',
    coins_enough:'Vous avez assez de pièces pour tous vos pronostics',
    insufficient_balance:'Solde insuffisant · Achetez un autre pack',
    cancel:'Annuler',change:'Modifier',
    predictions_ready:'PRONOSTIC PRÊT À ENREGISTRER',predictions_incomplete:'COMPLÉTEZ VOS PRONOSTICS',
    best_scorers:'MEILLEURS BUTEURS DE LA COUPE',
    groups_title:'MES GROUPES',create_group:'Créer un Groupe',join_group:'Rejoindre',
    join_code:'Code du groupe',group_name:'Nom du groupe',
    ranking:'Classement',predictions:'Pronostics',members:'Membres',
    report:'Rapport',chat:'Chat',lock:'Verrouiller',
    group_code:'Code',copy:'Copier',share_group:'Partager le groupe',
    invite_friends:'Invitez vos amis',copied:'Copié!',
    no_members:'Pas encore de membres',you:'MOI',points:'POINTS',
    delete_group:'SUPPRIMER LE GROUPE',delete:'Supprimer',
    locked_state:'🔒 Verrouillé',open_state:'⚡ Ouvert',view_group:'Voir →',
    write_message:'Écrire un message...',
    profile_title:'MON PROFIL',share_app:"Partager l'App",
    admin_panel:'PANNEAU ADMIN',registered:'Inscrits',with_package:'Avec forfait',
    gift_coins:'Pièces offertes',no_package:'Sans forfait',income:'Revenus',share_link:'Partager le lien',
    active_session:'Session active',my_account:'MON COMPTE',
    loading:'Chargement...',error:'Erreur',retry:'Réessayer',
    tbd:'À déterminer',active:'Actif',
  },
};

// ── Auto-detect language from nationality ──────────────────────
const LANG_BY_NAT={
  // Spanish
  'México':'es','España':'es','Argentina':'es','Colombia':'es','Chile':'es',
  'Venezuela':'es','Perú':'es','Ecuador':'es','Bolivia':'es','Uruguay':'es',
  'Paraguay':'es','Cuba':'es','Guatemala':'es','Honduras':'es','Nicaragua':'es',
  'Costa Rica':'es','Panamá':'es','Rep. Dominicana':'es','Puerto Rico':'es',
  // English
  'Estados Unidos':'en','USA':'en','Canadá':'en','Reino Unido':'en',
  'Australia':'en','Nueva Zelanda':'en','Jamaica':'en','Trinidad':'en',
  // Portuguese
  'Brasil':'pt','Portugal':'pt','Angola':'pt','Mozambique':'pt',
  // French
  'Francia':'fr','Bélgica':'fr','Suiza':'fr','Senegal':'fr','Costa de Marfil':'fr',
  'Marruecos':'fr','Argelia':'fr','Túnez':'fr','Haití':'fr','Camerún':'fr',
  // Korean
  'Corea del Sur':'ko','Rep. de Corea':'ko',
};

const LANG_FLAGS={'es':'🇲🇽','en':'🇺🇸','pt':'🇧🇷','fr':'🇫🇷','zh':'🇨🇳','ko':'🇰🇷'};
const LANG_NAMES={'es':'Español','en':'English','pt':'Português','fr':'Français','zh':'中文','ko':'한국어'};

// React Context for language
const LangCtx=createContext((k)=>TRANSLATIONS.es[k]||k);
const useLang=()=>useContext(LangCtx);

// API-Football: peticiones proxeadas por el backend (clave solo en servidor)
const WC_ID     = 1;   // FIFA World Cup league ID
const WC_SEASON = 2026;

// ── API fetch helper — usa proxy del servidor ─────────
const afFetch = async (endpoint) => {
  try {
    const r = await fetch(`/api/af${endpoint}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return d.response || null;
  } catch(e) { console.warn('API-Football proxy error:', e); return null; }
};

// ── Transformers: API response → formato de la app ──
const afFixtureToLive = f => ({
  id:     f.fixture.id,
  home:   f.teams.home.name,
  away:   f.teams.away.name,
  hs:     f.goals.home ?? 0,
  as:     f.goals.away ?? 0,
  min:    f.fixture.status.elapsed ?? 0,
  phase:  f.league.round,
  venue:  f.fixture.venue.name,
  city:   f.fixture.venue.city,
  events: [],
  homeFlag: f.teams.home.logo,
  awayFlag: f.teams.away.logo,
});

const afFixtureToNext = f => ({
  id:      f.fixture.id,
  home:    f.teams.home.name,
  away:    f.teams.away.name,
  isoDate: f.fixture.date.slice(0,10),
  date:    new Date(f.fixture.date).toLocaleDateString('es',{day:'numeric',month:'short'}),
  time:    new Date(f.fixture.date).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}),
  phase:   f.league.round,
  venue:   f.fixture.venue.name,
  city:    f.fixture.venue.city,
  wx:      {ic:'🌤️', desc:'Datos en vivo', t:'--°C'},
  odds:    [],
});

const afScorer = (p,i) => ({
  n:     p.player.name,
  team:  p.statistics[0]?.team?.name || '',
  g:     p.statistics[0]?.goals?.total || 0,
  a:     p.statistics[0]?.goals?.assists || 0,
  debut: '', ori: '',
  bio:   `${p.player.nationality} · ${p.player.age} años`,
  wiki:  null,
  photo: p.player.photo,
});

const afStandings = groups => groups.map(group => ({
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


const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#09091a;--surf:#0f0f24;--surf2:#14142e;--surf3:#1a1a38;
  --gold:#F0A500;--gold2:#C88500;--acc:#4F8EF7;
  --grn:#1EC66C;--red:#c8102e;--ylw:#FFCC00;
  --txt:#F0F4FF;--muted:#6B82AF;--dim:#8A9BC9;
  --br:rgba(255,255,255,0.07);--r:16px;
  --ff:'Bebas Neue',sans-serif;--fb:'DM Sans',sans-serif;
  --shadow:0 4px 24px rgba(0,0,0,.5);
  --glow:0 0 24px rgba(240,165,0,.22);
}
body{font-family:var(--fb);background:var(--bg);color:var(--txt);height:100%;overflow:hidden;}
.app{max-width:430px;margin:0 auto;height:100vh;overflow:hidden;display:flex;flex-direction:column;position:relative;isolation:isolate;
  background:
    url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='430' height='900'><filter id='r' x='-80%' y='-80%' width='260%' height='260%'><feGaussianBlur stdDeviation='52'/></filter><path d='M-90,-50 C70,-100 330,-15 410,55 C320,195 195,335 30,380 C-60,340 -90,235 -90,-50Z' fill='%23C8102E' opacity='.5' filter='url(%23r)'/><path d='M-40,380 C30,360 130,370 90,460 C60,530 -40,490 -40,380Z' fill='%23C8102E' opacity='.25' filter='url(%23r)'/></svg>"),
    url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='430' height='900'><filter id='g' x='-80%' y='-80%' width='260%' height='260%'><feGaussianBlur stdDeviation='48'/></filter><path d='M520,-50 C350,-100 95,-15 20,55 C110,195 240,325 410,375 C490,335 520,235 520,-50Z' fill='%23006847' opacity='.45' filter='url(%23g)'/><path d='M470,370 C400,350 300,365 350,455 C380,525 470,490 470,370Z' fill='%23006847' opacity='.22' filter='url(%23g)'/></svg>"),
    url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='430' height='900'><filter id='b' x='-80%' y='-80%' width='260%' height='260%'><feGaussianBlur stdDeviation='58'/></filter><path d='M-80,950 C40,640 125,665 215,648 C305,665 390,640 510,950Z' fill='%23002868' opacity='.58' filter='url(%23b)'/><path d='M60,648 C120,580 310,580 370,648 C320,700 110,700 60,648Z' fill='%23002868' opacity='.30' filter='url(%23b)'/></svg>"),
    linear-gradient(175deg,#0f0f24 0%,#09091a 50%,#0d060f 100%);
  background-size:100% 100%;background-repeat:no-repeat;}
.app::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,#c8102e 0%,#c8102e 28%,#F0A500 50%,#006847 72%,#002868 100%);
  z-index:200;opacity:.6;}
.scr{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:84px;}
.scr::-webkit-scrollbar{display:none;}
.bnav{position:absolute;bottom:0;left:0;right:0;height:76px;
  background:rgba(6,14,28,0.97);border-top:1px solid rgba(240,165,0,0.12);
  display:flex;align-items:center;justify-content:space-around;
  padding:0 4px 6px;z-index:100;backdrop-filter:blur(28px);
  box-shadow:0 -6px 24px rgba(0,0,0,.4);}
.nitem{display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:6px 2px;border-radius:12px;cursor:pointer;transition:all .25s;flex:1;}
.nitem.on{background:rgba(240,165,0,0.08);}
.nicon{font-size:20px;transition:transform .25s;}
.nitem.on .nicon{transform:scale(1.12);}
.nlbl{font-size:9px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:var(--muted);}
.nitem.on .nlbl{color:var(--gold);}
.live{display:inline-flex;align-items:center;gap:5px;
  background:linear-gradient(135deg,#c8102e,#8b0e20);color:#fff;
  font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;
  letter-spacing:1.5px;text-transform:uppercase;
  box-shadow:0 2px 12px rgba(200,16,46,.45);}
.ldot{width:6px;height:6px;background:#fff;border-radius:50%;animation:blink 1s infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:.2;}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes fin{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slidein{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes popbadge{0%{transform:scale(0)}80%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}
@keyframes pulse{0%,100%{box-shadow:var(--glow)}50%{box-shadow:0 0 32px rgba(240,165,0,.3)}}
@keyframes marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
.marquee-wrap{overflow:hidden;white-space:nowrap;background:linear-gradient(90deg,rgba(200,16,46,.12),rgba(240,165,0,.08));border-top:1px solid rgba(240,165,0,.2);border-bottom:1px solid rgba(240,165,0,.2);padding:8px 0;}
.marquee-text{display:inline-block;padding-left:100%;font-size:13px;font-weight:700;color:var(--gold);animation-name:marquee;animation-timing-function:linear;animation-iteration-count:infinite;}
.marquee-text:hover{animation-play-state:paused;}
.fin{animation:fin .35s ease forwards;}
.inp{width:100%;background:var(--surf2);border:1.5px solid var(--br);
  border-radius:12px;padding:14px 16px;color:var(--txt);font-family:var(--fb);
  font-size:15px;outline:none;transition:border-color .2s,box-shadow .2s;}
.inp:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(240,165,0,.1);}
.inp::placeholder{color:var(--muted);}
.btn{width:100%;background:linear-gradient(135deg,#F0A500,#C88500);
  color:#000;border:none;border-radius:14px;padding:15px;
  font-family:var(--ff);font-size:20px;letter-spacing:1px;cursor:pointer;
  transition:all .18s;font-weight:400;
  box-shadow:0 4px 18px rgba(240,165,0,.35);}
.btn:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 6px 24px rgba(240,165,0,.45);}
.btn:active{transform:scale(.98) translateY(0);}
.btng{width:100%;background:var(--surf2);color:var(--txt);border:1.5px solid var(--br);border-radius:12px;padding:14px;font-family:var(--fb);font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .2s;}
.btng:hover{border-color:var(--gold);background:var(--surf3);}
.tpill{flex-shrink:0;padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;background:var(--surf2);color:var(--muted);border:1.5px solid transparent;transition:all .2s;font-family:var(--fb);}
.tpill.on{background:rgba(240,165,0,.12);color:var(--gold);border-color:rgba(240,165,0,.4);}
.mc{margin:0 16px 12px;border-radius:var(--r);border:1px solid rgba(255,255,255,0.08);overflow:hidden;cursor:pointer;transition:transform .15s,border-color .2s,box-shadow .2s;
  background:
    radial-gradient(ellipse 90% 65% at 0% 100%, rgba(0,104,71,0.16) 0%,transparent 50%),
    radial-gradient(ellipse 90% 65% at 100% 0%, rgba(200,16,46,0.14) 0%,transparent 50%),
    var(--surf);
  box-shadow:0 1px 0 rgba(200,16,46,0.08) inset,0 -1px 0 rgba(0,104,71,0.08) inset;}
.mc:hover{transform:scale(1.015);border-color:rgba(240,165,0,.4);
  box-shadow:
    0 6px 32px rgba(0,0,0,.45),
    0 0 28px rgba(200,16,46,.15),
    0 0 28px rgba(0,40,104,.14),
    0 1px 0 rgba(200,16,46,0.12) inset,
    0 -1px 0 rgba(0,104,71,0.12) inset;}
.mc:active{transform:scale(.99);}
`;

const FLAGS={
  // Grupos A-D
  'México':'🇲🇽','Corea del Sur':'🇰🇷','Sudáfrica':'🇿🇦','Playoff UEFA B':'🏳',
  'Canadá':'🇨🇦','Suiza':'🇨🇭','Qatar':'🇶🇦','Bosnia-Herzegovina':'🇧🇦',
  'Brasil':'🇧🇷','Marruecos':'🇲🇦','Escocia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Haití':'🇭🇹',
  'USA':'🇺🇸','Australia':'🇦🇺','Paraguay':'🇵🇾','Türkiye':'🇹🇷',
  // Grupos E-H
  'Alemania':'🇩🇪','Ecuador':'🇪🇨','Costa de Marfil':'🇨🇮','Curazao':'🇨🇼',
  'Países Bajos':'🇳🇱','Japón':'🇯🇵','Túnez':'🇹🇳','Playoff UEFA F':'🏳',
  'Bélgica':'🇧🇪','Irán':'🇮🇷','Egipto':'🇪🇬','Nueva Zelanda':'🇳🇿',
  'España':'🇪🇸','Uruguay':'🇺🇾','Arabia Saudita':'🇸🇦','Cabo Verde':'🇨🇻',
  // Grupos I-L
  'Francia':'🇫🇷','Senegal':'🇸🇳','Noruega':'🇳🇴','Playoff AFC':'🏳',
  'Argentina':'🇦🇷','Austria':'🇦🇹','Argelia':'🇩🇿','Jordania':'🇯🇴',
  'Portugal':'🇵🇹','Colombia':'🇨🇴','Uzbekistán':'🇺🇿','Playoff Concacaf':'🏳',
  'Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croacia':'🇭🇷','Panamá':'🇵🇦','Ghana':'🇬🇭',
  // Equipos confirmados sorteo oficial
  'Polonia':'🇵🇱','Serbia':'🇷🇸','Chile':'🇨🇱',
  'Irak':'🇮🇶','Dinamarca':'🇩🇰','Bolivia':'🇧🇴','Surinam':'🇸🇷',
  'Rep. de Corea':'🇰🇷','República Checa':'🇨🇿','Suecia':'🇸🇪',
  'Congo DR':'🇨🇩','Kosovo':'🇽🇰','Italia':'🇮🇹',
  'Bosnia y Herzegovina':'🇧🇦','Turquía':'🇹🇷',
};
const COLS={
  'Brasil':'#F9D902','Argentina':'#74ACDF','Francia':'#4169E1','Alemania':'#ddd',
  'España':'#AA151B','Portugal':'#006600','Inglaterra':'#CF081F','Uruguay':'#5EB6E4',
  'México':'#006847','USA':'#B22234','Canadá':'#FF0000','Países Bajos':'#FF6600',
  'Bélgica':'#EF3340','Croacia':'#FF3333','Japón':'#BC002D','Marruecos':'#C1272D',
  'Colombia':'#FCD116','Ecuador':'#FFD100','Polonia':'#DC143C','Noruega':'#EF2B2D',
  'Senegal':'#00853F','Ghana':'#006B3F','Corea del Sur':'#CD2E3A','Sudáfrica':'#007A4D',
  'Escocia':'#003DA5','Haití':'#00209F','Qatar':'#8D1B3D','Suiza':'#FF0000',
  'Bosnia-Herzegovina':'#002395','Australia':'#00843D','Paraguay':'#D52B1E',
  'Türkiye':'#E30A17','Costa de Marfil':'#F77F00','Curazao':'#003DA5',
  'Túnez':'#E70013','Irán':'#239F40','Egipto':'#CE1126','Nueva Zelanda':'#00247D',
  'Arabia Saudita':'#006C35','Cabo Verde':'#003893','Argelia':'#006233',
  'Jordania':'#007A3D','Austria':'#ED2939','Uzbekistán':'#1EB53A',
  'Panamá':'#DA121A',
};

const LIVE_MATCHES=[];
// Live match data will be populated by sports API (SportRadar / API-Football)
// when the World Cup begins on June 11, 2026.
const NEXT_MATCHES=[
  // ══ JORNADA 1 ══════════════════════════════════════════════════
  // Jue 11 Jun
  {id:1,  home:'México',              away:'Sudáfrica',           isoDate:'2026-06-11',date:'Jun 11',time:'13:00',phase:'Grupo A · J1 · P1',  venue:'Estadio Azteca',                  city:'Tlalpan, CDMX',        wx:{ic:'⛅',desc:'Parcialmente nublado',t:'18°C'},odds:[1.8,3.5,4.5]},
  {id:2,  home:'Corea del Sur',       away:'República Checa',     isoDate:'2026-06-11',date:'Jun 11',time:'20:00',phase:'Grupo A · J1 · P2',  venue:'Estadio Guadalajara',             city:'Zapopan, Jalisco',     wx:{ic:'☀️',desc:'Soleado',t:'28°C'},            odds:[2.2,3.1,3.0]},
  // Vie 12 Jun
  {id:3,  home:'Canadá',              away:'Bosnia y Herzegovina',isoDate:'2026-06-12',date:'Jun 12',time:'13:00',phase:'Grupo B · J1 · P3',  venue:'Toronto Stadium',                 city:'Toronto, Ontario',     wx:{ic:'🌤️',desc:'Agradable',t:'22°C'},         odds:[1.9,3.4,4.0]},
  {id:4,  home:'USA',                 away:'Paraguay',            isoDate:'2026-06-12',date:'Jun 12',time:'19:00',phase:'Grupo D · J1 · P4',  venue:'Los Angeles Stadium',             city:'Inglewood, California',wx:{ic:'☀️',desc:'Soleado',t:'27°C'},            odds:[1.7,3.5,4.8]},
  // Sáb 13 Jun
  {id:5,  home:'Qatar',               away:'Suiza',               isoDate:'2026-06-13',date:'Jun 13',time:'13:00',phase:'Grupo B · J1 · P5',  venue:'San Francisco Bay Area Stadium',  city:'Santa Clara, CA',      wx:{ic:'🌫️',desc:'Neblina costera',t:'16°C'},    odds:[5.0,3.8,1.6]},
  {id:6,  home:'Brasil',              away:'Marruecos',           isoDate:'2026-06-13',date:'Jun 13',time:'16:00',phase:'Grupo C · J1 · P6',  venue:'New York New Jersey Stadium',     city:'East Rutherford, NJ',  wx:{ic:'🌤️',desc:'Mayormente soleado',t:'23°C'},odds:[1.4,4.0,7.5]},
  {id:7,  home:'Haití',               away:'Escocia',             isoDate:'2026-06-13',date:'Jun 13',time:'19:00',phase:'Grupo C · J1 · P7',  venue:'Boston Stadium',                  city:'Foxborough, MA',       wx:{ic:'🌥️',desc:'Nublado',t:'19°C'},           odds:[4.0,3.2,1.9]},
  {id:8,  home:'Australia',           away:'Turquía',             isoDate:'2026-06-13',date:'Jun 13',time:'22:00',phase:'Grupo D · J1 · P8',  venue:'BC Place',                        city:'Vancouver, BC',        wx:{ic:'🌧️',desc:'Lluvia ligera',t:'16°C'},     odds:[2.0,3.3,3.5]},
  // Dom 14 Jun
  {id:9,  home:'Alemania',            away:'Curazao',             isoDate:'2026-06-14',date:'Jun 14',time:'11:00',phase:'Grupo E · J1 · P9',  venue:'Houston Stadium',                 city:'Houston, Texas',       wx:{ic:'☀️',desc:'Caluroso',t:'34°C'},           odds:[1.2,6.0,18.0]},
  {id:10, home:'Países Bajos',        away:'Japón',               isoDate:'2026-06-14',date:'Jun 14',time:'14:00',phase:'Grupo F · J1 · P10', venue:'Dallas Stadium',                  city:'Arlington, Texas',     wx:{ic:'☀️',desc:'Despejado',t:'31°C'},          odds:[1.6,3.8,5.5]},
  {id:11, home:'Costa de Marfil',     away:'Ecuador',             isoDate:'2026-06-14',date:'Jun 14',time:'17:00',phase:'Grupo E · J1 · P11', venue:'Philadelphia Stadium',            city:'Filadelfia, PA',       wx:{ic:'🌤️',desc:'Soleado parcial',t:'25°C'},   odds:[2.2,3.1,3.0]},
  {id:12, home:'Suecia',              away:'Túnez',               isoDate:'2026-06-14',date:'Jun 14',time:'20:00',phase:'Grupo F · J1 · P12', venue:'Estadio Monterrey',               city:'Guadalupe, Monterrey', wx:{ic:'⛅',desc:'Caluroso',t:'32°C'},           odds:[2.0,3.2,3.5]},
  // Lun 15 Jun
  {id:13, home:'España',              away:'Cabo Verde',          isoDate:'2026-06-15',date:'Jun 15',time:'10:00',phase:'Grupo H · J1 · P13', venue:'Atlanta Stadium',                 city:'Atlanta, Georgia',     wx:{ic:'🌤️',desc:'Caluroso',t:'31°C'},          odds:[1.2,6.5,20.0]},
  {id:14, home:'Bélgica',             away:'Egipto',              isoDate:'2026-06-15',date:'Jun 15',time:'13:00',phase:'Grupo G · J1 · P14', venue:'Seattle Stadium',                 city:'Seattle, WA',          wx:{ic:'🌧️',desc:'Lluvia',t:'16°C'},            odds:[1.5,3.8,6.5]},
  {id:15, home:'Arabia Saudita',      away:'Uruguay',             isoDate:'2026-06-15',date:'Jun 15',time:'16:00',phase:'Grupo H · J1 · P15', venue:'Miami Stadium',                   city:'Miami Gardens, FL',    wx:{ic:'⛈️',desc:'Tormenta',t:'30°C'},          odds:[4.5,3.4,1.8]},
  {id:16, home:'Irán',                away:'Nueva Zelanda',       isoDate:'2026-06-15',date:'Jun 15',time:'19:00',phase:'Grupo G · J1 · P16', venue:'Los Angeles Stadium',             city:'Inglewood, CA',        wx:{ic:'☀️',desc:'Soleado',t:'27°C'},            odds:[1.8,3.2,4.0]},
  // Mar 16 Jun
  {id:17, home:'Francia',             away:'Senegal',             isoDate:'2026-06-16',date:'Jun 16',time:'13:00',phase:'Grupo I · J1 · P17', venue:'New York New Jersey Stadium',     city:'East Rutherford, NJ',  wx:{ic:'🌤️',desc:'Agradable',t:'23°C'},         odds:[1.5,3.8,6.5]},
  {id:18, home:'Irak',                away:'Noruega',             isoDate:'2026-06-16',date:'Jun 16',time:'16:00',phase:'Grupo I · J1 · P18', venue:'Boston Stadium',                  city:'Foxborough, MA',       wx:{ic:'⛅',desc:'Nublado',t:'20°C'},            odds:[7.0,4.0,1.4]},
  {id:19, home:'Argentina',           away:'Argelia',             isoDate:'2026-06-16',date:'Jun 16',time:'19:00',phase:'Grupo J · J1 · P19', venue:'Kansas City Stadium',             city:'Kansas City, MO',      wx:{ic:'⛅',desc:'Parcialmente nublado',t:'27°C'},odds:[1.3,5.5,12.0]},
  {id:20, home:'Austria',             away:'Jordania',            isoDate:'2026-06-16',date:'Jun 16',time:'22:00',phase:'Grupo J · J1 · P20', venue:'San Francisco Bay Area Stadium',  city:'Santa Clara, CA',      wx:{ic:'🌫️',desc:'Neblina costera',t:'15°C'},   odds:[1.5,3.8,6.0]},
  // Mié 17 Jun
  {id:21, home:'Portugal',            away:'Congo DR',            isoDate:'2026-06-17',date:'Jun 17',time:'11:00',phase:'Grupo K · J1 · P21', venue:'Houston Stadium',                 city:'Houston, Texas',       wx:{ic:'☀️',desc:'Caluroso',t:'35°C'},           odds:[1.2,6.0,20.0]},
  {id:22, home:'Inglaterra',          away:'Croacia',             isoDate:'2026-06-17',date:'Jun 17',time:'14:00',phase:'Grupo L · J1 · P22', venue:'Dallas Stadium',                  city:'Arlington, Texas',     wx:{ic:'☀️',desc:'Muy caluroso',t:'33°C'},       odds:[1.6,3.6,5.5]},
  {id:23, home:'Ghana',               away:'Panamá',              isoDate:'2026-06-17',date:'Jun 17',time:'17:00',phase:'Grupo L · J1 · P23', venue:'Toronto Stadium',                 city:'Toronto, Ontario',     wx:{ic:'🌤️',desc:'Agradable',t:'20°C'},         odds:[2.2,3.2,3.0]},
  {id:24, home:'Uzbekistán',          away:'Colombia',            isoDate:'2026-06-17',date:'Jun 17',time:'20:00',phase:'Grupo K · J1 · P24', venue:'Estadio Azteca',                  city:'Tlalpan, CDMX',        wx:{ic:'⛅',desc:'Nublado',t:'19°C'},            odds:[3.5,3.5,2.0]},

  // ══ JORNADA 2 ══════════════════════════════════════════════════
  // Jue 18 Jun
  {id:25, home:'República Checa',     away:'Sudáfrica',           isoDate:'2026-06-18',date:'Jun 18',time:'10:00',phase:'Grupo A · J2',venue:'Atlanta Stadium',                 city:'Atlanta, Georgia',     wx:{ic:'🌤️',desc:'Caluroso',t:'30°C'},          odds:[2.2,3.2,2.8]},
  {id:26, home:'Suiza',               away:'Bosnia y Herzegovina',isoDate:'2026-06-18',date:'Jun 18',time:'13:00',phase:'Grupo B · J2',venue:'Los Angeles Stadium',             city:'Inglewood, California',wx:{ic:'☀️',desc:'Soleado',t:'26°C'},            odds:[1.7,3.5,4.5]},
  {id:27, home:'Canadá',              away:'Qatar',               isoDate:'2026-06-18',date:'Jun 18',time:'16:00',phase:'Grupo B · J2',venue:'BC Place',                        city:'Vancouver, BC',        wx:{ic:'🌧️',desc:'Lluvia',t:'16°C'},            odds:[1.8,3.4,4.5]},
  {id:28, home:'México',              away:'Corea del Sur',       isoDate:'2026-06-18',date:'Jun 18',time:'19:00',phase:'Grupo A · J2',venue:'Estadio Guadalajara',             city:'Zapopan, Jalisco',     wx:{ic:'⛅',desc:'Agradable',t:'25°C'},          odds:[1.4,3.8,6.5]},
  // Vie 19 Jun
  {id:29, home:'USA',                 away:'Australia',           isoDate:'2026-06-19',date:'Jun 19',time:'13:00',phase:'Grupo D · J2',venue:'Seattle Stadium',                 city:'Seattle, WA',          wx:{ic:'🌤️',desc:'Fresco',t:'18°C'},            odds:[1.6,3.5,5.0]},
  {id:30, home:'Escocia',             away:'Marruecos',           isoDate:'2026-06-19',date:'Jun 19',time:'16:00',phase:'Grupo C · J2',venue:'Boston Stadium',                  city:'Foxborough, MA',       wx:{ic:'🌥️',desc:'Nublado',t:'18°C'},           odds:[3.0,3.2,2.3]},
  {id:31, home:'Brasil',              away:'Haití',               isoDate:'2026-06-19',date:'Jun 19',time:'19:00',phase:'Grupo C · J2',venue:'Philadelphia Stadium',            city:'Filadelfia, PA',       wx:{ic:'🌤️',desc:'Agradable',t:'25°C'},         odds:[1.2,6.0,18.0]},
  {id:32, home:'Turquía',             away:'Paraguay',            isoDate:'2026-06-19',date:'Jun 19',time:'22:00',phase:'Grupo D · J2',venue:'San Francisco Bay Area Stadium',  city:'Santa Clara, CA',      wx:{ic:'🌫️',desc:'Neblina',t:'15°C'},           odds:[2.0,3.3,3.5]},
  // Sáb 20 Jun
  {id:33, home:'Países Bajos',        away:'Suecia',              isoDate:'2026-06-20',date:'Jun 20',time:'11:00',phase:'Grupo F · J2',venue:'Houston Stadium',                 city:'Houston, Texas',       wx:{ic:'☀️',desc:'Caluroso',t:'34°C'},           odds:[1.5,3.6,6.0]},
  {id:34, home:'Alemania',            away:'Costa de Marfil',     isoDate:'2026-06-20',date:'Jun 20',time:'14:00',phase:'Grupo E · J2',venue:'Toronto Stadium',                 city:'Toronto, Ontario',     wx:{ic:'🌤️',desc:'Agradable',t:'22°C'},         odds:[1.4,4.0,7.0]},
  {id:35, home:'Ecuador',             away:'Curazao',             isoDate:'2026-06-20',date:'Jun 20',time:'18:00',phase:'Grupo E · J2',venue:'Kansas City Stadium',             city:'Kansas City, MO',      wx:{ic:'⛅',desc:'Nublado',t:'26°C'},            odds:[1.5,4.0,7.0]},
  {id:36, home:'Túnez',               away:'Japón',               isoDate:'2026-06-20',date:'Jun 20',time:'22:00',phase:'Grupo F · J2',venue:'Estadio Monterrey',               city:'Guadalupe, Monterrey', wx:{ic:'⛅',desc:'Caluroso',t:'30°C'},           odds:[2.5,3.2,2.8]},
  // Dom 21 Jun
  {id:37, home:'España',              away:'Arabia Saudita',      isoDate:'2026-06-21',date:'Jun 21',time:'10:00',phase:'Grupo H · J2',venue:'Atlanta Stadium',                 city:'Atlanta, Georgia',     wx:{ic:'🌤️',desc:'Caluroso',t:'31°C'},          odds:[1.3,5.5,10.0]},
  {id:38, home:'Bélgica',             away:'Irán',                isoDate:'2026-06-21',date:'Jun 21',time:'13:00',phase:'Grupo G · J2',venue:'Los Angeles Stadium',             city:'Inglewood, CA',        wx:{ic:'☀️',desc:'Soleado',t:'27°C'},            odds:[1.4,4.0,7.5]},
  {id:39, home:'Uruguay',             away:'Cabo Verde',          isoDate:'2026-06-21',date:'Jun 21',time:'16:00',phase:'Grupo H · J2',venue:'Miami Stadium',                   city:'Miami Gardens, FL',    wx:{ic:'🌤️',desc:'Caluroso',t:'30°C'},          odds:[1.4,3.8,7.0]},
  {id:40, home:'Nueva Zelanda',       away:'Egipto',              isoDate:'2026-06-21',date:'Jun 21',time:'19:00',phase:'Grupo G · J2',venue:'BC Place',                        city:'Vancouver, BC',        wx:{ic:'🌥️',desc:'Nublado',t:'16°C'},           odds:[3.5,3.2,2.0]},
  // Lun 22 Jun
  {id:41, home:'Argentina',           away:'Austria',             isoDate:'2026-06-22',date:'Jun 22',time:'11:00',phase:'Grupo J · J2',venue:'Dallas Stadium',                  city:'Arlington, Texas',     wx:{ic:'☀️',desc:'Caluroso',t:'33°C'},           odds:[1.3,5.5,12.0]},
  {id:42, home:'Francia',             away:'Irak',                isoDate:'2026-06-22',date:'Jun 22',time:'15:00',phase:'Grupo I · J2',venue:'Philadelphia Stadium',            city:'Filadelfia, PA',       wx:{ic:'🌤️',desc:'Agradable',t:'26°C'},         odds:[1.4,4.5,8.0]},
  {id:43, home:'Noruega',             away:'Senegal',             isoDate:'2026-06-22',date:'Jun 22',time:'18:00',phase:'Grupo I · J2',venue:'New York New Jersey Stadium',     city:'East Rutherford, NJ',  wx:{ic:'🌤️',desc:'Agradable',t:'24°C'},         odds:[1.6,3.5,5.5]},
  {id:44, home:'Jordania',            away:'Argelia',             isoDate:'2026-06-22',date:'Jun 22',time:'21:00',phase:'Grupo J · J2',venue:'San Francisco Bay Area Stadium',  city:'Santa Clara, CA',      wx:{ic:'🌫️',desc:'Neblina',t:'15°C'},           odds:[3.5,3.2,2.0]},
  // Mar 23 Jun
  {id:45, home:'Portugal',            away:'Uzbekistán',          isoDate:'2026-06-23',date:'Jun 23',time:'11:00',phase:'Grupo K · J2',venue:'Houston Stadium',                 city:'Houston, Texas',       wx:{ic:'☀️',desc:'Caluroso',t:'34°C'},           odds:[1.2,6.0,18.0]},
  {id:46, home:'Inglaterra',          away:'Ghana',               isoDate:'2026-06-23',date:'Jun 23',time:'14:00',phase:'Grupo L · J2',venue:'Boston Stadium',                  city:'Foxborough, MA',       wx:{ic:'⛅',desc:'Agradable',t:'22°C'},           odds:[1.5,3.8,6.0]},
  {id:47, home:'Panamá',              away:'Croacia',             isoDate:'2026-06-23',date:'Jun 23',time:'17:00',phase:'Grupo L · J2',venue:'Toronto Stadium',                 city:'Toronto, Ontario',     wx:{ic:'🌤️',desc:'Agradable',t:'21°C'},         odds:[4.0,3.2,1.9]},
  {id:48, home:'Colombia',            away:'Congo DR',            isoDate:'2026-06-23',date:'Jun 23',time:'20:00',phase:'Grupo K · J2',venue:'Estadio Guadalajara',             city:'Zapopan, Jalisco',     wx:{ic:'⛅',desc:'Agradable',t:'26°C'},          odds:[1.5,4.0,6.0]},

  // ══ JORNADA 3 (simultáneos) ════════════════════════════════════
  // Mié 24 Jun
  {id:49, home:'Suiza',               away:'Canadá',              isoDate:'2026-06-24',date:'Jun 24',time:'13:00',phase:'Grupo B · J3',venue:'BC Place',                        city:'Vancouver, BC',        wx:{ic:'🌤️',desc:'Agradable',t:'18°C'},         odds:[1.8,3.3,4.5]},
  {id:50, home:'Bosnia y Herzegovina',away:'Qatar',               isoDate:'2026-06-24',date:'Jun 24',time:'13:00',phase:'Grupo B · J3',venue:'Seattle Stadium',                 city:'Seattle, WA',          wx:{ic:'🌤️',desc:'Fresco',t:'17°C'},            odds:[1.6,3.5,5.5]},
  {id:51, home:'Escocia',             away:'Brasil',              isoDate:'2026-06-24',date:'Jun 24',time:'16:00',phase:'Grupo C · J3',venue:'Miami Stadium',                   city:'Miami Gardens, FL',    wx:{ic:'⛅',desc:'Caluroso',t:'30°C'},           odds:[7.5,4.0,1.3]},
  {id:52, home:'Marruecos',           away:'Haití',               isoDate:'2026-06-24',date:'Jun 24',time:'16:00',phase:'Grupo C · J3',venue:'Atlanta Stadium',                 city:'Atlanta, Georgia',     wx:{ic:'☀️',desc:'Caluroso',t:'31°C'},           odds:[1.4,4.5,8.0]},
  {id:53, home:'República Checa',     away:'México',              isoDate:'2026-06-24',date:'Jun 24',time:'21:00',phase:'Grupo A · J3',venue:'Estadio Azteca',                  city:'Tlalpan, CDMX',        wx:{ic:'⛅',desc:'Noche fresca',t:'16°C'},        odds:[4.5,3.5,1.7]},
  {id:54, home:'Sudáfrica',           away:'Corea del Sur',       isoDate:'2026-06-24',date:'Jun 24',time:'21:00',phase:'Grupo A · J3',venue:'Estadio Monterrey',               city:'Guadalupe, Monterrey', wx:{ic:'⛅',desc:'Cálido',t:'28°C'},             odds:[3.5,3.2,2.1]},
  // Jue 25 Jun
  {id:55, home:'Curazao',             away:'Costa de Marfil',     isoDate:'2026-06-25',date:'Jun 25',time:'14:00',phase:'Grupo E · J3',venue:'Philadelphia Stadium',            city:'Filadelfia, PA',       wx:{ic:'🌤️',desc:'Agradable',t:'26°C'},         odds:[8.0,4.0,1.4]},
  {id:56, home:'Ecuador',             away:'Alemania',            isoDate:'2026-06-25',date:'Jun 25',time:'16:00',phase:'Grupo E · J3',venue:'New York New Jersey Stadium',     city:'East Rutherford, NJ',  wx:{ic:'🌤️',desc:'Agradable',t:'24°C'},         odds:[7.0,4.5,1.4]},
  {id:57, home:'Japón',               away:'Suecia',              isoDate:'2026-06-25',date:'Jun 25',time:'17:00',phase:'Grupo F · J3',venue:'Dallas Stadium',                  city:'Arlington, Texas',     wx:{ic:'☀️',desc:'Caluroso',t:'32°C'},           odds:[2.2,3.2,3.0]},
  {id:58, home:'Túnez',               away:'Países Bajos',        isoDate:'2026-06-25',date:'Jun 25',time:'17:00',phase:'Grupo F · J3',venue:'Kansas City Stadium',             city:'Kansas City, MO',      wx:{ic:'⛅',desc:'Nublado',t:'27°C'},            odds:[8.0,4.5,1.3]},
  {id:59, home:'Turquía',             away:'USA',                 isoDate:'2026-06-25',date:'Jun 25',time:'20:00',phase:'Grupo D · J3',venue:'Los Angeles Stadium',             city:'Inglewood, CA',        wx:{ic:'☀️',desc:'Soleado',t:'27°C'},            odds:[3.0,3.2,2.2]},
  {id:60, home:'Paraguay',            away:'Australia',           isoDate:'2026-06-25',date:'Jun 25',time:'20:00',phase:'Grupo D · J3',venue:'San Francisco Bay Area Stadium',  city:'Santa Clara, CA',      wx:{ic:'🌫️',desc:'Neblina',t:'16°C'},           odds:[3.2,3.0,2.2]},
  // Vie 26 Jun
  {id:61, home:'Noruega',             away:'Francia',             isoDate:'2026-06-26',date:'Jun 26',time:'13:00',phase:'Grupo I · J3',venue:'Boston Stadium',                  city:'Foxborough, MA',       wx:{ic:'⛅',desc:'Nublado',t:'20°C'},            odds:[3.8,3.5,1.9]},
  {id:62, home:'Senegal',             away:'Irak',                isoDate:'2026-06-26',date:'Jun 26',time:'13:00',phase:'Grupo I · J3',venue:'Toronto Stadium',                 city:'Toronto, Ontario',     wx:{ic:'🌤️',desc:'Agradable',t:'22°C'},         odds:[1.5,3.8,6.0]},
  {id:63, home:'Cabo Verde',          away:'Arabia Saudita',      isoDate:'2026-06-26',date:'Jun 26',time:'18:00',phase:'Grupo H · J3',venue:'Houston Stadium',                 city:'Houston, Texas',       wx:{ic:'☀️',desc:'Caluroso',t:'34°C'},           odds:[4.0,3.5,1.9]},
  {id:64, home:'Uruguay',             away:'España',              isoDate:'2026-06-26',date:'Jun 26',time:'18:00',phase:'Grupo H · J3',venue:'Estadio Guadalajara',             city:'Zapopan, Jalisco',     wx:{ic:'⛅',desc:'Agradable',t:'26°C'},          odds:[5.5,3.8,1.5]},
  {id:65, home:'Egipto',              away:'Irán',                isoDate:'2026-06-26',date:'Jun 26',time:'21:00',phase:'Grupo G · J3',venue:'Seattle Stadium',                 city:'Seattle, WA',          wx:{ic:'🌧️',desc:'Lluvia',t:'16°C'},            odds:[2.2,3.2,3.0]},
  {id:66, home:'Nueva Zelanda',       away:'Bélgica',             isoDate:'2026-06-26',date:'Jun 26',time:'21:00',phase:'Grupo G · J3',venue:'BC Place',                        city:'Vancouver, BC',        wx:{ic:'🌥️',desc:'Nublado',t:'16°C'},           odds:[7.5,4.0,1.4]},
  // Sáb 27 Jun
  {id:67, home:'Panamá',              away:'Inglaterra',          isoDate:'2026-06-27',date:'Jun 27',time:'15:00',phase:'Grupo L · J3',venue:'New York New Jersey Stadium',     city:'East Rutherford, NJ',  wx:{ic:'🌤️',desc:'Agradable',t:'24°C'},         odds:[6.5,4.0,1.5]},
  {id:68, home:'Croacia',             away:'Ghana',               isoDate:'2026-06-27',date:'Jun 27',time:'15:00',phase:'Grupo L · J3',venue:'Philadelphia Stadium',            city:'Filadelfia, PA',       wx:{ic:'🌤️',desc:'Agradable',t:'25°C'},         odds:[1.8,3.3,4.5]},
  {id:69, home:'Colombia',            away:'Portugal',            isoDate:'2026-06-27',date:'Jun 27',time:'17:30',phase:'Grupo K · J3',venue:'Miami Stadium',                   city:'Miami Gardens, FL',    wx:{ic:'⛈️',desc:'Tormenta',t:'29°C'},          odds:[4.5,3.8,1.7]},
  {id:70, home:'Congo DR',            away:'Uzbekistán',          isoDate:'2026-06-27',date:'Jun 27',time:'17:30',phase:'Grupo K · J3',venue:'Atlanta Stadium',                 city:'Atlanta, Georgia',     wx:{ic:'☀️',desc:'Caluroso',t:'31°C'},           odds:[3.5,3.2,2.1]},
  {id:71, home:'Argelia',             away:'Austria',             isoDate:'2026-06-27',date:'Jun 27',time:'20:00',phase:'Grupo J · J3',venue:'Kansas City Stadium',             city:'Kansas City, MO',      wx:{ic:'⛅',desc:'Nublado',t:'26°C'},            odds:[3.5,3.2,2.1]},
  {id:72, home:'Jordania',            away:'Argentina',           isoDate:'2026-06-27',date:'Jun 27',time:'20:00',phase:'Grupo J · J3',venue:'Dallas Stadium',                  city:'Arlington, Texas',     wx:{ic:'☀️',desc:'Muy caluroso',t:'34°C'},       odds:[12.0,5.5,1.3]},

  // ══ DIECISEISAVOS DE FINAL (Jun 28 – Jul 3) ════════════════════
  {id:73, home:'Por definir',away:'Por definir',isoDate:'2026-06-28',date:'Jun 28',time:'13:00',phase:'16avos · P73', venue:'Los Angeles Stadium',            city:'Inglewood, CA',        wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:74, home:'Por definir',away:'Por definir',isoDate:'2026-06-29',date:'Jun 29',time:'11:00',phase:'16avos · P74', venue:'Houston Stadium',                city:'Houston, Texas',       wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:75, home:'Por definir',away:'Por definir',isoDate:'2026-06-29',date:'Jun 29',time:'14:30',phase:'16avos · P75', venue:'Boston Stadium',                 city:'Foxborough, MA',       wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:76, home:'Por definir',away:'Por definir',isoDate:'2026-06-29',date:'Jun 29',time:'19:00',phase:'16avos · P76', venue:'Estadio Monterrey',              city:'Guadalupe, Monterrey', wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:77, home:'Por definir',away:'Por definir',isoDate:'2026-06-30',date:'Jun 30',time:'11:00',phase:'16avos · P77', venue:'Dallas Stadium',                 city:'Arlington, Texas',     wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:78, home:'Por definir',away:'Por definir',isoDate:'2026-06-30',date:'Jun 30',time:'15:00',phase:'16avos · P78', venue:'New York New Jersey Stadium',    city:'East Rutherford, NJ',  wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:79, home:'Por definir',away:'Por definir',isoDate:'2026-06-30',date:'Jun 30',time:'19:00',phase:'16avos · P79', venue:'Estadio Azteca',                 city:'Tlalpan, CDMX',        wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:80, home:'Por definir',away:'Por definir',isoDate:'2026-07-01',date:'Jul 1', time:'10:00',phase:'16avos · P80', venue:'Atlanta Stadium',                city:'Atlanta, Georgia',     wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:81, home:'Por definir',away:'Por definir',isoDate:'2026-07-01',date:'Jul 1', time:'14:00',phase:'16avos · P81', venue:'Seattle Stadium',                city:'Seattle, WA',          wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:82, home:'Por definir',away:'Por definir',isoDate:'2026-07-01',date:'Jul 1', time:'18:00',phase:'16avos · P82', venue:'San Francisco Bay Area Stadium', city:'Santa Clara, CA',      wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:83, home:'Por definir',away:'Por definir',isoDate:'2026-07-02',date:'Jul 2', time:'13:00',phase:'16avos · P83', venue:'Los Angeles Stadium',            city:'Inglewood, CA',        wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:84, home:'Por definir',away:'Por definir',isoDate:'2026-07-02',date:'Jul 2', time:'17:00',phase:'16avos · P84', venue:'Toronto Stadium',                city:'Toronto, Ontario',     wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:85, home:'Por definir',away:'Por definir',isoDate:'2026-07-02',date:'Jul 2', time:'19:00',phase:'16avos · P85', venue:'BC Place',                       city:'Vancouver, BC',        wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:86, home:'Por definir',away:'Por definir',isoDate:'2026-07-03',date:'Jul 3', time:'12:00',phase:'16avos · P86', venue:'Dallas Stadium',                 city:'Arlington, Texas',     wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:87, home:'Por definir',away:'Por definir',isoDate:'2026-07-03',date:'Jul 3', time:'16:00',phase:'16avos · P87', venue:'Miami Stadium',                  city:'Miami Gardens, FL',    wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:88, home:'Por definir',away:'Por definir',isoDate:'2026-07-03',date:'Jul 3', time:'19:30',phase:'16avos · P88', venue:'Kansas City Stadium',            city:'Kansas City, MO',      wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},

  // ══ OCTAVOS DE FINAL (Jul 4 – Jul 7) ══════════════════════════
  {id:89, home:'Por definir',away:'Por definir',isoDate:'2026-07-04',date:'Jul 4', time:'15:00',phase:'Octavos · P89', venue:'Philadelphia Stadium',          city:'Filadelfia, PA',       wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:90, home:'Por definir',away:'Por definir',isoDate:'2026-07-04',date:'Jul 4', time:'11:00',phase:'Octavos · P90', venue:'Houston Stadium',               city:'Houston, Texas',       wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:91, home:'Por definir',away:'Por definir',isoDate:'2026-07-05',date:'Jul 5', time:'14:00',phase:'Octavos · P91', venue:'New York New Jersey Stadium',   city:'East Rutherford, NJ',  wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:92, home:'Por definir',away:'Por definir',isoDate:'2026-07-05',date:'Jul 5', time:'18:00',phase:'Octavos · P92', venue:'Estadio Azteca',                city:'Tlalpan, CDMX',        wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:93, home:'Por definir',away:'Por definir',isoDate:'2026-07-06',date:'Jul 6', time:'13:00',phase:'Octavos · P93', venue:'Dallas Stadium',                city:'Arlington, Texas',     wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:94, home:'Por definir',away:'Por definir',isoDate:'2026-07-06',date:'Jul 6', time:'18:00',phase:'Octavos · P94', venue:'Seattle Stadium',               city:'Seattle, WA',          wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:95, home:'Por definir',away:'Por definir',isoDate:'2026-07-07',date:'Jul 7', time:'10:00',phase:'Octavos · P95', venue:'Atlanta Stadium',               city:'Atlanta, Georgia',     wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:96, home:'Por definir',away:'Por definir',isoDate:'2026-07-07',date:'Jul 7', time:'14:00',phase:'Octavos · P96', venue:'BC Place',                      city:'Vancouver, BC',        wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},

  // ══ CUARTOS DE FINAL ═══════════════════════════════════════════
  {id:97, home:'Por definir',away:'Por definir',isoDate:'2026-07-09',date:'Jul 9', time:'14:00',phase:'Cuartos · P97', venue:'Boston Stadium',                city:'Foxborough, MA',       wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:98, home:'Por definir',away:'Por definir',isoDate:'2026-07-10',date:'Jul 10',time:'13:00',phase:'Cuartos · P98', venue:'Los Angeles Stadium',           city:'Inglewood, CA',        wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:99, home:'Por definir',away:'Por definir',isoDate:'2026-07-11',date:'Jul 11',time:'15:00',phase:'Cuartos · P99', venue:'Miami Stadium',                 city:'Miami Gardens, FL',    wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:100,home:'Por definir',away:'Por definir',isoDate:'2026-07-11',date:'Jul 11',time:'19:00',phase:'Cuartos · P100',venue:'Kansas City Stadium',           city:'Kansas City, MO',      wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},

  // ══ SEMIFINALES ════════════════════════════════════════════════
  {id:101,home:'Por definir',away:'Por definir',isoDate:'2026-07-14',date:'Jul 14',time:'13:00',phase:'Semifinal',venue:'Dallas Stadium',                    city:'Arlington, Texas',     wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
  {id:102,home:'Por definir',away:'Por definir',isoDate:'2026-07-15',date:'Jul 15',time:'13:00',phase:'Semifinal',venue:'Atlanta Stadium',                   city:'Atlanta, Georgia',     wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},

  // ══ TERCER LUGAR ═══════════════════════════════════════════════
  {id:103,home:'Por definir',away:'Por definir',isoDate:'2026-07-18',date:'Jul 18',time:'15:00',phase:'Tercer Lugar',venue:'Miami Stadium',                  city:'Miami Gardens, FL',    wx:{ic:'⛅',desc:'',t:'--'},odds:[2.0,3.2,3.0]},

  // ══ GRAN FINAL ═════════════════════════════════════════════════
  {id:104,home:'Por definir',away:'Por definir',isoDate:'2026-07-19',date:'Jul 19',time:'13:00',phase:'FINAL',       venue:'New York New Jersey Stadium',    city:'East Rutherford, NJ',  wx:{ic:'☀️',desc:'',t:'--'},odds:[2.0,3.2,3.0]},
];
const GROUPS=[
  // Grupos confirmados — Copa Mundial FIFA 2026
  {name:'Grupo A',teams:[{n:'México',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Corea del Sur',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Sudáfrica',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'República Checa',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo B',teams:[{n:'Canadá',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Suiza',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Qatar',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Bosnia y Herzegovina',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo C',teams:[{n:'Brasil',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Marruecos',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Haití',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Escocia',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo D',teams:[{n:'USA',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Australia',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Paraguay',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Turquía',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo E',teams:[{n:'Alemania',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Ecuador',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Costa de Marfil',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Curazao',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo F',teams:[{n:'Países Bajos',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Japón',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Suecia',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Túnez',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo G',teams:[{n:'Bélgica',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Irán',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Egipto',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Nueva Zelanda',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo H',teams:[{n:'España',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Uruguay',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Arabia Saudita',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Cabo Verde',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo I',teams:[{n:'Francia',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Senegal',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Noruega',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Irak',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo J',teams:[{n:'Argentina',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Austria',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Argelia',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Jordania',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo K',teams:[{n:'Portugal',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Colombia',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Uzbekistán',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Congo DR',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
  {name:'Grupo L',teams:[{n:'Inglaterra',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Croacia',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Ghana',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0},{n:'Panamá',pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}]},
];
const SCORERS=[
  // Candidatos al Trofeo de Bota de Oro FIFA World Cup 2026
  {n:'Kylian Mbappé',   team:'Francia',   g:0,a:0,debut:'AS Monaco · 2015',  ori:'Bondy, Francia',            bio:'Máximo favorito a la Bota de Oro. 8 goles en Qatar 2022. Capitán de Francia, crack del Real Madrid. Mejor jugador del mundo.',       wiki:'Kylian_Mbappé'},
  {n:'Harry Kane',      team:'Inglaterra',g:0,a:0,debut:'Tottenham · 2011',   ori:'Walthamstow, Inglaterra',   bio:'78 goles con la selección inglesa — récord histórico. Ganador de la Bota de Oro de la Bundesliga. Máximo favorito de Inglaterra.',  wiki:'Harry_Kane'},
  {n:'Erling Haaland',  team:'Noruega',   g:0,a:0,debut:'Bryne FK · 2016',   ori:'Leeds, Inglaterra',          bio:'Máquina goleadora del Man. City. 50+ goles por temporada en Premier League. Primer Mundial de Noruega desde 1998. Récords mundiales.', wiki:'Erling_Haaland'},
  {n:'Lamine Yamal',    team:'España',    g:0,a:0,debut:'FC Barcelona · 2023',ori:'Mataró, España',            bio:'El más joven en anotar en una Eurocopa. Campeón de la Euro 2024. La gran joya del fútbol mundial con solo 18 años.',               wiki:'Lamine_Yamal'},
  {n:'Lionel Messi',    team:'Argentina', g:0,a:0,debut:'FC Barcelona · 2004',ori:'Rosario, Argentina',        bio:'El GOAT. 8 Balones de Oro. Campeón del mundo Qatar 2022 con 7 goles. Su posible último Mundial con 38 años en Inter Miami.',       wiki:'Lionel_Messi'},
  {n:'Vinicius Jr.',    team:'Brasil',    g:0,a:0,debut:'Flamengo · 2017',   ori:'São Gonçalo, Brasil',        bio:'Balón de Oro 2024. Extremo del Real Madrid, imparable en velocidad y regate. Lidera el ataque de una Brasil renovada.',            wiki:'Vinícius_Júnior'},
  {n:'Cristiano Ronaldo',team:'Portugal',g:0,a:0,debut:'Sporting CP · 2002', ori:'Madeira, Portugal',          bio:'CR7 con 41 años, posiblemente su última Copa del Mundo. 134 goles internacionales — récord mundial. Aún peligroso en el área.',    wiki:'Cristiano_Ronaldo'},
  {n:'Lautaro Martínez',team:'Argentina',g:0,a:0,debut:'Racing Club · 2015', ori:'Bahía Blanca, Argentina',   bio:'Goleador del Inter de Milán. Campeón Copa América 2024. Compañero de Messi, letal en el área pequeña.',                            wiki:'Lautaro_Martínez'},
  {n:'Ousmane Dembélé', team:'Francia',  g:0,a:0,debut:'Rennes · 2015',     ori:'Vernon, Francia',            bio:'Ganador del Balón de Oro 2025 con el PSG. Rapidísimo por banda derecha. Peligroso compañero de Mbappé en Francia.',               wiki:'Ousmane_Dembélé'},
  {n:'Bukayo Saka',     team:'Inglaterra',g:0,a:0,debut:'Arsenal · 2019',    ori:'Ealing, Inglaterra',         bio:'Figura del Arsenal campeón Premier League. Extremo con gol y asistencia fácil. Clave en el ataque inglés junto a Kane.',            wiki:'Bukayo_Saka'},
  {n:'Rodrygo',         team:'Brasil',   g:0,a:0,debut:'Santos FC · 2018',   ori:'Osasco, Brasil',             bio:'Decisivo en Champions League con el Real Madrid. Rápido y técnico, un dolor de cabeza para cualquier defensa.',                     wiki:'Rodrygo'},
  {n:'Jude Bellingham', team:'Inglaterra',g:0,a:0,debut:'Birmingham · 2019', ori:'Stourbridge, Inglaterra',    bio:'Mejor jugador joven del mundo. Goleador del Real Madrid desde el mediocampo. Solo tiene 22 años y ya es leyenda.',                 wiki:'Jude_Bellingham'},
];

// Wikipedia article titles for photos
// Official World Cup squad numbers
const PLAYER_NUMBERS={
  'Kylian Mbappé':'10','Harry Kane':'9','Erling Haaland':'9',
  'Lamine Yamal':'19','Lionel Messi':'10','Vinicius Jr.':'7',
  'Cristiano Ronaldo':'7','Lautaro Martínez':'22','Ousmane Dembélé':'11',
  'Bukayo Saka':'7','Rodrygo':'19','Jude Bellingham':'10',
};

// Secondary (accent) color per team for jersey details
const COLS2={
  'Francia':'#FFFFFF','Inglaterra':'#CC0000','Noruega':'#FFFFFF',
  'España':'#F1BF00','Argentina':'#FFFFFF','Brasil':'#009C3B',
  'Portugal':'#006600','México':'#CE1126','USA':'#FFFFFF',
  'Alemania':'#000000','Países Bajos':'#FFFFFF','Japón':'#FFFFFF',
};

const PLAYER_WIKI={
  'Kylian Mbappé':'Kylian_Mbappé','Harry Kane':'Harry_Kane',
  'Erling Haaland':'Erling_Haaland','Lamine Yamal':'Lamine_Yamal',
  'Lionel Messi':'Lionel_Messi','Vinicius Jr.':'Vinícius_Júnior',
  'Cristiano Ronaldo':'Cristiano_Ronaldo',
  'Lautaro Martínez':'Lautaro_Martínez','Ousmane Dembélé':'Ousmane_Dembélé',
  'Bukayo Saka':'Bukayo_Saka','Rodrygo':'Rodrygo',
  'Jude Bellingham':'Jude_Bellingham',
  'Pedri':'Pedri','Rodri':'Rodri_(footballer)',
  'N.Williams':'Nico_Williams','Raphinha':'Raphinha',
  'Griezmann':'Antoine_Griezmann','Thuram':'Marcus_Thuram',
};
const VENUE_WIKI={
  'MetLife Stadium':'MetLife_Stadium',
  'AT&T Stadium':'AT&T_Stadium',
  'Mercedes-Benz Stadium':'Mercedes-Benz_Stadium',
  'SoFi Stadium':'SoFi_Stadium',
  'NRG Stadium':'NRG_Stadium',
  'Arrowhead Stadium':'Arrowhead_Stadium',
  'Levi Stadium':"Levi_Stadium",
  'Lincoln Financial Field':'Lincoln_Financial_Field',
  'Gillette Stadium':'Gillette_Stadium',
  'Lumen Field':'Lumen_Field',
  'Hard Rock Stadium':'Hard_Rock_Stadium',
  'Estadio Azteca':'Estadio_Azteca',
  'Estadio BBVA':'BBVA_Stadium_(Monterrey)',
  'Estadio Akron':'Estadio_Akron',
  'BC Place':'BC_Place',
  'BMO Field':'BMO_Field',
};

const VENUES=[
  // 16 sedes oficiales FIFA World Cup 2026 — datos del documento oficial FIFA
  // USA — 11 sedes
  {n:'New York New Jersey Stadium',c:'East Rutherford, NJ',   cap:'82,500',f:'🇺🇸',phase:'Final',       wk:'MetLife_Stadium'},
  {n:'Dallas Stadium',            c:'Arlington, Texas',      cap:'94,000',f:'🇺🇸',phase:'Semifinal',   wk:'AT&T_Stadium'},
  {n:'Atlanta Stadium',           c:'Atlanta, Georgia',      cap:'75,000',f:'🇺🇸',phase:'Semifinal',   wk:'Mercedes-Benz_Stadium'},
  {n:'Los Angeles Stadium',       c:'Inglewood, California', cap:'70,000',f:'🇺🇸',phase:'Cuartos',     wk:'SoFi_Stadium'},
  {n:'Houston Stadium',           c:'Houston, Texas',        cap:'72,220',f:'🇺🇸',phase:'Cuartos',     wk:'NRG_Stadium'},
  {n:'Miami Stadium',             c:'Miami Gardens, Florida',cap:'65,000',f:'🇺🇸',phase:'3er Lugar',   wk:'Hard_Rock_Stadium'},
  {n:'Kansas City Stadium',       c:'Kansas City, Missouri', cap:'73,000',f:'🇺🇸',phase:'Cuartos',     wk:'Arrowhead_Stadium'},
  {n:'Philadelphia Stadium',      c:'Filadelfia, PA',        cap:'69,000',f:'🇺🇸',phase:'Octavos',     wk:'Lincoln_Financial_Field'},
  {n:'Boston Stadium',            c:'Foxborough, MA',        cap:'65,000',f:'🇺🇸',phase:'Cuartos',     wk:'Gillette_Stadium'},
  {n:'Seattle Stadium',           c:'Seattle, Washington',   cap:'69,000',f:'🇺🇸',phase:'Octavos',     wk:'Lumen_Field'},
  {n:'San Francisco Bay Area Stadium',c:'Santa Clara, California',cap:'71,000',f:'🇺🇸',phase:'Octavos',wk:"Levi_Stadium"},
  // México — 3 sedes (datos oficiales FIFA)
  {n:'Estadio Azteca',            c:'Tlalpan, CDMX',         cap:'83,000',f:'🇲🇽',phase:'Inauguración',wk:'Estadio_Azteca'},
  {n:'Estadio Monterrey',         c:'Guadalupe, Monterrey',  cap:'53,500',f:'🇲🇽',phase:'Octavos',     wk:'BBVA_Stadium_(Monterrey)'},
  {n:'Estadio Guadalajara',       c:'Zapopan, Guadalajara',  cap:'48,000',f:'🇲🇽',phase:'Grupos',      wk:'Estadio_Akron'},
  // Canadá — 2 sedes
  {n:'BC Place',                  c:'Vancouver, BC',         cap:'54,000',f:'🇨🇦',phase:'Octavos',     wk:'BC_Place'},
  {n:'Toronto Stadium',           c:'Toronto, Ontario',      cap:'45,000',f:'🇨🇦',phase:'Octavos',     wk:'BMO_Field'},
];

// ── Bet Options Data ──────────────────────────────
const CAMPEON_OPTS=[
  {v:'Francia',odds:3.5},{v:'España',odds:4.0},{v:'Argentina',odds:4.5},
  {v:'Brasil',odds:5.0},{v:'Inglaterra',odds:5.5},{v:'Portugal',odds:6.0},
  {v:'Alemania',odds:7.0},{v:'Países Bajos',odds:9.0},{v:'Bélgica',odds:10.0},
  {v:'Uruguay',odds:15.0},{v:'México',odds:20.0},{v:'USA',odds:22.0},
  {v:'Noruega',odds:25.0},{v:'Japón',odds:28.0},{v:'Canadá',odds:30.0},
  {v:'Marruecos',odds:35.0},{v:'Senegal',odds:40.0},{v:'Ecuador',odds:45.0},
];
const BOTA_ORO_OPTS=[
  {v:'Kylian Mbappé',team:'Francia',odds:3.8},
  {v:'Harry Kane',team:'Inglaterra',odds:4.5},
  {v:'Erling Haaland',team:'Noruega',odds:5.0},
  {v:'Lamine Yamal',team:'España',odds:5.5},
  {v:'Lionel Messi',team:'Argentina',odds:6.5},
  {v:'Vinicius Jr.',team:'Brasil',odds:7.0},
  {v:'Cristiano Ronaldo',team:'Portugal',odds:8.5},
  {v:'Lautaro Martínez',team:'Argentina',odds:9.0},
  {v:'Ousmane Dembélé',team:'Francia',odds:10.0},
  {v:'Bukayo Saka',team:'Inglaterra',odds:12.0},
  {v:'Rodrygo',team:'Brasil',odds:13.0},
  {v:'Jude Bellingham',team:'Inglaterra',odds:14.0},
];
const BALON_ORO_OPTS=[
  {v:'Kylian Mbappé',team:'Francia',odds:3.2},
  {v:'Lamine Yamal',team:'España',odds:3.8},
  {v:'Jude Bellingham',team:'Inglaterra',odds:4.2},
  {v:'Vinicius Jr.',team:'Brasil',odds:4.5},
  {v:'Erling Haaland',team:'Noruega',odds:5.5},
  {v:'Lionel Messi',team:'Argentina',odds:6.0},
  {v:'Ousmane Dembélé',team:'Francia',odds:7.0},
  {v:'Rodri',team:'España',odds:8.0},
];
const GRP_WIN=[
  {g:'Grupo A',teams:[{v:'México',odds:1.6},{v:'Corea del Sur',odds:3.0},{v:'Sudáfrica',odds:6.0},{v:'República Checa',odds:7.0}]},
  {g:'Grupo B',teams:[{v:'Suiza',odds:1.9},{v:'Canadá',odds:2.2},{v:'Bosnia y Herzegovina',odds:4.5},{v:'Qatar',odds:9.0}]},
  {g:'Grupo C',teams:[{v:'Brasil',odds:1.2},{v:'Marruecos',odds:4.5},{v:'Escocia',odds:6.5},{v:'Haití',odds:20.0}]},
  {g:'Grupo D',teams:[{v:'USA',odds:1.7},{v:'Australia',odds:3.5},{v:'Paraguay',odds:5.5},{v:'Turquía',odds:6.0}]},
  {g:'Grupo E',teams:[{v:'Alemania',odds:1.3},{v:'Ecuador',odds:3.5},{v:'Costa de Marfil',odds:5.5},{v:'Curazao',odds:25.0}]},
  {g:'Grupo F',teams:[{v:'Países Bajos',odds:1.4},{v:'Japón',odds:3.5},{v:'Suecia',odds:5.0},{v:'Túnez',odds:8.0}]},
  {g:'Grupo G',teams:[{v:'Bélgica',odds:1.5},{v:'Egipto',odds:4.0},{v:'Irán',odds:5.0},{v:'Nueva Zelanda',odds:12.0}]},
  {g:'Grupo H',teams:[{v:'España',odds:1.2},{v:'Uruguay',odds:4.0},{v:'Arabia Saudita',odds:8.0},{v:'Cabo Verde',odds:20.0}]},
  {g:'Grupo I',teams:[{v:'Francia',odds:1.3},{v:'Senegal',odds:4.2},{v:'Noruega',odds:3.8},{v:'Irak',odds:15.0}]},
  {g:'Grupo J',teams:[{v:'Argentina',odds:1.2},{v:'Austria',odds:5.0},{v:'Argelia',odds:6.5},{v:'Jordania',odds:15.0}]},
  {g:'Grupo K',teams:[{v:'Portugal',odds:1.2},{v:'Colombia',odds:3.5},{v:'Uzbekistán',odds:9.0},{v:'Congo DR',odds:14.0}]},
  {g:'Grupo L',teams:[{v:'Inglaterra',odds:1.4},{v:'Croacia',odds:4.5},{v:'Ghana',odds:7.5},{v:'Panamá',odds:8.0}]},
];





// ── Coin System ───────────────────────────────────
const COINS_PER_PAGO=1000; // 1 pago de $30 MXN = 1000 monedas
const PRECIO_PAQUETE=30; // MXN por paquete — fuente única para ingresos del panel
// 72 partidos × (1X2:7 + BTTS:6=13) = 936
// Fijos: campeon:6 + bota:6 + balon:4 + gol1:15 + gol2:4 + gol3:5 + grupos(12×2):24 = 64
// Total: 936 + 64 = 1000 exacto ✓
const COIN_COSTS={campeon:6,'bota-oro':6,'balon-oro':4,
  'goleador-1':15,'goleador-2':4,'goleador-3':5};
const getBetCost=id=>{
  if(COIN_COSTS[id]!==undefined)return COIN_COSTS[id];
  if(id.startsWith('grp-'))return 2;           // 12×2=24
  if(id.endsWith('-1x2'))return 7;             // 72×7=504
  if(id.endsWith('-btts'))return 6;            // 72×6=432
  // Tipos deprecados — ya no aparecen en UI, no deben contar monedas
  if(id.endsWith('-exacto'))return 0;
  if(id.endsWith('-jugador'))return 0;
  if(id.endsWith('-handicap'))return 0;
  if(id.endsWith('-total')||id.endsWith('-dc'))return 0;
  return 0;
};

// ── Admin & DB Config ─────────────────────────────
const DB_KEY='wc2026_users_db'; // storage key for user database

// DB helpers using localStorage (works in any browser/deployment)
const dbLoad=async()=>{
  try{
    const data=localStorage.getItem(DB_KEY);
    return data?JSON.parse(data):[];
  }catch{return [];}
};
const dbSave=async users=>{
  try{localStorage.setItem(DB_KEY,JSON.stringify(users));}
  catch(e){console.warn('DB save error:',e);}
};
const dbFind=(users,email)=>
  users.find(u=>u.email.toLowerCase()===email.toLowerCase().trim());

// Espera a que una función global de Firebase esté disponible (la importación
// de ./firebase.js es asíncrona). Devuelve la función o null si expira.
const waitForFb=(name,timeout=6000)=>new Promise(resolve=>{
  if(window[name]) return resolve(window[name]);
  let elapsed=0;
  const t=setInterval(()=>{
    if(window[name]){clearInterval(t);resolve(window[name]);}
    else if((elapsed+=150)>=timeout){clearInterval(t);resolve(null);}
  },150);
});

// Increment paquetes + record payment timestamp in DB
const dbUpdatePaquetes=async email=>{
  try{
    const users=await dbLoad();
    const updated=users.map(u=>
      u.email.toLowerCase()===email.toLowerCase().trim()
        ?{...u,
          paquetes:(u.paquetes||0)+1,
          lastPayment:new Date().toISOString(),
          totalPagado:((u.paquetes||0)+1)*PRECIO_PAQUETE}
        :u
    );
    await dbSave(updated);
  }catch(e){console.warn('dbUpdatePaquetes error:',e);}
};

// Gift 1000 coins to a user (admin only) — marks gifted:true in DB
const dbGiftCoins=async(email,amount=1000)=>{
  // Admin can gift any amount of coins to any user
  try{
    const users=await dbLoad();
    const updated=users.map(u=>
      u.email.toLowerCase()===email.toLowerCase().trim()
        ?{...u,gifted:true,giftedCoins:amount,giftedAt:new Date().toISOString()}
        :u
    );
    await dbSave(updated);
    return true;
  }catch(e){console.warn('dbGiftCoins error:',e);return false;}
};

// Revoke gifted coins from a user (admin only)
const dbRevokeGift=async email=>{
  try{
    const users=await dbLoad();
    const updated=users.map(u=>
      u.email.toLowerCase()===email.toLowerCase().trim()
        ?{...u,gifted:false,giftedAt:null}
        :u
    );
    await dbSave(updated);
    return true;
  }catch(e){console.warn('dbRevokeGift error:',e);return false;}
};

// ── Trophy SVG ──────────────────────────────────
function Trophy({sz=80}){
  return(
    <svg width={sz} height={sz*1.25} viewBox="0 0 80 100" fill="none"
      style={{filter:'drop-shadow(0 0 18px rgba(240,165,0,.55))'}}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE97A"/>
          <stop offset="45%" stopColor="#F0A500"/>
          <stop offset="100%" stopColor="#B8840A"/>
        </linearGradient>
        <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE566"/>
          <stop offset="100%" stopColor="#D4A017"/>
        </linearGradient>
      </defs>
      <rect x="24" y="86" width="32" height="7" rx="3" fill="url(#tg)"/>
      <rect x="17" y="91" width="46" height="7" rx="3.5" fill="url(#tg)"/>
      <rect x="35" y="72" width="10" height="16" rx="4" fill="url(#tg)"/>
      <path d="M20 7 Q20 60 40 70 Q60 60 60 7 Z" fill="url(#tg2)"/>
      <path d="M20 15 Q6 15 6 30 Q6 44 20 44" stroke="url(#tg)" strokeWidth="5.5" fill="none" strokeLinecap="round"/>
      <path d="M60 15 Q74 15 74 30 Q74 44 60 44" stroke="url(#tg)" strokeWidth="5.5" fill="none" strokeLinecap="round"/>
      <path d="M29 11 Q31 37 37 52" stroke="rgba(255,255,255,.38)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <circle cx="40" cy="4" r="3.5" fill="#FFE566" opacity=".9"/>
      <path d="M32 4 L34 2 L36 4 L38 2 L40 4 L42 2 L44 4 L46 2 L48 4" stroke="#FFE566" strokeWidth="1.2" fill="none" opacity=".7"/>
    </svg>
  );
}

// ── WikiPhoto: Wikipedia REST API → real photo ───
// Uses Wikipedia REST API (CORS-enabled) to fetch real photos.
// Works in deployed apps (Railway). In sandbox may show SVG fallback.
function WikiPhoto({wiki, sz=52, style={}, fallback=null, radius='50%'}){
  const [src,setSrc]=useState(null);
  const [err,setErr]=useState(false);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!wiki){setLoading(false);setErr(true);return;}
    setLoading(true);setSrc(null);setErr(false);
    const controller=new AbortController();
    // Timeout de 6 segundos para no bloquear la UI
    const timer=setTimeout(()=>{controller.abort();},6000);
    const wikiTitle=wiki.replace(/ /g,'_');
    const url=`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    fetch(url,{signal:controller.signal,
      headers:{'Accept':'application/json','Api-User-Agent':'Mundial2026App/1.0'}})
      .then(r=>r.ok?r.json():Promise.reject(new Error('not ok')))
      .then(d=>{
        const s=d?.thumbnail?.source||d?.originalimage?.source;
        if(s){setSrc(s);}else{setErr(true);}
        setLoading(false);
      })
      .catch(e=>{
        if(e.name!=='AbortError')setErr(true);
        setLoading(false);
      })
      .finally(()=>clearTimeout(timer));
    return()=>{controller.abort();clearTimeout(timer);};
  },[wiki]);
  if(err)return fallback||null;
  if(loading||!src)return(
    <div style={{width:sz,height:sz,borderRadius:radius,
      background:'linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
      display:'flex',alignItems:'center',justifyContent:'center',
      flexShrink:0,...style}}>
      <div style={{width:'40%',height:2,borderRadius:2,background:'var(--gold)',opacity:.5,
        animation:'fin .8s ease infinite alternate'}}/>
    </div>
  );
  return(
    <img src={src} alt={wiki.replace(/_/g,' ')}
      style={{width:sz,height:sz,borderRadius:radius,objectFit:'cover',
        objectPosition:'top center',flexShrink:0,display:'block',...style}}
      onError={()=>setErr(true)}/>
  );
}

// ── Jersey color + pattern system (geometric, no copyright) ──────────────
const JERSEY_COL={
  'Argentina':    ['#74ACDF','#FFFFFF'],
  'Brasil':       ['#F9D902','#009C3B'],
  'Francia':      ['#001E96','#FFFFFF'],
  'Alemania':     ['#F0F0F0','#000000'],
  'España':       ['#AA151B','#F1BF00'],
  'Portugal':     ['#CC0001','#006600'],
  'Inglaterra':   ['#FFFFFF','#CC0000'],
  'Uruguay':      ['#5EB6E4','#FFFFFF'],
  'México':       ['#006847','#FFFFFF'],
  'USA':          ['#CC0000','#002868'],
  'Canadá':       ['#FF0000','#FFFFFF'],
  'Países Bajos': ['#FF6600','#FFFFFF'],
  'Bélgica':      ['#1A1A1A','#EF3340'],
  'Croacia':      ['#CC0000','#FFFFFF'],
  'Japón':        ['#152569','#BC002D'],
  'Marruecos':    ['#C1272D','#006233'],
  'Colombia':     ['#FCD116','#003580'],
  'Ecuador':      ['#FFD100','#034EA2'],
  'Senegal':      ['#00853F','#FFFFFF'],
  'Corea del Sur':['#CD2E3A','#003478'],
  'Noruega':      ['#EF2B2D','#FFFFFF'],
  'Ghana':        ['#FCD116','#006B3F'],
  'Suecia':       ['#006AA7','#FECC02'],
  'Suiza':        ['#EE0000','#FFFFFF'],
  'Qatar':        ['#8D1B3D','#FFFFFF'],
  'Arabia Saudita':['#006C35','#FFFFFF'],
  'Australia':    ['#FFD700','#00843D'],
};
// stripe_v=vertical stripes, diagonal=diagonal split, h_band=chest band,
// v_split=V-chevron bottom, cross=Nordic/St.George cross, stripe_h=horiz stripes, solid=plain
const JERSEY_PAT={
  'Argentina':'stripe_v','Brasil':'diagonal','Francia':'solid',
  'Alemania':'v_split','España':'h_band','Portugal':'diagonal',
  'Inglaterra':'cross','Uruguay':'solid','México':'stripe_v',
  'USA':'diagonal','Canadá':'solid','Países Bajos':'stripe_v',
  'Bélgica':'diagonal','Croacia':'stripe_h','Japón':'diagonal',
  'Marruecos':'h_band','Colombia':'diagonal','Ecuador':'diagonal',
  'Senegal':'h_band','Corea del Sur':'diagonal','Noruega':'cross',
  'Ghana':'stripe_h','Suecia':'h_band','Suiza':'cross',
};

// ── PlayerPhoto: geometric minimalist jersey SVG ──
function PlayerPhoto({name,team,g=0,a=0,sz=120}){
  const [c1,c2]=(JERSEY_COL[team])||[COLS[team]||'#4F8EF7','#FFFFFF'];
  const num=PLAYER_NUMBERS[name]||'10';
  const parts=(name||'').split(' ');
  const jname=parts.length>1?parts[parts.length-1].toUpperCase():(name||'').toUpperCase();
  const nSz=jname.length>7?7:jname.length>5?8.5:10;
  const pat=JERSEY_PAT[team]||'solid';
  const cid=`jc_${(name||'').replace(/\W/g,'')}_${team.replace(/\W/g,'')}`;
  const bP="M 26 44 C 26 42 32 37 40 35 Q 60 31 80 35 C 88 37 94 42 94 44 L 90 118 C 60 124 60 124 30 118 Z";
  const lP="M 26 44 C 20 46 12 52 8 68 Q 6 76 11 78 L 14 76 Q 11 70 13 64 C 17 52 24 48 28 46 Z";
  const rP="M 94 44 C 100 46 108 52 112 68 Q 114 76 109 78 L 106 76 Q 109 70 107 64 C 103 52 96 48 92 46 Z";
  return(
    <div style={{width:sz,height:Math.round(sz*1.25),borderRadius:14,overflow:'hidden',
      flexShrink:0,boxShadow:`0 8px 28px ${c1}55,0 2px 8px rgba(0,0,0,.5)`,
      border:`2px solid ${c1}99`,cursor:'pointer',position:'relative'}}>
      <svg viewBox="0 0 120 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={cid}>
            <path d={`${bP} ${lP} ${rP}`}/>
          </clipPath>
          <linearGradient id={`bg${cid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1828"/>
            <stop offset="100%" stopColor="#040c16"/>
          </linearGradient>
          <radialGradient id={`gw${cid}`} cx="50%" cy="55%" r="48%">
            <stop offset="0%" stopColor={c1} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={c1} stopOpacity="0"/>
          </radialGradient>
          <linearGradient id={`sh${cid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.24)"/>
          </linearGradient>
        </defs>
        {/* Dark abstract background */}
        <rect width="120" height="150" fill={`url(#bg${cid})`}/>
        <ellipse cx="60" cy="80" rx="56" ry="60" fill={`url(#gw${cid})`}/>
        {/* Jersey — clipped geometric pattern */}
        <g clipPath={`url(#${cid})`}>
          <rect width="120" height="150" fill={c1}/>
          {pat==='stripe_v'&&[1,3,5,7,9].map(i=>(
            <rect key={i} x={i*12} y="0" width="12" height="150" fill={c2} opacity="0.93"/>
          ))}
          {pat==='diagonal'&&(
            <polygon points="80,0 120,0 40,150 0,150" fill={c2} opacity="0.92"/>
          )}
          {pat==='h_band'&&(
            <rect x="0" y="57" width="120" height="26" fill={c2} opacity="0.88"/>
          )}
          {pat==='v_split'&&(
            <polygon points="0,150 60,68 120,150" fill={c2} opacity="0.9"/>
          )}
          {pat==='cross'&&<>
            <rect x="52" y="0" width="16" height="150" fill={c2} opacity="0.88"/>
            <rect x="0" y="68" width="120" height="15" fill={c2} opacity="0.88"/>
          </>}
          {pat==='stripe_h'&&[1,3].map(i=>(
            <rect key={i} x="0" y={i*34} width="120" height="20" fill={c2} opacity="0.88"/>
          ))}
          {/* Depth shading overlay */}
          <rect width="120" height="150" fill={`url(#sh${cid})`}/>
        </g>
        {/* Jersey outline strokes */}
        <path d={bP} fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.5"/>
        <path d={lP} fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.5"/>
        <path d={rP} fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.5"/>
        {/* Collar accent line */}
        <path d="M 46 35 Q 60 32 74 35" fill="none" stroke={c2} strokeWidth="2" opacity="0.75"/>
        {/* Drop shadow */}
        <ellipse cx="60" cy="130" rx="32" ry="4" fill="rgba(0,0,0,.28)"/>
        {/* Player name — white + black stroke (readable on any jersey) */}
        <text x="60" y="63" textAnchor="middle" fontSize={nSz}
          fontWeight="900" fontFamily="'Arial Black',Arial,sans-serif"
          fill="none" stroke="rgba(0,0,0,.55)" strokeWidth="3" strokeLinejoin="round">{jname}</text>
        <text x="60" y="63" textAnchor="middle" fontSize={nSz}
          fontWeight="900" fontFamily="'Arial Black',Arial,sans-serif"
          fill="#FFFFFF" letterSpacing="1.5">{jname}</text>
        {/* Jersey number — white + black stroke */}
        <text x="60" y="107" textAnchor="middle" fontSize="34"
          fontWeight="900" fontFamily="'Arial Black',Arial,sans-serif"
          fill="none" stroke="rgba(0,0,0,.5)" strokeWidth="3">{num}</text>
        <text x="60" y="107" textAnchor="middle" fontSize="34"
          fontWeight="900" fontFamily="'Arial Black',Arial,sans-serif"
          fill="#FFFFFF" opacity="0.95">{num}</text>
        {/* Team strip at bottom */}
        <rect x="0" y="138" width="120" height="12" fill={`${c1}cc`}/>
        <text x="60" y="147" textAnchor="middle" fontSize="7" fontWeight="700"
          fontFamily="Arial,sans-serif" fill="#FFFFFF" letterSpacing=".5"
          style={{textShadow:'0 1px 2px rgba(0,0,0,.8)'}}>{team}</text>
      </svg>
    </div>
  );
}
// Embedded stadium images (base64) — only BBVA has one
const STADIUM_IMGS={'Estadio Monterrey':'/stadiums/bbva.jpg'};

// Stadium color themes — accent colors per venue
const STADIUM_THEMES={
  'MetLife Stadium':      {bg1:'#0B1A2E',bg2:'#102A4A',ac:'#0053A0',lc:'#4D9FDC'},
  'AT&T Stadium':         {bg1:'#0D0D0D',bg2:'#1A1A2E',ac:'#003594',lc:'#6699CC'},
  'SoFi Stadium':         {bg1:'#0A1628',bg2:'#0D2040',ac:'#003594',lc:'#87CEEB'},
  'Rose Bowl':            {bg1:'#1A2408',bg2:'#2D4010',ac:'#4CAF50',lc:'#90EE90'},
  'Levi Stadium':         {bg1:'#0A1020',bg2:'#142030',ac:'#AA0000',lc:'#CC4444'},
  "Levi's Stadium":       {bg1:'#0A1020',bg2:'#142030',ac:'#AA0000',lc:'#CC4444'},
  'Estadio Azteca':       {bg1:'#1A0808',bg2:'#2E1010',ac:'#006847',lc:'#CE1126'},
  'Estadio BBVA':         {bg1:'#0A1628',bg2:'#0D2040',ac:'#004A97',lc:'#6699CC'},
  'Estadio Akron':        {bg1:'#0A1020',bg2:'#0D1830',ac:'#1B5EA6',lc:'#87CEEB'},
  'Estadio Monterrey':    {bg1:'#0A1020',bg2:'#0D1830',ac:'#1B5EA6',lc:'#87CEEB'},
  'BC Place':             {bg1:'#0D1A30',bg2:'#132440',ac:'#0066CC',lc:'#4DA6FF'},
  'Commonwealth Stadium': {bg1:'#0D1A30',bg2:'#142440',ac:'#005C38',lc:'#4DA67A'},
  'BMO Field':            {bg1:'#0D1A30',bg2:'#142440',ac:'#EF3E42',lc:'#FF8080'},
  'Gillette Stadium':     {bg1:'#0A1020',bg2:'#142030',ac:'#002244',lc:'#4D7AB5'},
  'Lincoln Financial Field':{bg1:'#0A1020',bg2:'#142030',ac:'#004953',lc:'#A5ACAF'},
  'NRG Stadium':          {bg1:'#1A1008',bg2:'#2E2010',ac:'#03202F',lc:'#8DC3E3'},
  'Arrowhead Stadium':    {bg1:'#1A0808',bg2:'#2E1010',ac:'#E31837',lc:'#FFB81C'},
  'Lumen Field':          {bg1:'#0A1020',bg2:'#0D1830',ac:'#002244',lc:'#69BE28'},
  'Bank of America Stadium':{bg1:'#0A1020',bg2:'#0D1830',ac:'#0085CA',lc:'#BFC0BF'},
  'Mercedes-Benz Stadium':{bg1:'#0A1020',bg2:'#0D1830',ac:'#A71930',lc:'#C6C7C7'},
  'Hard Rock Stadium':    {bg1:'#0A1020',bg2:'#0D1830',ac:'#F26522',lc:'#005778'},
  'Allegiant Stadium':    {bg1:'#050505',bg2:'#0A0A0A',ac:'#A5ACAF',lc:'#000000'},
  'Q2 Stadium':           {bg1:'#0A1020',bg2:'#0D1830',ac:'#00B140',lc:'#FFFFFF'},
  "Estadio Ciudad de México":{bg1:'#0A1628',bg2:'#0D2040',ac:'#006847',lc:'#CE1126'},
};

function StadiumCard({v,height=150}){
  const t=STADIUM_THEMES[v.n]||{bg1:'#040E24',bg2:'#0C2660',ac:'#60A5FA',lc:'#93C5FD'};
  const wiki=VENUE_WIKI[v.n]||v.wk;
  const hsh=(s,i)=>{let x=5381;for(let j=0;j<s.length+1;j++)x=((x<<5)+x)+(s.charCodeAt(j%s.length)||i*7);return(Math.abs(x)%10000)/10000;};
  const stars=Array.from({length:18},(_,i)=>({
    cx:hsh(v.n,i*3)*400,cy:hsh(v.n,i*3+1)*70,
    r:hsh(v.n,i*3+2)*1.4+0.3,op:hsh(v.n,i*3+2)*.5+.2
  }));
  const gvId=`vg${v.n.replace(/\W/g,'')}`;
  const phaseBg=v.phase==='Final'?t.ac:v.phase==='Semifinal'?t.lc:'rgba(0,0,0,.55)';
  const phaseCol=(v.phase==='Final'||v.phase==='Semifinal')?'#000':'rgba(255,255,255,.9)';

  // SVG illustration fallback
  const svgFallback=(
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}}
      viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gvId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="30%" stopColor="transparent"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.9)"/>
        </linearGradient>
        <radialGradient id={`gw${v.n.replace(/\W/g,'')}`} cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor={t.ac} stopOpacity="0.1"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      {stars.map((s,i)=><circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.op}/>)}
      <rect width="400" height="150" fill={`url(#gw${v.n.replace(/\W/g,'')})`}/>
      <ellipse cx="200" cy="134" rx="192" ry="57" fill={t.bg1} stroke={t.ac} strokeWidth="1.2" opacity=".95"/>
      <ellipse cx="200" cy="150" rx="150" ry="38" fill="#1B5E20"/>
      <ellipse cx="200" cy="150" rx="140" ry="34" fill="#1E6B23"/>
      <ellipse cx="200" cy="149" rx="36" ry="10" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.2"/>
      <line x1="55" y1="149" x2="345" y2="149" stroke="rgba(255,255,255,.22)" strokeWidth="1.2"/>
      {[[62,52],[148,40],[252,40],[338,52]].map(([px,py],i)=>(
        <g key={i}>
          <line x1={px} y1={py+6} x2={px+(i<2?-3:3)} y2="114" stroke={t.lc} strokeWidth="1.5" opacity=".5"/>
          <ellipse cx={px} cy={py} rx="11" ry="4" fill={t.ac} opacity=".95"/>
          <ellipse cx={px} cy={py+2} rx="22" ry="10" fill={t.ac} opacity=".06"/>
        </g>
      ))}
      <ellipse cx="200" cy="134" rx="188" ry="52" fill="none" stroke={t.ac} strokeWidth=".6" opacity=".18"/>
      <rect width="400" height="150" fill={`url(#${gvId})`}/>
    </svg>
  );

  const embeddedImg = STADIUM_IMGS[v.n];
  return(
    <div style={{width:'100%',height,position:'relative',overflow:'hidden',
      background:`linear-gradient(160deg,${t.bg1} 0%,${t.bg2} 100%)`}}>
      {embeddedImg
        ? <img src={embeddedImg} alt={v.n}
            style={{position:'absolute',inset:0,width:'100%',height:'100%',
              objectFit:'cover',objectPosition:'center top'}}/>
        : wiki
          ? <WikiPhoto wiki={wiki} sz="100%" radius="0"
              style={{position:'absolute',inset:0,width:'100%',height,
                borderRadius:0,objectFit:'cover',objectPosition:'center'}}
              fallback={svgFallback}/>
          : svgFallback
      }
      {/* Gradient overlay for text readability */}
      <div style={{position:'absolute',inset:0,
        background:'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.1) 55%, transparent 100%)'}}/>
      {/* Phase badge */}
      <div style={{position:'absolute',top:10,right:10,
        background:phaseBg,color:phaseCol,
        padding:'4px 11px',borderRadius:20,fontSize:10,fontWeight:700,
        letterSpacing:.3,backdropFilter:'blur(8px)'}}>
        {v.phase}
      </div>
      {/* Name */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'9px 13px'}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,
          color:'rgba(255,255,255,.97)',letterSpacing:1,lineHeight:1,
          textShadow:'0 2px 6px rgba(0,0,0,.9)'}}>{v.n}</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:2}}>{v.c} · 👥 {v.cap}</div>
      </div>
    </div>
  );
}
// ── Jersey images — now using geometric SVG jerseys (see PlayerPhoto above) ──
const JERSEY_IMGS={};

// ── Avatar: alias for PlayerPhoto (used throughout app) ──
function Avatar({name,team,cards=[],sz=52}){
  return <PlayerPhoto name={name} team={team} cards={cards} sz={sz}/>;
}

// ── Splash ───────────────────────────────────────
function Splash({done}){
  const [prog,setProg]=useState(0);
  useEffect(()=>{
    const t=setInterval(()=>setProg(p=>{if(p>=100){clearInterval(t);done();return 100;}return p+2;}),40);
    return()=>clearInterval(t);
  },[]);
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      height:'100%',gap:16,
      background:'radial-gradient(ellipse at 50% 38%,rgba(240,165,0,.09) 0%,transparent 62%)'}}>
      <img src="/icon-512.png" alt="Mundial 2026"
        style={{width:200,height:200,borderRadius:36,
          boxShadow:'0 0 40px rgba(240,165,0,.45), 0 8px 32px rgba(0,0,0,.6)',
          objectFit:'cover',border:'3px solid rgba(240,165,0,.3)'}}/>
      <div style={{textAlign:'center',lineHeight:1,marginTop:4}}>
        <div style={{fontSize:11,color:'var(--muted)',letterSpacing:3,textTransform:'uppercase'}}>
          USA · Canadá · México
        </div>
      </div>
      <div style={{width:160,height:3,background:'rgba(255,255,255,.08)',borderRadius:2,overflow:'hidden',marginTop:20}}>
        <div style={{height:'100%',background:'var(--gold)',borderRadius:2,width:`${prog}%`,transition:'width .04s linear'}}/>
      </div>
      <div style={{fontSize:12,color:'var(--muted)'}}>{prog < 100 ? 'Cargando…' : '¡Listo!'}</div>
    </div>
  );
}

// ── Auth ─────────────────────────────────────────
function Auth({onLogin,onLangChange=()=>{},logoutMsg='',onClearMsg=()=>{}}){
  const [mode,setMode]=useState('login');
  const [f,setF]=useState({email:'',pass:'',name:'',bd:'',nat:'',gen:'',lang:'es'});
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));

  const submit=async()=>{
    setErr('');
    const email=f.email.trim().toLowerCase();
    const pass=f.pass.trim();
    if(!email||!pass){setErr('El correo y la contraseña son requeridos');return;}

    setLoading(true);

    // ── Admin check (valida en el servidor, credenciales nunca en el bundle) ──
    try{
      const r=await fetch('/api/admin/auth',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,pass}),
      });
      const {ok}=await r.json();
      if(ok){
        setLoading(false);
        onLogin({id:'admin',email,name:'Administrador General',isAdmin:true,
                 nat:'México',gen:'Prefiero no decir'});
        return;
      }
    }catch(e){ /* si el servidor no responde, continúa con login normal */ }

    // ── Registro / Login con Firebase Auth nativo ──
    if(mode==='reg'){
      // Validate fields
      if(!f.name.trim()||!f.bd||!f.nat.trim()||!f.gen){
        setLoading(false);setErr('Por favor completa todos los campos del registro');return;
      }
      if(pass.length<6){
        setLoading(false);setErr('La contraseña debe tener al menos 6 caracteres.');return;
      }
      const authRegister=await waitForFb('_fbAuthRegister');
      if(!authRegister){
        setLoading(false);setErr('No se pudo conectar con el servidor de cuentas. Revisa tu conexión.');return;
      }
      try{
        const fbUser=await authRegister(email,pass);
        const uid=fbUser.uid;
        const newUser={
          id:uid,email,
          name:f.name.trim(),
          bd:f.bd,nat:f.nat.trim(),gen:f.gen,
          lang:f.lang||LANG_BY_NAT[f.nat.trim()]||'es',
          createdAt:new Date().toISOString(),
          paquetes:0,isAdmin:false,fromAuth:true
        };
        const saveAuthUser=window._fbSaveAuthUser;
        if(saveAuthUser) await saveAuthUser(uid,newUser);
        setLoading(false);
        onLogin(newUser);
        fetch('/api/welcome-email',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({email:newUser.email,name:newUser.name})}).catch(()=>{});
      }catch(e){
        setLoading(false);
        if(e.code==='auth/email-already-in-use') setErr('⚠️ Este correo ya está registrado. Por favor inicia sesión.');
        else if(e.code==='auth/weak-password') setErr('La contraseña debe tener al menos 6 caracteres.');
        else if(e.code==='auth/invalid-email') setErr('El correo electrónico no es válido.');
        else { console.warn('authRegister error:',e); setErr('No se pudo crear la cuenta. Intenta de nuevo.'); }
      }

    }else{
      const authLogin=await waitForFb('_fbAuthLogin');
      if(!authLogin){
        setLoading(false);setErr('No se pudo conectar con el servidor de cuentas. Revisa tu conexión.');return;
      }
      // Carga el perfil (migra datos legados la primera vez) y entra a la app
      const enterWithUid=async uid=>{
        let profile=null;
        const migrateFn=window._fbMigrateUser;
        if(migrateFn){ try{ profile=await migrateFn(uid,email); }catch(_){} }
        if(!profile){
          const getFn=window._fbGetUser;
          if(getFn){ try{ profile=await getFn(uid); }catch(_){} }
        }
        // Cuenta desactivada por el admin
        if(profile?.deleted||profile?.forceDelete){
          const logoutFn=window._fbAuthLogout; if(logoutFn) try{ await logoutFn(); }catch(_){}
          setLoading(false);
          setErr('Esta cuenta ha sido desactivada. Contacta al administrador.');
          return;
        }
        const u={email,fromAuth:true,...(profile||{}),id:uid,isAdmin:false};
        setLoading(false);
        onLogin(u);
      };
      try{
        const fbUser=await authLogin(email,pass);
        await enterWithUid(fbUser.uid);
      }catch(e){
        // auth/invalid-credential cubre "no existe" Y "contraseña incorrecta"
        // (protección anti-enumeración de Firebase). Para distinguir: si el email
        // existe como cuenta legada (sin cuenta Auth aún), la creamos con la
        // contraseña tecleada — migración perezosa aprobada.
        if(e.code==='auth/invalid-credential'||e.code==='auth/user-not-found'){
          const findFn=window._fbFindUserByEmail;
          let legacy=null;
          if(findFn){ try{ legacy=await findFn(email); }catch(_){} }
          if(legacy && !legacy.deleted && !legacy.forceDelete){
            if(pass.length<6){
              setLoading(false);
              setErr('Por seguridad, tu contraseña debe tener al menos 6 caracteres. Escribe una de 6+ para activar tu cuenta.');
              return;
            }
            const authRegister=window._fbAuthRegister;
            try{
              const fbUser=await authRegister(email,pass);
              await enterWithUid(fbUser.uid);
              return;
            }catch(e2){
              // email-already-in-use ⇒ la cuenta Auth ya existía ⇒ era contraseña incorrecta
              setLoading(false);
              setErr('Correo o contraseña incorrectos');
              return;
            }
          }
          setLoading(false);
          setErr('Correo o contraseña incorrectos');
          return;
        }
        setLoading(false);
        if(e.code==='auth/too-many-requests') setErr('Demasiados intentos. Espera un momento e inténtalo de nuevo.');
        else { console.warn('authLogin error:',e); setErr('Correo o contraseña incorrectos'); }
      }
    }
  };

  const t=useLang();
  return(
    <div style={{height:'100%',overflowY:'auto',background:'linear-gradient(160deg,#0D1A2E 0%,#040C1E 100%)'}}>
      <div style={{padding:'40px 24px 18px',textAlign:'center'}}>
        <img src="/icon-512.png" alt="Mundial 2026"
          style={{width:90,height:90,borderRadius:20,objectFit:'cover',
            boxShadow:'0 0 24px rgba(240,165,0,.35)',
            border:'2px solid rgba(240,165,0,.3)'}}/>
        <div style={{fontFamily:'var(--ff)',fontSize:32,letterSpacing:2,color:'var(--gold)',marginTop:10,lineHeight:1}}>MUNDIAL 2026</div>
        <div style={{fontSize:13,color:'var(--muted)',marginTop:6}}>
          {mode==='login'?t.login_subtitle:t.register_subtitle}
        </div>
      </div>

      {logoutMsg&&(
        <div style={{margin:'0 24px 4px',background:'rgba(240,165,0,.1)',
          border:'1px solid rgba(240,165,0,.35)',borderRadius:12,
          padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:10}}>
          <span style={{fontSize:20,flexShrink:0}}>📱</span>
          <div style={{flex:1,fontSize:13,color:'var(--gold)',lineHeight:1.5}}>{logoutMsg}</div>
          <button onClick={onClearMsg}
            style={{background:'none',border:'none',color:'var(--muted)',
              cursor:'pointer',fontSize:20,padding:0,flexShrink:0,lineHeight:1}}>×</button>
        </div>
      )}

      <div style={{padding:'0 24px 36px',display:'flex',flexDirection:'column',gap:11}}>
        {err&&
          <div style={{background:'rgba(200,16,46,.1)',border:'1px solid rgba(200,16,46,.3)',
            borderRadius:10,padding:'10px 14px',fontSize:13,color:'#FC8181',textAlign:'center'}}>
            ⚠️ {err}
          </div>}

        {mode==='reg'&&
          <input className="inp" placeholder={t.name} value={f.name} onChange={set('name')}/>}
        <input className="inp" placeholder={t.email} type="text" value={f.email} onChange={set('email')}/>
        <input className="inp" placeholder={t.password} type="password" value={f.pass} onChange={set('pass')}/>

        {mode==='reg'&&<>
          <div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:5,paddingLeft:2}}>{t.birthdate}</div>
            <input className="inp" type="date" value={f.bd} onChange={set('bd')}
              style={{colorScheme:'dark'}}/>
          </div>
          <input className="inp" placeholder={t.nationality} value={f.nat}
            onChange={e=>{
              set('nat')(e);
              const nat=e.target.value.trim();
              const suggestedLang=Object.keys(LANG_BY_NAT).find(k=>
                nat.toLowerCase().includes(k.toLowerCase())
              );
              if(suggestedLang){
                const lk=LANG_BY_NAT[suggestedLang];
                setF(p=>({...p,lang:lk}));
                onLangChange(lk);
              }
            }}/>
          {mode==='reg'&&(
            <div>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,paddingLeft:2}}>
                🌐 {t.language}
              </div>
              <div style={{display:'flex',gap:6}}>
                {Object.entries(LANG_NAMES).map(([lk,ln])=>(
                  <button key={lk} onClick={()=>{setF(p=>({...p,lang:lk}));onLangChange(lk);}}
                    type="button"
                    style={{flex:1,padding:'9px 4px',borderRadius:10,fontSize:11,
                      fontWeight:700,cursor:'pointer',
                      background:f.lang===lk?'var(--gold)':'var(--surf2)',
                      color:f.lang===lk?'#000':'var(--muted)',
                      border:`1.5px solid ${f.lang===lk?'var(--gold)':'var(--br)'}`,
                      transition:'all .2s',lineHeight:1.3,textAlign:'center'}}>
                    {LANG_FLAGS[lk]}<br/><span style={{fontSize:10}}>{ln}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <select className="inp" value={f.gen} onChange={set('gen')} style={{appearance:'none',WebkitAppearance:'none'}}>
            <option value="">{t.select_gender}</option>
            <option>{t.gender_male}</option><option>{t.gender_female}</option>
            <option>{t.gender_other}</option><option>{t.gender_prefer_not}</option>
          </select>
        </>}

        <button className="btn" onClick={submit} disabled={loading}
          style={{opacity: loading ? 0.7 : 1, display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {loading
            ? <span style={{display:'inline-block',width:18,height:18,border:'2.5px solid #000',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
            : null}
          {mode==='login'?t.sign_in:t.sign_up}
        </button>

        <div style={{textAlign:'center',marginTop:6}}>
          <span style={{fontSize:14,color:'var(--muted)'}}>
            {mode==='login'?t.no_account+' ':t.have_account+' '}
          </span>
          <span style={{fontSize:14,color:'var(--gold)',fontWeight:600,cursor:'pointer'}}
            onClick={()=>{setMode(mode==='login'?'reg':'login');setErr('');}}>
            {mode==='login'?t.register:t.login}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Match Card (live) ────────────────────────────
function MatchCard({m,onClick}){
  const [min,setMin]=useState(m.min);
  useEffect(()=>{const t=setInterval(()=>setMin(v=>Math.min(v+1,90)),30000);return()=>clearInterval(t);},[]);
  const last=m.events[m.events.length-1];
  const ico={goal:'⚽',yellow:'🟨',red:'🟥',sub:'🔄'};
  return(
    <div className="mc" onClick={onClick}>
      <div style={{padding:'9px 14px 4px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:.5}}>{m.phase} · {m.city}</span>
        <span className="live"><span className="ldot"/>{min}'</span>
      </div>
      <div style={{padding:'6px 14px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
          <span style={{fontSize:30}}>{FLAGS[m.home]||'🏴'}</span>
          <span style={{fontWeight:700,fontSize:14,color:'var(--txt)'}}>{m.home}</span>
          <div style={{display:'flex',gap:3}}>
            {m.homeXI.filter(p=>p.c.includes('yellow')).slice(0,3).map(p=>(
              <div key={p.n} title={p.n} style={{width:8,height:10,background:'#FFCC00',borderRadius:1}}/>))}
            {m.homeXI.filter(p=>p.c.includes('red')).map(p=>(
              <div key={p.n} title={p.n} style={{width:8,height:10,background:'#c8102e',borderRadius:1}}/>))}
          </div>
        </div>
        <div style={{textAlign:'center',minWidth:90}}>
          <div style={{fontFamily:'var(--ff)',fontSize:48,letterSpacing:5,lineHeight:1,color:'var(--gold)'}}>{m.hs} - {m.as}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>🏟 {m.venue}</div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
          <span style={{fontSize:30}}>{FLAGS[m.away]||'🏴'}</span>
          <span style={{fontWeight:700,fontSize:14,color:'var(--txt)'}}>{m.away}</span>
          <div style={{display:'flex',gap:3,justifyContent:'flex-end'}}>
            {m.awayXI.filter(p=>p.c.includes('yellow')).slice(0,3).map(p=>(
              <div key={p.n} title={p.n} style={{width:8,height:10,background:'#FFCC00',borderRadius:1}}/>))}
            {m.awayXI.filter(p=>p.c.includes('red')).map(p=>(
              <div key={p.n} title={p.n} style={{width:8,height:10,background:'#c8102e',borderRadius:1}}/>))}
          </div>
        </div>
      </div>
      {last&&
        <div style={{background:'rgba(255,255,255,.025)',padding:'8px 14px',
          borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',gap:7,alignItems:'flex-start'}}>
          <span style={{fontSize:15,flexShrink:0}}>{ico[last.t]||'📋'}</span>
          <span style={{fontSize:12,color:'#8A9BC9',lineHeight:1.45}}>{last.desc}</span>
          <span style={{marginLeft:'auto',fontSize:11,color:'var(--muted)',flexShrink:0}}>{last.m}'</span>
        </div>}
      <div style={{padding:'7px 14px',borderTop:'1px solid rgba(255,255,255,.04)',
        display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
        <span style={{fontSize:11,color:'var(--gold)',fontWeight:600}}>Ver detalle →</span>
      </div>
    </div>
  );
}

// ── Next Match Card ──────────────────────────────
function NextCard({m}){
  return(
    <div style={{margin:'0 16px 11px',background:'var(--surf)',borderRadius:'var(--r)',border:'1px solid var(--br)',overflow:'hidden'}}>
      <div style={{padding:'8px 14px 3px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>{m.phase} · {m.date}</span>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:11,color:'var(--muted)'}}>🕐 {m.time}</span>
          <span style={{fontSize:10,background:'rgba(79,142,247,.15)',color:'var(--acc)',padding:'2px 8px',borderRadius:20,fontWeight:700,letterSpacing:.5}}>PRÓXIMO</span>
        </div>
      </div>
      <div style={{padding:'6px 14px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
          <span style={{fontSize:28}}>{FLAGS[m.home]||'🏴'}</span>
          <span style={{fontWeight:700,fontSize:14}}>{m.home}</span>
        </div>
        <div style={{textAlign:'center',minWidth:82}}>
          <div style={{fontFamily:'var(--ff)',fontSize:22,color:'var(--muted)',letterSpacing:2}}>VS</div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>📍 {m.city}</div>
          <div style={{fontSize:10,color:'var(--muted)'}}>🏟 {m.venue}</div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
          <span style={{fontSize:28}}>{FLAGS[m.away]||'🏴'}</span>
          <span style={{fontWeight:700,fontSize:14}}>{m.away}</span>
        </div>
      </div>
      <div style={{padding:'8px 14px',background:'rgba(255,255,255,.02)',borderTop:'1px solid rgba(255,255,255,.05)',
        display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}>
          <span style={{fontSize:18}}>{m.wx.ic}</span>
          <div>
            <div style={{color:'var(--txt)',fontWeight:500}}>{m.wx.t}</div>
            <div style={{color:'var(--muted)',fontSize:11}}>{m.wx.desc}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:12}}>
          {['Local','Empate','Visit.'].map((o,i)=>(
            <div key={o} style={{textAlign:'center'}}>
              <div style={{fontSize:10,color:'var(--muted)'}}>{o}</div>
              <div style={{fontSize:14,fontWeight:700,color:'var(--gold)'}}>{m.odds[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Match Detail ─────────────────────────────────
function MatchDetail({m,onBack}){
  const [tab,setTab]=useState('eventos');
  const [lmin,setLmin]=useState(m.min);
  const [events,setEvents]=useState(m.events||[]);
  const [loadingEv,setLoadingEv]=useState(false);

  // ── Fetch live events: goles, tarjetas, cambios ──
  useEffect(()=>{
    const fetch_ev=async()=>{
      if(!true||!m.id)return;
      setLoadingEv(true);
      const data=await afFetch(`/fixtures/events?fixture=${m.id}`);
      if(data&&data.length>0){
        const mapped=data.map(ev=>({
          min:ev.time?.elapsed||0,
          type:ev.type==='Goal'?'goal':
               ev.detail==='Yellow Card'?'yellow':
               ev.detail==='Red Card'?'red':'sub',
          team:ev.team?.name||'',
          player:ev.player?.name||'',
          assist:ev.assist?.name||null,
          detail:ev.detail||'',
          isHome:ev.team?.name===m.home,
        }));
        setEvents(mapped.sort((a,b)=>b.min-a.min));
      }
      setLoadingEv(false);
    };
    fetch_ev();
    // Refresca eventos cada 45 segundos durante el partido
    const id=setInterval(fetch_ev,45000);
    return()=>clearInterval(id);
  },[m.id]);

  useEffect(()=>{const t=setInterval(()=>setLmin(v=>Math.min(v+1,90)),30000);return()=>clearInterval(t);},[]);

  const es={
    goal:{ic:'⚽',bg:'rgba(30,198,108,.1)',col:'var(--grn)'},
    yellow:{ic:'🟨',bg:'rgba(255,204,0,.1)',col:'#FFCC00'},
    red:{ic:'🟥',bg:'rgba(200,16,46,.1)',col:'var(--red)'},
    sub:{ic:'🔄',bg:'rgba(79,142,247,.1)',col:'var(--acc)'}
  };

  function Lineup({xi,team,flip}){
    const rows={
      GK:xi.filter(p=>p.pos==='GK'),
      DEF:xi.filter(p=>['RB','CB','LB','SW'].includes(p.pos)),
      MID:xi.filter(p=>['CM','DM','CAM','RM','LM'].includes(p.pos)),
      FWD:xi.filter(p=>['FW','RW','LW','SS'].includes(p.pos)),
    };
    const order=flip?['GK','DEF','MID','FWD']:['FWD','MID','DEF','GK'];
    return(
      <div style={{background:'linear-gradient(180deg,#1d6330 0%,#0e3d1b 100%)',
        borderRadius:12,padding:'14px 8px 12px',border:'1px solid rgba(255,255,255,.1)',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,
          marginBottom:10,paddingBottom:8,borderBottom:'1px dashed rgba(255,255,255,.12)'}}>
          <span style={{fontSize:16}}>{FLAGS[team]}</span>
          <span style={{fontSize:12,color:'rgba(255,255,255,.7)',fontWeight:600}}>{team}</span>
        </div>
        {order.map(row=>rows[row]?.length>0&&(
          <div key={row} style={{display:'flex',justifyContent:'space-around',marginBottom:12,flexWrap:'wrap',gap:4}}>
            {rows[row].map(p=>(
              <div key={p.n} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:50,maxWidth:60}}>
                <Avatar name={p.n} team={team} cards={p.c} sz={40}/>
                <span style={{fontSize:10,textAlign:'center',color:'rgba(255,255,255,.92)',fontWeight:600,
                  maxWidth:54,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {p.n.split(' ').slice(-1)[0]}
                </span>
                <span style={{fontSize:9,color:'rgba(255,255,255,.4)',background:'rgba(0,0,0,.3)',
                  padding:'1px 5px',borderRadius:4}}>{p.pos}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'center',gap:14,marginTop:4,fontSize:11,color:'rgba(255,255,255,.45)'}}>
          <span>🟡 Amonestado</span><span>🔴 Expulsado</span>
        </div>
      </div>
    );
  }

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{background:'var(--surf)',borderBottom:'1px solid var(--br)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',padding:'11px 16px',gap:10}}>
          <button onClick={onBack} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',
            width:36,height:36,borderRadius:10,cursor:'pointer',fontSize:20,
            display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.18)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'}>←</button>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--ff)',fontSize:18,letterSpacing:1}}>{m.home} vs {m.away}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{m.phase} · {m.venue}</div>
          </div>
          <span className="live"><span className="ldot"/>{lmin}'</span>
        </div>
        {/* Score */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,padding:'4px 16px 12px'}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:34}}>{FLAGS[m.home]}</div>
            <div style={{fontSize:12,fontWeight:700}}>{m.home}</div>
          </div>
          <div style={{fontFamily:'var(--ff)',fontSize:58,letterSpacing:6,color:'var(--gold)',lineHeight:1,
            textShadow:'0 0 20px rgba(240,165,0,.3)'}}>{m.hs} - {m.as}</div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:34}}>{FLAGS[m.away]}</div>
            <div style={{fontSize:12,fontWeight:700}}>{m.away}</div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{display:'flex',gap:8,padding:'0 16px 12px',overflowX:'auto'}}>
          {[['eventos','⚡ Eventos'],['alineación','👥 Alineación'],['previo','💬 Pre-Partido']].map(([k,l])=>(
            <button key={k} className={`tpill ${tab===k?'on':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto'}}>
        {tab==='eventos'&&(
          <div>
            {[...events].reverse().map((ev,i)=>{
              const e=es[ev.t]||{ic:'📋',bg:'rgba(255,255,255,.05)',col:'#fff'};
              return(
                <div key={i} style={{display:'flex',gap:12,padding:'13px 16px',
                  borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'flex-start',
                  animation:'slidein .25s ease'}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:e.bg,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{e.ic}</div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                      <span style={{fontFamily:'var(--ff)',fontSize:20,color:e.col,lineHeight:1}}>{ev.m}'</span>
                      <span style={{fontSize:14,fontWeight:700}}>
                        {ev.t==='sub'?`${ev.pOut} → ${ev.pIn}`:ev.p}
                      </span>
                      <span style={{marginLeft:'auto',fontSize:20}}>{FLAGS[ev.side==='home'?m.home:m.away]}</span>
                    </div>
                    {ev.ast&&<div style={{fontSize:12,color:'var(--muted)',marginBottom:2}}>🎯 Asistencia: {ev.ast}</div>}
                    <div style={{fontSize:12,color:'#8A9BC9',lineHeight:1.45}}>{ev.desc}</div>
                  </div>
                </div>
              );
            })}
            {m.events.length===0&&
              <div style={{textAlign:'center',padding:'48px 24px',color:'var(--muted)',fontSize:14}}>
                ⏳ Sin eventos aún. El partido está comenzando…
              </div>}
          </div>
        )}

        {tab==='alineación'&&(
          <div style={{padding:'14px 16px'}}>
            <Lineup xi={m.homeXI} team={m.home} flip={true}/>
            <div style={{textAlign:'center',padding:'2px 0 10px',fontSize:12,
              color:'var(--muted)',fontWeight:600,letterSpacing:2}}>⚔️  VS  ⚔️</div>
            <Lineup xi={m.awayXI} team={m.away} flip={false}/>
          </div>
        )}

        {tab==='previo'&&(
          <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{fontSize:12,color:'var(--muted)',textAlign:'center',
              padding:'8px',background:'var(--surf)',borderRadius:10,marginBottom:4}}>
              💬 Declaraciones antes del partido
            </div>
            {m.pre.map((q,i)=>(
              <div key={i} style={{background:'var(--surf)',borderRadius:12,padding:14,
                border:'1px solid var(--br)',animation:'slidein .3s ease'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:11}}>
                  <Avatar name={q.pl} team={q.team} sz={48}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{q.pl}</div>
                    <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                      {FLAGS[q.team]} {q.team} · {q.tipo}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:14,color:'#C8D8F0',fontStyle:'italic',lineHeight:1.6,
                  paddingLeft:12,borderLeft:'3px solid var(--gold)',background:'rgba(240,165,0,.03)',
                  padding:'10px 12px',borderRadius:'0 8px 8px 0'}}>
                  "{q.q}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Countdown to first match ─────────────────────
function Countdown(){
  // Primer partido del calendario (México vs Sudáfrica, id:1) — solo para el header.
  const FM=NEXT_MATCHES[0];
  // Objetivo en UTC ABSOLUTO para evitar cualquier ambigüedad de zona horaria del
  // navegador. 11 jun 2026 13:00 hora CDMX (UTC-6, sin horario de verano) = 19:00 UTC.
  // Date.UTC usa mes 0-indexed → junio = 5.
  const FIRST_MATCH=new Date(Date.UTC(2026, 5, 11, 19, 0, 0)); // 2026-06-11T19:00:00.000Z
  const [t,setT]=useState(null);
  useEffect(()=>{
    const calc=()=>{
      const diff=FIRST_MATCH-new Date();
      if(diff<=0){setT({done:true});return;}
      setT({
        d:Math.floor(diff/(864e5)),
        h:Math.floor((diff%864e5)/36e5),
        m:Math.floor((diff%36e5)/6e4),
        s:Math.floor((diff%6e4)/1e3),
        done:false
      });
    };
    calc();
    const id=setInterval(calc,1000);
    return()=>clearInterval(id);
  },[]);
  if(!t||t.done)return null;
  const pad=n=>String(n).padStart(2,'0');
  return(
    <div style={{margin:'10px 16px 14px',borderRadius:14,overflow:'hidden',
      border:'1px solid rgba(240,165,0,.25)',
      background:'linear-gradient(135deg,rgba(240,165,0,.07) 0%,rgba(240,165,0,.02) 100%)'}}>
      <div style={{padding:'12px 14px 10px',textAlign:'center'}}>
        <div style={{fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:1.2,
          textTransform:'uppercase',marginBottom:4}}>
          ⏱️ Cuenta regresiva · Primer partido
        </div>
        <div style={{fontSize:12,color:'var(--dim)',marginBottom:12}}>
          🇲🇽 México · Estadio Azteca · 11 Jun 2026 · {FM.time} h
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:8}}>
          {[['DÍAS',t.d],['HRS',t.h],['MIN',t.m],['SEG',t.s]].map(([label,val])=>(
            <div key={label} style={{textAlign:'center',flex:1,maxWidth:70,
              background:'var(--surf)',borderRadius:10,padding:'10px 4px',
              border:'1px solid rgba(240,165,0,.2)'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,
                color:'var(--gold)',lineHeight:1}}>{pad(val)}</div>
              <div style={{fontSize:9,color:'var(--muted)',fontWeight:700,
                marginTop:4,letterSpacing:.8}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,fontSize:10,color:'var(--dim)'}}>
          🏟️ También: USA vs Canadá · Jun 12 · SoFi Stadium
        </div>
      </div>
    </div>
  );
}

// ── Home Screen ──────────────────────────────────
// ── Marquesina de comentarios (texto desde Firestore live/banner) ──
function CommentMarquee(){
  const [texto,setTexto]=useState('');
  const [dur,setDur]=useState(30);
  const textRef=useRef(null);

  useEffect(()=>{
    let unsub, mounted=true;
    const cached=getCachedLive('banner');
    if(cached?.texto){ setTexto(cached.texto); }
    const trySub=()=>{
      if(!mounted) return;
      const fn=window._fbSubscribeLive;
      if(!fn){ setTimeout(trySub,800); return; }
      try{
        unsub=fn('banner',data=>{
          setCachedLive('banner',data);
          if(data?.texto) setTexto(data.texto);
        });
      }catch(e){}
    };
    trySub();
    return()=>{ mounted=false; if(typeof unsub==='function') unsub(); };
  },[]);

  // Velocidad constante: recalcula la duración cuando cambia el texto
  useEffect(()=>{
    if(!textRef.current) return;
    // ancho del texto + el padding-left:100% (ancho del contenedor)
    const textWidth=textRef.current.scrollWidth;
    const SPEED=40; // píxeles por segundo (más bajo = más lento). Ajustable.
    const duration=textWidth/SPEED;
    setDur(Math.max(duration,15)); // mínimo 15s para textos muy cortos
  },[texto]);

  // Texto por defecto si Firestore aún no tiene nada
  const display = texto || '📢 ¡Bienvenido a Mundial 2026! Haz tus pronósticos y compite con tus amigos · ⚽ El torneo comienza el 11 de Junio';

  return(
    <div className="marquee-wrap" style={{margin:'0 0 14px'}}>
      <div className="marquee-text" ref={textRef}
        style={{animationDuration:dur+'s'}}>
        {display}
      </div>
    </div>
  );
}

function HomeScreen({onMatch,onGoToCal}){
  const t=useLang();
  const [ref,setRef]=useState(false);
  const [upd,setUpd]=useState(new Date());
  // API-Football live data
  const [liveMatches,setLiveMatches]=useState(LIVE_MATCHES);
  const [apiStatus,setApiStatus]=useState(true?'connecting':'off');
  // Partido(s) en vivo MANUAL — doc Firestore live/livemanual editado por el admin
  const [liveManual,setLiveManual]=useState(null);

  // Firestore: marcadores en vivo (con cache para evitar re-leer al volver al tab)
  useEffect(()=>{
    if(new Date()<new Date(Date.UTC(2026,5,11,19,0,0))) return;
    const cached=getCachedLive('matches');
    if(cached?.matches?.length){ setLiveMatches(cached.matches); setApiStatus('live'); return; }
    let unsub, mounted=true;
    const trySubscribe=()=>{
      if(!mounted) return;
      const fn=window._fbSubscribeLive;
      if(!fn){ setTimeout(trySubscribe,800); return; }
      try{
        unsub=fn('matches',data=>{
          setCachedLive('matches',data);
          if(data.matches?.length) setLiveMatches(data.matches);
          setApiStatus('live');
        });
      }catch(e){ setApiStatus('error'); }
    };
    trySubscribe();
    return()=>{ mounted=false; if(typeof unsub==='function') unsub(); };
  },[]);

  // Suscripción al partido en vivo manual (live/livemanual), mismo patrón que matches
  useEffect(()=>{
    let unsub,mounted=true;
    const cached=getCachedLive('livemanual');
    if(cached) setLiveManual(cached);
    const trySub=()=>{
      if(!mounted)return;
      const fn=window._fbSubscribeLive;
      if(!fn){setTimeout(trySub,800);return;}
      try{ unsub=fn('livemanual',data=>{ setCachedLive('livemanual',data); setLiveManual(data); }); }catch(e){}
    };
    trySub();
    return()=>{ mounted=false; if(typeof unsub==='function') unsub(); };
  },[]);

  const doRef=useCallback(()=>{
    setRef(true);setTimeout(()=>{setRef(false);setUpd(new Date());},900);
  },[]);
  useEffect(()=>{const t=setInterval(doRef,30000);return()=>clearInterval(t);},[]);

  // Partidos en vivo manuales activos (prioridad sobre la API)
  const livMan = (liveManual?.activo && Array.isArray(liveManual.partidos)) ? liveManual.partidos : [];
  const liveCount = livMan.length;
  // Próximos partidos: solo los de HOY (hora de México); si no hay, los más cercanos
  const hoyMX = new Date().toLocaleDateString('en-CA',{timeZone:'America/Mexico_City'}); // YYYY-MM-DD
  const partidosHoy = NEXT_MATCHES.filter(m=>m.isoDate===hoyMX);
  const lista = partidosHoy.length>0 ? partidosHoy : NEXT_MATCHES.filter(m=>m.isoDate>hoyMX).slice(0,3);

  return(
    <div className="scr fin">
      {/* Top bar */}
      <div style={{background:'linear-gradient(180deg,rgba(240,165,0,.07) 0%,transparent 100%)',
        padding:'16px 16px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:10}}>
          <div>
            <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2,color:'var(--gold)',lineHeight:1}}>MUNDIAL 2026</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
              🕐 Actualizado: {upd.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <img src="/icon-512.png" alt="logo"
              style={{width:36,height:36,borderRadius:8,objectFit:'cover',
                boxShadow:'0 0 10px rgba(240,165,0,.3)'}}/>
            <button onClick={doRef} style={{background:'rgba(240,165,0,.1)',border:'1px solid rgba(240,165,0,.2)',
              color:'var(--gold)',width:34,height:34,borderRadius:9,cursor:'pointer',fontSize:15,
              display:'flex',alignItems:'center',justifyContent:'center',
              animation:ref?'spin .8s linear infinite':'none',transition:'background .2s'}}
              title="Actualizar">🔄</button>
          </div>
        </div>
        {/* Live banner - solo visible cuando hay partidos en vivo (livemanual) */}
        {liveCount>0&&(
          <div style={{display:'flex',gap:8,alignItems:'center',padding:'8px 0',
            borderTop:'1px solid rgba(255,255,255,.04)'}}>
            <span className="live" style={{fontSize:11}}><span className="ldot"/>EN VIVO</span>
            <span style={{fontSize:12,color:'var(--muted)'}}>
              {liveCount} partido{liveCount!==1?'s':''} en curso
            </span>
            <span style={{marginLeft:'auto',fontSize:11,color:'var(--muted)'}}>
              🔄 Auto-refresh 30s
            </span>
          </div>
        )}
      </div>

      {/* ── COUNTDOWN when WC hasn't started ── */}
      {new Date()<new Date(Date.UTC(2026,5,11,19,0,0))&&<Countdown/>}

      {/* ── Marquesina de comentarios (siempre visible) ── */}
      <CommentMarquee/>

      {/* ── LIVE matches manuales (Firestore live/livemanual) ── */}
      {livMan.length>0&&(
        <div style={{padding:'0 16px',marginBottom:14}}>
          {livMan.map((p,i)=>(
            <div key={i} style={{background:'var(--surf)',borderRadius:14,
              border:'1px solid rgba(200,16,46,.35)',padding:'14px 16px',marginBottom:10,
              boxShadow:'0 0 14px rgba(200,16,46,.12)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <span className="live" style={{fontSize:11}}><span className="ldot"/>EN VIVO</span>
                {p.min&&<span style={{fontSize:12,color:'var(--gold)',fontWeight:700}}>{p.min}'</span>}
                {p.venue&&<span style={{marginLeft:'auto',fontSize:10,color:'var(--muted)'}}>🏟️ {p.venue}</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                  <span style={{fontSize:26}}>{FLAGS[p.home]||'🏳️'}</span>
                  <span style={{fontSize:14,fontWeight:700}}>{p.home}</span>
                </div>
                <div style={{fontSize:24,fontWeight:800,color:'var(--gold)',padding:'0 14px'}}>
                  {p.hs??0} - {p.as??0}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,justifyContent:'flex-end'}}>
                  <span style={{fontSize:14,fontWeight:700}}>{p.away}</span>
                  <span style={{fontSize:26}}>{FLAGS[p.away]||'🏳️'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Countdown message before WC starts */}
      {new Date()<new Date(Date.UTC(2026,5,11,19,0,0))&&(
        <div style={{margin:'0 16px 14px',background:'rgba(240,165,0,.04)',
          borderRadius:14,border:'1px dashed rgba(240,165,0,.2)',padding:'14px 16px',
          textAlign:'center'}}>
          <div style={{fontSize:13,color:'var(--gold)',fontWeight:700,marginBottom:4}}>
            ⏳ {t.live_soon}
          </div>
          <div style={{fontSize:11,color:'var(--dim)',lineHeight:1.7}}>
            {t.wc_starts} <strong style={{color:'var(--txt)'}}>11 Jun 2026</strong>.
            <br/>{t.live_info}
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 16px 8px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:22,letterSpacing:1}}>{t.next_matches}</div>
        <span onClick={onGoToCal} style={{fontSize:12,color:'var(--gold)',fontWeight:600,cursor:'pointer'}}>{t.see_all}</span>
      </div>
      {lista.map(m=><NextCard key={m.id} m={m}/>)}
    </div>
  );
}

// ── Calendar Screen ──────────────────────────────
function CalScreen(){
  const t=useLang();
  const [fil,setFil]=useState('todos');
  const [matches,setMatches]=useState(NEXT_MATCHES);

  // Firestore: fixtures (con cache 30min — horarios no cambian frecuentemente)
  useEffect(()=>{
    const cached=getCachedLive('fixtures');
    if(cached?.fixtures?.length>0){ setMatches(cached.fixtures); return; }
    let unsub, mounted=true;
    const trySubscribe=()=>{
      if(!mounted) return;
      const fn=window._fbSubscribeLive;
      if(!fn){ setTimeout(trySubscribe,800); return; }
      try{
        unsub=fn('fixtures',data=>{
          setCachedLive('fixtures',data);
          if(data.fixtures?.length>0) setMatches(data.fixtures);
        });
      }catch(e){}
    };
    trySubscribe();
    return()=>{ mounted=false; if(typeof unsub==='function') unsub(); };
  },[]);

  // Build dynamic date tabs from match dates
  const today=new Date();
  today.setHours(0,0,0,0);
  const todayISO=today.toISOString().slice(0,10);
  const tomorrow=new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowISO=tomorrow.toISOString().slice(0,10);
  const nextWeek=new Date(today); nextWeek.setDate(nextWeek.getDate()+7);

  // Get unique dates from all upcoming matches
  const allDates=[...new Set(matches.map(m=>m.isoDate))].sort();

  // Filter matches by selected tab
  const filtered=matches.filter(m=>{
    if(fil==='todos')return true;
    if(fil==='hoy')return m.isoDate===todayISO;
    if(fil==='manana')return m.isoDate===tomorrowISO;
    if(fil==='semana'){
      const d=new Date(m.isoDate+'T00:00:00');
      return d>=today&&d<=nextWeek;
    }
    return m.isoDate===fil; // specific date
  });

  // Group filtered matches by date
  const byDate={};
  filtered.forEach(m=>{
    if(!byDate[m.isoDate])byDate[m.isoDate]=[];
    byDate[m.isoDate].push(m);
  });

  const fmt=iso=>{
    const d=new Date(iso+'T00:00:00');
    return d.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'});
  };

  // Date label helper
  const dateLabel=iso=>{
    if(iso===todayISO)return'📅 '+t.today.toUpperCase();
    if(iso===tomorrowISO)return'📅 '+t.tomorrow.toUpperCase();
    return'📅 '+new Date(iso+'T00:00:00').toLocaleDateString('es',{day:'numeric',month:'short'}).toUpperCase();
  };

  return(
    <div className="scr fin">
      <div style={{padding:'18px 16px 6px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>{t.calendar_title}</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>
          Mundial 2026 · {matches.length} {t.matches_title.toLowerCase()}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:8,padding:'4px 16px 10px',overflowX:'auto'}}>
        {[['todos',t.all],
          ...allDates.map(d=>[d,new Date(d+'T00:00:00').toLocaleDateString('es',{day:'numeric',month:'short'})])
        ].map(([k,l])=>(
          <button key={k} className={`tpill ${fil===k?'on':''}`} onClick={()=>setFil(k)}>{l}</button>
        ))}
      </div>

      {/* Live matches only show during WC period (Jun 11 - Jul 19 2026) */}
      {fil==='todos'&&LIVE_MATCHES.length>0&&new Date()>=new Date(Date.UTC(2026,5,11,19,0,0))&&(
        <div>
          <div style={{padding:'4px 16px 7px',fontSize:12,fontWeight:700,
            color:'var(--muted)',letterSpacing:.8,display:'flex',alignItems:'center',gap:6}}>
            <span className="live" style={{fontSize:9}}><span className="ldot"/>{t.live_now}</span>
            {t.today_live}
          </div>
          {LIVE_MATCHES.map(m=>(
            <div key={m.id} style={{margin:'0 16px 10px',background:'var(--surf)',
              borderRadius:'var(--r)',border:'1px solid rgba(200,16,46,.2)',padding:'11px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:20}}>{FLAGS[m.home]||'🏴'}</span>
                  <span style={{fontWeight:700,fontSize:14}}>{m.home}</span>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--ff)',fontSize:26,color:'var(--gold)',letterSpacing:3}}>
                    {m.hs} - {m.as}
                  </div>
                  <span className="live" style={{fontSize:9,marginTop:2,display:'inline-flex'}}>
                    <span className="ldot"/>{m.min}'
                  </span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexDirection:'row-reverse'}}>
                  <span style={{fontSize:20}}>{FLAGS[m.away]||'🏴'}</span>
                  <span style={{fontWeight:700,fontSize:14}}>{m.away}</span>
                </div>
              </div>
              <div style={{marginTop:6,fontSize:11,color:'var(--muted)',textAlign:'center'}}>
                🏟 {m.venue} · {m.city}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtered upcoming matches grouped by date */}
      {Object.keys(byDate).length===0&&(
        <div style={{textAlign:'center',padding:'40px 24px',color:'var(--muted)'}}>
          <div style={{fontSize:36,marginBottom:10}}>📅</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>
            {fil==='hoy'?t.no_matches_today:
             fil==='manana'?t.no_matches_tomorrow:
             t.no_matches}
          </div>
          <div style={{fontSize:12,lineHeight:1.6}}>
            {t.wc_date}<br/>{t.wc_opening}
          </div>
        </div>
      )}
      {Object.keys(byDate).sort().map(date=>(
        <div key={date}>
          <div style={{padding:'6px 16px 7px',fontSize:11,fontWeight:700,
            color:'var(--muted)',letterSpacing:.8}}>
            {dateLabel(date)} · {fmt(date).toUpperCase()}
          </div>
          {byDate[date].map(m=><NextCard key={m.id} m={m}/>)}
        </div>
      ))}

      {/* Venues section */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px 8px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:22,letterSpacing:1}}>Sedes Oficiales</div>
        <span style={{fontSize:10,color:'var(--muted)'}}>Fotos reales en app desplegada</span>
      </div>
      {VENUES.map(v=>(
        <div key={v.n} style={{margin:'0 16px 14px',background:'var(--surf)',
          borderRadius:14,border:'1px solid var(--br)',overflow:'hidden'}}>
          <StadiumCard v={v} height={150}/>
          <div style={{padding:'11px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{v.f} {v.n}</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>{v.c} · Cap. {v.cap}</div>
            </div>
            <div style={{fontSize:10,background:
              v.phase==='Final'?'rgba(240,165,0,.15)':
              v.phase==='Semifinal'?'rgba(79,142,247,.15)':'rgba(30,198,108,.1)',
              color:v.phase==='Final'?'var(--gold)':v.phase==='Semifinal'?'var(--acc)':'var(--grn)',
              padding:'3px 10px',borderRadius:20,fontWeight:700}}>
              {v.phase}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Bracket View Component ────────────────────────
function BracketSlot({slot,highlight=false}){
  const t=useLang();
  const hasTeams = slot?.home||slot?.away;
  const isWon    = !!slot?.winner;
  return(
    <div style={{background:highlight?'rgba(240,165,0,.08)':'var(--surf2)',
      borderRadius:10,border:`1px solid ${highlight?'rgba(240,165,0,.3)':'var(--br)'}`,
      padding:'8px 10px',minWidth:148,flexShrink:0,
      boxShadow:highlight?'0 0 12px rgba(240,165,0,.15)':'none'}}>
      {/* Team home */}
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,
        opacity:isWon&&slot.winner!==slot.home?.name?.slice(0,8)?0.4:1}}>
        <span style={{fontSize:16,lineHeight:1}}>{slot?.homeFl||'🏳️'}</span>
        <span style={{fontSize:11,fontWeight:slot.winner===slot.home?.name?.slice(0,8)?700:500,
          color:slot.winner===slot.home?.name?.slice(0,8)?'var(--gold)':'var(--txt)',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:90}}>
          {slot?.home||<span style={{color:'var(--muted)',fontStyle:'italic'}}>{t.tbd}</span>}
        </span>
      </div>
      <div style={{height:1,background:'var(--br)',marginBottom:5}}/>
      {/* Team away */}
      <div style={{display:'flex',alignItems:'center',gap:6,
        opacity:isWon&&slot.winner!==slot.away?.name?.slice(0,8)?0.4:1}}>
        <span style={{fontSize:16,lineHeight:1}}>{slot?.awayFl||'🏳️'}</span>
        <span style={{fontSize:11,fontWeight:slot.winner===slot.away?.name?.slice(0,8)?700:500,
          color:slot.winner===slot.away?.name?.slice(0,8)?'var(--gold)':'var(--txt)',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:90}}>
          {slot?.away||<span style={{color:'var(--muted)',fontStyle:'italic'}}>{t.tbd}</span>}
        </span>
      </div>
      {/* Date/venue */}
      <div style={{marginTop:5,fontSize:9,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',
        textOverflow:'ellipsis'}}>
        📅 {slot.date} · {slot.venue}
      </div>
    </div>
  );
}

function BracketRound({title,slots,color='var(--acc)',icon=''}){
  return(
    <div style={{marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 16px',marginBottom:10}}>
        <div style={{width:3,height:18,borderRadius:2,background:color}}/>
        <span style={{fontFamily:'var(--ff)',fontSize:18,letterSpacing:1,color}}>{icon} {title}</span>
        <span style={{fontSize:10,color:'var(--muted)',background:'var(--surf)',
          padding:'2px 8px',borderRadius:10,border:'1px solid var(--br)'}}>
          {slots.length} {slots.length===1?'partido':'partidos'}
        </span>
      </div>
      <div style={{display:'flex',gap:10,padding:'0 16px',overflowX:'auto',paddingBottom:4}}>
        {slots.map((s,i)=>(
          <BracketSlot key={i} slot={s}
            highlight={title.includes('FINAL')&&!title.includes('3er')}/>
        ))}
      </div>
    </div>
  );
}

function BracketView({bracket}){
  const t=useLang();
  if(!bracket) return null;
  const winner = bracket.final?.winner;
  return(
    <div style={{paddingBottom:20}}>
      {winner&&(
        <div style={{margin:'0 16px 16px',background:'linear-gradient(135deg,rgba(240,165,0,.2),rgba(240,165,0,.05))',
          borderRadius:14,border:'2px solid var(--gold)',padding:'16px',textAlign:'center',
          animation:'pulse 2s infinite'}}>
          <div style={{fontSize:32,marginBottom:4}}>🏆</div>
          <div style={{fontFamily:'var(--ff)',fontSize:28,color:'var(--gold)',letterSpacing:2}}>
            CAMPEÓN DEL MUNDO
          </div>
          <div style={{fontSize:22,marginTop:4,display:'flex',alignItems:'center',
            justifyContent:'center',gap:8}}>
            <span>{bracket.final?.winnerFl||'🏳️'}</span>
            <span style={{fontWeight:700}}>{winner}</span>
          </div>
        </div>
      )}
      <BracketRound title={t.round_32}      slots={bracket.r32||[]}  color='var(--acc)'   icon='⚔️'/>
      <BracketRound title={t.round_16}      slots={bracket.r16||[]}  color='#4F8EF7'      icon='🎯'/>
      <BracketRound title={t.quarterfinals} slots={bracket.qf||[]}   color='var(--grn)'   icon='⚡'/>
      <BracketRound title={t.semifinals}    slots={bracket.sf||[]}   color='#A855F7'      icon='⭐'/>
      <BracketRound title="3er LUGAR"    slots={[bracket.tercero||{}]} color='#CD7F32' icon='🥉'/>
      <BracketRound title="🏆 GRAN FINAL" slots={[bracket.final||{}]}  color='var(--gold)' icon=''/>
    </div>
  );
}

// ── Standings Screen ─────────────────────────────
function TablaScreen(){
  const t=useLang();
  const [gi,setGi]=useState(0);
  const [groups,setGroups]=useState(GROUPS);
  const [apiLoaded,setApiLoaded]=useState(false);

  // ── Initial bracket — all TBD until tournament plays ──
  const mkSlot=(label,date,venue='')=>({label,date,venue,home:null,away:null,winner:null});
  const [bracket,setBracket]=useState({
    r32:[  // Ronda de 32 · Jun 28–Jul 3 · 16 partidos
      mkSlot('2°A vs 2°B',    'Jun 28','Los Ángeles · SoFi Stadium'),
      mkSlot('1°E vs Mejor3', 'Jun 28','Boston · Gillette Stadium'),
      mkSlot('1°F vs 2°C',    'Jun 29','Monterrey · BBVA'),
      mkSlot('1°I vs Mejor3', 'Jun 29','MetLife · New Jersey'),
      mkSlot('1°C vs Mejor3', 'Jun 30','Dallas · AT&T Stadium'),
      mkSlot('2°E vs 2°I',    'Jun 30','Dallas · AT&T Stadium'),
      mkSlot('1°A vs Mejor3', 'Jun 30','Azteca · CDMX'),
      mkSlot('1°L vs Mejor3', 'Jun 30','Atlanta · Mercedes-Benz'),
      mkSlot('1°D vs Mejor3', 'Jul 1', 'San Francisco · Levi Stadium'),
      mkSlot('1°G vs Mejor3', 'Jul 1', 'Seattle · Lumen Field'),
      mkSlot('2°K vs 2°L',    'Jul 1', 'Toronto · BMO Field'),
      mkSlot('1°H vs 2°J',    'Jul 2', 'Los Ángeles · SoFi Stadium'),
      mkSlot('1°B vs Mejor3', 'Jul 2', 'Vancouver · BC Place'),
      mkSlot('1°J vs 2°H',    'Jul 2', 'Miami · Hard Rock Stadium'),
      mkSlot('1°K vs Mejor3', 'Jul 3', 'Kansas City · Arrowhead'),
      mkSlot('2°D vs 2°G',    'Jul 3', 'Dallas · AT&T Stadium'),
    ],
    r16:[  // Octavos de Final · Jul 5–8 · 8 partidos
      mkSlot('G.R1 vs G.R2',  'Jul 5', 'Houston · NRG Stadium'),
      mkSlot('G.R3 vs G.R4',  'Jul 5', 'Filadelfia · Lincoln Financial'),
      mkSlot('G.R5 vs G.R6',  'Jul 6', 'Seattle · Lumen Field'),
      mkSlot('G.R7 vs G.R8',  'Jul 6', 'Azteca · Ciudad de México'),
      mkSlot('G.R9 vs G.R10', 'Jul 7', 'Vancouver · BC Place'),
      mkSlot('G.R11 vs G.R12','Jul 7', 'Atlanta · Mercedes-Benz'),
      mkSlot('G.R13 vs G.R14','Jul 8', 'Dallas · AT&T Stadium'),
      mkSlot('G.R15 vs G.R16','Jul 8', 'MetLife · New Jersey'),
    ],
    qf:[   // Cuartos de Final · Jul 10–12 · 4 partidos
      mkSlot('O.1 vs O.2',    'Jul 10','Los Ángeles · SoFi Stadium'),
      mkSlot('O.3 vs O.4',    'Jul 11','Kansas City · Arrowhead'),
      mkSlot('O.5 vs O.6',    'Jul 11','Houston · NRG Stadium'),
      mkSlot('O.7 vs O.8',    'Jul 12','MetLife · New Jersey'),
    ],
    sf:[   // Semifinales · Jul 14–15 · 2 partidos
      mkSlot('QF1 vs QF2',    'Jul 14','Dallas · AT&T Stadium'),
      mkSlot('QF3 vs QF4',    'Jul 15','Atlanta · Mercedes-Benz'),
    ],
    tercero: mkSlot('3er Lugar','Jul 18','Miami · Hard Rock Stadium'),
    final:   mkSlot('🏆 FINAL', 'Jul 19','MetLife Stadium, New Jersey'),
  });

  // Firestore: clasificación y llave (con cache para evitar re-leer al volver al tab)
  useEffect(()=>{
    const cs=getCachedLive('standings'), cb=getCachedLive('bracket');
    if(cs?.groups?.length>0){ setGroups(cs.groups); setApiLoaded(true); }
    if(cb?.r32) setBracket(cb);
    if(cs && cb) return; // datos frescos en cache, no suscribir
    let u1,u2,mounted=true;
    const trySubscribe=()=>{
      if(!mounted) return;
      const fn=window._fbSubscribeLive;
      if(!fn){ setTimeout(trySubscribe,800); return; }
      try{
        if(!cs) u1=fn('standings',data=>{
          setCachedLive('standings',data);
          if(data.groups?.length>0){ setGroups(data.groups); setApiLoaded(true); }
        });
        if(!cb) u2=fn('bracket',data=>{
          setCachedLive('bracket',data);
          if(data.r32) setBracket(data);
        });
      }catch(e){ console.warn('standings error',e); }
    };
    trySubscribe();
    return()=>{ mounted=false; if(typeof u1==='function') u1(); if(typeof u2==='function') u2(); };
  },[]);

  const grp=groups[gi]||GROUPS[0];
  const sorted=[...grp.teams].sort((a,b)=>
    b.pts!==a.pts?b.pts-a.pts:(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf);
  const hdrs=['PJ','G','E','P','GF','GC','DG','PTS'];
  return(
    <div className="scr fin">
      <div style={{padding:'18px 16px 6px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>{t.table_title}</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>{t.group_stage} · Mundial 2026</div>
      </div>
      <div style={{display:'flex',gap:8,padding:'4px 16px 10px',overflowX:'auto'}}>
        {GROUPS.map((g,i)=>(
          <button key={g.name} className={`tpill ${gi===i?'on':''}`} onClick={()=>setGi(i)}>{g.name}</button>
        ))}
      </div>
      <div style={{margin:'0 16px'}}>
        <div style={{background:'var(--surf)',borderRadius:'14px 14px 0 0',border:'1px solid var(--br)',borderBottom:'none'}}>
          <div style={{display:'flex',padding:'9px 14px',fontSize:10,fontWeight:700,
            color:'var(--muted)',letterSpacing:.8,textTransform:'uppercase'}}>
            <div style={{flex:1}}>{t.team_col}</div>
            {hdrs.map(h=><div key={h} style={{width:26,textAlign:'center'}}>{h}</div>)}
          </div>
          {sorted.map((t,i)=>{
            const vals=[t.pj,t.g,t.e,t.p,t.gf,t.gc,t.gf-t.gc,t.pts];
            return(
              <div key={t.n} style={{display:'flex',padding:'9px 14px',alignItems:'center',
                borderTop:'1px solid rgba(255,255,255,.05)',
                background:i===0?'rgba(240,165,0,.04)':i===1?'rgba(30,198,108,.03)':'transparent',
                transition:'background .15s'}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:7}}>
                  <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,
                    background:i===0?'var(--gold)':i===1?'rgba(240,165,0,.22)':'rgba(255,255,255,.08)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:10,fontWeight:800,color:i===0?'#000':'#fff'}}>{i+1}</div>
                  <span style={{fontSize:17}}>{FLAGS[t.n]||'🏳️'}</span>
                  <span style={{fontSize:12,fontWeight:600}}>{t.n}</span>
                  {i<2&&<span style={{fontSize:9,background:'rgba(30,198,108,.15)',color:'var(--grn)',
                    padding:'1px 5px',borderRadius:4,fontWeight:700,flexShrink:0}}>{t.advancing}</span>}
                </div>
                {vals.map((v,vi)=>(
                  <div key={vi} style={{width:26,textAlign:'center',fontSize:12,
                    fontWeight:vi===7?800:400,
                    color:vi===7?'var(--gold)':vi===6&&v>0?'var(--grn)':vi===6&&v<0?'var(--red)':'var(--txt)'}}>
                    {vi===6&&v>0?'+'+v:v}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div style={{background:'var(--surf)',borderRadius:'0 0 14px 14px',border:'1px solid var(--br)',
          borderTop:'none',padding:'9px 14px'}}>
          <div style={{display:'flex',gap:16,fontSize:12,color:'var(--muted)',flexWrap:'wrap'}}>
            <span><span style={{color:'var(--gold)'}}>■</span> 1° {t.leader}</span>
            <span><span style={{color:'var(--grn)'}}>■</span> 2° {t.advancing}</span>
            <span>{t.top_2_qualify}</span>
          </div>
        </div>
      </div>

      {/* ── Stats dinámicas del grupo seleccionado ── */}
      {sorted[0]?.pj>0 ? (()=>{
        const leader  = sorted[0];
        const topScor = [...sorted].sort((a,b)=>b.gf-a.gf)[0];
        const bestDef = [...sorted].sort((a,b)=>a.gc-b.gc)[0];
        return(
          <div style={{display:'flex',gap:10,padding:'14px 16px',overflowX:'auto'}}>
            {[
              {l:t.top_goals,    v:`${FLAGS[topScor.n]||'🏴'} ${topScor.n} · ${topScor.gf}`, ic:'⚽'},
              {l:t.best_defense, v:`${FLAGS[bestDef.n]||'🏴'} ${bestDef.n} · ${bestDef.gc} GC`,ic:'🛡️'},
              {l:t.leader+' '+grp.name, v:`${FLAGS[leader.n]||'🏴'} ${leader.n} · ${leader.pts} pts`,ic:'🥇'},
            ].map(s=>(
              <div key={s.l} style={{flexShrink:0,background:'var(--surf)',borderRadius:12,
                padding:'10px 14px',border:'1px solid var(--br)',minWidth:130}}>
                <div style={{fontSize:18,marginBottom:4}}>{s.ic}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:2}}>{s.l}</div>
                <div style={{fontSize:12,fontWeight:700}}>{s.v}</div>
              </div>
            ))}
          </div>
        );
      })() : (
        <div style={{padding:'8px 16px 14px'}}>
          <div style={{background:'var(--surf)',borderRadius:12,padding:'12px 16px',
            border:'1px dashed var(--br)',textAlign:'center',fontSize:12,color:'var(--muted)'}}>
            📊 Las estadísticas del {grp.name} aparecerán cuando inicien los partidos
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          LLAVE ELIMINATORIA — no cambia al cambiar de grupo
          ════════════════════════════════════════════════════ */}
      <div style={{padding:'16px 16px 6px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:24,letterSpacing:2}}>LLAVE ELIMINATORIA</div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:12}}>
          Copa Mundial 2026 · Las banderas aparecen automáticamente conforme avanza el torneo
        </div>
      </div>
      <BracketView bracket={bracket}/>
    </div>
  );
}

// ── Scorers Screen ───────────────────────────────
function GolesScreen(){
  const t=useLang();
  const [sel,setSel]=useState(null);
  const [scorers,setScorers]=useState(SCORERS);

  useEffect(()=>{
    const cached=getCachedLive('scorers');
    if(cached?.list?.length){
      setScorers(prev=>cached.list.map(s=>({...(prev.find(p=>p.n===s.n)||{}),...s})));
      return;
    }
    let unsub, mounted=true;
    const trySubscribe=()=>{
      if(!mounted) return;
      const fn=window._fbSubscribeLive;
      if(!fn){ setTimeout(trySubscribe,800); return; }
      try{
        unsub=fn('scorers',data=>{
          setCachedLive('scorers',data);
          if(data.list?.length) setScorers(prev=>data.list.map(s=>({...(prev.find(p=>p.n===s.n)||{}),...s})));
        });
      }catch(e){}
    };
    trySubscribe();
    return()=>{ mounted=false; if(typeof unsub==='function') unsub(); };
  },[]);

  // Ordenar por goles; si todos tienen 0, mantener orden original
  const anyGoals=scorers.some(p=>p.g>0);
  const sorted=anyGoals
    ? [...scorers].sort((a,b)=>b.g-a.g||b.a-a.a)
    : scorers;

  const selPlayer=sel?sorted.find(p=>p.n===sel):null;
  const rankColors={1:'#F0A500',2:'#C0C0C0',3:'#CD7F32'};
  const medal={1:'🥇',2:'🥈',3:'🥉'};

  const top3=sorted.slice(0,3);
  const rest=sorted.slice(3);
  // El podio (3 posiciones) se muestra SIEMPRE; cada posición se llena solo con un
  // goleador real (g>0) y si no, muestra un placeholder "Por definir".
  // La lista muestra a TODOS los jugadores del 4º en adelante (incluidos los de 0 goles);
  // conforme anoten, 'sorted' los reordena por goles y pueden subir al podio.
  const listPlayers=rest;

  // ── Lugar del podio (top 3) — se renderiza siempre; placeholder si la posición está vacía ──
  const PodiumSpot=({p,rank})=>{
    const col=rankColors[rank];
    const pedestalH=rank===1?92:rank===2?68:52;
    const avatarSz=rank===1?80:66;
    const flagSz=rank===1?52:44;
    const filled=!!(p&&p.g>0);            // posición ocupada solo por un goleador real
    const active=filled&&sel===p.n;
    return(
      <div onClick={filled?()=>setSel(active?null:p.n):undefined}
        style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'flex-end',
          cursor:filled?'pointer':'default'}}>
        {/* Medalla — siempre visible para ver el estrado completo */}
        <div style={{fontSize:rank===1?28:22,lineHeight:1,marginBottom:3,
          filter:'drop-shadow(0 2px 5px rgba(0,0,0,.45))',opacity:filled?1:.5}}>
          {medal[rank]}
        </div>
        {/* Avatar / bandera (placeholder gris si la posición está vacía) */}
        <div style={{width:avatarSz,height:avatarSz,borderRadius:'50%',
          border:`3px solid ${active?'var(--gold)':filled?col:'var(--br)'}`,
          boxShadow:active?`0 0 18px ${col}aa`:filled?`0 5px 14px rgba(0,0,0,.35)`:'none',
          background:filled?'var(--surf2)':'rgba(255,255,255,.03)',
          display:'flex',alignItems:'center',justifyContent:'center',
          overflow:'hidden',flexShrink:0,
          transition:'border-color .15s,box-shadow .15s'}}>
          <span style={{fontSize:filled?flagSz:Math.round(flagSz*.7),lineHeight:1,
            filter:'drop-shadow(0 3px 6px rgba(0,0,0,.4))',
            color:'var(--muted)',opacity:filled?1:.55}}>
            {filled?(FLAGS[p.team]||'🏳'):'—'}
          </span>
        </div>
        {/* Nombre / "Por definir" */}
        <div style={{fontSize:rank===1?13:11,fontWeight:700,marginTop:7,
          color:active?'var(--gold)':filled?'var(--txt)':'var(--muted)',textAlign:'center',
          maxWidth:'100%',whiteSpace:'nowrap',overflow:'hidden',
          textOverflow:'ellipsis',padding:'0 2px',fontStyle:filled?'normal':'italic'}}>
          {filled?p.n.split(' ').slice(-1)[0]:'Por definir'}
        </div>
        {/* Goles */}
        <div style={{display:'flex',alignItems:'baseline',gap:3,marginTop:2,marginBottom:7}}>
          <span style={{fontFamily:'var(--ff)',fontSize:rank===1?20:16,
            color:filled?col:'var(--muted)',lineHeight:1}}>
            {filled?p.g:0}
          </span>
          <span style={{fontSize:10,color:'var(--muted)'}}>⚽</span>
        </div>
        {/* Pedestal — color de la posición siempre, atenuado si está vacío */}
        <div style={{width:'100%',height:pedestalH,
          background:`linear-gradient(180deg,${col}${filled?'3a':'1c'},${col}${filled?'10':'08'})`,
          border:`1px solid ${col}${filled?'55':'30'}`,borderBottom:'none',
          borderRadius:'10px 10px 0 0',display:'flex',
          alignItems:'flex-start',justifyContent:'center',paddingTop:9}}>
          <span style={{fontFamily:'var(--ff)',fontSize:rank===1?32:24,
            color:col,opacity:filled?.92:.5,textShadow:`0 2px 10px ${col}66`}}>
            {rank}
          </span>
        </div>
      </div>
    );
  };

  // ── Renglón de la lista (4º en adelante) ──
  const ListRow=({p,rank})=>{
    const active=sel===p.n;
    return(
      <div onClick={()=>setSel(active?null:p.n)}
        style={{display:'flex',alignItems:'center',gap:12,
          background:active?'rgba(240,165,0,.08)':'var(--surf)',
          border:`1px solid ${active?'var(--gold)':'var(--br)'}`,
          borderRadius:12,padding:'10px 14px',cursor:'pointer',
          transition:'background .15s,border-color .15s'}}>
        {/* Posición */}
        <div style={{fontFamily:'var(--ff)',fontSize:15,color:'var(--muted)',
          minWidth:22,textAlign:'center',flexShrink:0}}>{rank}</div>
        {/* Bandera */}
        <span style={{fontSize:30,lineHeight:1,flexShrink:0,
          filter:'drop-shadow(0 2px 4px rgba(0,0,0,.3))'}}>
          {FLAGS[p.team]||'🏳'}
        </span>
        {/* Nombre + equipo */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,
            color:active?'var(--gold)':'var(--txt)',
            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {p.n}
          </div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{p.team}</div>
        </div>
        {/* Goles */}
        <div style={{display:'flex',alignItems:'baseline',gap:3,flexShrink:0}}>
          <span style={{fontFamily:'var(--ff)',fontSize:18,
            color:p.g>0?'var(--gold)':'var(--muted)'}}>{p.g}</span>
          <span style={{fontSize:11,color:'var(--muted)'}}>⚽</span>
        </div>
      </div>
    );
  };

  return(
    <div className="scr fin">
      {/* Header */}
      <div style={{padding:'18px 16px 10px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>{t.goals_title||'GOLEADORES'}</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>
          {t.golden_boot||'Candidatos a la Bota de Oro del Mundial 2026'}
        </div>
      </div>

      <div style={{padding:'0 12px 24px'}}>
        {!anyGoals&&(
          <div style={{fontSize:11,color:'var(--muted)',textAlign:'center',
            marginBottom:12,padding:'8px',background:'rgba(240,165,0,.05)',
            borderRadius:8,border:'1px solid rgba(240,165,0,.12)'}}>
            ⏳ El ranking se actualizará conforme anoten goles
          </div>
        )}

        {/* ── PODIO — siempre visible (2º izq · 1º centro · 3º der); placeholder si falta jugador ── */}
        <div style={{display:'flex',alignItems:'flex-end',gap:8,
          padding:'8px 4px 0',marginBottom:18}}>
          <PodiumSpot p={top3[1]} rank={2}/>
          <PodiumSpot p={top3[0]} rank={1}/>
          <PodiumSpot p={top3[2]} rank={3}/>
        </div>

        {/* ── LISTA — todos los jugadores del 4º en adelante (incl. 0 goles) ── */}
        {listPlayers.length>0&&(
          <>
            <div style={{fontFamily:'var(--ff)',fontSize:15,letterSpacing:1.5,
              color:'var(--gold)',margin:'4px 2px 10px'}}>
              Posibles goleadores
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {listPlayers.map((p,i)=>(
                <ListRow key={p.n} p={p} rank={i+4}/>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── MODAL BIO — siempre visible en pantalla ── */}
      {selPlayer&&(
        <div
          onClick={()=>setSel(null)}
          style={{position:'fixed',inset:0,zIndex:100,
            background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',
            display:'flex',alignItems:'flex-end',justifyContent:'center',
            padding:'0 0 80px'}}>
          <div
            onClick={e=>e.stopPropagation()}
            style={{width:'min(360px,92vw)',background:'var(--surf)',
              borderRadius:'16px 16px 12px 12px',border:'1px solid var(--br)',
              overflow:'hidden',boxShadow:'0 -8px 40px rgba(0,0,0,.6)'}}>
            {/* Header bio */}
            <div style={{padding:'14px 16px 12px',background:'rgba(240,165,0,.07)',
              borderBottom:'1px solid var(--br)',display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:40,lineHeight:1}}>{FLAGS[selPlayer.team]||'🏳️'}</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:'var(--ff)',fontSize:18,color:'var(--gold)',letterSpacing:1}}>
                  {selPlayer.n}
                </div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                  {selPlayer.team} · {selPlayer.g>0?`${selPlayer.g}⚽`:'Sin goles aún'}
                </div>
              </div>
              <button onClick={()=>setSel(null)}
                style={{background:'rgba(255,255,255,.1)',border:'none',color:'var(--txt)',
                  borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:16,
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                ✕
              </button>
            </div>
            {/* Texto bio */}
            <div style={{padding:'14px 16px',fontSize:13,color:'var(--txt)',
              lineHeight:1.7,maxHeight:'40vh',overflowY:'auto'}}>
              {selPlayer.bio}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function AdminDialog({dlg,onClose}){
  const [val,setVal]=useState(dlg.defVal||'');
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);

  if(dlg.type==='confirm'){
    return(
      <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.72)',
        backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 24px'}}
        onClick={onClose}>
        <div onClick={e=>e.stopPropagation()}
          style={{width:'min(360px,94vw)',background:'var(--surf)',borderRadius:16,
            border:'1px solid var(--br)',padding:'24px',boxShadow:'0 8px 40px rgba(0,0,0,.6)'}}>
          <div style={{fontFamily:'var(--ff)',fontSize:15,letterSpacing:1,color:'var(--gold)',
            marginBottom:10,textAlign:'center'}}>{dlg.title}</div>
          <div style={{fontSize:13,color:'var(--dim)',lineHeight:1.6,marginBottom:20,
            textAlign:'center'}}>{dlg.msg}</div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={onClose}
              style={{flex:1,background:'rgba(255,255,255,.07)',border:'1px solid var(--br)',
                color:'var(--txt)',borderRadius:10,padding:12,fontSize:13,
                fontWeight:600,cursor:'pointer',fontFamily:'var(--fb)'}}>Cancelar</button>
            <button onClick={async()=>{setBusy(true);await dlg.onOk();setBusy(false);}}
              disabled={busy}
              style={{flex:1,background:'var(--red)',border:'none',
                color:'#fff',borderRadius:10,padding:12,fontSize:13,
                fontWeight:700,cursor:'pointer',fontFamily:'var(--fb)'}}>
              {busy?'…':'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if(dlg.type==='input'){
    const handleOk=async()=>{
      const n=parseInt(val,10);
      if(isNaN(n)||n<1||n>99999){setErr('Ingresa un número entre 1 y 99,999.');return;}
      setErr('');setBusy(true);
      await dlg.onOk(n);
      setBusy(false);
    };
    return(
      <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.72)',
        backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 24px'}}
        onClick={onClose}>
        <div onClick={e=>e.stopPropagation()}
          style={{width:'min(360px,94vw)',background:'var(--surf)',borderRadius:16,
            border:'1px solid var(--br)',padding:'24px',boxShadow:'0 8px 40px rgba(0,0,0,.6)'}}>
          <div style={{fontFamily:'var(--ff)',fontSize:15,letterSpacing:1,color:'var(--gold)',
            marginBottom:16,textAlign:'center'}}>{dlg.title}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:5}}>Cantidad de monedas (1 – 99,999)</div>
          <input value={val} onChange={e=>{setVal(e.target.value);setErr('');}}
            onKeyDown={e=>e.key==='Enter'&&handleOk()}
            type="number" min="1" max="99999"
            autoFocus
            style={{width:'100%',background:'var(--bg)',
              border:`1px solid ${err?'rgba(200,16,46,.6)':'var(--br)'}`,
              color:'var(--txt)',borderRadius:9,padding:'10px 12px',fontSize:15,
              fontFamily:'var(--fb)',boxSizing:'border-box',outline:'none',
              marginBottom:err?4:14}}/>
          {err&&<div style={{fontSize:11,color:'#FC8181',marginBottom:12}}>{err}</div>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={onClose}
              style={{flex:1,background:'rgba(255,255,255,.07)',border:'1px solid var(--br)',
                color:'var(--txt)',borderRadius:10,padding:12,fontSize:13,
                fontWeight:600,cursor:'pointer',fontFamily:'var(--fb)'}}>Cancelar</button>
            <button onClick={handleOk} disabled={busy}
              style={{flex:1,background:'rgba(240,165,0,.15)',border:'1px solid rgba(240,165,0,.4)',
                color:'var(--gold)',borderRadius:10,padding:12,fontSize:13,
                fontWeight:700,cursor:'pointer',fontFamily:'var(--fb)'}}>
              {busy?'…':'🎁 Regalar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function PerfilScreen({user,onLogout,lang='es'}){
  const t = useLang(); // ← translations
  const ini=(user.name||user.email||'U')[0].toUpperCase();
  const [saved,setSaved]=useState(false);
  const [dbUsers,setDbUsers]=useState([]);
  const [dbLoaded,setDbLoaded]=useState(false);
  const [fbStatus,setFbStatus]=useState('waiting'); // waiting | ready | error
  const [shareMsg,setShareMsg]=useState('');
  const [adminDlg,setAdminDlg]=useState(null);
  const [adminMsg,setAdminMsg]=useState('');

  // Fuera del useEffect para que refreshAdminUsers y el botón 🔄 puedan usarlo
  const getDeletedIds=()=>{try{return JSON.parse(localStorage.getItem('wc2026_admin_deleted')||'[]');}catch{return[];}};
  const mergeUsers=(local,fs)=>{
    const deleted=new Set(getDeletedIds());
    const merged=[...local].filter(u=>!deleted.has(u.id));
    fs.forEach(fu=>{
      if(deleted.has(fu.id)) return;
      const idx=merged.findIndex(lu=>lu.email?.toLowerCase()===fu.email?.toLowerCase());
      if(idx>=0) merged[idx]={...merged[idx],...fu};
      else merged.push(fu);
    });
    return merged;
  };

  useEffect(()=>{
    if(!user.isAdmin) return;

    // Step 1: Load local users immediately so panel isn't empty
    dbLoad().then(local=>{
      setDbUsers(local);
      setDbLoaded(true);
    });

    // Step 2: Poll every 400ms until Firebase is ready, then load Firestore users
    let pollCount=0;
    const pollFirebase=setInterval(async()=>{
      pollCount++;
      const fn=fbGetAllUsers||window._fbGetAllUsers;
      if(fn){
        clearInterval(pollFirebase);
        setFbStatus('ready');
        try{
          const local=await dbLoad();
          const fs=await fn();
          setDbUsers(mergeUsers(local,fs));
          setDbLoaded(true);
        }catch(e){
          console.warn('Firestore load error:',e);
          setFbStatus('error');
        }
      } else if(pollCount>30){ // 30 × 400ms = 12s timeout
        clearInterval(pollFirebase);
        setFbStatus('error');
        setDbLoaded(true);
      }
    },400);

    // Sin auto-refresh: el admin usa el botón "🔄 Actualizar" para recargar manualmente
    return()=>{ clearInterval(pollFirebase); };
  },[user.isAdmin]);

  const refreshAdminUsers=async()=>{
    const fn=fbGetAllUsers||window._fbGetAllUsers;
    if(!fn) return;
    try{
      const local=await dbLoad();
      const fsData=await getAllUsersCached(fn,0); // forzar recarga
      setDbUsers(mergeUsers(local,fsData));
    }catch(e){}
  };
  const deleteUser=id=>{
    const target=dbUsers.find(u=>u.id===id);
    const label=target?.name||target?.email||id;
    setAdminDlg({
      type:'confirm',
      title:'¿Eliminar usuario?',
      msg:`¿Eliminar a "${label}"? Esta acción no se puede deshacer.`,
      onOk:async()=>{
        setAdminDlg(null);
        // 1. Guardar ID en blocklist local (persiste aunque Firestore falle)
        try{
          const prev=JSON.parse(localStorage.getItem('wc2026_admin_deleted')||'[]');
          localStorage.setItem('wc2026_admin_deleted',JSON.stringify([...new Set([...prev,id])]));
        }catch(e){}
        // 2. Borrar de localStorage de usuarios
        const updated=dbUsers.filter(u=>u.id!==id);
        await dbSave(updated);
        setDbUsers(updated);
        // 3. Borrar de Firestore (intento)
        if(fbDeleteUser) fbDeleteUser(id);
      }
    });
  };

  // ── Share the app ────────────────────────────────
  const shareApp=async()=>{
    const shareData={
      title:'⚽ Mundial 2026',
      text:'¡Únete a mis pronósticos del Mundial! La app más completa para seguir cada partido.',
      url:window.location.href,
    };
    if(navigator.share){
      try{ await navigator.share(shareData); setShareMsg('¡Compartido! 🎉'); }
      catch(e){ if(e.name!=='AbortError') setShareMsg('Error al compartir'); }
    } else {
      try{
        await navigator.clipboard.writeText(window.location.href);
        setShareMsg('¡Enlace copiado al portapapeles! 📋');
      } catch{ setShareMsg('Copia este link: '+window.location.href); }
    }
    setTimeout(()=>setShareMsg(''),4000);
  };

  const shareWhatsApp=()=>{
    const txt=encodeURIComponent('⚽ ¡Únete a mis pronósticos del Mundial 2026! '+window.location.href);
    window.open(`https://wa.me/?text=${txt}`,'_blank');
  };

  return(
    <div className="scr fin">
      <div style={{padding:'28px 16px 20px',
        background:`linear-gradient(180deg,${user.isAdmin?'rgba(240,165,0,.14)':'rgba(240,165,0,.07)'} 0%,transparent 100%)`,
        textAlign:'center',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
        <div style={{width:78,height:78,borderRadius:'50%',
          background:user.isAdmin?'linear-gradient(135deg,#F0A500,#FF8C00)':'linear-gradient(135deg,var(--gold),var(--gold2))',
          margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'var(--ff)',fontSize:user.isAdmin?34:36,color:'#000',
          boxShadow:`0 0 0 4px rgba(240,165,0,${user.isAdmin?.35:.15})`}}>
          {user.isAdmin?'👑':ini}
        </div>
        <div style={{fontFamily:'var(--ff)',fontSize:24,letterSpacing:1}}>{user.name||user.email}</div>
        {user.isAdmin?(
          <div style={{display:'inline-flex',alignItems:'center',gap:7,marginTop:8,
            background:'rgba(240,165,0,.12)',borderRadius:20,padding:'5px 16px',
            border:'1px solid rgba(240,165,0,.35)'}}>
            <span style={{fontSize:14}}>👑</span>
            <span style={{fontSize:12,color:'var(--gold)',fontWeight:700,letterSpacing:.5}}>ADMINISTRADOR GENERAL</span>
          </div>
        ):(
          <div style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:10,
            background:'rgba(30,198,108,.1)',borderRadius:20,padding:'4px 14px'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'var(--grn)',display:'inline-block'}}/>
            <span style={{fontSize:12,color:'var(--grn)',fontWeight:600}}>{t.active_session}</span>
          </div>
        )}
      </div>

      <div style={{padding:'16px'}}>
        {user.isAdmin&&(
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:'var(--ff)',fontSize:20,letterSpacing:1,color:'var(--gold)',marginBottom:10}}>
              👑 PANEL DE ADMINISTRADOR
            </div>

            {/* ── 4 stat cards ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              {[
                ['👤','Registrados',dbUsers.length,'var(--txt)'],
                ['🔮','Con paquete',dbUsers.filter(u=>u.paquetes>0).length,'var(--gold)'],
                ['⏳','Sin paquete',dbUsers.filter(u=>!u.paquetes&&!u.gifted).length,'var(--muted)'],
                ['🎁','Monedas regalo',dbUsers.filter(u=>u.gifted).length,'var(--gold)'],
                ['💰','Ingresos MXN','$'+(dbUsers.reduce((s,u)=>s+((u.paquetes||0)*PRECIO_PAQUETE),0)).toLocaleString(),'var(--grn)'],
              ].map(([ic,lb,val,col])=>(
                <div key={lb} style={{background:'var(--surf)',borderRadius:11,
                  padding:'12px 10px',border:'1px solid var(--br)',textAlign:'center'}}>
                  <div style={{fontSize:20}}>{ic}</div>
                  <div style={{fontFamily:'var(--ff)',fontSize:22,color:col,lineHeight:1,marginTop:3}}>{val}</div>
                  <div style={{fontSize:9,color:'var(--muted)',fontWeight:700,marginTop:2,letterSpacing:.3}}>{lb}</div>
                </div>
              ))}
            </div>

            {/* ── Extra stats row ── */}
            <div style={{background:'var(--surf)',borderRadius:11,padding:'10px 14px',
              border:'1px solid var(--br)',marginBottom:12,
              display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              {[
                ['Paquetes vendidos',dbUsers.reduce((s,u)=>s+(u.paquetes||0),0),'🎟️'],
                ['Promedio por usuario',(dbUsers.length
                  ?(dbUsers.reduce((s,u)=>s+(u.paquetes||0),0)/dbUsers.length).toFixed(1)
                  :'0.0')+' paq.','📊'],
                ['Conversión',(dbUsers.length
                  ?Math.round(dbUsers.filter(u=>u.paquetes>0).length/dbUsers.length*100)
                  :0)+'%','📈'],
              ].map(([lb,val,ic])=>(
                <div key={lb} style={{flex:1,minWidth:80,textAlign:'center'}}>
                  <div style={{fontSize:16}}>{ic}</div>
                  <div style={{fontFamily:'var(--ff)',fontSize:18,color:'var(--gold)',lineHeight:1,marginTop:2}}>{val}</div>
                  <div style={{fontSize:9,color:'var(--muted)',fontWeight:600,marginTop:1}}>{lb}</div>
                </div>
              ))}
            </div>

            {/* ── User list ── */}
            <div style={{background:'var(--surf)',borderRadius:12,border:'1px solid var(--br)',
              overflow:'hidden',marginBottom:10}}>
              <div style={{padding:'10px 14px',borderBottom:'1px solid var(--br)',
                display:'flex',justifyContent:'space-between',alignItems:'center',
                background:'rgba(255,255,255,.02)'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',letterSpacing:.5}}>
                    🗃️ BASE DE DATOS · USUARIOS
                  </div>
                  <div style={{fontSize:10,color:'var(--dim)',marginTop:1,display:'flex',alignItems:'center',gap:4}}>
                    <span style={{
                      width:6,height:6,borderRadius:'50%',display:'inline-block',
                      background:fbStatus==='ready'?'var(--grn)':fbStatus==='error'?'var(--red)':'var(--ylw)',
                      animation:fbStatus==='waiting'?'blink 1s infinite':'none'
                    }}/>
                    {fbStatus==='ready'?'Firebase ✓':fbStatus==='error'?'Solo local':'Conectando Firebase...'}
                  </div>
                </div>
                <button onClick={async()=>{
                  setDbLoaded(false);
                  const local=await dbLoad();
                  let fs=[];
                  const fn=fbGetAllUsers||window._fbGetAllUsers;
                  if(fn){try{fs=await getAllUsersCached(fn,0);}catch(e){}}
                  setDbUsers(mergeUsers(local,fs));
                  setDbLoaded(true);
                }}
                  style={{background:'rgba(79,142,247,.12)',border:'none',color:'var(--acc)',
                    borderRadius:8,padding:'5px 10px',fontSize:11,fontWeight:700,
                    cursor:'pointer',fontFamily:'var(--fb)',flexShrink:0}}>🔄</button>
              </div>

              {/* Table header */}
              {dbLoaded&&dbUsers.length===0&&(
                <div style={{textAlign:'center',padding:'20px',color:'var(--muted)',fontSize:13}}>
                  {fbStatus==='waiting'
                    ? <><div style={{fontSize:20,marginBottom:6}}>🔄</div>Conectando a Firebase...</>
                    : <><div>Ningún usuario registrado aún.</div>
                       <span style={{fontSize:11,opacity:.7}}>
                         Los usuarios aparecen cuando inician sesión desde cualquier dispositivo.
                       </span></>
                  }
                </div>
              )}
              {dbLoaded&&dbUsers.length>0&&(
                <div style={{display:'flex',padding:'6px 14px',
                  background:'rgba(255,255,255,.03)',
                  borderBottom:'1px solid var(--br)',fontSize:9,
                  fontWeight:700,color:'var(--muted)',letterSpacing:.5,textTransform:'uppercase'}}>
                  <div style={{flex:1}}>Usuario</div>
                  <div style={{width:50,textAlign:'center'}}>Paquetes</div>
                  <div style={{width:60,textAlign:'center'}}>Pagado</div>
                  <div style={{width:50,textAlign:'center'}}>Último pago</div>
                  <div style={{width:24}}/>
                </div>
              )}

              {!dbLoaded&&(
                <div style={{padding:'18px',textAlign:'center',color:'var(--muted)',fontSize:12}}>
                  Cargando…
                </div>
              )}
              {dbLoaded&&dbUsers.length===0&&(
                <div style={{padding:'20px',textAlign:'center',color:'var(--muted)',fontSize:12}}>
                  Sin usuarios todavía.<br/>
                  <span style={{fontSize:11,color:'var(--dim)'}}>Los registros nuevos aparecen aquí automáticamente.</span>
                </div>
              )}
              {dbLoaded&&dbUsers.map((u,i)=>(
                <div key={u.id||i} style={{
                  padding:'5px 14px',borderBottom:'1px solid rgba(255,255,255,.04)',
                  background:u.paquetes>0?'rgba(240,165,0,.02)':'transparent'}}>
                  {/* Fila 1: avatar + nombre + correo (ancho completo) */}
                  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                    <div style={{width:24,height:24,borderRadius:'50%',flexShrink:0,
                      background:u.paquetes>0?'rgba(240,165,0,.15)':'rgba(79,142,247,.12)',
                      border:`1.5px solid ${u.paquetes>0?'rgba(240,165,0,.3)':'rgba(79,142,247,.25)'}`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:10,fontWeight:700,color:'#fff'}}>
                      {(u.name||u.email||'?')[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--txt)',lineHeight:1.2}}>
                        {u.name||'Sin nombre'}
                        {u.gifted&&<span style={{marginLeft:4,fontSize:8,background:'rgba(240,165,0,.2)',
                          color:'var(--gold)',padding:'1px 4px',borderRadius:4,fontWeight:700}}>🎁GRATIS</span>}
                      </div>
                      <div style={{fontSize:9,color:'var(--acc)',
                        wordBreak:'break-all',lineHeight:1.2}}>{u.email}</div>
                    </div>
                  </div>
                  {/* Fila 2: stats + botones */}
                  <div style={{display:'flex',alignItems:'center',gap:8,paddingLeft:38}}>
                    {/* Paquetes */}
                    <div style={{textAlign:'center',flexShrink:0,minWidth:36}}>
                      <div style={{fontFamily:'var(--ff)',fontSize:14,
                        color:u.paquetes>0?'var(--gold)':'var(--muted)',lineHeight:1}}>
                        {u.paquetes||0}
                      </div>
                      <div style={{fontSize:8,color:'var(--muted)',fontWeight:600}}>paq.</div>
                    </div>
                    {/* Total pagado */}
                    <div style={{textAlign:'center',flexShrink:0,minWidth:44}}>
                      <div style={{fontSize:11,fontWeight:700,
                        color:(u.paquetes||0)>0?'var(--grn)':'var(--muted)'}}>
                        {(u.paquetes||0)>0?'$'+((u.paquetes||0)*PRECIO_PAQUETE):'—'}
                      </div>
                      <div style={{fontSize:8,color:'var(--muted)',fontWeight:600}}>MXN</div>
                    </div>
                    {/* Last payment */}
                    <div style={{textAlign:'center',flexShrink:0,minWidth:40}}>
                      <div style={{fontSize:9,color:'var(--dim)',lineHeight:1.3}}>
                        {u.lastPayment
                          ?new Date(u.lastPayment).toLocaleDateString('es',{day:'numeric',month:'short'})
                          :'—'}
                      </div>
                    </div>
                    <div style={{flex:1}}/>
                    {/* Gift coins */}
                    <button
                      onClick={()=>{
                        if(u.gifted){
                          setAdminDlg({
                            type:'confirm',
                            title:'¿Quitar monedas?',
                            msg:`¿Quitar las monedas regalo a ${u.name||u.email}?`,
                            onOk:async()=>{
                              setAdminDlg(null);
                              const ok=await dbRevokeGift(u.email);
                              if(ok){
                                // Usar email para encontrar el doc correcto en Firestore
                                const giftFn=fbGiftCoinsByEmail||window._fbGiftCoinsByEmail;
                                if(giftFn) try{await giftFn(u.email,false);}catch(e){console.warn('fbGiftCoinsByEmail error:',e);}
                                const updated=await dbLoad();setDbUsers(updated);
                                refreshAdminUsers();
                              }
                            }
                          });
                        } else {
                          setAdminDlg({
                            type:'input',
                            title:`🎁 Regalar monedas a ${u.name||u.email}`,
                            defVal:'1000',
                            onOk:async amount=>{
                              const ok=await dbGiftCoins(u.email,amount);
                              if(ok){
                                // Usar email para encontrar el doc correcto en Firestore
                                const giftFn=fbGiftCoinsByEmail||window._fbGiftCoinsByEmail;
                                if(giftFn) try{await giftFn(u.email,true,amount);}catch(e){console.warn('fbGiftCoinsByEmail error:',e);}
                                setAdminDlg(null);
                                setAdminMsg(`✅ ${amount} monedas regaladas a ${u.name||u.email}`);
                                setTimeout(()=>setAdminMsg(''),4000);
                                const updated=await dbLoad();setDbUsers(updated);
                                refreshAdminUsers();
                              }
                            }
                          });
                        }
                      }}
                      title={u.gifted?`Quitar monedas (tiene ${u.giftedCoins||1000}🪙)`:'Regalar monedas'}
                      style={{width:28,flexShrink:0,
                        background:u.gifted?'rgba(30,198,108,.15)':'rgba(240,165,0,.12)',
                        border:`1px solid ${u.gifted?'rgba(30,198,108,.3)':'rgba(240,165,0,.3)'}`,
                        color:u.gifted?'var(--grn)':'var(--gold)',
                        borderRadius:5,padding:'3px 4px',
                        fontSize:11,cursor:'pointer',fontFamily:'var(--fb)'}}>
                      🎁
                    </button>
                    {/* Delete */}
                    <button onClick={()=>deleteUser(u.id)}
                      style={{width:24,flexShrink:0,background:'rgba(200,16,46,.1)',
                        border:'none',color:'#FC8181',borderRadius:5,padding:'3px 5px',
                        fontSize:10,cursor:'pointer',fontFamily:'var(--fb)'}}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── CSV Export ── */}
            <button onClick={()=>{
              const totalPaq=dbUsers.reduce((s,u)=>s+(u.paquetes||0),0);
              const totalIngresos=dbUsers.reduce((s,u)=>s+((u.paquetes||0)*PRECIO_PAQUETE),0);
              const conPaq=dbUsers.filter(u=>u.paquetes>0).length;
              const sinPaq=dbUsers.filter(u=>!u.paquetes||u.paquetes===0).length;
              const conv=dbUsers.length?Math.round(conPaq/dbUsers.length*100):0;

              const lines=[
                '=== MUNDIAL 2026 APP · REPORTE DE USUARIOS ===',
                `Generado:,${new Date().toLocaleString('es')}`,
                '',
                '--- RESUMEN ---',
                `Total registrados:,${dbUsers.length}`,
                `Con paquete:,${conPaq}`,
                `Sin paquete:,${sinPaq}`,
                `Paquetes vendidos:,${totalPaq}`,
                `Tasa de conversión:,${conv}%`,
                `Ingresos totales:,$${totalIngresos} MXN`,
                '',
                '--- DETALLE DE USUARIOS ---',
                'ID,Nombre,Email,Nacionalidad,Género,Nacimiento,Registro,Paquetes,Último Pago,Total Pagado (MXN)',
                ...dbUsers.map(u=>[
                  u.id||'',
                  `"${u.name||''}"`,
                  u.email||'',
                  u.nat||'',
                  u.gen||'',
                  u.bd||'',
                  u.createdAt?new Date(u.createdAt).toLocaleDateString('es'):'',
                  u.paquetes||0,
                  u.lastPayment?new Date(u.lastPayment).toLocaleDateString('es'):'Sin pago',
                  '$'+((u.paquetes||0)*PRECIO_PAQUETE),
                ].join(',')),
              ];
              const csvContent='﻿'+lines.join('\n'); // BOM para acentos en Excel
              const blob=new Blob([csvContent],{type:'text/csv;charset=utf-8;'});
              const url=URL.createObjectURL(blob);
              const a=document.createElement('a');
              a.href=url;
              const fecha=new Date().toISOString().slice(0,10);
              a.download=`reporte_mundial2026_${fecha}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(()=>URL.revokeObjectURL(url),1000);
              setSaved(true);setTimeout(()=>setSaved(false),3000);
            }}
              style={{width:'100%',background:'rgba(30,198,108,.08)',
                border:'1px solid rgba(30,198,108,.22)',color:'var(--grn)',
                borderRadius:10,padding:'12px',fontSize:13,fontWeight:700,
                cursor:'pointer',fontFamily:'var(--fb)',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <span style={{fontSize:16}}>📥</span>
              {saved?'✓ Archivo descargado correctamente':'Exportar Reporte CSV Completo'}
            </button>
            {saved&&(
              <div style={{marginTop:6,padding:'8px 12px',background:'rgba(30,198,108,.06)',
                borderRadius:8,border:'1px solid rgba(30,198,108,.2)',fontSize:11,
                color:'var(--grn)',textAlign:'center',lineHeight:1.5}}>
                El archivo CSV se descargó. Ábrelo con Excel o Google Sheets.
              </div>
            )}

            <div style={{marginTop:9,padding:'10px 12px',background:'rgba(200,16,46,.05)',
              borderRadius:9,border:'1px solid rgba(200,16,46,.12)',
              fontSize:11,color:'var(--dim)',lineHeight:1.6}}>
              ⚠️ <strong style={{color:'var(--txt)'}}>Producción:</strong> Contraseñas deben hashearse (bcrypt). Usar Firebase Auth + Firestore para gestión segura de usuarios y roles de admin.
            </div>
          </div>
        )}

        <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:1,color:'var(--muted)',marginBottom:10}}>{t.my_account}</div>
        {[['👤','Nombre',user.name||'—'],['📧','Correo electrónico',user.email],
          ['🎂','Fecha de nacimiento',user.bd||'—'],['🌎','Nacionalidad',user.nat||'—'],['⚧','Género',user.gen||'—']].map(([ic,lb,vl])=>(
          <div key={lb} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',
            background:'var(--surf)',borderRadius:12,marginBottom:8,border:'1px solid var(--br)'}}>
            <span style={{fontSize:18,flexShrink:0}}>{ic}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:1}}>{lb}</div>
              <div style={{fontSize:14,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{vl}</div>
            </div>
          </div>
        ))}
        {!user.isAdmin&&(
          <div style={{marginTop:8,background:'var(--surf)',borderRadius:12,padding:13,border:'1px solid var(--br)'}}>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
              <span style={{fontSize:15}}>🗃️</span>
              <span style={{fontSize:11,color:'var(--muted)',fontWeight:700}}>BASE DE DATOS</span>
              <span style={{marginLeft:'auto',width:7,height:7,borderRadius:'50%',background:'var(--grn)',display:'inline-block'}}/>
            </div>
            <div style={{fontSize:12,color:'#8A9BC9',lineHeight:1.55}}>
              Tus datos están almacenados de forma segura. Puedes solicitar su eliminación en cualquier momento.
            </div>
          </div>
        )}
        {/* ── Selector de idioma en Perfil ── */}
        <div style={{margin:'0 0 14px',background:'var(--surf)',borderRadius:14,
          border:'1px solid var(--br)',padding:'14px 16px'}}>
          <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:1,marginBottom:10}}>
            🌐 {t('language')}
          </div>
          <div style={{display:'flex',gap:8}}>
            {Object.entries(LANG_NAMES).map(([lk,ln])=>(
              <button key={lk} onClick={()=>{
                if(fbSaveUser) fbSaveUser({...user,lang:lk});
                window.dispatchEvent(new CustomEvent('wc_lang',{detail:lk}));
              }}
                style={{padding:'8px 4px',borderRadius:10,fontSize:10,
                  fontWeight:700,cursor:'pointer',textAlign:'center',
                  background:lang===lk?'var(--gold)':'var(--surf2)',
                  color:lang===lk?'#000':'var(--muted)',
                  border:`1.5px solid ${lang===lk?'var(--gold)':'var(--br)'}`,
                  transition:'all .2s',lineHeight:1.4}}>
                <div style={{fontSize:18}}>{LANG_FLAGS[lk]}</div>
                <div>{ln}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Compartir la app ── */}
        <div style={{margin:'0 0 14px',background:'var(--surf)',borderRadius:14,
          border:'1px solid rgba(79,142,247,.2)',padding:'16px'}}>
          <div style={{fontFamily:'var(--ff)',fontSize:18,letterSpacing:1,marginBottom:10}}>
            📲 COMPARTIR LA APP
          </div>
          <div style={{display:'flex',gap:8,marginBottom:shareMsg?8:0}}>
            <button onClick={shareApp} style={{flex:1,background:'var(--gold)',
              border:'none',borderRadius:10,padding:'11px 0',
              fontFamily:'var(--fb)',fontSize:13,fontWeight:700,color:'#000',
              cursor:'pointer',transition:'opacity .15s'}}
              onMouseEnter={e=>e.currentTarget.style.opacity='.85'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              🔗 {t.share_link}
            </button>
            <button onClick={shareWhatsApp} style={{flex:1,background:'#25D366',
              border:'none',borderRadius:10,padding:'11px 0',
              fontFamily:'var(--fb)',fontSize:13,fontWeight:700,color:'#fff',
              cursor:'pointer',transition:'opacity .15s'}}
              onMouseEnter={e=>e.currentTarget.style.opacity='.85'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              💬 WhatsApp
            </button>
          </div>
          {shareMsg&&<div style={{fontSize:12,color:'var(--grn)',textAlign:'center',
            padding:'6px 0',fontWeight:600}}>{shareMsg}</div>}
        </div>

        {/* ── API-Football Status ── */}
        <div style={{margin:'0 0 14px',background:'var(--surf)',borderRadius:14,
          border:`1px solid ${true?'rgba(30,198,108,.2)':'rgba(255,255,255,.08)'}`,
          padding:'14px 16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:1}}>🔌 API DEPORTIVA</div>
            <div style={{fontSize:10,padding:'3px 10px',borderRadius:20,fontWeight:700,
              background:true?'rgba(30,198,108,.15)':'rgba(255,255,255,.06)',
              color:true?'var(--grn)':'var(--muted)'}}>
              {true?'✅ CONECTADA':'⚠️ SIN CONECTAR'}
            </div>
          </div>
          {!true&&(
            <div style={{fontSize:12,color:'var(--dim)',lineHeight:1.6}}>
              Para ver datos en tiempo real (goles, tarjetas, marcadores en vivo):
              <br/>1. Ve a <strong style={{color:'var(--acc)'}}>api-football.com</strong>
              <br/>2. Crea cuenta gratis (100 peticiones/día)
              <br/>3. Copia tu API Key
              <br/>4. Pégala en <code style={{background:'rgba(255,255,255,.08)',padding:'1px 5px',borderRadius:4}}>App.jsx</code> línea 1:<br/>
              <code style={{background:'rgba(240,165,0,.1)',padding:'3px 8px',borderRadius:4,
                fontSize:11,display:'block',marginTop:4}}>const AF_KEY = 'TU_KEY_AQUI';</code>
            </div>
          )}
          {true&&(
            <div style={{fontSize:12,color:'var(--grn)',lineHeight:1.6}}>
              ✓ Marcadores en vivo actualizando cada 30 segundos<br/>
              ✓ Goleadores reales del torneo<br/>
              ✓ Tabla de posiciones en tiempo real
            </div>
          )}
        </div>

        <button onClick={()=>onLogout()} style={{width:'100%',marginTop:14,
          background:'rgba(200,16,46,.1)',border:'1px solid rgba(200,16,46,.22)',
          color:'#FC8181',borderRadius:12,padding:14,fontSize:14,fontWeight:700,
          cursor:'pointer',fontFamily:'var(--fb)',transition:'all .2s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(200,16,46,.18)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(200,16,46,.1)'}>
          🚪 {t.logout}
        </button>
      </div>

      {adminMsg&&(
        <div style={{position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',
          zIndex:200,background:'rgba(30,198,108,.15)',border:'1px solid rgba(30,198,108,.35)',
          borderRadius:12,padding:'10px 18px',fontSize:13,color:'var(--grn)',
          fontWeight:600,whiteSpace:'nowrap',pointerEvents:'none',
          boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>
          {adminMsg}
        </div>
      )}
      {adminDlg&&<AdminDialog dlg={adminDlg} onClose={()=>setAdminDlg(null)}/>}
    </div>
  );
}

// ── Groups Screen ─────────────────────────────────
function GruposScreen({user,userBets,credito,creditoLoading,onPagar,onRecheckAccess}){
  const t=useLang();
  // ── PAYMENT GATE: must pay to access groups ──────────────────
  const [view,setView]=useState('list');
  // Groups persisted per user in localStorage — no demo groups
  const GROUPS_KEY = `wc2026_groups_${user?.id||'guest'}`;
  const [groups,setGroups]=useState(()=>{
    try{
      const saved=localStorage.getItem(GROUPS_KEY);
      return saved?JSON.parse(saved):[];
    }catch{return[];}
  });

  // Persist groups whenever they change
  useEffect(()=>{
    try{localStorage.setItem(GROUPS_KEY,JSON.stringify(groups));}
    catch(e){console.warn('Groups save error:',e);}
  },[groups]);

  // Migración de pronósticos bloqueados al servidor (también corre al abrir la app).
  // groups en deps: al cargarse permite resolver más códigos id→code.
  useEffect(()=>{ if(user?.id) syncLockedBets(user); },[user?.id,groups]);

  const [selGroup,setSelGroup]=useState(null);
  const [dtab,setDtab]=useState('ranking');
  const [newName,setNewName]=useState('');
  const [newDesc,setNewDesc]=useState('');
  const [joinCode,setJoinCode]=useState('');
  // Bloqueos por grupo — se restauran desde localStorage para sobrevivir recargas
  const [locks,setLocks]=useState(()=>{
    try{
      const saved=localStorage.getItem('wc2026_locks_'+(user?.id||''));
      const p=saved?JSON.parse(saved):null;
      if(p && typeof p==='object') return p;
    }catch(e){}
    return {};
  });
  const [confirmLock,setConfirmLock]=useState(false);
  const [copied,setCopied]=useState(false);
  const [joinErr,setJoinErr]=useState('');
  // Chat state per group
  // Chats vacíos — se llenarán con mensajes reales de los usuarios
  const [chats,setChats]=useState({});
  const [chatInput,setChatInput]=useState('');
  const [creatingGroup,setCreatingGroup]=useState(false);
  const [createErr,setCreateErr]=useState('');
  const [confirmDelete,setConfirmDelete]=useState(false);
  const chatEndRef=useRef(null);
  const [showPago,setShowPago]=useState(false);

  // Poll server for new chat messages every 3 seconds (WhatsApp-style)
  useEffect(()=>{
    if(!selGroup?.code) return;
    const gid=selGroup.id;
    const grpCode=selGroup.code;
    let lastTs=0;

    const fetchMsgs=async()=>{
      try{
        const res=await fetch('/api/chat/'+grpCode+'?since='+lastTs);
        if(!res.ok) return;
        const data=await res.json();
        if(data.msgs?.length>0){
          const newMsgs=data.msgs.map(m=>({...m,col:
            m.uid===user?.id?'var(--gold)':'var(--acc)'}));
          setChats(prev=>{
            const existing=prev[gid]||[];
            const existIds=new Set(existing.map(m=>m.id));
            const toAdd=newMsgs.filter(m=>!existIds.has(m.id));
            if(toAdd.length===0) return prev;
            const merged=[...existing,...toAdd].sort((a,b)=>(a.ts||0)-(b.ts||0));
            return{...prev,[gid]:merged};
          });
          lastTs=Math.max(...newMsgs.map(m=>m.ts||0));
          setTimeout(()=>chatEndRef.current?.scrollIntoView({behavior:'smooth'}),80);
        }
      }catch(e){}
    };

    fetchMsgs(); // immediate load
    const interval=setInterval(fetchMsgs,15000); // poll every 15s (ahorra 80% lecturas)
    return()=>clearInterval(interval);
  },[selGroup?.code]);
  if(!credito&&creditoLoading) return(
    <div className="scr fin" style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <div style={{width:32,height:32,border:'3px solid var(--gold)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <div style={{fontSize:13,color:'var(--muted)'}}>Verificando acceso…</div>
    </div>
  );
  if(!credito&&showPago) return <PagoScreen onExito={()=>{setShowPago(false);onPagar();}} onRecheckAccess={onRecheckAccess} user={user}/>;
  if(!credito) return(
    <div className="scr fin" style={{display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',padding:'32px 24px',
      textAlign:'center',
      background:'radial-gradient(ellipse at 50% 30%,rgba(79,142,247,.1) 0%,transparent 60%)'}}>
      <div style={{fontSize:56,marginBottom:16}}>👥</div>
      <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2,marginBottom:8}}>
        GRUPOS PRIVADOS
      </div>
      <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.8,marginBottom:24,maxWidth:280}}>
        Crea o únete a grupos de amigos, comparte tus pronósticos y compite en el ranking.
        <br/><br/>
        <strong style={{color:'var(--txt)'}}>Requiere el paquete de pronósticos</strong> para acceder.
      </div>
      <div style={{background:'rgba(240,165,0,.08)',borderRadius:16,
        border:'1px solid rgba(240,165,0,.25)',padding:'16px 20px',marginBottom:20,width:'100%',maxWidth:300}}>
        <div style={{fontFamily:'var(--ff)',fontSize:22,color:'var(--gold)',marginBottom:4}}>
          🪙 1,000 MONEDAS
        </div>
        <div style={{fontSize:12,color:'var(--dim)'}}>
          Acceso completo a Grupos + Pronósticos
        </div>
        <div style={{fontSize:24,fontWeight:800,color:'var(--gold)',marginTop:6}}>$30 MXN</div>
      </div>
      {onRecheckAccess&&(
        <div style={{marginBottom:10,width:'100%',maxWidth:300}}>
          <button onClick={onRecheckAccess}
            style={{width:'100%',background:'rgba(79,142,247,.12)',border:'1px solid rgba(79,142,247,.3)',
              color:'var(--acc)',borderRadius:12,padding:'10px',fontSize:12,
              cursor:'pointer',fontFamily:'var(--fb)',fontWeight:700}}>
            🔍 Ya tengo regalo · Verificar acceso
          </button>
        </div>
      )}
      <button className="btn" onClick={()=>setShowPago(true)} style={{maxWidth:300,width:'100%'}}>
        💳 PAGAR Y ACCEDER
      </button>
      <div style={{fontSize:11,color:'var(--muted)',marginTop:12}}>
        Pago único · Acceso toda la Copa del Mundo 2026
      </div>
    </div>
  );


  // ── Helper functions ──────────────────────────────────────────
  const deleteGroup=async(grp)=>{
    try{
      const ctrl=new AbortController();
      setTimeout(()=>ctrl.abort(),8000);
      await fetch('/api/groups/'+grp.code,{method:'DELETE',signal:ctrl.signal});
    }catch(e){ console.warn('deleteGroup error:',e); }
    // Remove from local list regardless
    setGroups(p=>p.filter(g=>g.code!==grp.code));
    setConfirmDelete(false);
    setView('list');
    setSelGroup(null);
  };
  // Generate unique group code
  const genCode=()=>{
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c='WC26-';
    for(let i=0;i<5;i++) c+=chars[Math.floor(Math.random()*chars.length)];
    return c;
  };
  // Navigate to group detail — refresca miembros desde el servidor al abrir
  const goDetail=(g)=>{
    setSelGroup(g);setDtab('ranking');setView('detail');
    // Refrescar datos del grupo para ver miembros actualizados
    if(g.code&&g.code!=='WC26-AMIGOS'){
      fetch('/api/groups/'+encodeURIComponent(g.code))
        .then(r=>r.ok?r.json():null)
        .then(data=>{
          if(data?.found&&data.group){
            const fresh=data.group;
            setSelGroup(fresh);
            setGroups(p=>p.map(x=>x.code===fresh.code?fresh:x));
          }
        })
        .catch(()=>{});
    }
  };

  const sendMsg=(gid)=>{
    const txt=chatInput.trim();
    if(!txt)return;
    const myName=user?.name||'Tú';
    const grpCode=selGroup?.code||gid;
    const msg={id:'cm_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      uid:user?.id||'user',name:myName,ini:myName[0].toUpperCase(),
      col:'var(--gold)',text:txt,ts:Date.now()};
    // 1. Optimistic update — show immediately
    setChats(prev=>({...prev,[gid]:[...(prev[gid]||[]),msg]}));
    setChatInput('');
    setTimeout(()=>chatEndRef.current?.scrollIntoView({behavior:'smooth'}),50);
    // 2. Save via server API (Firebase Admin — no restrictions)
    fetch('/api/chat/'+grpCode,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:msg.id,uid:user?.id||'anon',name:myName,text:txt,ts:msg.ts})
    }).catch(e=>console.warn('sendMsg error:',e));
  };


  const createGroup=async()=>{
    if(!newName.trim())return;
    setCreatingGroup(true);
    setCreateErr('');
    const g={id:'g_'+Date.now(),name:newName.trim(),desc:newDesc.trim(),
      code:genCode(),created:Date.now(),members:[{id:user?.id||'anon',name:user?.name||'Usuario',
        ini:(user?.name||'U')[0].toUpperCase(),joined:Date.now()}],
      ownerId:user?.id||''};

    // Use Railway server API with 10s timeout
    try{
      const ctrl=new AbortController();
      const timer=setTimeout(()=>ctrl.abort(),10000);
      const res=await fetch('/api/groups',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(g),
        signal:ctrl.signal,
      });
      clearTimeout(timer);
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Error del servidor ('+res.status+')');
      setGroups(p=>[...p,g]);
      setNewName('');setNewDesc('');
      setCreatingGroup(false);
      goDetail(g);
    }catch(e){
      console.error('createGroup error:',e);
      const msg=e.name==='AbortError'?'Tiempo agotado. Verifica tu conexión.':e.message;
      setCreateErr('❌ '+msg);
      setCreatingGroup(false);
    }
  };

  // ── Grupo demo con 15 miembros simulados ──
  const DEMO_GROUP={
    id:'demo-wc26-amigos',code:'WC26-AMIGOS',
    name:'Los Compadres del Mundial 🌟',
    desc:'Grupo de ejemplo con simulación real de puntos',
    created:Date.now()-86400000*15,
    ownerId:'dm1',
    members:[
      {id:'dm1', name:'Carlos García',    ini:'C', col:'#F0A500', pts:247, locked:true, lockedAt:Date.now()-86400000*8, bets:[], correct:62, total:72},
      {id:'dm2', name:'María Rodríguez',  ini:'M', col:'#FF6B6B', pts:231, locked:true, lockedAt:Date.now()-86400000*8, bets:[], correct:58, total:72},
      {id:'dm3', name:'Javier López',     ini:'J', col:'#4ECDC4', pts:218, locked:true, lockedAt:Date.now()-86400000*7, bets:[], correct:55, total:72},
      {id:'dm4', name:'Diana Torres',     ini:'D', col:'#A855F7', pts:203, locked:true, lockedAt:Date.now()-86400000*7, bets:[], correct:51, total:72},
      {id:'dm5', name:'Roberto Jiménez', ini:'R', col:'#3B82F6', pts:195, locked:true, lockedAt:Date.now()-86400000*6, bets:[], correct:49, total:72},
      {id:'dm6', name:'Patricia Núñez',  ini:'P', col:'#10B981', pts:187, locked:true, lockedAt:Date.now()-86400000*6, bets:[], correct:47, total:72},
      {id:'dm7', name:'Miguel Ángel F.', ini:'M', col:'#F59E0B', pts:176, locked:true, lockedAt:Date.now()-86400000*5, bets:[], correct:44, total:72},
      {id:'dm8', name:'Carmen Vázquez',  ini:'C', col:'#EF4444', pts:164, locked:true, lockedAt:Date.now()-86400000*5, bets:[], correct:41, total:72},
      {id:'dm9', name:'Alejandro Cruz',  ini:'A', col:'#8B5CF6', pts:152, locked:true, lockedAt:Date.now()-86400000*4, bets:[], correct:38, total:72},
      {id:'dm10',name:'Isabella Moreno', ini:'I', col:'#06B6D4', pts:143, locked:true, lockedAt:Date.now()-86400000*4, bets:[], correct:36, total:72},
      {id:'dm11',name:'Eduardo Vargas',  ini:'E', col:'#84CC16', pts:131, locked:true, lockedAt:Date.now()-86400000*3, bets:[], correct:33, total:72},
      {id:'dm12',name:'Valentina Ruiz',  ini:'V', col:'#F97316', pts:119, locked:true, lockedAt:Date.now()-86400000*3, bets:[], correct:30, total:72},
      {id:'dm13',name:'Francisco Medina',ini:'F', col:'#6366F1', pts:108, locked:true, lockedAt:Date.now()-86400000*2, bets:[], correct:27, total:72},
      {id:'dm14',name:'Daniela Herrera', ini:'D', col:'#EC4899', pts:94,  locked:true, lockedAt:Date.now()-86400000*2, bets:[], correct:24, total:72},
      {id:'dm15',name:'Antonio Guerrero',ini:'A', col:'#78716C', pts:79,  locked:true, lockedAt:Date.now()-86400000*1, bets:[], correct:20, total:72},
    ]
  };

  const joinGroup=async()=>{
    const code=joinCode.trim().toUpperCase();
    if(!code)return;
    // Grupo demo local
    if(code==='WC26-AMIGOS'){
      setGroups(p=>[...p.filter(x=>x.code!==code),DEMO_GROUP]);
      setJoinErr('');goDetail(DEMO_GROUP);setJoinCode('');return;
    }
    // Check local first (fast)
    const found=groups.find(g=>g.code===code);
    if(found){setJoinErr('');goDetail(found);setJoinCode('');return;}
    // Search via Railway server API
    try{
      setJoinErr('🔍 Buscando grupo...');
      const ctrl=new AbortController();
      const timer=setTimeout(()=>ctrl.abort(),10000);
      const res=await fetch('/api/groups/'+encodeURIComponent(code),{signal:ctrl.signal});
      clearTimeout(timer);
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Error del servidor');
      if(data.found&&data.group){
        let g=data.group;
        // Registrar al usuario como miembro en el servidor
        try{
          const mr=await fetch('/api/groups/'+encodeURIComponent(code)+'/members',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              id:user?.id||'anon',name:user?.name||'Usuario',
              ini:(user?.name||'U')[0].toUpperCase(),
              col:'#4F8EF7',
            }),
          });
          if(mr.ok){const md=await mr.json();if(md.group) g=md.group;}
        }catch(e){console.warn('add member error:',e);}
        setGroups(p=>[...p.filter(x=>x.code!==g.code),g]);
        setJoinErr('');goDetail(g);setJoinCode('');
      } else {
        setJoinErr('❌ Código no encontrado. Verifica que sea exacto.');
      }
    }catch(e){
      const msg=e.name==='AbortError'?'Tiempo agotado. Verifica tu conexión.':e.message;
      setJoinErr('⚠️ '+msg);
    }
  };

  const lockBets=gid=>{
    const lockedAt=Date.now();
    const nextLocks={...locks,[gid]:{bets:[...userBets],lockedAt}};
    setLocks(nextLocks);
    // Persistir el bloqueo en el dispositivo para que sobreviva recargas
    try{localStorage.setItem('wc2026_locks_'+(user?.id||''),JSON.stringify(nextLocks));}catch(e){}
    setConfirmLock(false);
    // Paso 1: persistir los pronósticos bloqueados en el servidor para que el resto
    // del grupo pueda verlos. Solo grupos reales (el demo WC26-AMIGOS es local).
    const code=selGroup?.code;
    console.log('[DIAG lockBets] llamado · gid=',gid,'· selGroup.id=',selGroup?.id,'· selGroup.code=',code,'· user.id=',user?.id,'· user.name=',user?.name,'· #userBets=',userBets.length);
    if(code && code!=='WC26-AMIGOS' && user?.id){
      const bets=userBets.map(b=>({id:b.id,category:b.category,selection:b.selection,odds:b.odds,ts:b.ts}));
      const body=JSON.stringify({
        id:user.id, name:user.name||'Usuario',
        ini:(user.name||'U')[0].toUpperCase(), col:'#4F8EF7',
        bets, lockedAt,
      });
      const url='/api/groups/'+encodeURIComponent(code)+'/lock';
      console.log('[DIAG lockBets] POST',url,'· body=',body);
      // Reintentar hasta 3 veces si el servidor no responde OK (404 transitorio, red, etc.)
      const postLock=async(attempt=1)=>{
        try{
          const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body});
          let txt=''; try{ txt=await res.text(); }catch(_){}
          console.log('[DIAG lockBets] intento',attempt,'· res.ok=',res.ok,'· status=',res.status,'· respuesta=',txt);
          if(res.ok) return;
          if(attempt<3){ await new Promise(r=>setTimeout(r,1500)); return postLock(attempt+1); }
          console.warn('[DIAG lockBets] FALLÓ tras 3 intentos · status=',res.status);
        }catch(e){
          console.warn('[DIAG lockBets] intento',attempt,'· error de red:',e);
          if(attempt<3){ await new Promise(r=>setTimeout(r,1500)); return postLock(attempt+1); }
        }
      };
      postLock();
    } else {
      console.warn('[DIAG lockBets] NO se hace POST · code=',code,'· user.id=',user?.id,'(grupo demo, o falta code/usuario)');
    }
  };

  const isLocked=gid=>!!locks[gid];

  const getUserEntry=gid=>{
    const l=locks[gid];
    const uid=user?.id||'anon';
    // Siempre incluir al usuario actual (con o sin bets bloqueados)
    return{
      id:'user',
      name:user?.name||'Tú',
      ini:(user?.name||'U')[0].toUpperCase(),
      col:'var(--gold)',
      locked:!!l,
      lockedAt:l?.lockedAt||null,
      pts:0,
      bets:l?(l.bets||[]).map(b=>({id:b.id,cat:b.category,sel:b.selection,odds:b.odds})):[],
    };
  };

  const getAllMembers=(g,gid)=>{
    const ue=getUserEntry(gid);
    const uid=user?.id||'anon';
    // Combinar: miembros del grupo (filtrando al usuario actual para no duplicar) + entrada del usuario
    const others=(g.members||[]).filter(m=>m.id!==uid&&m.id!=='user');
    return [...others,ue].sort((a,b)=>(b.pts||0)-(a.pts||0));
  };

  const BackBtn=({to})=>(
    <button onClick={()=>{setView(to);setJoinErr('');}}
      style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',width:36,height:36,
        borderRadius:10,cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',
        justifyContent:'center',flexShrink:0}}>←</button>
  );

  // ── LIST ──
  const [membersModal,setMembersModal]=useState(null); // grupo cuyo modal de miembros está abierto

  if(view==='list')return(
    <div className="scr fin">
      {/* Header compacto */}
      <div style={{padding:'14px 16px 6px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:24,letterSpacing:2}}>{t('nav_groups').toUpperCase()}</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setView('join')}
            style={{background:'var(--surf)',color:'var(--txt)',border:'1.5px solid var(--br)',
              borderRadius:10,padding:'8px 12px',fontFamily:'var(--fb)',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            🔗 {t('join_group')}
          </button>
          <button onClick={()=>setView('create')}
            style={{background:'var(--gold)',color:'#000',border:'none',borderRadius:10,
              padding:'8px 14px',fontFamily:'var(--ff)',fontSize:14,letterSpacing:.5,cursor:'pointer'}}>
            + {t('create_group')}
          </button>
        </div>
      </div>

      {/* Lista compacta */}
      <div style={{padding:'6px 12px 16px'}}>
        {groups.length===0&&(
          <div style={{textAlign:'center',padding:'32px 16px',color:'var(--muted)',fontSize:13}}>
            No tienes grupos aún.<br/>
            <span style={{fontSize:11,color:'var(--dim)'}}>Crea uno o únete con un código.</span>
          </div>
        )}
        {groups.map(g=>{
          const locked=isLocked(g.id);
          const allM=getAllMembers(g,g.id);
          const leader=allM[0];
          return(
            <div key={g.id}
              style={{background:'var(--surf)',borderRadius:12,border:'1px solid var(--br)',
                marginBottom:8,overflow:'hidden'}}>
              {/* Fila principal — toca para entrar al detalle */}
              <div onClick={()=>goDetail(g)}
                style={{padding:'10px 12px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                {/* Icono/inicial del grupo */}
                <div style={{width:40,height:40,borderRadius:10,flexShrink:0,
                  background:'rgba(240,165,0,.12)',border:'1px solid rgba(240,165,0,.2)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'var(--ff)',fontSize:18,color:'var(--gold)'}}>
                  {(g.name||'G')[0].toUpperCase()}
                </div>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,overflow:'hidden',
                    textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</div>
                  <div style={{display:'flex',gap:6,alignItems:'center',marginTop:2}}>
                    <span style={{fontSize:9,background:'var(--surf2)',padding:'1px 6px',
                      borderRadius:8,color:'var(--dim)',fontFamily:'var(--ff)',letterSpacing:.5}}>
                      {g.code}
                    </span>
                    {locked
                      ?<span style={{fontSize:10,color:'var(--grn)',fontWeight:700}}>🔒 Guardado</span>
                      :<span style={{fontSize:10,color:'var(--gold)',fontWeight:700}}>✏️ Abierto</span>}
                  </div>
                </div>
                {/* Flecha */}
                <span style={{fontSize:16,color:'var(--muted)',flexShrink:0}}>›</span>
              </div>
              {/* Barra inferior — avatares + botón ver miembros */}
              <div style={{padding:'6px 12px 8px',borderTop:'1px solid rgba(255,255,255,.05)',
                display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                {/* Avatares apilados */}
                <div style={{display:'flex',alignItems:'center',gap:0}}>
                  {allM.slice(0,6).map((m,i)=>(
                    <div key={m.id} title={m.name}
                      style={{width:22,height:22,borderRadius:'50%',flexShrink:0,
                        background:(m.col||'#4F8EF7')+'44',
                        border:'1.5px solid var(--surf)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:8,fontWeight:800,color:'#fff',
                        marginLeft:i>0?-6:0,zIndex:6-i}}>
                      {(m.ini||'?')[0]}
                    </div>
                  ))}
                  {allM.length>6&&(
                    <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,
                      background:'var(--surf2)',border:'1.5px solid var(--surf)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:7,fontWeight:700,color:'var(--muted)',marginLeft:-6}}>
                      +{allM.length-6}
                    </div>
                  )}
                  <span style={{fontSize:10,color:'var(--muted)',marginLeft:8}}>
                    {allM.length} miembro{allM.length!==1?'s':''}
                  </span>
                </div>
                {/* Botón ver miembros */}
                <button
                  onClick={e=>{e.stopPropagation();setMembersModal({g,allM});}}
                  style={{background:'rgba(79,142,247,.12)',border:'1px solid rgba(79,142,247,.2)',
                    color:'var(--acc)',borderRadius:8,padding:'4px 10px',fontSize:11,
                    fontWeight:700,cursor:'pointer',fontFamily:'var(--fb)'}}>
                  👥 Ver
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL DE MIEMBROS ── */}
      {membersModal&&(
        <div onClick={()=>setMembersModal(null)}
          style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.65)',
            backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',
            padding:'0 0 76px'}}>
          <div onClick={e=>e.stopPropagation()}
            style={{width:'min(420px,96vw)',background:'var(--surf)',
              borderRadius:'16px 16px 12px 12px',border:'1px solid var(--br)',
              overflow:'hidden',boxShadow:'0 -8px 40px rgba(0,0,0,.6)',maxHeight:'70vh',
              display:'flex',flexDirection:'column'}}>
            {/* Cabecera del modal */}
            <div style={{padding:'14px 16px 12px',borderBottom:'1px solid var(--br)',
              display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:1,color:'var(--txt)'}}>
                  {membersModal.g.name}
                </div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                  {membersModal.allM.length} miembro{membersModal.allM.length!==1?'s':''} · {membersModal.g.code}
                </div>
              </div>
              <button onClick={()=>setMembersModal(null)}
                style={{background:'rgba(255,255,255,.1)',border:'none',color:'var(--txt)',
                  borderRadius:8,width:30,height:30,cursor:'pointer',fontSize:14,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            {/* Lista de miembros */}
            <div style={{overflowY:'auto',flex:1}}>
              {membersModal.allM.length===0&&(
                <div style={{padding:'24px',textAlign:'center',color:'var(--muted)',fontSize:13}}>
                  Sin miembros aún
                </div>
              )}
              {membersModal.allM.map((m,i)=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,
                  padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,.05)',
                  background:m.id==='user'?'rgba(240,165,0,.03)':'transparent'}}>
                  {/* Posición */}
                  <div style={{width:22,flexShrink:0,textAlign:'center',fontSize:11,
                    color:i===0?'var(--gold)':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--muted)',fontWeight:700}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  {/* Avatar */}
                  <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,
                    background:(m.col||'#4F8EF7')+'30',
                    border:`2px solid ${(m.col||'#4F8EF7')}60`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:'var(--ff)',fontSize:14,color:'#fff'}}>
                    {m.ini||'?'}
                  </div>
                  {/* Nombre e info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:5}}>
                      {m.name}
                      {m.id==='user'&&<span style={{fontSize:8,background:'rgba(240,165,0,.15)',
                        color:'var(--gold)',padding:'1px 5px',borderRadius:8,fontWeight:700,flexShrink:0}}>TÚ</span>}
                    </div>
                    <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>
                      {m.locked?`🔒 Guardado ${new Date(m.lockedAt).toLocaleDateString('es',{day:'numeric',month:'short'})}`:'✏️ Sin guardar'}
                    </div>
                  </div>
                  {/* Puntos */}
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'var(--ff)',fontSize:20,lineHeight:1,
                      color:i===0?'var(--gold)':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--txt)'}}>
                      {m.pts||0}
                    </div>
                    <div style={{fontSize:8,color:'var(--muted)',fontWeight:700}}>PTS</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── CREATE ──
  if(view==='create')return(
    <div className="scr fin">
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'18px 16px 10px'}}>
        <BackBtn to="list"/>
        <div>
          <div style={{fontFamily:'var(--ff)',fontSize:22,letterSpacing:1}}>CREAR GRUPO</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Invita a tus amigos</div>
        </div>
      </div>
      <div style={{padding:'4px 20px 24px',display:'flex',flexDirection:'column',gap:12}}>
        <div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:5,fontWeight:700}}>NOMBRE *</div>
          <input className="inp" placeholder="Ej. Los Compadres del Mundial"
            value={newName} onChange={e=>setNewName(e.target.value)}/>
        </div>
        <div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:5,fontWeight:700}}>DESCRIPCIÓN (opcional)</div>
          <input className="inp" placeholder="Describe tu grupo..."
            value={newDesc} onChange={e=>setNewDesc(e.target.value)}/>
        </div>
        <div style={{background:'var(--surf)',borderRadius:12,padding:14,border:'1px solid var(--br)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:8,letterSpacing:.5}}>📋 REGLAS AUTOMÁTICAS</div>
          {['🔒 Los pronósticos se bloquean al confirmarlos',
            '🚫 No se pueden modificar una vez guardados',
            '👁️ Solo ves los pronósticos ajenos después de guardar los tuyos',
            '🏆 Puntos calculados automáticamente por resultados',
            '📊 Reporte completo disponible para todos'].map(r=>(
            <div key={r} style={{fontSize:12,color:'var(--dim)',padding:'4px 0',
              borderBottom:'1px solid rgba(255,255,255,.04)',lineHeight:1.5}}>{r}</div>
          ))}
        </div>
        {createErr&&<div style={{margin:'0 0 8px',padding:'10px 14px',
          background:'rgba(200,16,46,.1)',border:'1px solid rgba(200,16,46,.3)',
          borderRadius:10,fontSize:12,color:'#FC8181',lineHeight:1.5}}>
          {createErr}
        </div>}
        <button className="btn" onClick={createGroup}
          disabled={creatingGroup}
          style={{opacity:newName.trim()&&!creatingGroup?1:0.5,marginTop:4}}>
          {creatingGroup?'⏳ Guardando en Firestore...':'CREAR GRUPO'}
        </button>
      </div>
    </div>
  );

  // ── JOIN ──
  if(view==='join')return(
    <div className="scr fin">
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'18px 16px 10px'}}>
        <BackBtn to="list"/>
        <div>
          <div style={{fontFamily:'var(--ff)',fontSize:22,letterSpacing:1}}>UNIRSE A GRUPO</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Ingresa el código que te compartieron</div>
        </div>
      </div>
      <div style={{padding:'4px 20px 24px',display:'flex',flexDirection:'column',gap:12}}>
        <input className="inp" placeholder="Ej. WC26-K7X9"
          value={joinCode} onChange={e=>{setJoinCode(e.target.value.toUpperCase());setJoinErr('');}}
          style={{textAlign:'center',fontSize:22,letterSpacing:4,fontFamily:'var(--ff)'}}/>
        {joinErr&&<div style={{background:'rgba(200,16,46,.1)',border:'1px solid rgba(200,16,46,.25)',
          borderRadius:10,padding:'9px 14px',fontSize:12,color:'#FC8181',textAlign:'center'}}>⚠️ {joinErr}</div>}
        <button className="btn" onClick={joinGroup} style={{opacity:joinCode.trim()?1:0.45}}>
          UNIRSE AL GRUPO
        </button>
        <div style={{background:'rgba(79,142,247,.07)',borderRadius:10,padding:12,
          border:'1px solid rgba(79,142,247,.15)',fontSize:12,color:'var(--dim)',textAlign:'center',lineHeight:1.6}}>
          💡 Prueba el código <strong style={{color:'var(--gold)',letterSpacing:2}}>WC26-AMIGOS</strong><br/>
          para ver un grupo de ejemplo con amigos
        </div>
      </div>
    </div>
  );

  // ── DETAIL ──
  if(view==='detail'&&selGroup){
    const gid=selGroup.id;
    const locked=isLocked(gid);
    const lock=locks[gid];
    const allM=getAllMembers(selGroup,gid);
    const userEntry=getUserEntry(gid);
    const allCats=[...new Set(allM.flatMap(m=>(m.bets||[]).map(b=>b.cat)))];

    const POINTS_INFO=[
      ['1X2 correcto','3 pts × cuota'],
      ['Campeón del Mundo','20 pts × cuota'],
      ['Bota de Oro','15 pts × cuota'],
      ['Balón de Oro','12 pts × cuota'],
      ['Ganador de Grupo','5 pts × cuota'],
      ['Mejor Goleador 1°','15 pts × cuota'],
      ['Mejor Goleador 2°','4 pts × cuota'],
      ['Mejor Goleador 3°','5 pts × cuota'],
    ];

    const visibleTabs=[
      ['ranking','🏆 Ranking'],
      ['chat','💬 Chat'],
      ['pronosticos','🔮 Pronósticos'],
      ...(locked?[['todos','👥 Ver Todos'],['reporte','📊 Reporte']]:[['info','ℹ️ Info']]),
    ];

    return(
      <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
        {/* Header */}
        <div style={{background:'var(--surf)',borderBottom:'1px solid var(--br)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px'}}>
            <BackBtn to="list"/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:.5,overflow:'hidden',
                textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selGroup.name}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{allM.length} miembros</div>
            </div>
            <button onClick={()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}}
              style={{background:copied?'rgba(30,198,108,.12)':'rgba(255,255,255,.07)',
                border:`1px solid ${copied?'rgba(30,198,108,.3)':'var(--br)'}`,
                color:copied?'var(--grn)':'var(--dim)',borderRadius:9,padding:'6px 10px',
                cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:'var(--fb)',transition:'all .2s',flexShrink:0}}>
              {copied?'✓ Copiado!':selGroup.code+' 📋'}
            </button>
            {selGroup.ownerId===user?.id&&(
              <button onClick={()=>setConfirmDelete(true)}
                style={{background:'rgba(200,16,46,.1)',border:'1px solid rgba(200,16,46,.3)',
                  color:'#FC8181',borderRadius:9,padding:'6px 8px',cursor:'pointer',
                  fontSize:15,flexShrink:0}} title="Eliminar grupo">🗑️</button>
            )}
            {/* Confirm delete dialog */}
            {confirmDelete&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',
                zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',
                padding:'0 24px'}}>
                <div style={{background:'var(--surf)',borderRadius:18,padding:24,
                  maxWidth:320,width:'100%',border:'1px solid rgba(200,16,46,.3)'}}>
                  <div style={{fontSize:32,textAlign:'center',marginBottom:12}}>🗑️</div>
                  <div style={{fontFamily:'var(--ff)',fontSize:18,textAlign:'center',
                    marginBottom:8,letterSpacing:1}}>{t.delete_group}</div>
                  <div style={{fontSize:13,color:'var(--muted)',textAlign:'center',
                    lineHeight:1.6,marginBottom:20}}>
                    ¿Estás seguro que quieres eliminar <strong style={{color:'var(--txt)'}}>"{selGroup.name}"</strong>?
                    <br/>Esta acción no se puede deshacer y se perderá el historial del chat.
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>setConfirmDelete(false)}
                      style={{flex:1,background:'var(--surf2)',border:'1px solid var(--br)',
                        color:'var(--txt)',borderRadius:10,padding:'11px',fontSize:13,
                        fontWeight:700,cursor:'pointer',fontFamily:'var(--fb)'}}>
                      Cancelar
                    </button>
                    <button onClick={()=>deleteGroup(selGroup)}
                      style={{flex:1,background:'rgba(200,16,46,.15)',
                        border:'1px solid rgba(200,16,46,.4)',color:'#FC8181',
                        borderRadius:10,padding:'11px',fontSize:13,
                        fontWeight:700,cursor:'pointer',fontFamily:'var(--fb)'}}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:7,padding:'0 16px 11px',overflowX:'auto'}}>
            {visibleTabs.map(([k,l])=>(
              <button key={k} className={`tpill ${dtab===k?'on':''}`} onClick={()=>setDtab(k)}>{l}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',paddingBottom:90}}>

          {/* ── Ranking ── */}
          {dtab==='ranking'&&(
            <div>
              {allM.length===0&&(
                <div style={{textAlign:'center',padding:'40px 24px',color:'var(--muted)'}}>
                  <div style={{fontSize:36,marginBottom:10}}>👥</div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{t.no_members}</div>
                  <div style={{fontSize:12}}>Comparte el código <strong style={{color:'var(--gold)'}}>{selGroup.code}</strong></div>
                </div>
              )}
              {allM.map((m,i)=>{
                const topPts=allM[0]?.pts||1;
                const pct=Math.round(((m.pts||0)/topPts)*100);
                const acc=m.correct!=null&&m.total?Math.round((m.correct/m.total)*100):null;
                return(
                <div key={m.id} style={{padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,.04)',
                  background:m.id==='user'?'rgba(240,165,0,.04)':'transparent'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {/* Posición */}
                    <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,
                      background:i===0?'rgba(240,165,0,.3)':i===1?'rgba(192,192,192,.2)':i===2?'rgba(205,127,50,.2)':'rgba(255,255,255,.07)',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:i<3?14:11,fontWeight:800,color:i===0?'var(--gold)':'#fff'}}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                    </div>
                    {/* Avatar */}
                    <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,
                      background:(m.col||'#4F8EF7')+'30',border:`2px solid ${m.col||'#4F8EF7'}60`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontFamily:'var(--ff)',fontSize:14,color:'#fff',position:'relative'}}>
                      {m.ini}
                      <div style={{position:'absolute',bottom:-2,right:-2,background:'var(--surf)',
                        borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',
                        justifyContent:'center',fontSize:7,border:'1px solid var(--br)'}}>
                        {m.locked?'🔒':'✏️'}
                      </div>
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</span>
                        {m.id==='user'&&<span style={{fontSize:8,background:'rgba(240,165,0,.15)',
                          color:'var(--gold)',padding:'1px 5px',borderRadius:8,fontWeight:700,flexShrink:0}}>{t.you}</span>}
                      </div>
                      {/* Barra de progreso relativa al 1° */}
                      <div style={{height:4,background:'rgba(255,255,255,.08)',borderRadius:2,marginBottom:3,overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:2,
                          background:i===0?'var(--gold)':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--acc)',
                          width:`${pct}%`,transition:'width .4s ease'}}/>
                      </div>
                      <div style={{fontSize:10,color:'var(--muted)',display:'flex',gap:8}}>
                        {acc!=null&&<span style={{color:'var(--grn)'}}>✓ {m.correct}/{m.total} ({acc}%)</span>}
                        <span>{m.locked?`🔒 ${new Date(m.lockedAt).toLocaleDateString('es',{day:'numeric',month:'short'})}`:'⚡ Sin guardar'}</span>
                      </div>
                    </div>
                    {/* Puntos */}
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:'var(--ff)',fontSize:26,lineHeight:1,
                        color:i===0?'var(--gold)':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--txt)'}}>{m.pts||0}</div>
                      <div style={{fontSize:8,color:'var(--muted)',fontWeight:700}}>PTS</div>
                    </div>
                  </div>
                </div>
                );
              })}
              {/* Points table */}
              <div style={{margin:'14px 16px',background:'var(--surf)',borderRadius:12,
                padding:14,border:'1px solid var(--br)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:9,letterSpacing:.5}}>
                  🏅 SISTEMA DE PUNTOS
                </div>
                {POINTS_INFO.map(([cat,pts])=>(
                  <div key={cat} style={{display:'flex',justifyContent:'space-between',
                    padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,.04)',fontSize:12}}>
                    <span style={{color:'var(--dim)'}}>{cat}</span>
                    <span style={{color:'var(--gold)',fontWeight:700}}>{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Mis Pronósticos ── */}
          {dtab==='pronosticos'&&(
            <div style={{padding:'12px 16px'}}>
              {locked?(
                <div style={{background:'rgba(30,198,108,.07)',border:'1px solid rgba(30,198,108,.22)',
                  borderRadius:12,padding:14,marginBottom:14,textAlign:'center'}}>
                  <div style={{fontSize:28,marginBottom:4}}>🔒</div>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--grn)',marginBottom:4}}>Pronósticos Bloqueados</div>
                  <div style={{fontSize:11,color:'var(--dim)'}}>
                    {lock?.lockedAt ? new Date(lock.lockedAt).toLocaleDateString('es',{
                      weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}) : '—'}
                  </div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>
                    ✅ Ahora puedes ver los pronósticos de los demás miembros
                  </div>
                </div>
              ):(
                <div>
                  <div style={{background:'rgba(240,165,0,.07)',border:'1px solid rgba(240,165,0,.2)',
                    borderRadius:12,padding:12,marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--gold)',marginBottom:4}}>⚠️ Antes de guardar</div>
                    <div style={{fontSize:12,color:'var(--dim)',lineHeight:1.65}}>
                      Una vez que confirmes, tus pronósticos quedarán <strong style={{color:'var(--txt)'}}>bloqueados permanentemente</strong> para este grupo. No podrás modificarlos.
                    </div>
                  </div>
                  {userBets.length===0&&(
                    <div style={{background:'rgba(200,16,46,.07)',border:'1px solid rgba(200,16,46,.18)',
                      borderRadius:12,padding:12,marginBottom:12,textAlign:'center',fontSize:12,color:'#FC8181',lineHeight:1.5}}>
                      ⚠️ Aún no tienes pronósticos.<br/>
                      Ve a la sección <strong>🎰 Apuestas</strong> y haz tus predicciones primero.
                    </div>
                  )}
                </div>
              )}

              {(locked?(lock?.bets||[]):userBets).map((b,i)=>(
                <div key={(b.id||'')+i} style={{display:'flex',justifyContent:'space-between',
                  alignItems:'center',padding:'10px 13px',background:'var(--surf)',
                  borderRadius:11,marginBottom:7,border:'1px solid var(--br)'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:1}}>{b.category||b.cat}</div>
                    <div style={{fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>→ {b.selection||b.sel}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--gold)'}}>{b.odds}x</span>
                    {locked&&<span style={{fontSize:13}}>🔒</span>}
                  </div>
                </div>
              ))}

              {!locked&&userBets.length>0&&(
                <div style={{marginTop:14}}>
                  {!confirmLock?(
                    <button onClick={()=>setConfirmLock(true)}
                      style={{width:'100%',background:'var(--gold)',color:'#000',border:'none',
                        borderRadius:12,padding:15,fontFamily:'var(--ff)',fontSize:18,
                        letterSpacing:1,cursor:'pointer'}}>
                      🔒 GUARDAR Y BLOQUEAR PRONÓSTICOS
                    </button>
                  ):(
                    <div style={{background:'rgba(200,16,46,.08)',border:'1.5px solid rgba(200,16,46,.3)',
                      borderRadius:14,padding:16}}>
                      <div style={{fontSize:15,fontWeight:700,color:'#FC8181',marginBottom:8,textAlign:'center'}}>
                        ⚠️ ¿Confirmar bloqueo definitivo?
                      </div>
                      <div style={{fontSize:12,color:'var(--dim)',marginBottom:14,textAlign:'center',lineHeight:1.6}}>
                        Esta acción es <strong style={{color:'#FC8181'}}>IRREVERSIBLE</strong>.<br/>
                        Tus <strong style={{color:'var(--txt)'}}>{userBets.length} pronósticos</strong> quedarán bloqueados permanentemente para <strong style={{color:'var(--txt)'}}>{selGroup.name}</strong>.
                      </div>
                      <div style={{display:'flex',gap:10}}>
                        <button onClick={()=>setConfirmLock(false)}
                          style={{flex:1,background:'rgba(255,255,255,.08)',border:'1px solid var(--br)',
                            color:'var(--txt)',borderRadius:10,padding:'12px 8px',fontSize:13,
                            fontWeight:600,cursor:'pointer',fontFamily:'var(--fb)'}}>{t.cancel}</button>
                        <button onClick={()=>lockBets(gid)}
                          style={{flex:1,background:'var(--red)',border:'none',
                            color:'#fff',borderRadius:10,padding:'12px 8px',fontSize:13,
                            fontWeight:700,cursor:'pointer',fontFamily:'var(--fb)'}}>
                          🔒 Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Ver Todos ── */}
          {dtab==='todos'&&locked&&(
            <div>
              <div style={{padding:'10px 16px 4px',fontSize:11,color:'var(--muted)',lineHeight:1.5}}>
                👁️ Visible porque ya guardaste tus pronósticos. Todos los datos son definitivos.
              </div>
              {allM.map((m,rank)=>(
                <div key={m.id} style={{margin:'8px 16px',background:'var(--surf)',borderRadius:14,
                  border:`1.5px solid ${m.id==='user'?'rgba(240,165,0,.3)':'var(--br)'}`,overflow:'hidden'}}>
                  <div style={{padding:'10px 14px',borderBottom:'1px solid var(--br)',
                    display:'flex',alignItems:'center',gap:10,
                    background:m.id==='user'?'rgba(240,165,0,.04)':'rgba(255,255,255,.015)'}}>
                    <span style={{fontSize:16}}>{rank===0?'🥇':rank===1?'🥈':rank===2?'🥉':'#'+(rank+1)}</span>
                    <div style={{width:36,height:36,borderRadius:'50%',background:m.col+'22',
                      border:`2px solid ${m.col}44`,display:'flex',alignItems:'center',
                      justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',flexShrink:0}}>{m.ini}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700}}>
                        {m.name}{m.id==='user'&&<span style={{marginLeft:6,fontSize:9,color:'var(--gold)'}}>· TÚ</span>}
                      </div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{(m.bets||[]).length} pronósticos · 🔒</div>
                    </div>
                    <div style={{fontFamily:'var(--ff)',fontSize:24,color:rank===0?'var(--gold)':'var(--txt)',textAlign:'right'}}>
                      {m.pts||0}<span style={{fontSize:9,color:'var(--muted)',fontFamily:'var(--fb)',fontWeight:600,display:'block'}}>PTS</span>
                    </div>
                  </div>
                  {(m.bets||[]).map((b,i)=>(
                    <div key={(b.id||'')+i} style={{display:'flex',justifyContent:'space-between',
                      padding:'7px 14px',borderBottom:'1px solid rgba(255,255,255,.03)',alignItems:'center'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,color:'var(--muted)',fontWeight:600}}>{b.cat||b.category}</div>
                        <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--txt)'}}>{b.sel||b.selection}</div>
                      </div>
                      <span style={{fontSize:11,color:'var(--gold)',fontWeight:700,flexShrink:0}}>{b.odds}x</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── Reporte ── */}
          {dtab==='reporte'&&locked&&(
            <div style={{padding:'12px 16px'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:12,lineHeight:1.5}}>
                📊 Comparativa completa · pronóstico más popular destacado en 🟢
              </div>
              {allCats.map(cat=>{
                const preds=allM.map(m=>({m,b:(m.bets||[]).find(b=>(b.cat||b.category)===cat)})).filter(x=>x.b);
                if(!preds.length)return null;
                const counts={};
                preds.forEach(({b})=>{const s=b.sel||b.selection;counts[s]=(counts[s]||0)+1;});
                const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
                return(
                  <div key={cat} style={{marginBottom:11,background:'var(--surf)',borderRadius:12,
                    border:'1px solid var(--br)',overflow:'hidden'}}>
                    <div style={{padding:'8px 14px',borderBottom:'1px solid var(--br)',
                      display:'flex',justifyContent:'space-between',alignItems:'center',
                      background:'rgba(255,255,255,.02)'}}>
                      <span style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:.3}}>{cat}</span>
                      <span style={{fontSize:10,color:'var(--dim)'}}>
                        Favorito: <strong style={{color:'var(--gold)'}}>{top}</strong> ({counts[top]})
                      </span>
                    </div>
                    {preds.map(({m,b})=>{
                      const sel=b.sel||b.selection;
                      const isTop=sel===top;
                      const isUser=m.id==='user';
                      return(
                        <div key={m.id} style={{display:'flex',alignItems:'center',gap:9,
                          padding:'7px 14px',borderBottom:'1px solid rgba(255,255,255,.03)',
                          background:isUser?'rgba(240,165,0,.025)':'transparent'}}>
                          <div style={{width:26,height:26,borderRadius:'50%',background:m.col+'22',
                            border:`1.5px solid ${m.col}44`,display:'flex',alignItems:'center',
                            justifyContent:'center',fontSize:10,color:'#fff',fontWeight:700,flexShrink:0}}>{m.ini}</div>
                          <span style={{fontSize:11,color:'var(--dim)',minWidth:70,flexShrink:0}}>
                            {m.name}{isUser&&<span style={{color:'var(--gold)'}}> ·T</span>}
                          </span>
                          <span style={{flex:1,fontSize:12,fontWeight:700,
                            color:isTop?'var(--grn)':'var(--txt)',overflow:'hidden',
                            textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {isTop?'🟢 ':''}{sel}
                          </span>
                          <span style={{fontSize:10,color:'var(--gold)',fontWeight:700,flexShrink:0}}>{b.odds}x</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Info (before locking) ── */}
          {dtab==='info'&&(
            <div style={{padding:'14px 16px'}}>
              <div style={{background:'var(--surf)',borderRadius:12,padding:14,border:'1px solid var(--br)',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--gold)',marginBottom:8}}>🔗 Código de Invitación</div>
                <div style={{fontFamily:'var(--ff)',fontSize:32,letterSpacing:4,textAlign:'center',
                  color:'var(--txt)',padding:'12px 0',background:'var(--surf2)',
                  borderRadius:10,marginBottom:8}}>{selGroup.code}</div>
                <div style={{fontSize:11,color:'var(--muted)',textAlign:'center'}}>
                  Comparte este código con tus amigos para que se unan
                </div>
              </div>
              <div style={{background:'var(--surf)',borderRadius:12,padding:14,border:'1px solid var(--br)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',marginBottom:8,letterSpacing:.5}}>📋 CÓMO FUNCIONA</div>
                {[['1','Cada miembro va a la sección 🎰 Apuestas y hace sus pronósticos'],
                  ['2','Cuando estés listo, ve a "Mis Pronósticos" y guarda. Son IRREVERSIBLES'],
                  ['3','Después de guardar, podrás ver los pronósticos de todos los demás'],
                  ['4','Los puntos se calculan automáticamente cuando terminen los partidos'],
                  ['5','El Reporte muestra quién acertó cada pronóstico']].map(([n,t])=>(
                  <div key={n} style={{display:'flex',gap:10,padding:'8px 0',
                    borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'flex-start'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(240,165,0,.15)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,fontWeight:700,color:'var(--gold)',flexShrink:0}}>{n}</div>
                    <div style={{fontSize:12,color:'var(--dim)',lineHeight:1.5}}>{t}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ── Chat ── */}
          {dtab==='chat'&&(
            <div style={{display:'flex',flexDirection:'column',
              height:'calc(100dvh - 230px)',minHeight:'300px'}}>
              {/* Header */}
              <div style={{padding:'10px 16px 8px',borderBottom:'1px solid var(--br)',
                flexShrink:0,background:'rgba(255,255,255,.02)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',letterSpacing:.5}}>
                  💬 CHAT · {allM.length} MIEMBROS
                </div>
                <div style={{fontSize:10,color:'var(--dim)',marginTop:2}}>
                  Se actualiza cada 3 segundos
                </div>
              </div>

              {/* Messages — scrollable */}
              <div style={{flex:1,overflowY:'auto',padding:'12px 16px',
                display:'flex',flexDirection:'column',gap:10}}>
                {(chats[gid]||[]).length===0&&(
                  <div style={{textAlign:'center',padding:'32px 16px',color:'var(--muted)'}}>
                    <div style={{fontSize:36,marginBottom:8}}>💬</div>
                    <div style={{fontSize:13,fontWeight:600}}>Sin mensajes aún</div>
                    <div style={{fontSize:11,marginTop:4}}>Sé el primero en escribir</div>
                  </div>
                )}
                {(chats[gid]||[]).map((msg,i)=>{
                  const isMe=msg.uid===user?.id||msg.uid==='user';
                  const ts=new Date(msg.ts||Date.now());
                  const timeStr=ts.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
                  return(
                    <div key={msg.id||i} style={{display:'flex',gap:8,
                      flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end'}}>
                      {!isMe&&(
                        <div style={{width:28,height:28,borderRadius:'50%',
                          background:'var(--acc)22',border:'1.5px solid var(--acc)55',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>
                          {(msg.ini||msg.name||'?')[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{maxWidth:'72%'}}>
                        {!isMe&&(
                          <div style={{fontSize:12,color:'var(--muted)',marginBottom:2,paddingLeft:4}}>
                            {msg.name||'Usuario'}
                          </div>
                        )}
                        <div style={{background:isMe?'var(--gold)':'var(--surf2)',
                          color:isMe?'#000':'var(--txt)',
                          borderRadius:isMe?'16px 16px 4px 16px':'16px 16px 16px 4px',
                          padding:'10px 14px',fontSize:15,lineHeight:1.5,
                          border:isMe?'none':'1px solid var(--br)'}}>
                          {msg.text}
                        </div>
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:3,
                          textAlign:isMe?'right':'left',paddingLeft:4}}>
                          {timeStr}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef}/>
              </div>

              {/* Input — always visible at bottom */}
              <div style={{padding:'10px 12px',borderTop:'1px solid var(--br)',
                background:'var(--surf)',flexShrink:0,
                display:'flex',gap:8,alignItems:'flex-end'}}>
                <textarea
                  value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg(gid);}}}
                  placeholder={t.write_message}
                  rows={1}
                  style={{flex:1,background:'var(--surf2)',border:'1.5px solid var(--br)',
                    borderRadius:12,padding:'10px 14px',color:'var(--txt)',
                    fontFamily:'var(--fb)',fontSize:14,outline:'none',resize:'none',
                    lineHeight:1.4,maxHeight:80,overflowY:'auto',
                    transition:'border-color .2s'}}
                  onFocus={e=>e.target.style.borderColor='var(--gold)'}
                  onBlur={e=>e.target.style.borderColor='var(--br)'}/>
                <button
                  onClick={()=>sendMsg(gid)}
                  disabled={!chatInput.trim()}
                  style={{width:44,height:44,borderRadius:12,flexShrink:0,
                    background:chatInput.trim()?'var(--gold)':'rgba(255,255,255,.08)',
                    border:'none',cursor:chatInput.trim()?'pointer':'not-allowed',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:20,transition:'all .15s'}}>
                  ➤
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }
  return null;
}

// ── Pago Screen ───────────────────────────────────
function PagoScreen({onExito,onCancelar,esReset=false,onRecheckAccess,user,onRecover}){
  const t=useLang();
  const [metodo,setMetodo]=useState('card');
  const [loading,setLoading]=useState(false);
  const [exito,setExito]=useState(false);

  const handlePagar=async()=>{
    setLoading(true);
    try{
      const res=await fetch('/api/mp/create-preference',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:user?.id,userEmail:user?.email})
      });
      const {checkoutUrl}=await res.json();
      window.location.href=checkoutUrl;
    }catch(e){
      alert('Error al iniciar el pago');
      setLoading(false);
    }
  };

  if(exito)return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      height:'100%',gap:14,textAlign:'center',padding:'32px',
      background:'radial-gradient(ellipse at 50% 40%,rgba(30,198,108,.12) 0%,transparent 60%)'}}>
      <div style={{width:76,height:76,borderRadius:'50%',background:'rgba(30,198,108,.15)',
        border:'2px solid var(--grn)',display:'flex',alignItems:'center',
        justifyContent:'center',fontSize:34,animation:'popbadge .4s ease'}}>✅</div>
      <div style={{fontFamily:'var(--ff)',fontSize:32,letterSpacing:2,color:'var(--grn)'}}>
        ¡PAGO EXITOSO!
      </div>
      <div style={{background:'rgba(240,165,0,.1)',borderRadius:14,padding:'14px 24px',
        border:'1px solid rgba(240,165,0,.25)'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:44,color:'var(--gold)',lineHeight:1}}>
          🪙 1,000
        </div>
        <div style={{fontSize:13,color:'var(--dim)',marginTop:4}}>monedas añadidas a tu cuenta</div>
      </div>
      {esReset&&<div style={{fontSize:13,color:'var(--txt)',background:'rgba(200,16,46,.1)',
        padding:'10px 20px',borderRadius:10,border:'1px solid rgba(200,16,46,.2)'}}>
        🔄 Pronósticos anteriores eliminados
      </div>}
      <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Redirigiendo a Mi Pronóstico…</div>
    </div>
  );

  // ── Pantalla "Esperando confirmación de pago" ──

  return(
    <div className="scr fin">
      {/* Header */}
      <div style={{padding:'18px 16px 14px',
        background:'linear-gradient(180deg,rgba(240,165,0,.07) 0%,transparent 100%)',
        borderBottom:'1px solid rgba(255,255,255,.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          {onCancelar&&(
            <button onClick={onCancelar} style={{background:'rgba(255,255,255,.1)',border:'none',
              color:'#fff',width:36,height:36,borderRadius:10,cursor:'pointer',fontSize:20,
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>←</button>
          )}
          <div>
            <div style={{fontFamily:'var(--ff)',fontSize:22,letterSpacing:1,color:'var(--gold)'}}>
              {esReset?'CAMBIAR PRONÓSTICOS':'ACTIVAR MI PRONÓSTICO'}
            </div>
            <div style={{fontSize:12,color:'var(--muted)'}}>
              {esReset?'Paga $30 · reinicia todo y vuelve a apostar':'Acceso completo · $30 MXN una sola vez'}
            </div>
          </div>
        </div>
        {/* Amount card */}
        <div style={{background:'var(--surf)',borderRadius:14,padding:'16px',
          border:'1.5px solid rgba(240,165,0,.3)',display:'flex',justifyContent:'space-between',
          alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,letterSpacing:.5}}>
              {esReset?'COSTO DE REINICIO':'PRECIO DE ACCESO'}
            </div>
            <div style={{fontFamily:'var(--ff)',fontSize:48,color:'var(--gold)',lineHeight:1,marginTop:2}}>
              $30
</div>
            <div style={{fontSize:12,color:'var(--dim)'}}>pesos mexicanos</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:'var(--ff)',fontSize:32,color:'var(--gold)'}}>🪙1,000</div>
            <div style={{fontSize:10,color:'var(--dim)',marginTop:2}}>MONEDAS VIRTUALES</div>
            <div style={{fontSize:10,color:'var(--grn)',fontWeight:700,marginTop:2}}>
              ✓ Cubren TODO
            </div>
          </div>
        </div>
        {esReset&&(
          <div style={{marginTop:10,padding:'9px 12px',background:'rgba(200,16,46,.08)',
            borderRadius:9,border:'1px solid rgba(200,16,46,.2)',fontSize:12,color:'#FC8181',
            fontWeight:600,textAlign:'center'}}>
            ⚠️ Se borrarán TODOS tus pronósticos actuales y no se pueden recuperar
          </div>
        )}
      </div>

      <div style={{padding:'14px 16px 24px',display:'flex',flexDirection:'column',gap:13}}>
        {/* Includes list */}
        {!esReset&&(
          <div style={{background:'var(--surf)',borderRadius:12,padding:13,border:'1px solid var(--br)'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:8,letterSpacing:.5}}>
              ✅ INCLUYE TODO EN MI PRONÓSTICO
            </div>
            {['🏆 Campeón del Mundo (10🪙)',
              '⚽ Bota de Oro y Balón de Oro (8🪙 c/u)',
              '🏅 Ganadores de los 12 grupos (4🪙 c/u)',
              '📊 1X2 (3🪙) · Total Goles / BTTS / DC (2🪙 c/u)',
              '🎯 Marcador exacto · Primer goleador · Hándicap (1🪙 c/u)',
              '⚽ 72 partidos de fase de grupos completa',
              '📈 Estadísticas personales en tiempo real'].map(i=>(
              <div key={i} style={{fontSize:11,color:'var(--dim)',padding:'3px 0',
                borderBottom:'1px solid rgba(255,255,255,.04)',lineHeight:1.4}}>{i}</div>
            ))}
            <div style={{fontSize:11,color:'var(--grn)',fontWeight:700,marginTop:7}}>
              Total máximo: ~962🪙 si apuestas todo · Con 1,000🪙 siempre te alcanza ✓
            </div>
          </div>
        )}

        {/* Payment method selector */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:8,letterSpacing:.5}}>
            MÉTODO DE PAGO
          </div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {[['card','💳','Tarjeta'],['oxxo','🏪','OXXO']].map(([m,ic,lb])=>(
              <button key={m} onClick={()=>setMetodo(m)}
                style={{flex:1,padding:'10px 4px',
                  background:metodo===m?'rgba(240,165,0,.12)':'var(--surf)',
                  border:`1.5px solid ${metodo===m?'rgba(240,165,0,.4)':'var(--br)'}`,
                  borderRadius:11,cursor:'pointer',transition:'all .15s',fontFamily:'var(--fb)'}}>
                <div style={{fontSize:20}}>{ic}</div>
                <div style={{fontSize:10,color:metodo===m?'var(--gold)':'var(--muted)',
                  fontWeight:700,marginTop:3,letterSpacing:.3}}>{lb}</div>
              </button>
            ))}
          </div>

          {/* Card form — vía MercadoPago Checkout */}
          {metodo==='card'&&(
            <div style={{background:'var(--surf)',borderRadius:12,padding:16,
              border:'1px solid rgba(240,165,0,.2)',textAlign:'center'}}>
              <div style={{fontSize:32,marginBottom:8}}>💳</div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:6,color:'var(--gold)'}}>
                Pago Seguro con Tarjeta
              </div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:10}}>
                Visa · Mastercard · American Express<br/>
                Proceso seguro vía <strong style={{color:'var(--txt)'}}>MercadoPago</strong>
              </div>
              <div style={{fontSize:12,color:'var(--dim)',background:'rgba(255,255,255,.04)',
                borderRadius:8,padding:'8px 12px',marginBottom:4}}>
                🔒 Tu tarjeta NO se almacena en la app.<br/>
                Pago cifrado SSL/TLS
              </div>
            </div>
          )}

          {/* OXXO — vía MercadoPago */}
          {metodo==='oxxo'&&(
            <div style={{background:'var(--surf)',borderRadius:12,padding:16,
              border:'1px solid var(--br)',textAlign:'center'}}>
              <div style={{fontSize:30,marginBottom:8}}>🏪</div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Pago en efectivo OXXO</div>
              <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.6}}>
                Al hacer clic en <strong style={{color:'var(--gold)'}}>Pagar $30 MXN</strong>,
                MercadoPago generará tu referencia OXXO.<br/>
                Válida 24 horas en cualquier tienda OXXO del país.
              </div>
              <div style={{marginTop:10,fontSize:11,color:'var(--dim)',
                background:'rgba(240,165,0,.05)',borderRadius:8,padding:'8px'}}>
                💡 Comisión OXXO: $13 MXN adicionales (total $33 MXN)
              </div>
            </div>
          )}

        </div>

        {/* Pay button */}
        <button onClick={handlePagar} disabled={loading}
          style={{width:'100%',background:'var(--gold)',color:'#000',border:'none',
            borderRadius:12,padding:'16px',fontFamily:'var(--ff)',fontSize:20,
            letterSpacing:1,cursor:loading?'not-allowed':'pointer',transition:'all .2s',
            fontWeight:400,opacity:loading?0.7:1}}>
          {loading?'Conectando…':esReset?'PAGAR $30 Y REINICIAR TODO':'PAGAR $30 MXN Y ACTIVAR'}
        </button>
        {!esReset&&onRecheckAccess&&(
          <div style={{textAlign:'center',marginTop:16,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.07)'}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>¿Ya recibiste monedas de regalo?</div>
            <button onClick={onRecheckAccess}
              style={{background:'rgba(79,142,247,.12)',border:'1px solid rgba(79,142,247,.3)',
                color:'var(--acc)',borderRadius:10,padding:'8px 18px',fontSize:12,
                cursor:'pointer',fontFamily:'var(--fb)',fontWeight:700}}>
              🔍 Verificar acceso
            </button>
          </div>
        )}
        {!esReset&&onRecover&&(
          <div style={{textAlign:'center',marginTop:10,paddingTop:12,
            borderTop:'1px solid rgba(255,255,255,.05)'}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>
              ¿Pagaste pero no recibiste tus monedas?
            </div>
            <button onClick={onRecover}
              style={{background:'rgba(246,201,14,.1)',border:'1px solid rgba(246,201,14,.3)',
                color:'var(--gold)',borderRadius:10,padding:'8px 18px',fontSize:12,
                cursor:'pointer',fontFamily:'var(--fb)',fontWeight:700}}>
              🔄 Recuperar monedas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bets Screen ───────────────────────────────────
function BetsScreen({bets,placeBet,credito,creditoLoading,onPagar,onReset,betsSaved=false,onSave,currentUser,onRecheckAccess,onRecover}){
  const t=useLang();
  const [tab,setTab]=useState('largo');
  const [exact,setExact]=useState({});
  const [showReset,setShowReset]=useState(false);
  const [confirmReset,setConfirmReset]=useState(false);

  // ── Payment gates ──
  if(!credito&&creditoLoading) return(
    <div className="scr fin" style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <div style={{width:32,height:32,border:'3px solid var(--gold)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <div style={{fontSize:13,color:'var(--muted)'}}>Verificando acceso…</div>
    </div>
  );
  if(!credito) return <PagoScreen onExito={onPagar} onRecheckAccess={onRecheckAccess} user={currentUser} onRecover={onRecover}/>;
  if(showReset) return(
    <PagoScreen
      onExito={()=>{onReset();setShowReset(false);setConfirmReset(false);}}
      onCancelar={()=>{setShowReset(false);setConfirmReset(false);}}
      esReset={true} user={currentUser}/>
  );

  // Coins
  const isAdminUser=credito?.isAdmin||false;
  const coinsUsed=isAdminUser?0:bets.reduce((s,b)=>s+getBetCost(b.id),0);
  const totalCoins=COINS_PER_PAGO;
  const coinsLeft=isAdminUser?999999:totalCoins-coinsUsed;
  const pctUsed=isAdminUser?0:Math.min(100,Math.round(coinsUsed/totalCoins*100));

  const getBet=id=>bets.find(b=>b.id===id);
  const isSel=(id,val)=>getBet(id)?.selection===val;

  const place=(id,category,selection,odds)=>{
    placeBet({id,category,selection,odds,status:'pendiente',ts:Date.now()});
  };

  // Botón apuesta — FIJO en tamaño; deshabilitado si pronóstico guardado
  const OBtn=({id,category,val,odds,display})=>{
    const sel=isSel(id,val);
    return(
      <button type="button"
        onClick={betsSaved?undefined:e=>{e.preventDefault();place(id,category,val,odds);}}
        style={{background:sel?'rgba(240,165,0,.18)':'var(--surf2)',
          border:`1.5px solid ${sel?'var(--gold)':'var(--br)'}`,
          borderRadius:10,padding:'6px 6px 5px',cursor:betsSaved?'default':'pointer',
          transition:'background .15s,border-color .15s,color .15s',
          display:'flex',flexDirection:'column',alignItems:'center',gap:1,
          fontFamily:'var(--fb)',width:'100%',boxSizing:'border-box',
          opacity:betsSaved&&!sel?0.4:1}}>
        <span style={{fontSize:11,color:sel?'var(--gold)':'var(--txt)',fontWeight:700,
          textAlign:'center',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',
          textOverflow:'ellipsis',width:'100%'}}>{display||val}</span>
        <span style={{fontSize:10,color:sel?'var(--gold)':'#6B82AF',fontWeight:700,lineHeight:1}}>{odds}x</span>
      </button>
    );
  };


  const SecHead=({icon,title,betId})=>(
    <div style={{padding:'10px 14px 8px',borderBottom:'1px solid var(--br)',display:'flex',alignItems:'center',gap:8}}>
      <span style={{fontSize:18}}>{icon}</span>
      <span style={{fontFamily:'var(--ff)',fontSize:15,letterSpacing:1}}>{title}</span>
      {getBet(betId)&&<span style={{marginLeft:'auto',fontSize:10,background:'rgba(30,198,108,.15)',color:'var(--grn)',padding:'2px 8px',borderRadius:20,fontWeight:700}}>✓ APOSTADO</span>}
    </div>
  );

  const BetResult=({betId})=>{
    const b=getBet(betId);
    if(!b) return null;
    return(
      <div style={{margin:'6px 0 0',padding:'7px 10px',background:'rgba(240,165,0,.05)',borderRadius:8,fontSize:12,color:'var(--dim)',display:'flex',justifyContent:'space-between'}}>
        <span>Tu apuesta: <strong style={{color:'var(--gold)'}}>{b.selection}</strong></span>
        <strong style={{color:'var(--gold)'}}>{b.odds}x</strong>
      </div>
    );
  };

  // Botón compacto para Partidos del Mundial — varios por fila
  const SmBtn=({id,category,val,odds,display})=>{
    const sel=isSel(id,val);
    return(
      <button type="button"
        onClick={betsSaved?undefined:e=>{e.preventDefault();place(id,category,val,odds);}}
        style={{background:sel?'rgba(240,165,0,.18)':'var(--surf2)',
          border:`1.5px solid ${sel?'var(--gold)':'var(--br)'}`,
          borderRadius:8,padding:'4px 7px 3px',cursor:betsSaved?'default':'pointer',
          transition:'background .15s,border-color .15s,color .15s',
          display:'inline-flex',flexDirection:'column',alignItems:'center',gap:0,
          fontFamily:'var(--fb)',boxSizing:'border-box',flexShrink:0,
          opacity:betsSaved&&!sel?0.4:1}}>
        <span style={{fontSize:11,color:sel?'var(--gold)':'var(--txt)',fontWeight:700,
          textAlign:'center',lineHeight:1.2,whiteSpace:'nowrap'}}>{display||val}</span>
        <span style={{fontSize:10,color:sel?'var(--gold)':'#6B82AF',fontWeight:600,lineHeight:1}}>{odds}x</span>
      </button>
    );
  };


  // ── Tab: Partidos Mundial ──
  const LargoPlazo=()=>(
    <div>
      {/* Campeón */}
      <div style={{margin:'0 16px 13px',background:'var(--surf)',borderRadius:14,border:'1px solid var(--br)',overflow:'hidden'}}>
        <SecHead icon="🏆" title="CAMPEÓN DEL MUNDO" betId="campeon"/>
        <div style={{padding:'10px 14px'}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>{t.world_champion_q}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {CAMPEON_OPTS.map(o=>(
              <SmBtn key={o.v} id="campeon" category="Campeón del Mundo" val={o.v} odds={o.odds}
                display={`${FLAGS[o.v]||'🏴'} ${o.v}`}/>
            ))}
          </div>
          <BetResult betId="campeon"/>
        </div>
      </div>

      {/* Bota de Oro */}
      <div style={{margin:'0 16px 13px',background:'var(--surf)',borderRadius:14,border:'1px solid var(--br)',overflow:'hidden'}}>
        <SecHead icon="⚽" title="BOTA DE ORO" betId="bota-oro"/>
        <div style={{padding:'10px 14px'}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>{t.top_scorer_q}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {BOTA_ORO_OPTS.map(o=>(
              <SmBtn key={o.v} id="bota-oro" category="Bota de Oro" val={o.v} odds={o.odds}
                display={`${FLAGS[o.team]||'🏴'} ${o.v.split(' ').slice(-1)[0]}`}/>
            ))}
          </div>
          <BetResult betId="bota-oro"/>
        </div>
      </div>

      {/* Balón de Oro — mismos candidatos que Bota de Oro */}
      <div style={{margin:'0 16px 13px',background:'var(--surf)',borderRadius:14,border:'1px solid var(--br)',overflow:'hidden'}}>
        <SecHead icon="🌟" title="BALÓN DE ORO" betId="balon-oro"/>
        <div style={{padding:'10px 14px'}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>{t.best_player_q}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {BOTA_ORO_OPTS.map(o=>(
              <SmBtn key={o.v} id="balon-oro" category="Balón de Oro" val={o.v} odds={o.odds}
                display={`${FLAGS[o.team]||'🏴'} ${o.v.split(' ').slice(-1)[0]}`}/>
            ))}
          </div>
          <BetResult betId="balon-oro"/>
        </div>
      </div>

      {/* Ganadores de Grupo — 4 equipos en una línea, nombre abreviado */}
      <div style={{margin:'0 16px 6px',fontFamily:'var(--ff)',fontSize:17,letterSpacing:1,paddingLeft:2}}>🏅 {t.group_winners}</div>
      {GRP_WIN.map(grp=>{
        const gid=`grp-${grp.g.replace(' ','')}`;
        const gb=getBet(gid);
        return(
          <div key={grp.g} style={{margin:'0 16px 8px',background:'var(--surf)',borderRadius:12,border:'1px solid var(--br)',overflow:'hidden'}}>
            <div style={{padding:'6px 12px',borderBottom:'1px solid var(--br)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:.8}}>{grp.g}</span>
              {gb&&<span style={{fontSize:9,background:'rgba(30,198,108,.15)',color:'var(--grn)',padding:'1px 6px',borderRadius:20,fontWeight:700}}>✓ {gb.selection.split(' ').slice(-1)[0].substring(0,6)}</span>}
            </div>
            <div style={{padding:'7px 10px',display:'flex',gap:4}}>
              {grp.teams.map(tm=>(
                <SmBtn key={tm.v} id={gid} category={`Ganador ${grp.g}`} val={tm.v} odds={tm.odds}
                  display={`${FLAGS[tm.v]||'🏴'} ${tm.v.split(' ')[0].substring(0,5)}`}/>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Tab: Por Partido ──
  const PorPartido=()=>(
    <div style={{padding:'0 12px'}}>
      {[...LIVE_MATCHES,...NEXT_MATCHES].filter(m => m.home !== 'Por definir' && m.away !== 'Por definir').map(m=>{
        const mid=m.id;
        const isLive=m.min!=null;
        const o=m.odds||[2.2,3.2,3.0];
        const homeShort=m.home.substring(0,8);
        const awayShort=m.away.substring(0,8);
        return(
          <div key={mid} style={{display:'flex',alignItems:'center',gap:8,
            padding:'6px 10px',marginBottom:5,
            background:'var(--surf)',borderRadius:10,border:'1px solid var(--br)'}}>
            {/* Izquierda: nombres + fecha */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                <span style={{fontSize:14,lineHeight:1}}>{FLAGS[m.home]||'🏴'}</span>
                <span style={{fontSize:11,fontWeight:700,color:'var(--txt)',
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.home}</span>
                {isLive&&<span className="live" style={{fontSize:8}}><span className="ldot"/>{m.min}'</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
                <span style={{fontSize:14,lineHeight:1}}>{FLAGS[m.away]||'🏴'}</span>
                <span style={{fontSize:11,fontWeight:700,color:'var(--txt)',
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.away}</span>
              </div>
              <div style={{fontSize:9,color:'var(--muted)'}}>
                {m.date||''}{m.time?' · '+m.time:''}
              </div>
            </div>
            {/* Derecha: botones apuestas */}
            <div style={{flexShrink:0}}>
              {/* Fila 1: 1X2 */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3,marginBottom:3}}>
                <OBtn id={`m${mid}-1x2`} category="1X2" val="1" odds={o[0]} display={homeShort}/>
                <OBtn id={`m${mid}-1x2`} category="1X2" val="X" odds={o[1]} display="EMP"/>
                <OBtn id={`m${mid}-1x2`} category="1X2" val="2" odds={o[2]} display={awayShort}/>
              </div>
              {/* Fila 2: Ambos anotan */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3}}>
                <OBtn id={`m${mid}-btts`} category="BTTS" val="si" odds={1.75} display="✓ Anotan"/>
                <OBtn id={`m${mid}-btts`} category="BTTS" val="no" odds={2.05} display="✗ No"/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Tab: Especiales ──
  const Especiales=()=>(
    <div>
      {/* ── MEJORES GOLEADORES DEL MUNDIAL — 3 × 8 = 24 monedas ── */}
      <div style={{margin:'0 16px 16px',background:'var(--surf)',borderRadius:14,
        border:'2px solid rgba(240,165,0,.3)',overflow:'hidden'}}>
        <div style={{padding:'11px 14px',background:'rgba(240,165,0,.06)',
          borderBottom:'1px solid rgba(240,165,0,.2)',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:20}}>🥇</span>
          <div>
            <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:1,color:'var(--gold)'}}>
              {t.best_scorers}
            </div>
            <div style={{fontSize:10,color:'var(--muted)'}}>
              Selecciona al 1°, 2° y 3° goleador del Mundial
            </div>
          </div>
        </div>
        {[
          {key:'goleador-1',label:'🥇 1er Goleador · 15🪙',rank:1},
          {key:'goleador-2',label:'🥈 2do Goleador · 4🪙',rank:2},
          {key:'goleador-3',label:'🥉 3er Goleador · 5🪙',rank:3},
        ].map(({key,label,rank})=>{
          const picked=getBet(key);
          return(
            <div key={key} style={{padding:'10px 14px',
              borderBottom:'1px solid rgba(255,255,255,.04)'}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,
                marginBottom:8,letterSpacing:.8,display:'flex',alignItems:'center',gap:8}}>
                {label} · 8🪙
                {picked&&<span style={{color:'var(--grn)',fontWeight:700}}>✓ {picked.selection}</span>}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {SCORERS.map(p=>{
                  const sel=getBet(key)?.selection===p.n;
                  return(
                    <button type="button" key={p.n}
                      onClick={e=>{e.preventDefault();place(key,`Goleador ${rank}°`,p.n,32);}}
                      style={{background:sel?'rgba(240,165,0,.18)':'var(--surf2)',
                        border:`1.5px solid ${sel?'var(--gold)':'var(--br)'}`,
                        borderRadius:8,padding:'5px 9px',cursor:'pointer',
                        display:'flex',alignItems:'center',gap:5,
                        transition:'background .15s,border-color .15s,color .15s'}}>
                      <span style={{fontSize:14}}>{FLAGS[p.team]||'🏳️'}</span>
                      <span style={{fontSize:11,fontWeight:700,
                        color:sel?'var(--gold)':'var(--txt)'}}>
                        {p.n.split(' ').slice(-1)[0]}
                      </span>
                      {sel&&<span style={{fontSize:9,color:'var(--grn)'}}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {false&&[...LIVE_MATCHES,...NEXT_MATCHES].map(m=>{
        const mid=m.id;
        const exKey=`m${mid}-exacto`;
        const jugKey=`m${mid}-jugador`;
        const hdKey=`m${mid}-handicap`;
        const ex=exact[mid]||{h:'',a:''};
        const players=[...(m.homeXI||[]),...(m.awayXI||[])].filter(p=>p.pos!=='GK');
        return(
          <div key={mid} style={{margin:'0 16px 13px',background:'var(--surf)',borderRadius:14,border:'1px solid var(--br)',overflow:'hidden'}}>
            <div style={{padding:'9px 14px',borderBottom:'1px solid var(--br)',display:'flex',alignItems:'center',gap:8}}>
              <span>{FLAGS[m.home]||'🏴'}</span>
              <span style={{fontSize:13,fontWeight:700}}>{m.home} vs {m.away}</span>
              <span>{FLAGS[m.away]||'🏴'}</span>
            </div>
            {/* Marcador Exacto */}
            <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:8,letterSpacing:.8,display:'flex',alignItems:'center',gap:8}}>
                🎯 MARCADOR EXACTO · 8.5x
                {getBet(exKey)&&<span style={{color:'var(--grn)',fontWeight:700}}>✓ {getBet(exKey).selection}</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="text" inputMode="numeric" pattern="[0-9]"
                  maxLength={1} placeholder="0" value={ex.h}
                  onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(-1);setExact(p=>({...p,[mid]:{...ex,h:v}}));}}
                  onFocus={e=>{e.target.select();e.target.scrollIntoView({block:'nearest',behavior:'smooth'});}}
                  style={{width:50,padding:'9px 6px',background:'var(--surf2)',border:'1.5px solid var(--br)',
                    borderRadius:10,color:'var(--txt)',fontSize:22,fontFamily:'var(--ff)',
                    textAlign:'center',outline:'none'}}/>
                <span style={{fontFamily:'var(--ff)',fontSize:24,color:'var(--muted)'}}>–</span>
                <input type="text" inputMode="numeric" pattern="[0-9]"
                  maxLength={1} placeholder="0" value={ex.a}
                  onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(-1);setExact(p=>({...p,[mid]:{...ex,a:v}}));}}
                  onFocus={e=>{e.target.select();e.target.scrollIntoView({block:'nearest',behavior:'smooth'});}}
                  style={{width:50,padding:'9px 6px',background:'var(--surf2)',border:'1.5px solid var(--br)',
                    borderRadius:10,color:'var(--txt)',fontSize:22,fontFamily:'var(--ff)',
                    textAlign:'center',outline:'none'}}/>
                <button
                  type="button"
                  onClick={e=>{
                    e.preventDefault();
                    if(ex.h===''||ex.a==='') return;
                    place(exKey,'Marcador Exacto',`${m.home} ${ex.h}-${ex.a} ${m.away}`,8.5);
                  }}
                  style={{flex:1,background:'rgba(240,165,0,.1)',border:'1px solid rgba(240,165,0,.3)',
                    color:'var(--gold)',borderRadius:10,padding:'10px 8px',fontSize:12,
                    fontWeight:700,cursor:'pointer',fontFamily:'var(--fb)'}}>
                  Registrar Marcador
                </button>
              </div>
            </div>
            {/* Quién Anotará Primero — elige equipo */}
            <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:8,letterSpacing:.8,display:'flex',alignItems:'center',gap:8}}>
                🥅 QUIÉN ANOTARÁ PRIMERO · 1.8x
                {getBet(jugKey)&&<span style={{color:'var(--grn)',fontWeight:700}}>✓ {getBet(jugKey).selection}</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[m.home,m.away].map(team=>{
                  const sel=getBet(jugKey)?.selection===team;
                  return(
                    <button type="button" key={team}
                      onClick={e=>{e.preventDefault();place(jugKey,'Quién Anotará Primero',team,1.8);}}
                      style={{background:sel?'rgba(240,165,0,.18)':'var(--surf2)',
                        border:`1.5px solid ${sel?'var(--gold)':'var(--br)'}`,
                        borderRadius:10,padding:'10px 6px',cursor:'pointer',
                        display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                        transition:'background .15s,border-color .15s,color .15s'}}>
                      <span style={{fontSize:22}}>{FLAGS[team]||'🏳️'}</span>
                      <span style={{fontSize:11,fontWeight:700,color:sel?'var(--gold)':'var(--txt)',
                        textAlign:'center'}}>{team}</span>
                      <span style={{fontSize:8,color:sel?'var(--grn)':'transparent',fontWeight:700}}>✓</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Hándicap — 3 columnas fijas */}
            <div style={{padding:'12px 14px'}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:8,letterSpacing:.8,display:'flex',alignItems:'center',gap:8}}>
                ⚖️ HÁNDICAP
                {getBet(hdKey)&&<span style={{color:'var(--grn)',fontWeight:700}}>✓ {getBet(hdKey).selection}</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
                <OBtn id={hdKey} category="Hándicap" val={`${m.home} -1`} odds={2.1}
                  display={`${m.home.substring(0,7)} -1`}/>
                <OBtn id={hdKey} category="Hándicap" val="Empate HC" odds={3.4}
                  display="Empate HC"/>
                <OBtn id={hdKey} category="Hándicap" val={`${m.away} +1`} odds={1.9}
                  display={`${m.away.substring(0,7)} +1`}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return(
    <div className="scr fin">
      {/* Header — STICKY para que monedas siempre sean visibles */}
      <div style={{padding:'14px 16px 10px',borderBottom:'1px solid rgba(255,255,255,.04)',
        position:'sticky',top:0,zIndex:20,background:'var(--bg)',
        backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
          <div>
            <div style={{fontFamily:'var(--ff)',fontSize:26,letterSpacing:2}}>{t('bets_title')}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>
              Paquete #{credito?.paquetes||0} · {new Date(credito.paidAt).toLocaleDateString('es',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
          <button onClick={()=>setConfirmReset(true)}
            disabled={coinsLeft > 0}
            title={coinsLeft > 0
              ? `Usa tus ${coinsLeft} monedas restantes antes de cambiar`
              : 'Cambiar paquete de pronósticos'}
            style={{background:'rgba(200,16,46,.1)',border:'1px solid rgba(200,16,46,.25)',
              color:'#FC8181',borderRadius:10,padding:'7px 11px',fontSize:11,fontWeight:700,
              cursor:coinsLeft > 0 ? 'not-allowed' : 'pointer',fontFamily:'var(--fb)',flexShrink:0,
              opacity:coinsLeft > 0 ? 0.4 : 1}}>
            🔄 Cambiar
          </button>
        </div>
        {/* Coin balance */}
        <div style={{background:'var(--surf)',borderRadius:12,padding:'11px 13px',
          border:`1px solid ${isAdminUser?'rgba(240,165,0,.4)':'var(--br)'}`}}>
          {isAdminUser?(
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>👑</span>
              <div>
                <div style={{fontFamily:'var(--ff)',fontSize:20,color:'var(--gold)',lineHeight:1}}>
                  ADMINISTRADOR · Monedas Ilimitadas
                </div>
                <div style={{fontSize:11,color:'var(--grn)',marginTop:2}}>
                  ✓ Acceso completo sin costo · {bets.length} pronósticos activos
                </div>
              </div>
            </div>
          ):(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <span style={{fontSize:18}}>🪙</span>
                  <div>
                    <span style={{fontFamily:'var(--ff)',fontSize:22,color:'var(--gold)'}}>{coinsLeft.toLocaleString()}</span>
                    <span style={{fontSize:11,color:'var(--muted)'}}> / {totalCoins.toLocaleString()} monedas</span>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,color:'var(--muted)'}}>Usadas: <strong style={{color:'var(--txt)'}}>{coinsUsed}</strong></div>
                  <div style={{fontSize:11,color:'var(--grn)',fontWeight:700}}>{bets.length} pronósticos</div>
                </div>
              </div>
              <div style={{height:8,borderRadius:4,background:'var(--surf2)',overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:4,
                  background:pctUsed>85?'var(--grn)':'var(--gold)',
                  width:`${pctUsed}%`,transition:'width .4s ease'}}/>
              </div>
              <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>
                {coinsLeft>=0
                  ?'✅ '+t.coins_enough
                  :'⚠️ '+t.insufficient_balance}
              </div>
            </>
          )}
        </div>
        {/* Confirm reset modal */}
        {confirmReset&&(
          <div style={{marginTop:10,background:'rgba(200,16,46,.08)',border:'1.5px solid rgba(200,16,46,.3)',
            borderRadius:12,padding:13}}>
            <div style={{fontSize:13,fontWeight:700,color:'#FC8181',marginBottom:6,textAlign:'center'}}>
              ⚠️ ¿Cambiar todos tus pronósticos?
            </div>
            <div style={{fontSize:11,color:'var(--dim)',marginBottom:10,textAlign:'center',lineHeight:1.55}}>
              Pagarás <strong style={{color:'var(--gold)'}}>$30 MXN</strong> y se borrarán tus {bets.length} pronósticos actuales. Recibirás <strong style={{color:'var(--gold)'}}>1,000🪙</strong> nuevas para volver a apostar.
            </div>
            <div style={{display:'flex',gap:9}}>
              <button onClick={()=>setConfirmReset(false)}
                style={{flex:1,background:'rgba(255,255,255,.07)',border:'1px solid var(--br)',
                  color:'var(--txt)',borderRadius:9,padding:'11px 6px',fontSize:12,
                  fontWeight:600,cursor:'pointer',fontFamily:'var(--fb)'}}>Cancelar</button>
              <button onClick={()=>{setConfirmReset(false);setShowReset(true);}}
                style={{flex:1,background:'var(--red)',border:'none',
                  color:'#fff',borderRadius:9,padding:'11px 6px',fontSize:12,
                  fontWeight:700,cursor:'pointer',fontFamily:'var(--fb)'}}>
                🔄 Ir a pagar $30
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div style={{display:'flex',gap:8,padding:'8px 16px',overflowX:'auto',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
        {[['largo','🏅 '+t('long_term')],['partido','⚽ '+t('per_match')],['especiales','🎯 '+t('specials')],['stats','📈 '+t('stats')]].map(([k,l])=>(
          <button key={k} className={`tpill ${tab===k?'on':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>
      <div style={{height:10}}/>
      {tab==='largo'&&LargoPlazo()}
      {tab==='partido'&&PorPartido()}
      {tab==='especiales'&&Especiales()}
      {tab==='stats'&&<StatsScreen bets={bets} noWrapper={true}/>}

      {/* ── BOTÓN GUARDAR PRONÓSTICO ── */}
      {!isAdminUser&&(
        <div style={{margin:'8px 16px 24px',padding:'16px',background:'var(--surf)',
          borderRadius:16,border:`2px solid ${betsSaved?'var(--grn)':coinsLeft<=0?'rgba(240,165,0,.5)':'var(--br)'}`,
          textAlign:'center'}}>

          {betsSaved?(
            /* Estado: GUARDADO — solo consulta */
            <div>
              <div style={{fontSize:28,marginBottom:6}}>🔒</div>
              <div style={{fontFamily:'var(--ff)',fontSize:20,letterSpacing:1,color:'var(--grn)',marginBottom:6}}>
                PRONÓSTICO GUARDADO
              </div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:12}}>
                Tus pronósticos están asegurados y son de solo consulta.<br/>
                Para hacer cambios necesitas comprar un nuevo paquete.
              </div>
              <div style={{background:'rgba(240,165,0,.08)',borderRadius:12,
                border:'1px solid rgba(240,165,0,.2)',padding:'12px',marginBottom:12}}>
                <div style={{fontSize:13,color:'var(--gold)',fontWeight:700,marginBottom:4}}>
                  ¿Quieres cambiar tus pronósticos?
                </div>
                <div style={{fontSize:11,color:'var(--dim)'}}>
                  Compra otro paquete de <strong style={{color:'var(--gold)'}}>$30 MXN</strong> y recibirás 1,000🪙 nuevas para volver a apostar.
                </div>
              </div>
              <button onClick={()=>setConfirmReset(true)}
                style={{width:'100%',background:'rgba(240,165,0,.1)',
                  border:'1px solid rgba(240,165,0,.3)',color:'var(--gold)',
                  borderRadius:10,padding:'11px',fontSize:13,fontWeight:700,
                  cursor:'pointer',fontFamily:'var(--fb)'}}>
                💳 Comprar otro paquete ($30 MXN)
              </button>
            </div>
          ):(
            /* Estado: PENDIENTE GUARDAR */
            <div>
              <div style={{fontFamily:'var(--ff)',fontSize:18,letterSpacing:1,marginBottom:8}}>
                {coinsLeft<=0?'✅ '+t.predictions_ready:'⏳ '+t.predictions_incomplete}
              </div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:12}}>
                {coinsLeft<=0
                  ?'Has usado todas tus monedas. Una vez que guardes, los pronósticos no se podrán modificar.'
                  :`Aún tienes ${coinsLeft}🪙 disponibles. Usa todas tus monedas antes de guardar.`
                }
              </div>
              {coinsLeft>0&&(
                <div style={{background:'rgba(200,16,46,.06)',borderRadius:10,
                  border:'1px solid rgba(200,16,46,.2)',padding:'10px 12px',
                  marginBottom:12,fontSize:11,color:'#FC8181'}}>
                  ⚠️ Te quedan <strong>{coinsLeft}</strong> monedas sin usar. Debes usar el saldo completo para guardar.
                </div>
              )}
              <button
                disabled={coinsLeft>0||bets.length===0}
                onClick={()=>{
                  if(coinsLeft>0||bets.length===0) return;
                  onSave&&onSave();
                }}
                style={{width:'100%',
                  background:coinsLeft<=0&&bets.length>0?'linear-gradient(135deg,var(--gold),var(--gold2))':'var(--surf2)',
                  border:`1.5px solid ${coinsLeft<=0&&bets.length>0?'var(--gold)':'var(--br)'}`,
                  color:coinsLeft<=0&&bets.length>0?'#000':'var(--muted)',
                  borderRadius:12,padding:'14px',fontSize:15,fontWeight:800,
                  cursor:coinsLeft<=0&&bets.length>0?'pointer':'not-allowed',
                  fontFamily:'var(--ff)',letterSpacing:1,
                  boxShadow:coinsLeft<=0&&bets.length>0?'0 4px 20px rgba(240,165,0,.4)':'none',
                  transition:'all .3s',marginBottom:10}}>
                💾 {t.save_prediction}
              </button>
              <div style={{fontSize:10,color:'var(--muted)',lineHeight:1.5}}>
                🔒 Una vez guardado, los pronósticos <strong style={{color:'var(--txt)'}}>no se podrán modificar</strong>.<br/>
                Para cambiar necesitarás comprar un nuevo paquete de <strong style={{color:'var(--gold)'}}>$30 MXN</strong>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stats Screen ──────────────────────────────────
function StatsScreen({bets,noWrapper=false}){
  const total=bets.length;
  const ganados=bets.filter(b=>b.status==='ganado').length;
  const perdidos=bets.filter(b=>b.status==='perdido').length;
  const pend=bets.filter(b=>b.status==='pendiente').length;
  const pct=(ganados+perdidos)>0?Math.round(ganados/(ganados+perdidos)*100):0;

  const byCategory={};
  bets.forEach(b=>{
    const c=b.category||'Otros';
    if(!byCategory[c])byCategory[c]={n:0,win:0,pend:0};
    byCategory[c].n++;
    if(b.status==='ganado')byCategory[c].win++;
    else if(b.status==='pendiente')byCategory[c].pend++;
  });

  const catColor={'Campeón del Mundo':'#F0A500','Bota de Oro':'#FF6B35','Balón de Oro':'#C0C0C0',
    '1X2':'#4F8EF7','Total Goles':'#1EC66C','BTTS':'#c8102e',
    'Doble Oportunidad':'#A855F7','Marcador Exacto':'#F97316',
    'Jugador que Anotará':'#22D3EE','Hándicap':'#FBBF24'};

  const SC=({icon,label,val,color})=>(
    <div style={{background:'var(--surf)',borderRadius:12,padding:'12px 14px',border:'1px solid var(--br)',flex:1,minWidth:0}}>
      <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
      <div style={{fontFamily:'var(--ff)',fontSize:30,color:color,lineHeight:1}}>{val}</div>
      <div style={{fontSize:11,color:'var(--muted)',marginTop:3,fontWeight:600}}>{label}</div>
    </div>
  );

  return(
    <div className={noWrapper?'fin':'scr fin'}>
      <div style={{padding:'18px 16px 8px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>MIS ESTADÍSTICAS</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>Historial de predicciones · Mundial 2026</div>
      </div>

      {/* Stat grid */}
      <div style={{display:'flex',gap:8,padding:'0 16px 14px',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8,width:'100%'}}>
          <SC icon="📋" label="Total Apuestas" val={total} color="var(--txt)"/>
          <SC icon="✅" label="Acertadas" val={ganados} color="var(--grn)"/>
        </div>
        <div style={{display:'flex',gap:8,width:'100%'}}>
          <SC icon="⏳" label="Pendientes" val={pend} color="var(--gold)"/>
          <SC icon="🎯" label="% Acierto" val={`${pct}%`} color="var(--acc)"/>
        </div>
      </div>

      {/* Visual bar */}
      {total>0&&(
        <div style={{margin:'0 16px 14px',background:'var(--surf)',borderRadius:12,padding:14,border:'1px solid var(--br)'}}>
          <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,marginBottom:10,letterSpacing:.8}}>DESGLOSE VISUAL</div>
          <div style={{height:16,borderRadius:8,background:'var(--surf2)',overflow:'hidden',display:'flex'}}>
            {ganados>0&&<div style={{width:`${ganados/total*100}%`,background:'var(--grn)',transition:'width .6s'}}/>}
            {perdidos>0&&<div style={{width:`${perdidos/total*100}%`,background:'var(--red)',transition:'width .6s'}}/>}
            {pend>0&&<div style={{width:`${pend/total*100}%`,background:'var(--gold)',opacity:.7,transition:'width .6s'}}/>}
          </div>
          <div style={{display:'flex',gap:16,marginTop:8,fontSize:11}}>
            <span><span style={{color:'var(--grn)'}}>■ </span>Acertadas {ganados}</span>
            {perdidos>0&&<span><span style={{color:'var(--red)'}}>■ </span>Falladas {perdidos}</span>}
            <span><span style={{color:'var(--gold)'}}>■ </span>Pendientes {pend}</span>
          </div>
        </div>
      )}

      {/* By category */}
      {Object.keys(byCategory).length>0&&(
        <div style={{margin:'0 16px 14px'}}>
          <div style={{fontFamily:'var(--ff)',fontSize:18,letterSpacing:1,marginBottom:10}}>POR CATEGORÍA</div>
          {Object.entries(byCategory).map(([cat,data])=>(
            <div key={cat} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',
              background:'var(--surf)',borderRadius:10,marginBottom:7,border:'1px solid var(--br)'}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:catColor[cat]||'var(--acc)',flexShrink:0}}/>
              <span style={{flex:1,fontSize:13,fontWeight:600}}>{cat}</span>
              <span style={{fontSize:13,color:'var(--gold)',fontWeight:800}}>{data.n}</span>
              {data.win>0&&<span style={{fontSize:10,background:'rgba(30,198,108,.12)',color:'var(--grn)',padding:'2px 7px',borderRadius:20}}>✓ {data.win}</span>}
              {data.pend>0&&<span style={{fontSize:10,background:'rgba(240,165,0,.1)',color:'var(--gold)',padding:'2px 7px',borderRadius:20}}>⏳ {data.pend}</span>}
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div style={{margin:'0 16px 16px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:18,letterSpacing:1,marginBottom:10}}>
          HISTORIAL {bets.length>0&&<span style={{fontSize:13,color:'var(--muted)',fontFamily:'var(--fb)',fontWeight:400}}>({bets.length} apuestas)</span>}
        </div>
        {bets.length===0
          ?<div style={{textAlign:'center',padding:'36px 24px',color:'var(--muted)'}}>
            <div style={{fontSize:44,marginBottom:12}}>🎰</div>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Sin predicciones todavía</div>
            <div style={{fontSize:12,lineHeight:1.55}}>Ve a la pantalla <span style={{color:'var(--gold)',fontWeight:700}}>Apuestas</span> y realiza tus predicciones del Mundial 2026</div>
          </div>
          :[...bets].reverse().map((b,i)=>(
            <div key={b.id+i} style={{display:'flex',gap:10,padding:'10px 14px',
              background:'var(--surf)',borderRadius:11,marginBottom:7,
              border:`1px solid ${b.status==='ganado'?'rgba(30,198,108,.25)':b.status==='perdido'?'rgba(200,16,46,.2)':'var(--br)'}`,
              alignItems:'center'}}>
              <div style={{width:10,height:10,borderRadius:'50%',flexShrink:0,
                background:b.status==='ganado'?'var(--grn)':b.status==='perdido'?'var(--red)':'var(--gold)'}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.category}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>→ {b.selection}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:14,fontWeight:800,color:'var(--gold)'}}>{b.odds}x</div>
                <div style={{fontSize:10,fontWeight:700,
                  color:b.status==='ganado'?'var(--grn)':b.status==='perdido'?'var(--red)':'var(--muted)'}}>
                  {b.status==='ganado'?'✓ Acertada':b.status==='perdido'?'✗ Fallada':'⏳ Pendiente'}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState('splash');
  const [user,setUser]=useState(null);
  const [lang,setLang]=useState('es');
  const _tr=TRANSLATIONS[lang]||TRANSLATIONS.es;
  const _fn=k=>_tr[k]||TRANSLATIONS.es[k]||k;
  const t=new Proxy(_fn,{get(_,p){return p in _tr?_tr[p]:_fn[p];}});
  const [tab,setTab]=useState('home');
  const [match,setMatch]=useState(null);
  const [userBets,setUserBets]=useState([]);
  // Save bets to localStorage whenever they change (so they survive logout)
  const saveBets=(u,bets)=>{
    if(!u?.id)return;
    try{localStorage.setItem('wc2026_bets_'+u.id,JSON.stringify(bets));}
    catch(e){}
  };
  const [credito,setCredito]=useState(null);
  const [creditoLoading,setCreditoLoading]=useState(false);
  const [mpVerify,setMpVerify]=useState(null);
  // mpVerify: null | "verifying" | {ok:true,paymentId,coins} | {ok:false,paymentId,error}
  //         | {kind:'pending'} | {kind:'failure'}
  const [betsSaved,setBetsSaved]=useState(false); // predictions locked after saving
  const [groupSyncMsg,setGroupSyncMsg]=useState(''); // feedback de subida a grupos (Flujo A)
  const [logoutMsg,setLogoutMsg]=useState('');
  // credito = {coins:1000, paquetes:N, paidAt:timestamp} | null
  // Espejo del usuario activo para leerlo dentro de listeners sin stale closure
  const userRef=useRef(null);
  useEffect(()=>{userRef.current=user;},[user]);
  // Migración de pronósticos bloqueados: correr al abrir la app (no solo en Grupos)
  // para que los usuarios afectados por el bug del stub se recuperen más rápido.
  useEffect(()=>{ if(user?.id) syncLockedBets(user); },[user?.id]);

  // ── Push Notification helper ──────────────────────────
  const requestPush = async () => {
    if(!('Notification' in window)||!('serviceWorker' in navigator)) return;
    try {
      const perm = await Notification.requestPermission();
      if(perm === 'granted') {
        console.log('Push notifications activadas ✓');
        // Notificación de bienvenida
        new Notification('⚽ Mundial 2026', {
          body: 'Notificaciones activadas. Te avisaremos cuando empiece cada partido.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        });
      }
    } catch(e) { console.warn('Push error:', e); }
  };

  const login=async u=>{
    setLogoutMsg('');
    setUser(u);
    setScreen('app');
    // Restore saved bets from localStorage (survive logout)
    try{
      const saved=localStorage.getItem('wc2026_bets_'+u.id);
      if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed))setUserBets(parsed);}
    }catch(e){}
    // Apply user language preference
    if(u.lang && TRANSLATIONS[u.lang]) setLang(u.lang);
    // Pedir permiso de notificaciones al login
    setTimeout(requestPush, 2000);
    // Generar sessionId único para este dispositivo
    const sessionId = 'sess_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    localStorage.setItem('wc2026_session_'+u.id, sessionId);
    // Persistir sesión para restauración automática al recargar
    try{localStorage.setItem('wc2026_current_user',JSON.stringify(u));}catch(e){}
    // Persistir/actualizar al usuario en la DB local (upsert por email). Antes esto
    // solo ocurría en el registro o en el bloque de migración canónica, dejando
    // wc2026_users_db vacío en una máquina nueva (admin o usuario sincronizado
    // desde Firestore al iniciar sesión por primera vez en este navegador).
    try{
      const localDB=await dbLoad();
      const prev=localDB.find(x=>x.email?.toLowerCase()===u.email?.toLowerCase());
      const others=localDB.filter(x=>x.email?.toLowerCase()!==u.email?.toLowerCase());
      await dbSave([...others,{...prev,...u}]);
    }catch(e){}
    // Guardar en Firestore — con reintentos si Firebase aún carga
    const saveToFirestore = async(attempts=0) => {
      const saveFn=fbSaveUser||window._fbSaveUser;
      if(saveFn){
        try{
          const fsId=await saveFn({...u, sessionId});
          if(fsId && fsId!==u.id){
            // Firestore tiene un ID canónico diferente al local (re-registro desde otro dispositivo).
            // Sincronizar localStorage y estado de React para que usen el ID de Firestore.
            const canonUser={...u,id:fsId};
            setUser(canonUser);
            try{localStorage.setItem('wc2026_current_user',JSON.stringify(canonUser));}catch(e){}
            const localDB=await dbLoad();
            const myEntry=localDB.find(x=>x.id===u.id);
            if(myEntry){
              await dbSave([...localDB.filter(x=>x.id!==u.id&&x.id!==fsId),{...myEntry,id:fsId}]);
              // Migrar claves de apuestas/sesión al nuevo ID
              try{
                ['wc2026_bets_','wc2026_saved_','wc2026_groups_'].forEach(prefix=>{
                  const v=localStorage.getItem(prefix+u.id);
                  if(v){localStorage.setItem(prefix+fsId,v);localStorage.removeItem(prefix+u.id);}
                });
                localStorage.removeItem('wc2026_session_'+u.id);
                localStorage.setItem('wc2026_session_'+fsId,sessionId);
              }catch(e){}
            }
          }
        }
        catch(e){ console.warn('saveUser error:',e); }
      } else if(attempts < 10){
        setTimeout(()=>saveToFirestore(attempts+1), 600);
      }
    };
    // El admin no se guarda como documento de usuario en Firestore (evita que
    // aparezca listado en su propio panel). Su sesión sí queda en localStorage.
    // Usuarios de Auth (fromAuth) ya tienen su doc users/{uid}: no usar el guardado
    // canónico viejo (crearía un doc u_..._at_... duplicado).
    if(!u.isAdmin && !u.fromAuth) saveToFirestore();
    // Admin: verificar flags + TAMBIÉN detectar regalo (gifted) desde Firestore
    const checkAdminFlags=async(attempts=0)=>{
      const getFn=fbGetAllUsers||window._fbGetAllUsers;
      if(getFn){
        try{
          const allUsers=await getAllUsersCached(getFn);
          // Buscar por ID primero; si no hay match, buscar por email (cubre registro multi-dispositivo)
          const fsUser=allUsers.find(x=>x.id===u.id)||
                       allUsers.find(x=>x.email?.toLowerCase()===u.email?.toLowerCase());
          // ── Regalo: otorgar acceso si Firestore dice gifted:true ──
          if(fsUser?.gifted&&!u.isAdmin){
            const gc=fsUser.giftedCoins||1000;
            setCredito({coins:gc+(fsUser?.paquetes||0)*COINS_PER_PAGO,paquetes:fsUser?.paquetes||1,paidAt:Date.now(),gifted:true,giftedCoins:gc});
            const localUsers=await dbLoad();
            await dbSave(localUsers.map(x=>x.id===u.id?{...x,gifted:true,giftedCoins:gc}:x));
          }
          // ── Borrar cuenta completa ──────────────────────────
          if(fsUser?.forceDelete){
            const allDB=await dbLoad();
            await dbSave(allDB.filter(x=>x.id!==u.id));
            ['wc2026_bets_','wc2026_saved_','wc2026_groups_','wc2026_session_'].forEach(k=>{
              try{localStorage.removeItem(k+u.id);}catch(e){}
            });
            logout('Tu cuenta fue eliminada. Puedes registrarte de nuevo con el mismo correo.');
            return;
          }
          // ── Reset solo apuestas ─────────────────────────────
          if(fsUser?.forceBetReset){
            localStorage.removeItem('wc2026_bets_'+u.id);
            localStorage.removeItem('wc2026_saved_'+u.id);
            setUserBets([]);
            setBetsSaved(false);
            const saveFn=fbSaveUser||window._fbSaveUser;
            if(saveFn) saveFn({...u,forceBetReset:false});
          }
        }catch(e){console.warn('checkAdminFlags error:',e);}
      } else if(attempts<10){ setTimeout(()=>checkAdminFlags(attempts+1),800); }
    };
    checkAdminFlags();
    // Admin gets unlimited coins automatically
    if(u.isAdmin){
      setCredito({coins:999999,paquetes:999,paidAt:Date.now(),isAdmin:true});
      return;
    }
    // Check if user has gifted coins or paid package
    try{
      const users=await dbLoad();
      const dbUser=users.find(x=>x.email.toLowerCase()===u.email.toLowerCase());
      if(dbUser?.gifted){
        const giftedCoins=dbUser.giftedCoins||1000;
        setCredito({coins:giftedCoins+(dbUser?.paquetes||0)*COINS_PER_PAGO,paquetes:dbUser?.paquetes||1,paidAt:Date.now(),gifted:true,giftedCoins});
      } else if(dbUser?.paquetes>0){
        setCredito({coins:dbUser.paquetes*COINS_PER_PAGO,paquetes:dbUser.paquetes,paidAt:Date.now()});
      } else {
        // Fallback: leer doc del usuario en Firestore (1 lectura rápida)
        setCreditoLoading(true);
        const checkFirestoreCredit=async(attempts=0)=>{
          const getOneFn=window._fbGetUser;
          if(getOneFn){
            try{
              // Intentar por ID primero
              let fsUser=await getOneFn(u.id);
              // Si no tiene gifted/paquetes, buscar por email en todos los usuarios
              // (cubre el caso donde el ID de Firestore difiere del ID local)
              if(!fsUser?.gifted&&!(fsUser?.paquetes>0)){
                const getAllFn=fbGetAllUsers||window._fbGetAllUsers;
                if(getAllFn){
                  const all=await getAllUsersCached(getAllFn,0); // lectura fresca: evita cache viejo tras un regalo reciente
                  const byEmail=all.find(x=>x.email?.toLowerCase()===u.email?.toLowerCase()&&(x.gifted||(x.paquetes>0)));
                  if(byEmail) fsUser=byEmail;
                }
              }
              if(fsUser?.gifted){
                const gc=fsUser.giftedCoins||1000;
                setCredito({coins:gc+(fsUser?.paquetes||0)*COINS_PER_PAGO,paquetes:fsUser?.paquetes||1,paidAt:Date.now(),gifted:true,giftedCoins:gc});
                const localUsers=await dbLoad();
                await dbSave(localUsers.map(x=>x.id===u.id?{...x,gifted:true,giftedCoins:gc}:x));
              } else if(fsUser?.paquetes>0){
                setCredito({coins:fsUser.paquetes*COINS_PER_PAGO,paquetes:fsUser.paquetes,paidAt:Date.now()});
              }
            }catch(e){console.warn('checkFirestoreCredit error:',e);}
            setCreditoLoading(false);
          } else if(attempts<15){ setTimeout(()=>checkFirestoreCredit(attempts+1),600); }
          else { setCreditoLoading(false); }
        };
        checkFirestoreCredit();
      }
      // Restore betsSaved state (locked predictions)
      try{
        const savedFlag=localStorage.getItem('wc2026_saved_'+u.id);
        if(savedFlag==='true') setBetsSaved(true);
      }catch(e){}
    }catch(e){console.warn('login check error:',e);}
  };
  // Restaurar sesión guardada al cargar la app (evita pantalla de login en recarga)
  useEffect(()=>{
    try{
      const stored=localStorage.getItem('wc2026_current_user');
      if(stored){
        const u=JSON.parse(stored);
        if(u?.id&&u?.email) login(u);
      }
    }catch(e){}
  },[]);
  // Fase 3: enlazar la sesión de Firebase Auth. Firebase persiste la sesión por
  // dispositivo y la restaura al recargar; si al cargar hay usuario de Auth y NO
  // hay sesión activa (ni manual, ni localStorage, ni admin), restauramos el perfil
  // y entramos a la app con el mismo flujo que el login manual (fromAuth:true, id:uid).
  useEffect(()=>{
    let unsub=null, cancelled=false, pollTimer=null;
    const subscribe=()=>{
      const authOnChange=window._fbAuthOnChange;
      if(!authOnChange) return false;
      unsub=authOnChange(async fbUser=>{
        if(cancelled) return;
        // Sin usuario de Firebase, o ya hay sesión activa (manual/localStorage/admin): no hacer nada
        if(!fbUser||userRef.current) return;
        const uid=fbUser.uid;
        const email=(fbUser.email||'').toLowerCase().trim();
        // Cargar el perfil (migra datos legados la primera vez), igual que enterWithUid del login
        let profile=null;
        const migrateFn=window._fbMigrateUser;
        if(migrateFn){ try{ profile=await migrateFn(uid,email); }catch(_){} }
        if(!profile){
          const getFn=window._fbGetUser;
          if(getFn){ try{ profile=await getFn(uid); }catch(_){} }
        }
        // Mientras tanto pudo entrar otra sesión o desmontarse el efecto
        if(cancelled||userRef.current) return;
        if(profile?.deleted||profile?.forceDelete) return; // cuenta desactivada por el admin
        const u={email,fromAuth:true,...(profile||{}),id:uid,isAdmin:false};
        login(u);
      });
      return true;
    };
    if(!subscribe()){
      let elapsed=0;
      pollTimer=setInterval(()=>{
        if(subscribe()){clearInterval(pollTimer);}
        else if((elapsed+=200)>=8000){clearInterval(pollTimer);}
      },200);
    }
    return()=>{cancelled=true;clearInterval(pollTimer);unsub?.();};
  },[]);
  // Re-verifica acceso en Firestore sin necesidad de cerrar sesión
  // Útil cuando el admin regala monedas mientras el usuario ya está en la app
  const recheckAccess=async()=>{
    if(!user?.id) return;
    setCreditoLoading(true);
    try{
      const getFn=window._fbGetUser;
      const getAllFn=fbGetAllUsers||window._fbGetAllUsers;
      let fsUser=null;
      // Intentar por ID
      if(getFn) try{ fsUser=await getFn(user.id); }catch(e){}
      // Si no tiene gifted/paquetes, buscar por email (fallback multi-dispositivo)
      if(!fsUser?.gifted&&!(fsUser?.paquetes>0)&&getAllFn){
        try{
          const all=await getAllUsersCached(getAllFn,0); // lectura fresca
          const byEmail=all.find(x=>x.email?.toLowerCase()===user.email?.toLowerCase()&&(x.gifted||(x.paquetes>0)));
          if(byEmail) fsUser=byEmail;
        }catch(e){}
      }
      if(fsUser?.gifted){
        const gc=fsUser.giftedCoins||1000;
        setCredito({coins:gc+(fsUser?.paquetes||0)*COINS_PER_PAGO,paquetes:fsUser?.paquetes||1,paidAt:Date.now(),gifted:true,giftedCoins:gc});
        const localUsers=await dbLoad();
        await dbSave(localUsers.map(x=>x.id===user.id?{...x,gifted:true,giftedCoins:gc}:x));
      } else if(fsUser?.paquetes>0){
        setCredito({coins:fsUser.paquetes*COINS_PER_PAGO,paquetes:fsUser.paquetes,paidAt:Date.now()});
      }
    }catch(e){console.warn('recheckAccess error:',e);}
    setCreditoLoading(false);
  };
  // Listen for language changes dispatched from Profile screen
  useEffect(()=>{
    const handleLang=e=>{if(TRANSLATIONS[e.detail])setLang(e.detail);};
    window.addEventListener('wc_lang',handleLang);
    return()=>window.removeEventListener('wc_lang',handleLang);
  },[]);

  // Detectar retorno de MercadoPago y verificar pago
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const status=params.get('payment_status');
    const paymentId=params.get('collection_id')||params.get('payment_id');
    if(status==='success'&&paymentId&&paymentId!=='{{payment_id}}'&&user){
      // Guardar en localStorage para botón de recuperación
      try{localStorage.setItem('wc2026_last_payment_id',paymentId);}catch(e){}
      setMpVerify('verifying');
      window.history.replaceState({},''+'/');
      // Reintentar hasta 3 veces con 2s entre intentos
      const verifyWithRetry=async(attempts=1)=>{
        try{
          const r=await fetch('/api/mp/verify',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({paymentId,userId:user.id})
          });
          const data=await r.json();
          console.log('[MP] verify intento',attempts,'respuesta:',data);
          return data;
        }catch(e){
          console.warn('[MP] verify intento',attempts,'error:',e.message);
          if(attempts<3){
            await new Promise(res=>setTimeout(res,2000));
            return verifyWithRetry(attempts+1);
          }
          throw e;
        }
      };
      verifyWithRetry()
        .then(data=>{
          if(data.ok){
            onPagar();
            setTab('pronostico');
            setTimeout(()=>{
              recheckAccess();
              setMpVerify(prev=>({ok:true,paymentId,coins:COINS_PER_PAGO}));
            },1500);
          } else {
            setMpVerify({ok:false,paymentId,error:data.status||'Pago no aprobado'});
          }
        })
        .catch(e=>{setMpVerify({ok:false,paymentId,error:e.message||'Error de red'});});
    } else if(status==='pending'){
      setMpVerify({kind:'pending'});
      window.history.replaceState({},'','/');
    } else if(status==='failure'){
      setMpVerify({kind:'failure'});
      window.history.replaceState({},'','/');
    }
  },[user]);

  const logout=(reason='')=>{
    if(reason && typeof reason === 'string') setLogoutMsg(reason);
    // Cerrar también la sesión de Firebase Auth (no afecta al admin, que no es usuario de Auth)
    const authLogoutFn=window._fbAuthLogout;
    if(authLogoutFn) try{ authLogoutFn(); }catch(_){}
    try{localStorage.removeItem('wc2026_current_user');}catch(e){}
    setUser(null);setScreen('auth');setMatch(null);
    setTab('home');setUserBets([]);setCredito(null);setBetsSaved(false);
  };

  // Suscripción en tiempo real al doc del usuario: expulsión + regalo de monedas
  useEffect(()=>{
    if(!user?.id||!user?.email||user.isAdmin) return;
    let unsub=null;
    let cancelled=false;
    let pollTimer=null;
    const doSubscribe=async()=>{
      const subscribeFn=window._fbSubscribeUser;
      const findFn=window._fbFindUserByEmail;
      if(!subscribeFn){console.warn('[gift-listener] _fbSubscribeUser aún no disponible');return;}
      // Encontrar el ID correcto en Firestore por email (puede diferir del local)
      let targetId=user.id;
      if(user.fromAuth){
        // Usuario de Firebase Auth: su doc definitivo es users/{uid}. El regalo
        // (giftCoinsByEmail) se escribe ahí porque el doc tiene el campo email.
        // Suscribir directo al uid evita engancharse a un doc legado por email.
        console.log('[gift-listener] fromAuth → doc Firestore: users/'+targetId);
      } else if(findFn){
        try{
          const fsUser=await findFn(user.email);
          if(fsUser?.id) targetId=fsUser.id;
          console.log('[gift-listener] email',user.email,'→ doc Firestore:',targetId,'(id local:',user.id+')','| gifted actual:',fsUser?.gifted);
        }catch(e){console.warn('[gift-listener] findUserByEmail error:',e);}
      }
      console.log('[gift-listener] suscrito a users/'+targetId);
      unsub=subscribeFn(targetId,fsUser=>{
        if(cancelled) return;
        console.log('[gift-listener] snapshot:',JSON.stringify({id:targetId,gifted:fsUser?.gifted,giftedCoins:fsUser?.giftedCoins,paquetes:fsUser?.paquetes}));
        // Detectar eliminación
        if(fsUser?.forceDelete||fsUser?.deleted){
          dbLoad().then(allDB=>dbSave(allDB.filter(x=>x.id!==user.id))).catch(()=>{});
          ['wc2026_bets_','wc2026_saved_','wc2026_groups_','wc2026_session_'].forEach(k=>{
            try{localStorage.removeItem(k+user.id);}catch(e){}
          });
          logout('Tu cuenta fue eliminada. Puedes registrarte de nuevo con el mismo correo.');
          return;
        }
        // Detectar regalo de monedas en tiempo real
        if(fsUser?.gifted){
          const gc=Number(fsUser.giftedCoins)||1000; // coerción: el admin puede enviar string
          console.log('[gift-listener] ✓ REGALO detectado, monedas:',gc);
          setCredito(prev=>{
            if(prev?.gifted){console.log('[gift-listener] credito ya era gifted, sin cambio');return prev;}
            const nuevo={coins:gc+(fsUser.paquetes||0)*COINS_PER_PAGO,paquetes:fsUser.paquetes||1,paidAt:Date.now(),gifted:true,giftedCoins:gc};
            console.log('[gift-listener] setCredito →',JSON.stringify(nuevo));
            return nuevo;
          });
          dbLoad().then(localUsers=>{
            dbSave(localUsers.map(x=>x.email?.toLowerCase()===user.email?.toLowerCase()?{...x,gifted:true,giftedCoins:gc}:x));
          });
        } else if(fsUser&&fsUser.gifted===false){
          console.log('[gift-listener] regalo revocado (gifted:false) — el saldo de regalo se actualizará al recargar');
        }
      });
    };
    if(window._fbSubscribeUser){
      doSubscribe();
    } else {
      let elapsed=0;
      pollTimer=setInterval(()=>{
        if(window._fbSubscribeUser){clearInterval(pollTimer);if(!cancelled)doSubscribe();}
        else if((elapsed+=200)>=8000){clearInterval(pollTimer);}
      },200);
    }
    return()=>{cancelled=true;clearInterval(pollTimer);unsub?.();};
  },[user?.id,user?.email]);

  // Session check cada 5 min — usa 1 sola lectura (getUserFromFirestore) en vez de getAllUsers
  useEffect(()=>{
    if(!user||user.isAdmin) return;
    const checkSession=async()=>{
      try{
        const localSession=localStorage.getItem('wc2026_session_'+user.id);
        if(!localSession) return;
        // 1 lectura (doc del usuario) en vez de leer toda la colección
        const getFn=window._fbGetUser;
        if(!getFn) return;
        const fsUser=await getFn(user.id);
        if(fsUser?.sessionId && fsUser.sessionId!==localSession){
          logout('Tu cuenta fue abierta en otro dispositivo. Se cerró esta sesión.');
        }
      }catch(e){/* silent */}
    };
    const id=setInterval(checkSession,5*60*1000); // 5 min (antes 30s)
    return()=>clearInterval(id);
  },[user]);
  const placeBet=bet=>{
    setUserBets(prev=>{
      const next=[...prev.filter(b=>b.id!==bet.id),bet];
      saveBets(user,next); // persist so bets survive logout
      return next;
    });
  };

  // Recuperar monedas de un pago ya aprobado en MP
  const handleMpRecover=async()=>{
    const lastId=localStorage.getItem('wc2026_last_payment_id');
    if(!lastId||!user?.id){alert('No se encontró un pago reciente en este dispositivo.');return;}
    setMpVerify('verifying');
    const verifyWithRetry=async(attempts=1)=>{
      try{
        const r=await fetch('/api/mp/verify',{method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({paymentId:lastId,userId:user.id})});
        return await r.json();
      }catch(e){
        if(attempts<3){await new Promise(res=>setTimeout(res,2000));return verifyWithRetry(attempts+1);}
        throw e;
      }
    };
    verifyWithRetry()
      .then(data=>{
        if(data.ok){
          onPagar();
          setTimeout(()=>{recheckAccess();setMpVerify({ok:true,paymentId:lastId,coins:COINS_PER_PAGO});},1500);
        }else{
          setMpVerify({ok:false,paymentId:lastId,error:data.status||'Pago no aprobado'});
        }
      })
      .catch(e=>{setMpVerify({ok:false,paymentId:lastId,error:e.message||'Error de red'});});
  };

  // Called after successful $20 payment (first time)
  const onPagar=async()=>{
    console.log('[onPagar] iniciando, credito actual:', credito?.paquetes);
    setBetsSaved(false);
    if(user?.id) localStorage.removeItem('wc2026_saved_'+user.id);
    // setCredito funcional evita stale closure si credito cambio entre renders
    let newPaquetes=1;
    setCredito(prev=>{
      newPaquetes=(prev?.paquetes||0)+1;
      console.log('[onPagar] setCredito: prev.paquetes=',prev?.paquetes,'newPaquetes=',newPaquetes);
      return {coins:COINS_PER_PAGO,paquetes:newPaquetes,paidAt:Date.now()};
    });
    if(user&&!user.isAdmin){
      await dbUpdatePaquetes(user.email);
      if(user.fromAuth){
        // Usuario de Firebase Auth: su doc definitivo es users/{uid}. Guardar ahí con
        // saveAuthUserToFirestore para acreditar el pago en el doc correcto y NO crear
        // un doc duplicado u_..._at_... vía el guardado canónico viejo.
        const saveAuthFn=window._fbSaveAuthUser;
        if(saveAuthFn) saveAuthFn(user.id,{...user,paquetes:newPaquetes});
      } else {
        const saveFn=fbSaveUser||window._fbSaveUser;
        if(saveFn&&user.id) saveFn({...user,paquetes:newPaquetes,sessionId:localStorage.getItem('wc2026_session_'+user.id)||''});
      }
      console.log('[onPagar] Firestore sync: paquetes=',newPaquetes);
    }
  };

  // Called after successful $20 payment (reset)
  const onReset=async()=>{
    setUserBets([]);
    setBetsSaved(false);
    if(user?.id) localStorage.removeItem('wc2026_saved_'+user.id);
    setCredito(prev=>({
      coins:COINS_PER_PAGO,
      paquetes:(prev?.paquetes||0)+1,
      paidAt:Date.now()
    }));
    if(user&&!user.isAdmin) await dbUpdatePaquetes(user.email);
  };

  const nav=[
    ['home','🏟️',t('nav_home')],
    ['cal','📅',t('nav_matches')],
    ['tabla','🏅',t('nav_table')],
    ['goles','⚽',t('nav_goals')],
    ['pronostico','TROPHY',t('nav_bets')],
    ['grupos','CROWN',t('nav_groups')],
    ['perfil','👤',t('nav_profile')],
  ];

  return(
    <LangCtx.Provider value={t}>
    <div>
      <style>{css}</style>
      <div className="app">
        {/* Abstract background shapes — Mundial 2026 */}
        <svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:-1}} viewBox="0 0 430 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          {/* Canada red — organic blob top-left */}
          <path d="M 0 0 C 55,-18 190,12 232,82 C 268,138 252,208 194,230 C 138,252 56,222 12,164 C -28,112 -18,48 0,0 Z" fill="#C8102E" opacity="0.18"/>
          <path d="M 192 158 C 224,136 272,152 276,194 C 280,230 248,250 206,238 C 168,226 162,178 192,158 Z" fill="#C8102E" opacity="0.11"/>
          {/* Mexico green — tall brushstroke top-right */}
          <path d="M 430 0 C 414,28 372,65 336,125 C 300,182 312,256 366,278 C 408,295 430,270 430,195 C 430,125 430,52 430,0 Z" fill="#006847" opacity="0.18"/>
          <path d="M 248 192 C 274,168 326,180 330,220 C 334,254 302,270 266,258 C 234,246 228,214 248,192 Z" fill="#006847" opacity="0.11"/>
          {/* USA blue — wave from bottom */}
          <path d="M 0 900 L 0 838 C 48,800 106,782 160,788 C 196,792 234,792 270,788 C 324,782 382,800 430,838 L 430 900 Z" fill="#002868" opacity="0.22"/>
          <path d="M 148 762 C 174,740 254,736 284,758 C 308,776 294,804 256,808 C 218,810 158,802 144,782 C 136,768 142,762 148,762 Z" fill="#002868" opacity="0.14"/>
          {/* Gold destellos — scattered sparkles */}
          <circle cx="64" cy="344" r="5" fill="#F0A500" opacity="0.14"/>
          <circle cx="64" cy="344" r="11" fill="#F0A500" opacity="0.05"/>
          <circle cx="158" cy="296" r="3.5" fill="#F0A500" opacity="0.11"/>
          <circle cx="332" cy="418" r="5" fill="#F0A500" opacity="0.12"/>
          <circle cx="332" cy="418" r="10" fill="#F0A500" opacity="0.05"/>
          <circle cx="272" cy="528" r="3" fill="#F0A500" opacity="0.10"/>
          <circle cx="88" cy="594" r="4.5" fill="#F0A500" opacity="0.11"/>
          <circle cx="385" cy="464" r="3.5" fill="#F0A500" opacity="0.10"/>
          <circle cx="385" cy="464" r="8" fill="#F0A500" opacity="0.04"/>
          <circle cx="214" cy="658" r="2.5" fill="#F0A500" opacity="0.09"/>
          <circle cx="46" cy="720" r="3" fill="#F0A500" opacity="0.08"/>
          <circle cx="394" cy="314" r="3.5" fill="#F0A500" opacity="0.10"/>
          <circle cx="180" cy="726" r="2.5" fill="#F0A500" opacity="0.08"/>
          <circle cx="130" cy="490" r="2" fill="#F0A500" opacity="0.07"/>
          <circle cx="300" cy="640" r="3" fill="#F0A500" opacity="0.09"/>
        </svg>
        {screen==='splash'&&<Splash done={()=>setScreen('auth')}/>}
        {screen==='auth'&&<Auth onLogin={login} onLangChange={setLang} logoutMsg={logoutMsg} onClearMsg={()=>setLogoutMsg('')}/>}
        {screen==='app'&&user&&<>
          {/* ── Pantalla de verificación de pago MP ── */}
          {mpVerify&&(
            <div style={{position:'absolute',inset:0,zIndex:60,background:'var(--bg)',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              gap:18,padding:'32px 24px',textAlign:'center'}}>
              {mpVerify==='verifying'&&(<>
                <div style={{width:48,height:48,border:'4px solid var(--gold)',
                  borderTopColor:'transparent',borderRadius:'50%',
                  animation:'spin .9s linear infinite'}}/>
                <div style={{fontFamily:'var(--ff)',fontSize:22,letterSpacing:2,color:'var(--gold)'}}>
                  VERIFICANDO PAGO
                </div>
                <div style={{fontSize:13,color:'var(--muted)'}}>
                  Consultando con MercadoPago…
                </div>
              </>)}
              {mpVerify?.ok&&(<>
                <div style={{fontSize:52}}>✅</div>
                <div style={{fontFamily:'var(--ff)',fontSize:26,color:'var(--grn)',letterSpacing:1}}>
                  PAGO EXITOSO
                </div>
                <button onClick={()=>setMpVerify(null)}
                  style={{background:'var(--gold)',color:'#000',border:'none',borderRadius:12,
                    padding:'14px 32px',fontFamily:'var(--ff)',fontSize:18,cursor:'pointer'}}>
                  CONTINUAR →
                </button>
              </>)}
              {mpVerify?.ok===false&&(<>
                <div style={{fontSize:52}}>❌</div>
                <div style={{fontFamily:'var(--ff)',fontSize:22,color:'#FC8181',letterSpacing:1}}>
                  ERROR AL VERIFICAR
                </div>
                <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.6,maxWidth:280}}>
                  {mpVerify.error}
                </div>
                <div style={{background:'rgba(255,255,255,.04)',borderRadius:10,
                  padding:'10px 16px',fontSize:11,color:'var(--dim)'}}>
                  ID de operación:<br/>
                  <strong style={{color:'var(--acc)',fontFamily:'monospace',fontSize:13}}>
                    {mpVerify.paymentId}
                  </strong>
                </div>
                <div style={{fontSize:12,color:'var(--muted)'}}>
                  Guarda este ID y usa el botón<br/>
                  <strong>¿No recibiste tus monedas?</strong> en la pantalla de pago.
                </div>
                <button onClick={()=>setMpVerify(null)}
                  style={{background:'rgba(255,255,255,.08)',color:'var(--txt)',border:'1px solid var(--br)',
                    borderRadius:10,padding:'12px 24px',fontSize:14,cursor:'pointer'}}>
                  Cerrar
                </button>
              </>)}
              {mpVerify?.kind==='pending'&&(<>
                <div style={{fontSize:52}}>⏳</div>
                <div style={{fontFamily:'var(--ff)',fontSize:22,color:'var(--gold)',letterSpacing:1}}>
                  PAGO EN PROCESO
                </div>
                <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.6,maxWidth:300}}>
                  Una vez que pagues en OXXO o se confirme tu transferencia, recibirás tus 1,000 monedas automáticamente. Puede tardar hasta 24 horas.
                </div>
                <button onClick={()=>setMpVerify(null)}
                  style={{background:'var(--gold)',color:'#000',border:'none',borderRadius:12,
                    padding:'14px 32px',fontFamily:'var(--ff)',fontSize:18,cursor:'pointer'}}>
                  ENTENDIDO
                </button>
              </>)}
              {mpVerify?.kind==='failure'&&(<>
                <div style={{fontSize:52}}>❌</div>
                <div style={{fontFamily:'var(--ff)',fontSize:22,color:'#FC8181',letterSpacing:1}}>
                  PAGO NO COMPLETADO
                </div>
                <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.6,maxWidth:300}}>
                  El pago no se completó. Puedes intentarlo de nuevo.
                </div>
                <button onClick={()=>setMpVerify(null)}
                  style={{background:'rgba(255,255,255,.08)',color:'var(--txt)',border:'1px solid var(--br)',
                    borderRadius:10,padding:'12px 24px',fontSize:14,cursor:'pointer'}}>
                  Cerrar
                </button>
              </>)}
            </div>
          )}
          {/* Match detail overlay */}
          {match&&(
            <div style={{position:'absolute',inset:0,background:'var(--bg)',zIndex:50,display:'flex',flexDirection:'column'}}>
              <MatchDetail m={match} onBack={()=>setMatch(null)}/>
            </div>
          )}
          {tab==='home'       &&<HomeScreen onMatch={setMatch} onGoToCal={()=>setTab('cal')}/>}
          {tab==='cal'        &&<CalScreen/>}
          {tab==='tabla'      &&<TablaScreen/>}
          {tab==='goles'      &&<GolesScreen/>}
          {tab==='pronostico' &&<BetsScreen bets={userBets} placeBet={placeBet}
                                  credito={credito} creditoLoading={creditoLoading} onPagar={onPagar} onReset={onReset}
                                  betsSaved={betsSaved}
                                  onSave={async()=>{
                                    setBetsSaved(true);
                                    if(user?.id)localStorage.setItem('wc2026_saved_'+user.id,'true');
                                    // Flujo A → subir los pronósticos a TODOS los grupos del usuario
                                    const r=await uploadBetsToAllGroups(user,userBets);
                                    if(r.total>0){
                                      setGroupSyncMsg(r.fail===0
                                        ? `✓ Pronósticos guardados en ${r.ok} grupo${r.ok!==1?'s':''}`
                                        : '⚠ Guardado local OK. Error al sincronizar con grupos.');
                                      setTimeout(()=>setGroupSyncMsg(''),3500);
                                    }
                                  }}
                                  currentUser={user} onRecheckAccess={recheckAccess} onRecover={handleMpRecover}/>}
          {tab==='grupos'     &&<GruposScreen user={user} userBets={userBets} credito={credito} creditoLoading={creditoLoading} onPagar={onPagar} onRecheckAccess={recheckAccess}/>}
          {tab==='perfil'     &&<PerfilScreen user={user} onLogout={logout} lang={lang}/>}
          {/* Bottom nav */}
          <div className="bnav">
            {nav.map(([id,ic,lb])=>{
              const isPremium=id==='pronostico'||id==='grupos';
              const isActive=tab===id;
              const svgIcon=id==='pronostico'?(
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M8 21h8M12 17v4M5 3H3v3c0 2.21 1.79 4 4 4M19 3h2v3c0 2.21-1.79 4-4 4"
                    stroke={isActive?'#F0A500':'#C48F00'} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 17c-3.87 0-7-3.13-7-7V3h14v7c0 3.87-3.13 7-7 7z"
                    fill={isActive?'rgba(240,165,0,.25)':'rgba(196,143,0,.12)'}
                    stroke={isActive?'#F0A500':'#C48F00'} strokeWidth="2"/>
                  <circle cx="12" cy="8" r="2" fill={isActive?'#F0A500':'#C48F00'}/>
                </svg>
              ):(
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 18h18M5 18L3 8l4.5 4L12 4l4.5 8L21 8l-2 10H5z"
                    fill={isActive?'rgba(240,165,0,.25)':'rgba(196,143,0,.12)'}
                    stroke={isActive?'#F0A500':'#C48F00'} strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="4" r="1.5" fill={isActive?'#F0A500':'#C48F00'}/>
                  <circle cx="3" cy="8" r="1.5" fill={isActive?'#F0A500':'#C48F00'}/>
                  <circle cx="21" cy="8" r="1.5" fill={isActive?'#F0A500':'#C48F00'}/>
                </svg>
              );
              return(
                <div key={id} onClick={()=>setTab(id)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',
                    justifyContent:'center',flex:1,cursor:'pointer',gap:2,
                    position:'relative',paddingTop:isPremium?2:0}}>
                  {isPremium&&(
                    <div style={{position:'absolute',top:-1,left:'50%',transform:'translateX(-50%)',
                      background:credito?'linear-gradient(90deg,#F0A500,#C88500)':'rgba(100,100,100,.8)',
                      borderRadius:'0 0 8px 8px',padding:'1px 10px',
                      fontSize:8,fontWeight:800,letterSpacing:.5,color:credito?'#000':'#fff',
                      boxShadow:credito?'0 2px 8px rgba(240,165,0,.4)':'none'}}>
                      {credito?'VIP':'🔒'}
                    </div>
                  )}
                  <div style={{
                    display:'flex',alignItems:'center',justifyContent:'center',
                    width:isPremium?38:28, height:isPremium?38:28,
                    borderRadius:isPremium?12:8,
                    background:isPremium
                      ?(isActive?'rgba(240,165,0,.18)':'rgba(196,143,0,.08)')
                      :'transparent',
                    border:isPremium
                      ?`1.5px solid ${isActive?'rgba(240,165,0,.6)':'rgba(196,143,0,.3)'}`
                      :'none',
                    transition:'all .2s',
                    boxShadow:isPremium&&isActive?'0 0 12px rgba(240,165,0,.35)':'none',
                  }}>
                    {isPremium ? svgIcon
                      : <div style={{fontSize:18,filter:isActive?'none':'grayscale(.3)'}}>{ic}</div>}
                  </div>
                  <div style={{
                    fontSize:9,
                    fontWeight:isPremium?800:600,
                    color:isPremium?(isActive?'#F0A500':'#A07830'):(isActive?'var(--gold)':'var(--muted)'),
                    letterSpacing:isPremium?.5:0,
                    marginTop:1,
                  }}>{lb}</div>
                </div>
              );
            })}
          </div>
          {groupSyncMsg&&(
            <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',
              bottom:96,zIndex:80,maxWidth:'90%',
              background:'var(--surf2)',color:'var(--txt)',
              border:'1px solid var(--br)',borderRadius:12,
              padding:'10px 16px',fontSize:13,fontWeight:700,
              boxShadow:'0 6px 20px rgba(0,0,0,.4)',textAlign:'center'}}>
              {groupSyncMsg}
            </div>
          )}
        </>}
      </div>
    </div>
    </LangCtx.Provider>
  );
}
