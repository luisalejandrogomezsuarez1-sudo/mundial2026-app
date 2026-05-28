import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ── Firebase ACTIVO ─────────────────────────────────────────────
let fbSendMsg = null, fbSubscribeChat = null, fbSaveUser = null, fbGetAllUsers = null, fbGiftCoins = null, fbSaveGroup = null, fbGetGroupByCode = null;
const FB_ACTIVE = true;

import('./firebase.js').then(fb => {
  fbSendMsg       = fb.sendChatMessage;
  fbSubscribeChat = fb.subscribeToChatMessages;
  fbSaveUser      = fb.saveUserToFirestore;
  fbGetAllUsers   = fb.getAllUsersFromFirestore;
  fbGiftCoins      = fb.giftCoinsInFirestore;
  fbSaveGroup      = fb.saveGroupToFirestore;
  fbGetGroupByCode = fb.getGroupByCode;
  // Expose globally
  window._fbGetAllUsers    = fb.getAllUsersFromFirestore;
  window._fbSaveUser       = fb.saveUserToFirestore;
  window._fbSaveGroup      = fb.saveGroupToFirestore;
  window._fbGetGroupByCode = fb.getGroupByCode;
  window._fbSendMsg        = fb.sendChatMessage;
  window._fbSubscribeChat  = fb.subscribeToChatMessages;
  window._fbReady          = true; // Firebase fully loaded
  console.log('🔥 Firebase conectado — mundial2026-15686');
}).catch(e => console.warn('Firebase error:', e));


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
    google_login:'Continuar con Google',language:'Idioma',
    // Home
    live_matches:'Partidos en Vivo',next_matches:'Próximos Partidos',
    see_all:'Ver todos →',countdown_title:'Cuenta Regresiva',
    days:'días',hours:'horas',minutes:'minutos',seconds:'segundos',
    wc_starts:'El Mundial comienza',live_soon:'Los marcadores en vivo aparecerán aquí',
    // Matches
    matches_title:'PARTIDOS',all:'Todos',today:'Hoy',tomorrow:'Mañana',
    venues:'Sedes Oficiales',
    // Table
    table_title:'CLASIFICACIÓN',group_stage:'Fase de grupos',
    top_goals:'Más goles',best_defense:'Mejor defensa',leader:'Líder',
    bracket_title:'LLAVE ELIMINATORIA',auto_flags:'Las banderas aparecen conforme avanza el torneo',
    champion:'CAMPEÓN DEL MUNDO',
    // Goals
    goals_title:'GOLEADORES',golden_boot:'Candidatos a la Bota de Oro',
    // Bets
    bets_title:'MIS PRONÓSTICOS',long_term:'Partidos Mundial',
    per_match:'Por Partido',specials:'Especiales',stats:'Estadísticas',
    world_champion:'Campeón del Mundo',golden_ball:'Balón de Oro',
    buy_package:'Comprar Paquete de Pronósticos',price:'$20 MXN',
    pay_card:'Tarjeta',pay_oxxo:'OXXO',pay_transfer:'Transferencia',
    pay_btn:'Pagar $20 MXN',payment_success:'¡PAGO EXITOSO!',
    coins_added:'monedas añadidas a tu cuenta',
    // Groups
    groups_title:'MIS GRUPOS',create_group:'Crear Grupo',join_group:'Unirse',
    join_code:'Código del grupo',group_name:'Nombre del grupo',
    ranking:'Ranking',predictions:'Pronósticos',members:'Miembros',
    report:'Reporte',chat:'Chat',lock:'Bloquear',
    group_code:'Código',copy:'Copiar',share_group:'Compartir grupo',
    // Profile
    profile_title:'MI PERFIL',share_app:'Compartir la App',
    admin_panel:'PANEL ADMIN',registered:'Registrados',with_package:'Con paquete',
    gift_coins:'Monedas regalo',no_package:'Sin paquete',
    income:'Ingresos',
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
    google_login:'Continue with Google',language:'Language',
    live_matches:'Live Matches',next_matches:'Upcoming Matches',
    see_all:'See all →',countdown_title:'Countdown',
    days:'days',hours:'hours',minutes:'minutes',seconds:'seconds',
    wc_starts:'The World Cup starts',live_soon:'Live scores will appear here',
    matches_title:'MATCHES',all:'All',today:'Today',tomorrow:'Tomorrow',
    venues:'Official Venues',
    table_title:'STANDINGS',group_stage:'Group Stage',
    top_goals:'Top scorer',best_defense:'Best defense',leader:'Leader',
    bracket_title:'KNOCKOUT BRACKET',auto_flags:'Flags update automatically as teams advance',
    champion:'WORLD CHAMPION',
    goals_title:'SCORERS',golden_boot:'Golden Boot Candidates',
    bets_title:'MY PREDICTIONS',long_term:'World Cup Matches',
    per_match:'Per Match',specials:'Specials',stats:'Statistics',
    world_champion:'World Champion',golden_ball:'Golden Ball',
    buy_package:'Buy Predictions Package',price:'$20 MXN',
    pay_card:'Card',pay_oxxo:'OXXO',pay_transfer:'Transfer',
    pay_btn:'Pay $20 MXN',payment_success:'PAYMENT SUCCESSFUL!',
    coins_added:'coins added to your account',
    groups_title:'MY GROUPS',create_group:'Create Group',join_group:'Join',
    join_code:'Group code',group_name:'Group name',
    ranking:'Ranking',predictions:'Predictions',members:'Members',
    report:'Report',chat:'Chat',lock:'Lock',
    group_code:'Code',copy:'Copy',share_group:'Share group',
    profile_title:'MY PROFILE',share_app:'Share the App',
    admin_panel:'ADMIN PANEL',registered:'Registered',with_package:'With package',
    gift_coins:'Gift coins',no_package:'No package',income:'Income',
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
    google_login:'Continuar com Google',language:'Idioma',
    live_matches:'Jogos ao Vivo',next_matches:'Próximos Jogos',
    see_all:'Ver todos →',countdown_title:'Contagem Regressiva',
    days:'dias',hours:'horas',minutes:'minutos',seconds:'segundos',
    wc_starts:'A Copa começa',live_soon:'Os placares ao vivo aparecerão aqui',
    matches_title:'JOGOS',all:'Todos',today:'Hoje',tomorrow:'Amanhã',
    venues:'Estádios Oficiais',
    table_title:'CLASSIFICAÇÃO',group_stage:'Fase de grupos',
    top_goals:'Mais gols',best_defense:'Melhor defesa',leader:'Líder',
    bracket_title:'CHAVES ELIMINATÓRIAS',auto_flags:'As bandeiras aparecem conforme o torneio avança',
    champion:'CAMPEÃO MUNDIAL',
    goals_title:'ARTILHEIROS',golden_boot:'Candidatos à Chuteira de Ouro',
    bets_title:'MEUS PALPITES',long_term:'Jogos da Copa',
    per_match:'Por Jogo',specials:'Especiais',stats:'Estatísticas',
    world_champion:'Campeão Mundial',golden_ball:'Bola de Ouro',
    buy_package:'Comprar Pacote de Palpites',price:'$20 MXN',
    pay_card:'Cartão',pay_oxxo:'OXXO',pay_transfer:'Transferência',
    pay_btn:'Pagar $20 MXN',payment_success:'PAGAMENTO REALIZADO!',
    coins_added:'moedas adicionadas à sua conta',
    groups_title:'MEUS GRUPOS',create_group:'Criar Grupo',join_group:'Entrar',
    join_code:'Código do grupo',group_name:'Nome do grupo',
    ranking:'Classificação',predictions:'Palpites',members:'Membros',
    report:'Relatório',chat:'Chat',lock:'Bloquear',
    group_code:'Código',copy:'Copiar',share_group:'Compartilhar grupo',
    profile_title:'MEU PERFIL',share_app:'Compartilhar o App',
    admin_panel:'PAINEL ADMIN',registered:'Cadastrados',with_package:'Com pacote',
    gift_coins:'Moedas presente',no_package:'Sem pacote',income:'Receita',
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
    google_login:'使用Google继续',language:'语言',
    live_matches:'直播赛事',next_matches:'即将开始',
    see_all:'查看全部 →',countdown_title:'倒计时',
    days:'天',hours:'小时',minutes:'分钟',seconds:'秒',
    wc_starts:'世界杯开幕',live_soon:'实时比分将显示在这里',
    matches_title:'赛程',all:'全部',today:'今天',tomorrow:'明天',
    venues:'官方球场',
    table_title:'积分榜',group_stage:'小组赛阶段',
    top_goals:'进球最多',best_defense:'最佳防守',leader:'榜首',
    bracket_title:'淘汰赛对阵',auto_flags:'随着赛事推进自动显示国旗',
    champion:'世界冠军',
    goals_title:'射手榜',golden_boot:'金靴奖候选人',
    bets_title:'我的预测',long_term:'世界杯赛事',
    per_match:'按场次',specials:'特别预测',stats:'统计',
    world_champion:'世界冠军',golden_ball:'金球奖',
    buy_package:'购买预测套餐',price:'$20 MXN',
    pay_card:'银行卡',pay_oxxo:'OXXO',pay_transfer:'转账',
    pay_btn:'支付 $20 MXN',payment_success:'支付成功！',
    coins_added:'金币已添加到您的账户',
    groups_title:'我的小组',create_group:'创建小组',join_group:'加入',
    join_code:'小组代码',group_name:'小组名称',
    ranking:'排名',predictions:'预测',members:'成员',
    report:'报告',chat:'聊天',lock:'锁定',
    group_code:'代码',copy:'复制',share_group:'分享小组',
    profile_title:'我的档案',share_app:'分享应用',
    admin_panel:'管理面板',registered:'已注册',with_package:'有套餐',
    gift_coins:'赠送金币',no_package:'无套餐',income:'收入',
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
    google_login:'Google로 계속하기',language:'언어',
    live_matches:'실시간 경기',next_matches:'예정 경기',
    see_all:'전체 보기 →',countdown_title:'카운트다운',
    days:'일',hours:'시간',minutes:'분',seconds:'초',
    wc_starts:'월드컵 시작',live_soon:'실시간 점수가 여기에 표시됩니다',
    matches_title:'경기',all:'전체',today:'오늘',tomorrow:'내일',
    venues:'공식 경기장',
    table_title:'순위표',group_stage:'조별 리그',
    top_goals:'최다 득점',best_defense:'최고 수비',leader:'선두',
    bracket_title:'토너먼트 대진표',auto_flags:'경기 진행에 따라 국기가 자동으로 표시됩니다',
    champion:'월드컵 우승팀',
    goals_title:'득점왕',golden_boot:'골든 부트 후보',
    bets_title:'내 예측',long_term:'월드컵 경기',
    per_match:'경기별',specials:'특별 예측',stats:'통계',
    world_champion:'월드 챔피언',golden_ball:'골든 볼',
    buy_package:'예측 패키지 구매',price:'$20 MXN',
    pay_card:'카드',pay_oxxo:'OXXO',pay_transfer:'이체',
    pay_btn:'$20 MXN 결제',payment_success:'결제 완료!',
    coins_added:'코인이 계정에 추가되었습니다',
    groups_title:'내 그룹',create_group:'그룹 만들기',join_group:'참가',
    join_code:'그룹 코드',group_name:'그룹 이름',
    ranking:'순위',predictions:'예측',members:'멤버',
    report:'보고서',chat:'채팅',lock:'잠금',
    group_code:'코드',copy:'복사',share_group:'그룹 공유',
    profile_title:'내 프로필',share_app:'앱 공유',
    admin_panel:'관리자 패널',registered:'등록됨',with_package:'패키지 보유',
    gift_coins:'코인 선물',no_package:'패키지 없음',income:'수입',
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
    google_login:'Continuer avec Google',language:'Langue',
    live_matches:'Matchs en Direct',next_matches:'Prochains Matchs',
    see_all:'Voir tout →',countdown_title:'Compte à Rebours',
    days:'jours',hours:'heures',minutes:'minutes',seconds:'secondes',
    wc_starts:'La Coupe du Monde commence',live_soon:'Les scores en direct apparaîtront ici',
    matches_title:'MATCHS',all:'Tous',today:"Aujourd'hui",tomorrow:'Demain',
    venues:'Stades Officiels',
    table_title:'CLASSEMENT',group_stage:'Phase de groupes',
    top_goals:'Meilleur buteur',best_defense:'Meilleure défense',leader:'Leader',
    bracket_title:'TABLEAU ÉLIMINATOIRE',auto_flags:'Les drapeaux se mettent à jour automatiquement',
    champion:'CHAMPION DU MONDE',
    goals_title:'BUTEURS',golden_boot:"Candidats au Soulier d'Or",
    bets_title:'MES PRONOSTICS',long_term:'Matchs Coupe du Monde',
    per_match:'Par Match',specials:'Spéciaux',stats:'Statistiques',
    world_champion:'Champion du Monde',golden_ball:"Ballon d'Or",
    buy_package:'Acheter un Pack de Pronostics',price:'$20 MXN',
    pay_card:'Carte',pay_oxxo:'OXXO',pay_transfer:'Virement',
    pay_btn:'Payer $20 MXN',payment_success:'PAIEMENT RÉUSSI!',
    coins_added:'pièces ajoutées à votre compte',
    groups_title:'MES GROUPES',create_group:'Créer un Groupe',join_group:'Rejoindre',
    join_code:'Code du groupe',group_name:'Nom du groupe',
    ranking:'Classement',predictions:'Pronostics',members:'Membres',
    report:'Rapport',chat:'Chat',lock:'Verrouiller',
    group_code:'Code',copy:'Copier',share_group:'Partager le groupe',
    profile_title:'MON PROFIL',share_app:"Partager l'App",
    admin_panel:'PANNEAU ADMIN',registered:'Inscrits',with_package:'Avec forfait',
    gift_coins:'Pièces offertes',no_package:'Sans forfait',income:'Revenus',
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
};

const LANG_FLAGS={'es':'🇪🇸','en':'🇺🇸','pt':'🇧🇷','fr':'🇫🇷','zh':'🇨🇳','ko':'🇰🇷'};
const LANG_NAMES={'es':'Español','en':'English','pt':'Português','fr':'Français','zh':'中文','ko':'한국어'};

// React Context for language
const LangCtx=createContext((k)=>TRANSLATIONS.es[k]||k);
const useLang=()=>useContext(LangCtx);

// ═══════════════════════════════════════════════════════
// 🔑 API-FOOTBALL CONFIG — Reemplaza con tu API Key
// Consigue tu key gratis en: https://www.api-football.com
// Plan gratuito: 100 peticiones/día (suficiente para pruebas)
// ═══════════════════════════════════════════════════════
const AF_KEY    = '4469df9c23e73da2c728be5b093c2464'; // API-Football key
const AF_BASE   = 'https://v3.football.api-sports.io';
const WC_ID     = 1;                              // FIFA World Cup league ID
const WC_SEASON = 2026;
const AF_ON     = AF_KEY !== 'TU_API_KEY_AQUI';  // Se activa solo cuando pones la key
const AF_HDR    = {'x-apisports-key': AF_KEY, 'Content-Type': 'application/json'};

// ── API fetch helper ─────────────────────────────────
const afFetch = async (endpoint) => {
  if (!AF_ON) return null;
  try {
    const r = await fetch(`${AF_BASE}${endpoint}`, {headers: AF_HDR});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return d.response || null;
  } catch(e) { console.warn('API-Football error:', e); return null; }
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
  --bg:#020B1A;--surf:#081525;--surf2:#0E1E35;--surf3:#162845;
  --gold:#F6C90E;--gold2:#D4A800;--acc:#4F8EF7;
  --grn:#1EC66C;--red:#E53E3E;--ylw:#FFCC00;
  --txt:#F0F4FF;--muted:#6B82AF;--dim:#8A9BC9;
  --br:rgba(255,255,255,0.07);--r:16px;
  --ff:'Bebas Neue',sans-serif;--fb:'DM Sans',sans-serif;
  --shadow:0 4px 24px rgba(0,0,0,.5);
  --glow:0 0 24px rgba(246,201,14,.18);
}
body{font-family:var(--fb);background:var(--bg);color:var(--txt);height:100%;overflow:hidden;}
.app{max-width:430px;margin:0 auto;height:100vh;overflow:hidden;display:flex;flex-direction:column;position:relative;background:var(--bg);}
.scr{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:84px;}
.scr::-webkit-scrollbar{display:none;}
.bnav{position:absolute;bottom:0;left:0;right:0;height:76px;
  background:rgba(6,14,28,0.97);border-top:1px solid rgba(246,201,14,0.12);
  display:flex;align-items:center;justify-content:space-around;
  padding:0 4px 6px;z-index:100;backdrop-filter:blur(28px);
  box-shadow:0 -6px 24px rgba(0,0,0,.4);}
.nitem{display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:6px 2px;border-radius:12px;cursor:pointer;transition:all .25s;flex:1;}
.nitem.on{background:rgba(246,201,14,0.08);}
.nicon{font-size:20px;transition:transform .25s;}
.nitem.on .nicon{transform:scale(1.12);}
.nlbl{font-size:9px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:var(--muted);}
.nitem.on .nlbl{color:var(--gold);}
.live{display:inline-flex;align-items:center;gap:5px;
  background:linear-gradient(135deg,#E53E3E,#B02020);color:#fff;
  font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;
  letter-spacing:1.5px;text-transform:uppercase;
  box-shadow:0 2px 12px rgba(229,62,62,.45);}
.ldot{width:6px;height:6px;background:#fff;border-radius:50%;animation:blink 1s infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:.2;}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes fin{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slidein{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes popbadge{0%{transform:scale(0)}80%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}
@keyframes pulse{0%,100%{box-shadow:var(--glow)}50%{box-shadow:0 0 32px rgba(246,201,14,.3)}}
.fin{animation:fin .35s ease forwards;}
.inp{width:100%;background:var(--surf2);border:1.5px solid var(--br);
  border-radius:12px;padding:14px 16px;color:var(--txt);font-family:var(--fb);
  font-size:15px;outline:none;transition:border-color .2s,box-shadow .2s;}
.inp:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(246,201,14,.1);}
.inp::placeholder{color:var(--muted);}
.btn{width:100%;background:linear-gradient(135deg,#F6C90E,#D4A800);
  color:#000;border:none;border-radius:14px;padding:15px;
  font-family:var(--ff);font-size:20px;letter-spacing:1px;cursor:pointer;
  transition:all .18s;font-weight:400;
  box-shadow:0 4px 18px rgba(246,201,14,.35);}
.btn:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 6px 24px rgba(246,201,14,.45);}
.btn:active{transform:scale(.98) translateY(0);}
.btng{width:100%;background:var(--surf2);color:var(--txt);border:1.5px solid var(--br);border-radius:12px;padding:14px;font-family:var(--fb);font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .2s;}
.btng:hover{border-color:var(--gold);background:var(--surf3);}
.tpill{flex-shrink:0;padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;background:var(--surf2);color:var(--muted);border:1.5px solid transparent;transition:all .2s;font-family:var(--fb);}
.tpill.on{background:rgba(246,201,14,.12);color:var(--gold);border-color:rgba(246,201,14,.4);}
.mc{margin:0 16px 12px;background:var(--surf);border-radius:var(--r);border:1px solid var(--br);overflow:hidden;cursor:pointer;transition:transform .15s,border-color .2s,box-shadow .2s;}
.mc:hover{transform:scale(1.015);border-color:rgba(246,201,14,.3);box-shadow:0 4px 24px rgba(0,0,0,.3);}
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
  'Panamá':'#DA121A','Portugal':'#006600','Noruega':'#EF2B2D',
};

const LIVE_MATCHES=[];
// Live match data will be populated by sports API (SportRadar / API-Football)
// when the World Cup begins on June 11, 2026.
const NEXT_MATCHES=[
  // ══════════════════════════════════════════════════════════════
  // CALENDARIO OFICIAL CONFIRMADO — Copa Mundial FIFA 2026
  // Sorteo oficial — horarios en hora CDMX (UTC-6)
  // ══════════════════════════════════════════════════════════════

  // ── 11 de junio ───────────────────────────────────────────────
  {id:1,  home:'México',           away:'Sudáfrica',        isoDate:'2026-06-11',date:'Jun 11',time:'13:00',phase:'Grupo A · J1 · P1',  venue:'Estadio Azteca',         city:'Tlalpan, CDMX',       wx:{ic:'⛅',desc:'Parcialmente nublado',t:'18°C'},odds:[1.8,3.5,4.5]},
  {id:2,  home:'Corea del Sur',    away:'República Checa',  isoDate:'2026-06-11',date:'Jun 11',time:'16:00',phase:'Grupo A · J1 · P2',  venue:'Estadio Akron',          city:'Zapopan, Jalisco',    wx:{ic:'☀️',desc:'Soleado',t:'28°C'},            odds:[2.2,3.1,3.0]},

  // ── 12 de junio ───────────────────────────────────────────────
  {id:3,  home:'Canadá',           away:'Bosnia y Herzegovina',isoDate:'2026-06-12',date:'Jun 12',time:'16:00',phase:'Grupo B · J1 · P3',venue:'BMO Field',             city:'Toronto, Ontario',    wx:{ic:'🌤️',desc:'Agradable',t:'22°C'},         odds:[1.9,3.4,4.0]},
  {id:4,  home:'USA',              away:'Paraguay',         isoDate:'2026-06-12',date:'Jun 12',time:'19:00',phase:'Grupo D · J1 · P4',  venue:'SoFi Stadium',           city:'Inglewood, California',wx:{ic:'☀️',desc:'Soleado',t:'27°C'},           odds:[1.7,3.5,4.8]},

  // ── 13 de junio ───────────────────────────────────────────────
  {id:5,  home:'Haití',            away:'Escocia',          isoDate:'2026-06-13',date:'Jun 13',time:'11:00',phase:'Grupo C · J1 · P5',  venue:'Gillette Stadium',       city:'Foxborough, MA',      wx:{ic:'🌥️',desc:'Nublado',t:'19°C'},           odds:[4.0,3.2,1.9]},
  {id:6,  home:'Australia',        away:'Turquía',          isoDate:'2026-06-13',date:'Jun 13',time:'14:00',phase:'Grupo D · J1 · P6',  venue:'BC Place',               city:'Vancouver, BC',       wx:{ic:'🌧️',desc:'Lluvia ligera',t:'16°C'},      odds:[2.0,3.3,3.5]},
  {id:7,  home:'Brasil',           away:'Marruecos',        isoDate:'2026-06-13',date:'Jun 13',time:'17:00',phase:'Grupo C · J1 · P7',  venue:'MetLife Stadium',        city:'East Rutherford, NJ', wx:{ic:'🌤️',desc:'Mayormente soleado',t:'23°C'}, odds:[1.4,4.0,7.5]},
  {id:8,  home:'Qatar',            away:'Suiza',            isoDate:'2026-06-13',date:'Jun 13',time:'20:00',phase:'Grupo B · J1 · P8',  venue:'Levi Stadium',           city:'Santa Clara, CA',     wx:{ic:'🌫️',desc:'Neblina costera',t:'16°C'},    odds:[5.0,3.8,1.6]},

  // ── 14 de junio ───────────────────────────────────────────────
  {id:9,  home:'Costa de Marfil',  away:'Ecuador',          isoDate:'2026-06-14',date:'Jun 14',time:'11:00',phase:'Grupo E · J1 · P9',  venue:'Lincoln Financial Field',city:'Filadelfia, PA',      wx:{ic:'🌤️',desc:'Soleado parcial',t:'25°C'},   odds:[2.2,3.1,3.0]},
  {id:10, home:'Alemania',         away:'Curazao',          isoDate:'2026-06-14',date:'Jun 14',time:'14:00',phase:'Grupo E · J1 · P10', venue:'NRG Stadium',            city:'Houston, Texas',      wx:{ic:'☀️',desc:'Caluroso',t:'34°C'},           odds:[1.2,6.0,18.0]},
  {id:11, home:'Países Bajos',     away:'Japón',            isoDate:'2026-06-14',date:'Jun 14',time:'17:00',phase:'Grupo F · J1 · P11', venue:'AT&T Stadium',           city:'Arlington, Texas',    wx:{ic:'☀️',desc:'Despejado',t:'31°C'},          odds:[1.6,3.8,5.5]},
  {id:12, home:'Suecia',           away:'Túnez',            isoDate:'2026-06-14',date:'Jun 14',time:'20:00',phase:'Grupo F · J1 · P12', venue:'Estadio BBVA',           city:'Guadalupe, Monterrey',wx:{ic:'⛅',desc:'Caluroso',t:'32°C'},           odds:[2.0,3.2,3.5]},

  // ── 15 de junio ───────────────────────────────────────────────
  {id:13, home:'Arabia Saudita',   away:'Uruguay',          isoDate:'2026-06-15',date:'Jun 15',time:'11:00',phase:'Grupo H · J1 · P13', venue:'Hard Rock Stadium',      city:'Miami Gardens, FL',   wx:{ic:'⛈️',desc:'Tormenta',t:'30°C'},           odds:[4.5,3.4,1.8]},
  {id:14, home:'España',           away:'Cabo Verde',       isoDate:'2026-06-15',date:'Jun 15',time:'14:00',phase:'Grupo H · J1 · P14', venue:'Mercedes-Benz Stadium',  city:'Atlanta, Georgia',    wx:{ic:'🌤️',desc:'Caluroso',t:'31°C'},          odds:[1.2,6.5,20.0]},
  {id:15, home:'Irán',             away:'Nueva Zelanda',    isoDate:'2026-06-15',date:'Jun 15',time:'17:00',phase:'Grupo G · J1 · P15', venue:'SoFi Stadium',           city:'Inglewood, CA',       wx:{ic:'☀️',desc:'Soleado',t:'27°C'},            odds:[1.8,3.2,4.0]},
  {id:16, home:'Bélgica',          away:'Egipto',           isoDate:'2026-06-15',date:'Jun 15',time:'20:00',phase:'Grupo G · J1 · P16', venue:'Lumen Field',            city:'Seattle, WA',         wx:{ic:'🌧️',desc:'Lluvia',t:'16°C'},             odds:[1.5,3.8,6.5]},

  // ── 16 de junio ───────────────────────────────────────────────
  {id:17, home:'Francia',          away:'Senegal',          isoDate:'2026-06-16',date:'Jun 16',time:'13:00',phase:'Grupo I · J1 · P17', venue:'MetLife Stadium',        city:'East Rutherford, NJ', wx:{ic:'🌤️',desc:'Agradable',t:'23°C'},         odds:[1.5,3.8,6.5]},
  {id:18, home:'Irak',             away:'Noruega',          isoDate:'2026-06-16',date:'Jun 16',time:'17:00',phase:'Grupo I · J1 · P18', venue:'Gillette Stadium',       city:'Foxborough, MA',      wx:{ic:'⛅',desc:'Nublado',t:'20°C'},            odds:[7.0,4.0,1.4]},

  // ── 17 de junio ───────────────────────────────────────────────
  {id:19, home:'Argentina',        away:'Argelia',          isoDate:'2026-06-17',date:'Jun 17',time:'11:00',phase:'Grupo J · J1 · P19', venue:'Arrowhead Stadium',      city:'Kansas City, MO',     wx:{ic:'⛅',desc:'Parcialmente nublado',t:'27°C'},odds:[1.3,5.5,12.0]},
  {id:20, home:'Austria',          away:'Jordania',         isoDate:'2026-06-17',date:'Jun 17',time:'11:00',phase:'Grupo J · J1 · P20', venue:'Levi Stadium',           city:'Santa Clara, CA',     wx:{ic:'🌫️',desc:'Neblina costera',t:'15°C'},   odds:[1.5,3.8,6.0]},
  {id:21, home:'Portugal',         away:'Congo DR',         isoDate:'2026-06-17',date:'Jun 17',time:'13:00',phase:'Grupo K · J1 · P23', venue:'NRG Stadium',            city:'Houston, Texas',      wx:{ic:'☀️',desc:'Caluroso',t:'35°C'},           odds:[1.2,6.0,20.0]},
  {id:22, home:'Inglaterra',       away:'Croacia',          isoDate:'2026-06-17',date:'Jun 17',time:'15:00',phase:'Grupo L · J1 · P22', venue:'AT&T Stadium',           city:'Arlington, Texas',    wx:{ic:'☀️',desc:'Muy caluroso',t:'33°C'},       odds:[1.6,3.6,5.5]},
  {id:23, home:'Ghana',            away:'Panamá',           isoDate:'2026-06-17',date:'Jun 17',time:'16:00',phase:'Grupo L · J1 · P21', venue:'BMO Field',              city:'Toronto, Ontario',    wx:{ic:'🌤️',desc:'Agradable',t:'20°C'},         odds:[2.2,3.2,3.0]},
  {id:24, home:'Colombia',         away:'Uzbekistán',       isoDate:'2026-06-17',date:'Jun 17',time:'19:00',phase:'Grupo K · J1 · P24', venue:'Estadio Azteca',         city:'Tlalpan, CDMX',       wx:{ic:'⛅',desc:'Nublado',t:'19°C'},            odds:[1.4,4.0,7.5]},
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
  {n:'MetLife Stadium',         c:'East Rutherford, NJ',   cap:'82,500',f:'🇺🇸',phase:'Final',       wk:'MetLife_Stadium'},
  {n:'AT&T Stadium',            c:'Arlington, Texas',      cap:'94,000',f:'🇺🇸',phase:'Semifinal',   wk:'AT&T_Stadium'},
  {n:'Mercedes-Benz Stadium',   c:'Atlanta, Georgia',      cap:'75,000',f:'🇺🇸',phase:'Semifinal',   wk:'Mercedes-Benz_Stadium'},
  {n:'SoFi Stadium',            c:'Inglewood, California', cap:'70,000',f:'🇺🇸',phase:'Cuartos',     wk:'SoFi_Stadium'},
  {n:'NRG Stadium',             c:'Houston, Texas',        cap:'72,220',f:'🇺🇸',phase:'Cuartos',     wk:'NRG_Stadium'},
  {n:'Hard Rock Stadium',       c:'Miami Gardens, Florida',cap:'65,000',f:'🇺🇸',phase:'3er Lugar',   wk:'Hard_Rock_Stadium'},
  {n:'Arrowhead Stadium',       c:'Kansas City, Missouri', cap:'73,000',f:'🇺🇸',phase:'Cuartos',     wk:'Arrowhead_Stadium'},
  {n:'Lincoln Financial Field', c:'Filadelfia, PA',        cap:'69,000',f:'🇺🇸',phase:'Octavos',     wk:'Lincoln_Financial_Field'},
  {n:'Gillette Stadium',        c:'Foxborough, MA',        cap:'65,000',f:'🇺🇸',phase:'Cuartos',     wk:'Gillette_Stadium'},
  {n:'Lumen Field',             c:'Seattle, Washington',   cap:'69,000',f:'🇺🇸',phase:'Octavos',     wk:'Lumen_Field'},
  {n:'Levi Stadium',            c:'Santa Clara, California',cap:'71,000',f:'🇺🇸',phase:'Octavos',    wk:"Levi_Stadium"},
  // México — 3 sedes (datos oficiales FIFA)
  {n:'Estadio Azteca',          c:'Tlalpan, CDMX',         cap:'83,000',f:'🇲🇽',phase:'Inauguración',wk:'Estadio_Azteca'},
  {n:'Estadio BBVA',            c:'Guadalupe, Monterrey',  cap:'53,500',f:'🇲🇽',phase:'Octavos',     wk:'BBVA_Stadium_(Monterrey)'},
  {n:'Estadio Akron',           c:'Zapopan, Guadalajara',  cap:'48,000',f:'🇲🇽',phase:'Grupos',      wk:'Estadio_Akron'},
  // Canadá — 2 sedes
  {n:'BC Place',                c:'Vancouver, BC',         cap:'54,000',f:'🇨🇦',phase:'Octavos',     wk:'BC_Place'},
  {n:'BMO Field',               c:'Toronto, Ontario',      cap:'45,000',f:'🇨🇦',phase:'Octavos',     wk:'BMO_Field'},
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





// ── Demo Group Members (example group participants) ──────────────────────────
const DEMO_MEMBERS=[
  {id:'m1',name:'Carlos M.',ini:'CM',col:'#4F8EF7',locked:false,lockedAt:null,pts:0,bets:[]},
  {id:'m2',name:'Ana R.',  ini:'AR',col:'#1EC66C',locked:false,lockedAt:null,pts:0,bets:[]},
  {id:'m3',name:'Miguel T.',ini:'MT',col:'#F6C90E',locked:false,lockedAt:null,pts:0,bets:[]},
  {id:'m4',name:'Sofía L.', ini:'SL',col:'#E53E3E',locked:false,lockedAt:null,pts:0,bets:[]},
  {id:'m5',name:'Roberto V.',ini:'RV',col:'#A855F7',locked:false,lockedAt:null,pts:0,bets:[]},
];
// ── Coin System ───────────────────────────────────
const COINS_PER_PAGO=1000; // 1 pago de $20 MXN = 1000 monedas
// Costos EXACTOS: 24 partidos × (4 tipos×6 + 3 especiales×4) + 3 mundiales + 12 grupos×8 = 1000
const COIN_COSTS={campeon:16,'bota-oro':12,'balon-oro':12,
  'goleador-1':32,'goleador-2':32,'goleador-3':32};
const getBetCost=id=>{
  if(COIN_COSTS[id]!==undefined)return COIN_COSTS[id];
  if(id.startsWith('grp-'))return 8;          // 12×8=96
  if(id.endsWith('-exacto'))return 4;          // 24×4=96
  if(id.endsWith('-jugador'))return 4;         // 24×4=96
  if(id.endsWith('-handicap'))return 4;        // 24×4=96
  if(id.endsWith('-1x2'))return 6;             // 24×6=144
  if(id.endsWith('-total')||id.endsWith('-btts')||id.endsWith('-dc'))return 6; // 72×6=432
  return 4;
};
// VERIFICADO: 16+12+12 + 12×8 + 24×4×6 + 24×3×4 = 40+96+576+288 = 1000 EXACTO ✓

// ── Admin & DB Config ─────────────────────────────
const ADMIN_EMAIL='luis.gomezs@yahoo.com.mx';
const ADMIN_PASS='85489705';
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

// Increment paquetes + record payment timestamp in DB
const dbUpdatePaquetes=async email=>{
  try{
    const users=await dbLoad();
    const updated=users.map(u=>
      u.email.toLowerCase()===email.toLowerCase().trim()
        ?{...u,
          paquetes:(u.paquetes||0)+1,
          lastPayment:new Date().toISOString(),
          totalPagado:((u.paquetes||0)+1)*20}
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
      style={{filter:'drop-shadow(0 0 18px rgba(246,201,14,.55))'}}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE97A"/>
          <stop offset="45%" stopColor="#F6C90E"/>
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
const STADIUM_IMGS={'Estadio BBVA':'data:image/jpeg;base64,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'};

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
      background:'radial-gradient(ellipse at 50% 38%,rgba(246,201,14,.09) 0%,transparent 62%)'}}>
      <img src="/icon-512.png" alt="Mundial 2026"
        style={{width:200,height:200,borderRadius:36,
          boxShadow:'0 0 40px rgba(246,201,14,.45), 0 8px 32px rgba(0,0,0,.6)',
          objectFit:'cover',border:'3px solid rgba(246,201,14,.3)'}}/>
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
function Auth({onLogin,onLangChange=()=>{}}){
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

    // ── Admin check ──
    if(email===ADMIN_EMAIL&&pass===ADMIN_PASS){
      setLoading(false);
      onLogin({email:ADMIN_EMAIL,name:'Administrador General',isAdmin:true,
               nat:'México',gen:'Prefiero no decir'});
      return;
    }

    // ── Load DB ──
    const users=await dbLoad();

    if(mode==='reg'){
      // Validate fields
      if(!f.name.trim()||!f.bd||!f.nat.trim()||!f.gen){
        setLoading(false);setErr('Por favor completa todos los campos del registro');return;
      }
      // Check duplicate email
      if(dbFind(users,email)){
        setLoading(false);
        setErr('⚠️ Este correo ya está registrado. Por favor inicia sesión.');
        return;
      }
      // Save new user to DB
      const newUser={
        id:'u_'+Date.now(),
        email,pass,
        name:f.name.trim(),
        bd:f.bd,nat:f.nat.trim(),gen:f.gen,
        lang:f.lang||LANG_BY_NAT[f.nat.trim()]||'es',
        createdAt:new Date().toISOString(),
        paquetes:0,isAdmin:false
      };
      await dbSave([...users,newUser]);
      setLoading(false);
      onLogin(newUser);

    }else{
      // Login: find user
      const found=dbFind(users,email);
      if(!found||found.pass!==pass){
        setLoading(false);
        setErr('Correo o contraseña incorrectos');
        return;
      }
      setLoading(false);
      onLogin(found);
    }
  };

  const googleLogin=async()=>{
    setLoading(true);
    // Prompt for name since we don't have real Google OAuth yet
    const name = prompt('¿Cuál es tu nombre completo?','');
    if(!name?.trim()){setLoading(false);return;}
    const users=await dbLoad();
    // Use a device-unique ID based on timestamp
    const gId='u_g_'+Date.now();
    const gEmail=`google_${gId}@mundial2026.app`;
    const gUser={
      id:gId,
      email:gEmail,
      name:name.trim(),
      google:true,
      nat:'México',
      gen:'Prefiero no decir',
      createdAt:new Date().toISOString(),
      paquetes:0,
      isAdmin:false
    };
    await dbSave([...users,gUser]);
    setLoading(false);
    onLogin(gUser);
  };

  return(
    <div style={{height:'100%',overflowY:'auto',background:'linear-gradient(160deg,#0D1A2E 0%,#040C1E 100%)'}}>
      <div style={{padding:'40px 24px 18px',textAlign:'center'}}>
        <img src="/icon-512.png" alt="Mundial 2026"
          style={{width:90,height:90,borderRadius:20,objectFit:'cover',
            boxShadow:'0 0 24px rgba(246,201,14,.35)',
            border:'2px solid rgba(246,201,14,.3)'}}/>
        <div style={{fontFamily:'var(--ff)',fontSize:32,letterSpacing:2,color:'var(--gold)',marginTop:10,lineHeight:1}}>MUNDIAL 2026</div>
        <div style={{fontSize:13,color:'var(--muted)',marginTop:6}}>
          {mode==='login'?'Inicia sesión para vivir el Mundial':'Crea tu cuenta · Es gratis'}
        </div>
      </div>

      <div style={{padding:'0 24px 36px',display:'flex',flexDirection:'column',gap:11}}>
        {err&&
          <div style={{background:'rgba(229,62,62,.1)',border:'1px solid rgba(229,62,62,.3)',
            borderRadius:10,padding:'10px 14px',fontSize:13,color:'#FC8181',textAlign:'center'}}>
            ⚠️ {err}
          </div>}

        {mode==='reg'&&
          <input className="inp" placeholder="Nombre completo" value={f.name} onChange={set('name')}/>}
        <input className="inp" placeholder="Correo o usuario" type="text" value={f.email} onChange={set('email')}/>
        <input className="inp" placeholder="Contraseña" type="password" value={f.pass} onChange={set('pass')}/>

        {mode==='reg'&&<>
          <div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:5,paddingLeft:2}}>Fecha de nacimiento</div>
            <input className="inp" type="date" value={f.bd} onChange={set('bd')}
              style={{colorScheme:'dark'}}/>
          </div>
          <input className="inp" placeholder="Nacionalidad (ej. Mexicano/a)" value={f.nat}
            onChange={e=>{
              set('nat')(e);
              // Auto-detect language from nationality
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
          {/* Language selector — appears in registration */}
          {mode==='reg'&&(
            <div>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,paddingLeft:2}}>
                🌐 Idioma de la app / App language
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
            <option value="">Selecciona tu género</option>
            <option>Masculino</option><option>Femenino</option>
            <option>Otro</option><option>Prefiero no decir</option>
          </select>
        </>}

        <button className="btn" onClick={submit} disabled={loading}
          style={{opacity: loading ? 0.7 : 1, display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {loading
            ? <span style={{display:'inline-block',width:18,height:18,border:'2.5px solid #000',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
            : null}
          {mode==='login'?'INICIAR SESIÓN':'CREAR CUENTA'}
        </button>

        <div style={{display:'flex',alignItems:'center',gap:12,margin:'2px 0'}}>
          <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
          <span style={{fontSize:12,color:'var(--muted)'}}>o continúa con</span>
          <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
        </div>

        <button className="btng" onClick={googleLogin} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <div style={{textAlign:'center',marginTop:6}}>
          <span style={{fontSize:14,color:'var(--muted)'}}>
            {mode==='login'?'¿Sin cuenta? ':'¿Ya tienes cuenta? '}
          </span>
          <span style={{fontSize:14,color:'var(--gold)',fontWeight:600,cursor:'pointer'}}
            onClick={()=>{setMode(mode==='login'?'reg':'login');setErr('');}}>
            {mode==='login'?'Regístrate gratis':'Inicia sesión'}
          </span>
        </div>

        {mode==='reg'&&
          <div style={{fontSize:11,color:'var(--muted)',textAlign:'center',lineHeight:1.5,marginTop:4}}>
            Al registrarte aceptas que tus datos se almacenen de forma segura conforme a las políticas de privacidad FIFA 2026. Puedes solicitar su eliminación en cualquier momento.
          </div>}
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
              <div key={p.n} title={p.n} style={{width:8,height:10,background:'#E53E3E',borderRadius:1}}/>))}
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
              <div key={p.n} title={p.n} style={{width:8,height:10,background:'#E53E3E',borderRadius:1}}/>))}
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
      if(!AF_ON||!m.id)return;
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
    red:{ic:'🟥',bg:'rgba(229,62,62,.1)',col:'var(--red)'},
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
            textShadow:'0 0 20px rgba(246,201,14,.3)'}}>{m.hs} - {m.as}</div>
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
                  paddingLeft:12,borderLeft:'3px solid var(--gold)',background:'rgba(246,201,14,.03)',
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
  const FIRST_MATCH=new Date('2026-06-12T00:00:00Z'); // Jun 11 19:00 CDT (UTC-5)
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
      border:'1px solid rgba(246,201,14,.25)',
      background:'linear-gradient(135deg,rgba(246,201,14,.07) 0%,rgba(246,201,14,.02) 100%)'}}>
      <div style={{padding:'12px 14px 10px',textAlign:'center'}}>
        <div style={{fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:1.2,
          textTransform:'uppercase',marginBottom:4}}>
          ⏱️ Cuenta regresiva · Primer partido
        </div>
        <div style={{fontSize:12,color:'var(--dim)',marginBottom:12}}>
          🇲🇽 México · Estadio Azteca · 11 Jun 2026 · 19:00 h
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:8}}>
          {[['DÍAS',t.d],['HRS',t.h],['MIN',t.m],['SEG',t.s]].map(([label,val])=>(
            <div key={label} style={{textAlign:'center',flex:1,maxWidth:70,
              background:'var(--surf)',borderRadius:10,padding:'10px 4px',
              border:'1px solid rgba(246,201,14,.2)'}}>
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
function HomeScreen({onMatch,onGoToCal}){
  const t=useLang();
  const [ref,setRef]=useState(false);
  const [upd,setUpd]=useState(new Date());
  // API-Football live data
  const [liveMatches,setLiveMatches]=useState(LIVE_MATCHES);
  const [apiStatus,setApiStatus]=useState(AF_ON?'connecting':'off');

  // Read live data from Firestore (server updates this, not each user)
  useEffect(()=>{
    if(new Date()<new Date('2026-06-11'))return;
    if(!window._fbDB) return;
    try{
      const {doc,onSnapshot,getFirestore}=window._fbFirestore||{};
      if(!onSnapshot) return;
      const db=getFirestore();
      const unsub=onSnapshot(doc(db,'live','matches'),snap=>{
        if(snap.exists()){
          const d=snap.data();
          if(d.matches) setLiveMatches(d.matches);
          setApiStatus('live');
        }
      });
      return()=>unsub();
    }catch(e){setApiStatus('error');}
  },[]);
  const doRef=useCallback(()=>{
    setRef(true);setTimeout(()=>{setRef(false);setUpd(new Date());},900);
  },[]);
  useEffect(()=>{const t=setInterval(doRef,30000);return()=>clearInterval(t);},[]);

  return(
    <div className="scr fin">
      {/* Top bar */}
      <div style={{background:'linear-gradient(180deg,rgba(246,201,14,.07) 0%,transparent 100%)',
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
                boxShadow:'0 0 10px rgba(246,201,14,.3)'}}/>
            <button onClick={doRef} style={{background:'rgba(246,201,14,.1)',border:'1px solid rgba(246,201,14,.2)',
              color:'var(--gold)',width:34,height:34,borderRadius:9,cursor:'pointer',fontSize:15,
              display:'flex',alignItems:'center',justifyContent:'center',
              animation:ref?'spin .8s linear infinite':'none',transition:'background .2s'}}
              title="Actualizar">🔄</button>
          </div>
        </div>
        {/* Live banner - only shown when WC is active */}
        {new Date()>=new Date('2026-06-11')&&(
          <div style={{display:'flex',gap:8,alignItems:'center',padding:'8px 0',
            borderTop:'1px solid rgba(255,255,255,.04)'}}>
            <span className="live" style={{fontSize:11}}><span className="ldot"/>EN VIVO</span>
            <span style={{fontSize:12,color:'var(--muted)'}}>
              {liveMatches.length} partido{liveMatches.length!==1?'s':''} en curso
            </span>
            <span style={{marginLeft:'auto',fontSize:11,color:'var(--muted)'}}>
              🔄 Auto-refresh 30s
            </span>
          </div>
        )}
      </div>

      {/* ── COUNTDOWN when WC hasn't started ── */}
      {new Date()<new Date('2026-06-11')&&<Countdown/>}

      {/* ── LIVE matches (only when WC is active) ── */}
      {new Date()>=new Date('2026-06-11')&&(
        <div>
          <div style={{height:10}}/>
          {liveMatches.map(m=><MatchCard key={m.id} m={m} onClick={()=>onMatch(m)}/>)}
        </div>
      )}

      {/* Countdown message before WC starts */}
      {new Date()<new Date('2026-06-11')&&(
        <div style={{margin:'0 16px 14px',background:'rgba(246,201,14,.04)',
          borderRadius:14,border:'1px dashed rgba(246,201,14,.2)',padding:'14px 16px',
          textAlign:'center'}}>
          <div style={{fontSize:13,color:'var(--gold)',fontWeight:700,marginBottom:4}}>
            ⏳ Los marcadores en vivo aparecerán aquí
          </div>
          <div style={{fontSize:11,color:'var(--dim)',lineHeight:1.7}}>
            El Mundial comienza el <strong style={{color:'var(--txt)'}}>11 de junio de 2026</strong>.
            <br/>Los goles, tarjetas y estadísticas se actualizarán en tiempo real.
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 16px 8px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:22,letterSpacing:1}}>Próximos Partidos</div>
        <span onClick={onGoToCal} style={{fontSize:12,color:'var(--gold)',fontWeight:600,cursor:'pointer'}}>Ver todos →</span>
      </div>
      {NEXT_MATCHES.slice(0,4).map(m=><NextCard key={m.id} m={m}/>)}
    </div>
  );
}

// ── Calendar Screen ──────────────────────────────
function CalScreen(){
  const t=useLang();
  const [fil,setFil]=useState('todos');

  // Build dynamic date tabs from match dates
  const today=new Date();
  today.setHours(0,0,0,0);
  const todayISO=today.toISOString().slice(0,10);
  const tomorrow=new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowISO=tomorrow.toISOString().slice(0,10);
  const nextWeek=new Date(today); nextWeek.setDate(nextWeek.getDate()+7);

  // Get unique dates from all upcoming matches
  const allDates=[...new Set(NEXT_MATCHES.map(m=>m.isoDate))].sort();

  // Filter matches by selected tab
  const filtered=NEXT_MATCHES.filter(m=>{
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
    if(iso===todayISO)return'📅 HOY';
    if(iso===tomorrowISO)return'📅 MAÑANA';
    return'📅 '+new Date(iso+'T00:00:00').toLocaleDateString('es',{day:'numeric',month:'short'}).toUpperCase();
  };

  return(
    <div className="scr fin">
      <div style={{padding:'18px 16px 6px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>CALENDARIO</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>
          Mundial FIFA 2026 · {NEXT_MATCHES.length} partidos programados
        </div>
      </div>

      {/* Filter tabs — solo Todos + fechas reales de partidos */}
      <div style={{display:'flex',gap:8,padding:'4px 16px 10px',overflowX:'auto'}}>
        {[['todos','Todos'],
          ...allDates.map(d=>[d,new Date(d+'T00:00:00').toLocaleDateString('es',{day:'numeric',month:'short'})])
        ].map(([k,l])=>(
          <button key={k} className={`tpill ${fil===k?'on':''}`} onClick={()=>setFil(k)}>{l}</button>
        ))}
      </div>

      {/* Live matches only show during WC period (Jun 11 - Jul 19 2026) */}
      {fil==='todos'&&LIVE_MATCHES.length>0&&new Date()>=new Date('2026-06-11')&&(
        <div>
          <div style={{padding:'4px 16px 7px',fontSize:12,fontWeight:700,
            color:'var(--muted)',letterSpacing:.8,display:'flex',alignItems:'center',gap:6}}>
            <span className="live" style={{fontSize:9}}><span className="ldot"/>EN VIVO</span>
            HOY · PARTIDOS EN CURSO
          </div>
          {LIVE_MATCHES.map(m=>(
            <div key={m.id} style={{margin:'0 16px 10px',background:'var(--surf)',
              borderRadius:'var(--r)',border:'1px solid rgba(229,62,62,.2)',padding:'11px 14px'}}>
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
            {fil==='hoy'?'No hay partidos hoy':
             fil==='manana'?'No hay partidos mañana':
             'No hay partidos en este período'}
          </div>
          <div style={{fontSize:12,lineHeight:1.6}}>
            El Mundial FIFA 2026 comienza el <strong style={{color:'var(--gold)'}}>11 de junio de 2026</strong><br/>
            📍 Apertura: Estadio Azteca · Ciudad de México
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
              v.phase==='Final'?'rgba(246,201,14,.15)':
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
  const hasTeams = slot?.home||slot?.away;
  const isWon    = !!slot?.winner;
  return(
    <div style={{background:highlight?'rgba(246,201,14,.08)':'var(--surf2)',
      borderRadius:10,border:`1px solid ${highlight?'rgba(246,201,14,.3)':'var(--br)'}`,
      padding:'8px 10px',minWidth:148,flexShrink:0,
      boxShadow:highlight?'0 0 12px rgba(246,201,14,.15)':'none'}}>
      {/* Team home */}
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,
        opacity:isWon&&slot.winner!==slot.home?.name?.slice(0,8)?0.4:1}}>
        <span style={{fontSize:16,lineHeight:1}}>{slot?.homeFl||'🏳️'}</span>
        <span style={{fontSize:11,fontWeight:slot.winner===slot.home?.name?.slice(0,8)?700:500,
          color:slot.winner===slot.home?.name?.slice(0,8)?'var(--gold)':'var(--txt)',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:90}}>
          {slot?.home||<span style={{color:'var(--muted)',fontStyle:'italic'}}>Por definir</span>}
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
          {slot?.away||<span style={{color:'var(--muted)',fontStyle:'italic'}}>Por definir</span>}
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
  if(!bracket) return null;
  const winner = bracket.final?.winner;
  return(
    <div style={{paddingBottom:20}}>
      {winner&&(
        <div style={{margin:'0 16px 16px',background:'linear-gradient(135deg,rgba(246,201,14,.2),rgba(246,201,14,.05))',
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
      <BracketRound title="RONDA DE 16"  slots={bracket.r16||[]}  color='var(--acc)'  icon='⚔️'/>
      <BracketRound title="CUARTOS"      slots={bracket.qf||[]}   color='var(--grn)'  icon='🎯'/>
      <BracketRound title="SEMIFINALES"  slots={bracket.sf||[]}   color='#A855F7'     icon='⭐'/>
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
    r16:[
      mkSlot('2°A vs 2°B',     'Jun 28','Los Ángeles'),
      mkSlot('1°E vs 3°*',     'Jun 29','Boston'),
      mkSlot('1°F vs 2°C',     'Jun 29','Monterrey'),
      mkSlot('1°C vs 3°*',     'Jun 30','?'),
      mkSlot('1°I vs 3°*',     'Jun 30','MetLife'),
      mkSlot('2°E vs 2°I',     'Jun 30','Dallas'),
      mkSlot('1°A vs 3°*',     'Jun 30','Azteca'),
      mkSlot('1°L vs 3°*',     'Jul 1', 'Atlanta'),
      mkSlot('1°D vs 3°*',     'Jul 1', 'San Francisco'),
      mkSlot('1°G vs 3°*',     'Jul 1', 'Seattle'),
      mkSlot('2°K vs 2°L',     'Jul 2', 'Toronto'),
      mkSlot('1°H vs 2°J',     'Jul 2', 'Los Ángeles'),
      mkSlot('1°B vs 3°*',     'Jul 2', 'Vancouver'),
      mkSlot('1°J vs 2°H',     'Jul 3', 'Miami'),
      mkSlot('1°K vs 3°*',     'Jul 3', 'Kansas City'),
      mkSlot('2°D vs 2°G',     'Jul 3', 'Dallas'),
    ],
    qf:[
      mkSlot('G.P74 vs G.P77', 'Jul 4', 'Filadelfia'),
      mkSlot('G.P75 vs G.P76', 'Jul 4', 'Houston'),
      mkSlot('G.P77 vs G.P79', 'Jul 5', 'MetLife'),
      mkSlot('G.P73 vs G.P80', 'Jul 5', 'Azteca'),
      mkSlot('G.P83 vs G.P84', 'Jul 6', 'Dallas'),
      mkSlot('G.P81 vs G.P82', 'Jul 6', 'Seattle'),
      mkSlot('G.P86 vs G.P88', 'Jul 7', 'Atlanta'),
      mkSlot('G.P85 vs G.P87', 'Jul 7', 'Vancouver'),
    ],
    sf:[
      mkSlot('SF1','Jul 14','Dallas'),
      mkSlot('SF2','Jul 15','Atlanta'),
    ],
    tercero: mkSlot('3er Lugar','Jul 18','Miami'),
    final:   mkSlot('🏆 FINAL', 'Jul 19','MetLife Stadium, NJ'),
  });

  // Firestore listener for standings AND bracket
  useEffect(()=>{
    if(!window._fbDB) return;
    try{
      const {doc,onSnapshot,getFirestore}=window._fbFirestore||{};
      if(!onSnapshot) return;
      const db=getFirestore();
      // standings
      const u1=onSnapshot(doc(db,'live','standings'),snap=>{
        if(snap.exists()&&snap.data().groups?.length>0){
          setGroups(snap.data().groups);setApiLoaded(true);
        }
      });
      // bracket updates from server
      const u2=onSnapshot(doc(db,'live','bracket'),snap=>{
        if(snap.exists()&&snap.data().r16) setBracket(snap.data());
      });
      return()=>{u1();u2();};
    }catch(e){console.warn('standings error',e);}
  },[]);

  const grp=groups[gi]||GROUPS[0];
  const sorted=[...grp.teams].sort((a,b)=>
    b.pts!==a.pts?b.pts-a.pts:(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf);
  const hdrs=['PJ','G','E','P','GF','GC','DG','PTS'];
  return(
    <div className="scr fin">
      <div style={{padding:'18px 16px 6px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>CLASIFICACIÓN</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>Fase de grupos · FIFA World Cup 2026</div>
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
            <div style={{flex:1}}>Equipo</div>
            {hdrs.map(h=><div key={h} style={{width:26,textAlign:'center'}}>{h}</div>)}
          </div>
          {sorted.map((t,i)=>{
            const vals=[t.pj,t.g,t.e,t.p,t.gf,t.gc,t.gf-t.gc,t.pts];
            return(
              <div key={t.n} style={{display:'flex',padding:'9px 14px',alignItems:'center',
                borderTop:'1px solid rgba(255,255,255,.05)',
                background:i===0?'rgba(246,201,14,.04)':i===1?'rgba(30,198,108,.03)':'transparent',
                transition:'background .15s'}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:7}}>
                  <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,
                    background:i===0?'var(--gold)':i===1?'rgba(246,201,14,.22)':'rgba(255,255,255,.08)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:10,fontWeight:800,color:i===0?'#000':'#fff'}}>{i+1}</div>
                  <span style={{fontSize:17}}>{FLAGS[t.n]||'🏳️'}</span>
                  <span style={{fontSize:12,fontWeight:600}}>{t.n}</span>
                  {i<2&&<span style={{fontSize:9,background:'rgba(30,198,108,.15)',color:'var(--grn)',
                    padding:'1px 5px',borderRadius:4,fontWeight:700,flexShrink:0}}>ADV</span>}
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
            <span><span style={{color:'var(--gold)'}}>■</span> 1° lugar</span>
            <span><span style={{color:'var(--grn)'}}>■</span> 2° avanza</span>
            <span>Top 2 clasifican a octavos</span>
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
              {l:'Más goles',    v:`${FLAGS[topScor.n]||'🏴'} ${topScor.n} · ${topScor.gf}`, ic:'⚽'},
              {l:'Mejor defensa',v:`${FLAGS[bestDef.n]||'🏴'} ${bestDef.n} · ${bestDef.gc} GC`,ic:'🛡️'},
              {l:'Líder '+grp.name, v:`${FLAGS[leader.n]||'🏴'} ${leader.n} · ${leader.pts} pts`,ic:'🥇'},
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
          Copa Mundial FIFA 2026 · Las banderas aparecen automáticamente conforme avanza el torneo
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

  // Sort by goals
  const sorted=[...scorers].sort((a,b)=>b.g-a.g||b.a-a.a);
  const top3=sorted.slice(0,3);
  const rest=sorted.slice(3);

  // Jersey card component — geometric SVG jerseys
  const JerseyCard=({p,rank,size='md'})=>{
    const isOpen=sel===p.n;
    const sz=size==='lg'?144:size==='md'?114:96;
    const rankColors={1:'#F6C90E',2:'#C0C0C0',3:'#CD7F32'};
    const medal={1:'🥇',2:'🥈',3:'🥉'};
    return(
      <div onClick={()=>setSel(isOpen?null:p.n)}
        style={{display:'flex',flexDirection:'column',alignItems:'center',
          cursor:'pointer',position:'relative',width:'100%'}}>
        {/* Rank badge */}
        <div style={{position:'absolute',top:-8,left:'50%',transform:'translateX(-50%)',
          zIndex:3,background:rank<=3?rankColors[rank]:'var(--surf2)',
          color:rank<=3?'#000':'var(--muted)',fontFamily:'var(--ff)',
          fontSize:rank<=3?12:10,letterSpacing:.5,padding:'2px 9px',
          borderRadius:10,boxShadow:'0 2px 8px rgba(0,0,0,.3)',whiteSpace:'nowrap'}}>
          {rank<=3?medal[rank]:`#${rank}`}
        </div>
        {/* Geometric SVG jersey */}
        <div style={{width:'100%',aspectRatio:'1/1.15',borderRadius:10,overflow:'hidden',
          border:`2px solid ${rank<=3?rankColors[rank]+'66':'var(--br)'}`,
          boxShadow:`0 4px 16px rgba(0,0,0,.3)`,marginTop:8,
          display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surf2)'}}>
          <PlayerPhoto name={p.n} team={p.team} sz={sz}/>
        </div>
        {/* Stats bar */}
        <div style={{width:'100%',background:'var(--surf)',borderRadius:'0 0 8px 8px',
          border:`1px solid ${rank<=3?rankColors[rank]+'44':'var(--br)'}`,
          borderTop:'none',padding:'4px 6px 5px',textAlign:'center'}}>
          <div style={{fontSize:rank<=3?10:9,fontWeight:700,color:'var(--txt)',
            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {p.n.split(' ').slice(-1)[0].toUpperCase()}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:2}}>
            <span style={{fontSize:rank<=3?13:11,fontFamily:'var(--ff)',
              color:p.g>0?'var(--gold)':'var(--muted)'}}>{p.g}⚽</span>
            {p.a>0&&<span style={{fontSize:rank<=3?11:9,color:'var(--acc)'}}>{p.a}A</span>}
          </div>
        </div>
        {/* Bio expandible */}
        {isOpen&&(
          <div style={{position:'absolute',top:'105%',left:'50%',transform:'translateX(-50%)',
            width:200,background:'var(--surf)',border:'1px solid var(--br)',
            borderRadius:12,padding:'10px 12px',zIndex:10,fontSize:11,
            color:'var(--dim)',lineHeight:1.6,boxShadow:'0 8px 24px rgba(0,0,0,.4)'}}>
            <div style={{fontWeight:700,color:'var(--txt)',marginBottom:4}}>
              {FLAGS[p.team]||'🏳️'} {p.n}
            </div>
            {p.bio}
          </div>
        )}
      </div>
    );
  };

  return(
    <div className="scr fin" onClick={e=>{if(sel&&!e.target.closest('[data-jersey]'))setSel(null)}}>
      {/* Header */}
      <div style={{padding:'18px 16px 10px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>GOLEADORES</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>
          Candidatos a la Bota de Oro · FIFA World Cup 2026
        </div>
      </div>

      {/* ── PODIO TOP 3 ── */}
      {top3.length>0&&(
        <div style={{padding:'0 8px 16px'}}>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:6}}>
            {/* 2nd place */}
            {top3[1]&&(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:0}}>
                <JerseyCard p={top3[1]} rank={2} size="md"/>
                <div style={{width:'100%',height:60,background:'rgba(192,192,192,.15)',
                  border:'1px solid rgba(192,192,192,.3)',borderRadius:'6px 6px 0 0',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'var(--ff)',fontSize:22,color:'#C0C0C0',marginTop:4}}>2°</div>
              </div>
            )}
            {/* 1st place — tallest pedestal */}
            {top3[0]&&(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:0}}>
                <JerseyCard p={top3[0]} rank={1} size="lg"/>
                <div style={{width:'100%',height:90,
                  background:'linear-gradient(180deg,rgba(246,201,14,.2),rgba(246,201,14,.05))',
                  border:'1px solid rgba(246,201,14,.4)',borderRadius:'6px 6px 0 0',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'var(--ff)',fontSize:28,color:'var(--gold)',marginTop:4}}>1°</div>
              </div>
            )}
            {/* 3rd place */}
            {top3[2]&&(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:0}}>
                <JerseyCard p={top3[2]} rank={3} size="md"/>
                <div style={{width:'100%',height:40,background:'rgba(205,127,50,.15)',
                  border:'1px solid rgba(205,127,50,.3)',borderRadius:'6px 6px 0 0',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'var(--ff)',fontSize:18,color:'#CD7F32',marginTop:4}}>3°</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESTO DEL RANKING (4° en adelante) ── */}
      {rest.length>0&&(
        <div style={{padding:'0 12px 24px'}}>
          <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,letterSpacing:.8,
            marginBottom:10,paddingLeft:2}}>4° EN ADELANTE</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {rest.map((p,i)=>(
              <JerseyCard key={p.n} p={p} rank={i+4} size="sm"/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function PerfilScreen({user,onLogout,lang='es'}){
  const t = useLang(); // ← translations
  const ini=(user.name||user.email||'U')[0].toUpperCase();
  const [saved,setSaved]=useState(false);
  const [dbUsers,setDbUsers]=useState([]);
  const [dbLoaded,setDbLoaded]=useState(false);
  const [fbStatus,setFbStatus]=useState('waiting'); // waiting | ready | error
  const [shareMsg,setShareMsg]=useState('');

  useEffect(()=>{
    if(!user.isAdmin) return;

    const mergeUsers=(local,fs)=>{
      const merged=[...local];
      fs.forEach(fu=>{
        const idx=merged.findIndex(lu=>lu.email?.toLowerCase()===fu.email?.toLowerCase());
        if(idx>=0) merged[idx]={...merged[idx],...fu};
        else merged.push(fu);
      });
      return merged;
    };

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

    // Step 3: Keep refreshing every 8s once Firebase is ready
    const refresh=setInterval(async()=>{
      const fn=fbGetAllUsers||window._fbGetAllUsers;
      if(!fn) return;
      try{
        const local=await dbLoad();
        const fs=await fn();
        setDbUsers(mergeUsers(local,fs));
      }catch(e){}
    },8000);

    return()=>{clearInterval(pollFirebase);clearInterval(refresh);};
  },[user.isAdmin]);

  const deleteUser=async id=>{
    const updated=dbUsers.filter(u=>u.id!==id);
    await dbSave(updated);setDbUsers(updated);
  };

  // ── Share the app ────────────────────────────────
  const shareApp=async()=>{
    const shareData={
      title:'⚽ Mundial FIFA 2026',
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
    const txt=encodeURIComponent('⚽ ¡Únete a mis pronósticos del Mundial FIFA 2026! '+window.location.href);
    window.open(`https://wa.me/?text=${txt}`,'_blank');
  };

  return(
    <div className="scr fin">
      <div style={{padding:'28px 16px 20px',
        background:`linear-gradient(180deg,${user.isAdmin?'rgba(246,201,14,.14)':'rgba(246,201,14,.07)'} 0%,transparent 100%)`,
        textAlign:'center',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
        <div style={{width:78,height:78,borderRadius:'50%',
          background:user.isAdmin?'linear-gradient(135deg,#F6C90E,#FF8C00)':'linear-gradient(135deg,var(--gold),var(--gold2))',
          margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'var(--ff)',fontSize:user.isAdmin?34:36,color:'#000',
          boxShadow:`0 0 0 4px rgba(246,201,14,${user.isAdmin?.35:.15})`}}>
          {user.isAdmin?'👑':ini}
        </div>
        <div style={{fontFamily:'var(--ff)',fontSize:24,letterSpacing:1}}>{user.name||user.email}</div>
        {user.isAdmin?(
          <div style={{display:'inline-flex',alignItems:'center',gap:7,marginTop:8,
            background:'rgba(246,201,14,.12)',borderRadius:20,padding:'5px 16px',
            border:'1px solid rgba(246,201,14,.35)'}}>
            <span style={{fontSize:14}}>👑</span>
            <span style={{fontSize:12,color:'var(--gold)',fontWeight:700,letterSpacing:.5}}>ADMINISTRADOR GENERAL</span>
          </div>
        ):(
          <div style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:10,
            background:'rgba(30,198,108,.1)',borderRadius:20,padding:'4px 14px'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'var(--grn)',display:'inline-block'}}/>
            <span style={{fontSize:12,color:'var(--grn)',fontWeight:600}}>Sesión activa</span>
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
                ['💰','Ingresos MXN','$'+(dbUsers.reduce((s,u)=>s+(u.totalPagado||0),0)).toLocaleString(),'var(--grn)'],
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
                  const localUsers = await dbLoad();
                  let fsUsers = [];
                  const fn=fbGetAllUsers||window._fbGetAllUsers;if(fn){try{fsUsers=await fn();}catch(e){}}
                  const merged=[...localUsers];
                  fsUsers.forEach(fu=>{
                    const idx=merged.findIndex(lu=>lu.email?.toLowerCase()===fu.email?.toLowerCase());
                    if(idx>=0)merged[idx]={...merged[idx],...fu};
                    else merged.push(fu);
                  });
                  setDbUsers(merged);setDbLoaded(true);
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
                <div key={u.id||i} style={{display:'flex',alignItems:'center',gap:8,
                  padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,.04)',
                  background:u.paquetes>0?'rgba(246,201,14,.02)':'transparent'}}>
                  {/* Avatar */}
                  <div style={{width:30,height:30,borderRadius:'50%',
                    background:u.paquetes>0?'rgba(246,201,14,.15)':'rgba(79,142,247,.12)',
                    border:`1.5px solid ${u.paquetes>0?'rgba(246,201,14,.3)':'rgba(79,142,247,.25)'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>
                    {(u.name||u.email||'?')[0].toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:700,overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {u.name||'Sin nombre'}
                      {u.google&&<span style={{marginLeft:4,fontSize:8,color:'var(--acc)',fontWeight:700}}>G</span>}
                      {u.gifted&&<span style={{marginLeft:4,fontSize:8,background:'rgba(246,201,14,.2)',
                        color:'var(--gold)',padding:'1px 4px',borderRadius:4,fontWeight:700}}>🎁GRATIS</span>}
                    </div>
                    <div style={{fontSize:9,color:'var(--muted)',overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                  </div>
                  {/* Paquetes */}
                  <div style={{width:50,textAlign:'center',flexShrink:0}}>
                    <div style={{fontFamily:'var(--ff)',fontSize:16,
                      color:u.paquetes>0?'var(--gold)':'var(--muted)',lineHeight:1}}>
                      {u.paquetes||0}
                    </div>
                    <div style={{fontSize:8,color:'var(--muted)',fontWeight:600}}>paq.</div>
                  </div>
                  {/* Total pagado */}
                  <div style={{width:60,textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:700,
                      color:u.totalPagado>0?'var(--grn)':'var(--muted)'}}>
                      {u.totalPagado>0?'$'+(u.totalPagado||0):'—'}
                    </div>
                    <div style={{fontSize:8,color:'var(--muted)',fontWeight:600}}>MXN</div>
                  </div>
                  {/* Last payment */}
                  <div style={{width:50,textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:9,color:'var(--dim)',lineHeight:1.3}}>
                      {u.lastPayment
                        ?new Date(u.lastPayment).toLocaleDateString('es',{day:'numeric',month:'short'})
                        :'—'}
                    </div>
                  </div>
                  {/* Gift coins — admin inputs custom amount */}
                  <button
                    onClick={async()=>{
                      if(u.gifted){
                        // Revoke
                        if(!window.confirm(`¿Quitar monedas a ${u.name||u.email}?`))return;
                        const ok=await dbRevokeGift(u.email);
                        if(ok){
                          if(fbGiftCoins&&u.id) fbGiftCoins(u.id,false);
                          const updated=await dbLoad();setDbUsers(updated);
                        }
                      } else {
                        // Gift — ask amount
                        const raw=window.prompt(`¿Cuántas monedas regalar a ${u.name||u.email}?\n(mínimo 1, máximo 99999)`, '1000');
                        if(!raw) return;
                        const amount=parseInt(raw,10);
                        if(isNaN(amount)||amount<1||amount>99999){
                          alert('Cantidad inválida. Ingresa un número entre 1 y 99,999.');return;
                        }
                        const ok=await dbGiftCoins(u.email,amount);
                        if(ok){
                          if(fbGiftCoins&&u.id) fbGiftCoins(u.id,true);
                          alert(`✅ ${amount} monedas regaladas a ${u.name||u.email}`);
                          const updated=await dbLoad();setDbUsers(updated);
                        }
                      }
                    }}
                    title={u.gifted?`Quitar monedas (tiene ${u.giftedCoins||1000}🪙)`:'Regalar monedas (ingresarás el monto)'}
                    style={{width:28,flexShrink:0,
                      background:u.gifted?'rgba(30,198,108,.15)':'rgba(246,201,14,.12)',
                      border:`1px solid ${u.gifted?'rgba(30,198,108,.3)':'rgba(246,201,14,.3)'}`,
                      color:u.gifted?'var(--grn)':'var(--gold)',
                      borderRadius:5,padding:'3px 4px',
                      fontSize:11,cursor:'pointer',fontFamily:'var(--fb)'}}>
                    🎁
                  </button>
                  {/* Delete */}
                  <button onClick={()=>deleteUser(u.id)}
                    style={{width:24,flexShrink:0,background:'rgba(229,62,62,.1)',
                      border:'none',color:'#FC8181',borderRadius:5,padding:'3px 5px',
                      fontSize:10,cursor:'pointer',fontFamily:'var(--fb)'}}>✕</button>
                </div>
              ))}
            </div>

            {/* ── CSV Export ── */}
            <button onClick={()=>{
              const totalPaq=dbUsers.reduce((s,u)=>s+(u.paquetes||0),0);
              const totalIngresos=dbUsers.reduce((s,u)=>s+(u.totalPagado||0),0);
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
                  '$'+(u.totalPagado||0),
                ].join(',')),
              ];
              console.log(lines.join('\n'));
              setSaved(true);setTimeout(()=>setSaved(false),3000);
            }}
              style={{width:'100%',background:'rgba(30,198,108,.08)',
                border:'1px solid rgba(30,198,108,.22)',color:'var(--grn)',
                borderRadius:10,padding:'12px',fontSize:13,fontWeight:700,
                cursor:'pointer',fontFamily:'var(--fb)',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <span style={{fontSize:16}}>📥</span>
              {saved?'✓ CSV listo en consola (F12 → Console)':'Exportar Reporte CSV Completo'}
            </button>
            {saved&&(
              <div style={{marginTop:6,padding:'8px 12px',background:'rgba(30,198,108,.06)',
                borderRadius:8,border:'1px solid rgba(30,198,108,.2)',fontSize:11,
                color:'var(--grn)',textAlign:'center',lineHeight:1.5}}>
                Abre el navegador → F12 → pestaña "Console" → copia el texto completo
              </div>
            )}

            <div style={{marginTop:9,padding:'10px 12px',background:'rgba(229,62,62,.05)',
              borderRadius:9,border:'1px solid rgba(229,62,62,.12)',
              fontSize:11,color:'var(--dim)',lineHeight:1.6}}>
              ⚠️ <strong style={{color:'var(--txt)'}}>Producción:</strong> Contraseñas deben hashearse (bcrypt). Usar Firebase Auth + Firestore para gestión segura de usuarios y roles de admin.
            </div>
          </div>
        )}

        <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:1,color:'var(--muted)',marginBottom:10}}>MI CUENTA</div>
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
              🔗 Compartir enlace
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
          border:`1px solid ${AF_ON?'rgba(30,198,108,.2)':'rgba(255,255,255,.08)'}`,
          padding:'14px 16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:1}}>🔌 API DEPORTIVA</div>
            <div style={{fontSize:10,padding:'3px 10px',borderRadius:20,fontWeight:700,
              background:AF_ON?'rgba(30,198,108,.15)':'rgba(255,255,255,.06)',
              color:AF_ON?'var(--grn)':'var(--muted)'}}>
              {AF_ON?'✅ CONECTADA':'⚠️ SIN CONECTAR'}
            </div>
          </div>
          {!AF_ON&&(
            <div style={{fontSize:12,color:'var(--dim)',lineHeight:1.6}}>
              Para ver datos en tiempo real (goles, tarjetas, marcadores en vivo):
              <br/>1. Ve a <strong style={{color:'var(--acc)'}}>api-football.com</strong>
              <br/>2. Crea cuenta gratis (100 peticiones/día)
              <br/>3. Copia tu API Key
              <br/>4. Pégala en <code style={{background:'rgba(255,255,255,.08)',padding:'1px 5px',borderRadius:4}}>App.jsx</code> línea 1:<br/>
              <code style={{background:'rgba(246,201,14,.1)',padding:'3px 8px',borderRadius:4,
                fontSize:11,display:'block',marginTop:4}}>const AF_KEY = 'TU_KEY_AQUI';</code>
            </div>
          )}
          {AF_ON&&(
            <div style={{fontSize:12,color:'var(--grn)',lineHeight:1.6}}>
              ✓ Marcadores en vivo actualizando cada 30 segundos<br/>
              ✓ Goleadores reales del torneo<br/>
              ✓ Tabla de posiciones en tiempo real
            </div>
          )}
        </div>

        <button onClick={()=>onLogout()} style={{width:'100%',marginTop:14,
          background:'rgba(229,62,62,.1)',border:'1px solid rgba(229,62,62,.22)',
          color:'#FC8181',borderRadius:12,padding:14,fontSize:14,fontWeight:700,
          cursor:'pointer',fontFamily:'var(--fb)',transition:'all .2s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(229,62,62,.18)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(229,62,62,.1)'}>
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ── Groups Screen ─────────────────────────────────
function GruposScreen({user,userBets,credito,onPagar}){
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

  const [selGroup,setSelGroup]=useState(null);
  const [dtab,setDtab]=useState('ranking');
  const [newName,setNewName]=useState('');
  const [newDesc,setNewDesc]=useState('');
  const [joinCode,setJoinCode]=useState('');
  const [locks,setLocks]=useState({});
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
    const interval=setInterval(fetchMsgs,3000); // poll every 3s
    return()=>clearInterval(interval);
  },[selGroup?.code]);
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
      <div style={{background:'rgba(246,201,14,.08)',borderRadius:16,
        border:'1px solid rgba(246,201,14,.25)',padding:'16px 20px',marginBottom:20,width:'100%',maxWidth:300}}>
        <div style={{fontFamily:'var(--ff)',fontSize:22,color:'var(--gold)',marginBottom:4}}>
          🪙 1,000 MONEDAS
        </div>
        <div style={{fontSize:12,color:'var(--dim)'}}>
          Acceso completo a Grupos + Pronósticos
        </div>
        <div style={{fontSize:24,fontWeight:800,color:'var(--gold)',marginTop:6}}>$20 MXN</div>
      </div>
      <button className="btn" onClick={onPagar} style={{maxWidth:300,width:'100%'}}>
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
  // Navigate to group detail — a user can be in multiple groups
  const goDetail=(g)=>{setSelGroup(g);setDtab('ranking');setView('detail');};

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

  const joinGroup=async()=>{
    const code=joinCode.trim().toUpperCase();
    if(!code)return;
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
        const g=data.group;
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
    setLocks(p=>({...p,[gid]:{bets:[...userBets],lockedAt:Date.now()}}));
    setConfirmLock(false);
  };

  const isLocked=gid=>!!locks[gid];

  const getUserEntry=gid=>{
    const l=locks[gid];
    if(!l)return null;
    return{id:'user',name:user?.name||'Tú',ini:(user?.name||'U')[0].toUpperCase(),
      col:'var(--gold)',locked:true,lockedAt:l.lockedAt,pts:0,
      bets:(l.bets||[]).map(b=>({id:b.id,cat:b.category,sel:b.selection,odds:b.odds}))};
  };

  const getAllMembers=(g,gid)=>{
    const ue=getUserEntry(gid);
    return [...(g.members||[]),...(ue?[ue]:[])].sort((a,b)=>(b.pts||0)-(a.pts||0));
  };

  const BackBtn=({to})=>(
    <button onClick={()=>{setView(to);setJoinErr('');}}
      style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',width:36,height:36,
        borderRadius:10,cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',
        justifyContent:'center',flexShrink:0}}>←</button>
  );

  // ── LIST ──
  if(view==='list')return(
    <div className="scr fin">
      <div style={{padding:'18px 16px 8px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>GRUPOS</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>Compite con amigos · Pronósticos bloqueados</div>
      </div>
      <div style={{display:'flex',gap:10,padding:'4px 16px 14px'}}>
        <button onClick={()=>setView('create')} style={{flex:1,background:'var(--gold)',color:'#000',
          border:'none',borderRadius:12,padding:'13px 8px',fontFamily:'var(--ff)',fontSize:17,
          letterSpacing:1,cursor:'pointer'}}>+ CREAR</button>
        <button onClick={()=>setView('join')} style={{flex:1,background:'var(--surf)',color:'var(--txt)',
          border:'1.5px solid var(--br)',borderRadius:12,padding:'13px 8px',fontFamily:'var(--fb)',
          fontSize:13,fontWeight:700,cursor:'pointer'}}>🔗 Unirse con código</button>
      </div>
      <div style={{padding:'0 16px 6px',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:.8}}>
        MIS GRUPOS ({groups.length})
      </div>
      {groups.map(g=>{
        const locked=isLocked(g.id);
        const allM=getAllMembers(g,g.id);
        return(
          <div key={g.id} onClick={()=>goDetail(g)}
            style={{margin:'0 16px 11px',background:'var(--surf)',borderRadius:14,
              border:'1px solid var(--br)',overflow:'hidden',cursor:'pointer',transition:'border-color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(246,201,14,.3)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.08)'}>
            <div style={{padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{g.name}</div>
                {g.desc&&<div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>{g.desc}</div>}
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <span style={{fontSize:11,background:'var(--surf2)',padding:'2px 8px',borderRadius:20,
                    color:'var(--dim)',fontFamily:'var(--ff)',letterSpacing:.5}}>{g.code}</span>
                  <span style={{fontSize:11,color:'var(--muted)'}}>{allM.length} miembros</span>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0,marginLeft:8}}>
                {locked
                  ?<div style={{fontSize:12,color:'var(--grn)',fontWeight:700}}>🔒 Bloqueado</div>
                  :<div style={{fontSize:12,color:'var(--gold)',fontWeight:700}}>⚡ Abierto</div>}
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Ver →</div>
              </div>
            </div>
            <div style={{padding:'8px 14px',borderTop:'1px solid var(--br)',
              display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              {/* Stacked avatars */}
              <div style={{display:'flex',alignItems:'center'}}>
                {allM.slice(0,5).map((m,i)=>(
                  <div key={m.id} title={m.name}
                    style={{width:28,height:28,borderRadius:'50%',
                      background:`linear-gradient(135deg,${m.col}55,${m.col}22)`,
                      border:`2px solid var(--surf)`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:9,fontWeight:800,color:'#fff',
                      marginLeft:i>0?-8:0,zIndex:5-i,flexShrink:0,
                      boxShadow:`0 0 0 1px ${m.col}44`}}>
                    {(m.ini||'?').slice(0,2)}
                  </div>
                ))}
                {allM.length>5&&(
                  <div style={{width:28,height:28,borderRadius:'50%',
                    background:'var(--surf2)',border:'2px solid var(--surf)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:8,fontWeight:700,color:'var(--muted)',marginLeft:-8,flexShrink:0}}>
                    +{allM.length-5}
                  </div>
                )}
              </div>
              {/* Member count + top scorer */}
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:10,color:'var(--muted)'}}>{allM.length} miembro{allM.length!==1?'s':''}</div>
                {allM[0]&&allM[0].pts>0&&(
                  <div style={{fontSize:10,color:'var(--gold)',fontWeight:600}}>
                    🥇 {allM[0].name?.split(' ')[0]} · {allM[0].pts}pts
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
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
          background:'rgba(229,62,62,.1)',border:'1px solid rgba(229,62,62,.3)',
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
        {joinErr&&<div style={{background:'rgba(229,62,62,.1)',border:'1px solid rgba(229,62,62,.25)',
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
      ['Campeón del Mundo','20 pts'],['Bota de Oro','15 pts'],['Balón de Oro','12 pts'],
      ['Ganador de Grupo','5 pts / grupo'],['1X2 correcto','3 pts'],
      ['Total Goles / BTTS','2 pts'],['Doble Oportunidad','1 pt'],
      ['Marcador Exacto','10 pts'],['Jugador que Anota','5 pts'],['Hándicap','3 pts'],
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
                style={{background:'rgba(229,62,62,.1)',border:'1px solid rgba(229,62,62,.3)',
                  color:'#FC8181',borderRadius:9,padding:'6px 8px',cursor:'pointer',
                  fontSize:15,flexShrink:0}} title="Eliminar grupo">🗑️</button>
            )}
            {/* Confirm delete dialog */}
            {confirmDelete&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',
                zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',
                padding:'0 24px'}}>
                <div style={{background:'var(--surf)',borderRadius:18,padding:24,
                  maxWidth:320,width:'100%',border:'1px solid rgba(229,62,62,.3)'}}>
                  <div style={{fontSize:32,textAlign:'center',marginBottom:12}}>🗑️</div>
                  <div style={{fontFamily:'var(--ff)',fontSize:18,textAlign:'center',
                    marginBottom:8,letterSpacing:1}}>ELIMINAR GRUPO</div>
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
                      style={{flex:1,background:'rgba(229,62,62,.15)',
                        border:'1px solid rgba(229,62,62,.4)',color:'#FC8181',
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
        <div style={{flex:1,overflowY:'auto'}}>

          {/* ── Ranking ── */}
          {dtab==='ranking'&&(
            <div>
              {allM.length===0&&(
                <div style={{textAlign:'center',padding:'40px 24px',color:'var(--muted)'}}>
                  <div style={{fontSize:36,marginBottom:10}}>👥</div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Sin miembros aún</div>
                  <div style={{fontSize:12}}>Comparte el código <strong style={{color:'var(--gold)'}}>{selGroup.code}</strong></div>
                </div>
              )}
              {allM.map((m,i)=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:11,
                  padding:'11px 16px',borderBottom:'1px solid rgba(255,255,255,.04)',
                  background:m.id==='user'?'rgba(246,201,14,.03)':'transparent',
                  transition:'background .15s'}}>
                  <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,
                    background:i===0?'rgba(246,201,14,.3)':i===1?'rgba(192,192,192,.2)':i===2?'rgba(205,127,50,.2)':'rgba(255,255,255,.07)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:i<3?15:12,fontWeight:800,color:i===0?'var(--gold)':'#fff'}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div style={{width:42,height:42,borderRadius:'50%',background:m.col+'25',
                    border:`2px solid ${m.col}55`,display:'flex',alignItems:'center',
                    justifyContent:'center',fontFamily:'var(--ff)',fontSize:15,color:'#fff',
                    flexShrink:0,position:'relative'}}>
                    {m.ini}
                    <div style={{position:'absolute',bottom:-3,right:-3,background:'var(--surf)',
                      borderRadius:'50%',width:16,height:16,display:'flex',alignItems:'center',
                      justifyContent:'center',fontSize:8,border:'1px solid var(--br)'}}>
                      {m.locked?'🔒':'✏️'}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:6}}>
                      {m.name}
                      {m.id==='user'&&<span style={{fontSize:9,background:'rgba(246,201,14,.15)',
                        color:'var(--gold)',padding:'1px 6px',borderRadius:9,fontWeight:700}}>TÚ</span>}
                    </div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>
                      {(m.bets||[]).length} pronósticos · {m.locked
                        ?`🔒 ${new Date(m.lockedAt).toLocaleDateString('es',{day:'numeric',month:'short'})}`
                        :'⚡ Sin guardar'}
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'var(--ff)',fontSize:30,lineHeight:1,
                      color:i===0?'var(--gold)':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--txt)'}}>{m.pts||0}</div>
                    <div style={{fontSize:9,color:'var(--muted)',fontWeight:700}}>PUNTOS</div>
                  </div>
                </div>
              ))}
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
                  <div style={{background:'rgba(246,201,14,.07)',border:'1px solid rgba(246,201,14,.2)',
                    borderRadius:12,padding:12,marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--gold)',marginBottom:4}}>⚠️ Antes de guardar</div>
                    <div style={{fontSize:12,color:'var(--dim)',lineHeight:1.65}}>
                      Una vez que confirmes, tus pronósticos quedarán <strong style={{color:'var(--txt)'}}>bloqueados permanentemente</strong> para este grupo. No podrás modificarlos.
                    </div>
                  </div>
                  {userBets.length===0&&(
                    <div style={{background:'rgba(229,62,62,.07)',border:'1px solid rgba(229,62,62,.18)',
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
                    <div style={{background:'rgba(229,62,62,.08)',border:'1.5px solid rgba(229,62,62,.3)',
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
                            fontWeight:600,cursor:'pointer',fontFamily:'var(--fb)'}}>Cancelar</button>
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
                  border:`1.5px solid ${m.id==='user'?'rgba(246,201,14,.3)':'var(--br)'}`,overflow:'hidden'}}>
                  <div style={{padding:'10px 14px',borderBottom:'1px solid var(--br)',
                    display:'flex',alignItems:'center',gap:10,
                    background:m.id==='user'?'rgba(246,201,14,.04)':'rgba(255,255,255,.015)'}}>
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
                          background:isUser?'rgba(246,201,14,.025)':'transparent'}}>
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
                    <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(246,201,14,.15)',
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
                          <div style={{fontSize:10,color:'var(--muted)',marginBottom:2,paddingLeft:4}}>
                            {msg.name||'Usuario'}
                          </div>
                        )}
                        <div style={{background:isMe?'var(--gold)':'var(--surf2)',
                          color:isMe?'#000':'var(--txt)',
                          borderRadius:isMe?'16px 16px 4px 16px':'16px 16px 16px 4px',
                          padding:'9px 13px',fontSize:13,lineHeight:1.5,
                          border:isMe?'none':'1px solid var(--br)'}}>
                          {msg.text}
                        </div>
                        <div style={{fontSize:9,color:'var(--muted)',marginTop:3,
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
                  placeholder="Escribe un mensaje..."
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
function PagoScreen({onExito,onCancelar,esReset=false}){
  const t=useLang();
  const [metodo,setMetodo]=useState('card');
  const [loading,setLoading]=useState(false);
  const [exito,setExito]=useState(false);
  const [esperandoPago,setEsperandoPago]=useState(false);

  // ══════════════════════════════════════════════════
  // 🔑 CONFIGURACIÓN DE PAGOS — REEMPLAZA ESTAS URLS
  // ══════════════════════════════════════════════════
  // Crea tu link de pago en mercadopago.com.mx:
  // Dashboard → Cobrar → Link de pago → $20 MXN → Copiar link
  const MP_LINK = 'https://mpago.la/TU_LINK_AQUI'; // ← Reemplaza con tu link real

  // Referencia única por usuario (para identificar el pago en el dashboard de MP)
  const REF = `WC26_${Date.now()}_${Math.random().toString(36).slice(2,7).toUpperCase()}`;

  const pagar=()=>{
    // Si ya está configurado el link real de MercadoPago
    if(MP_LINK !== 'https://mpago.la/TU_LINK_AQUI'){
      setEsperandoPago(true);
      // Abrir MercadoPago en nueva pestaña con referencia única
      const url = `${MP_LINK}?external_reference=${REF}`;
      window.open(url, '_blank');
      return;
    }
    // Modo demo (sin link configurado) — simula el pago
    setLoading(true);
    setTimeout(()=>{setLoading(false);setExito(true);setTimeout(onExito,1800);},1600);
  };

  const confirmarPagoManual=()=>{
    // El usuario ya pagó en MercadoPago → acreditar monedas
    setExito(true);
    setTimeout(onExito,1800);
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
      <div style={{background:'rgba(246,201,14,.1)',borderRadius:14,padding:'14px 24px',
        border:'1px solid rgba(246,201,14,.25)'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:44,color:'var(--gold)',lineHeight:1}}>
          🪙 1,000
        </div>
        <div style={{fontSize:13,color:'var(--dim)',marginTop:4}}>monedas añadidas a tu cuenta</div>
      </div>
      {esReset&&<div style={{fontSize:13,color:'var(--txt)',background:'rgba(229,62,62,.1)',
        padding:'10px 20px',borderRadius:10,border:'1px solid rgba(229,62,62,.2)'}}>
        🔄 Pronósticos anteriores eliminados
      </div>}
      <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Redirigiendo a Mi Pronóstico…</div>
    </div>
  );

  // ── Pantalla "Esperando confirmación de pago" ──
  if(esperandoPago)return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      height:'100%',gap:16,textAlign:'center',padding:'32px'}}>
      <div style={{fontSize:48}}>💳</div>
      <div style={{fontFamily:'var(--ff)',fontSize:24,letterSpacing:2}}>PAGO EN PROCESO</div>
      <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,maxWidth:280}}>
        Se abrió MercadoPago en una nueva pestaña.<br/>
        Completa el pago de <strong style={{color:'var(--gold)'}}>$20 MXN</strong> y regresa aquí.
      </div>
      <div style={{fontSize:11,color:'var(--dim)',background:'rgba(255,255,255,.04)',
        borderRadius:8,padding:'8px 14px'}}>
        Ref: <strong style={{color:'var(--acc)',fontFamily:'monospace'}}>{REF}</strong>
      </div>
      <button onClick={confirmarPagoManual}
        style={{background:'var(--gold)',color:'#000',border:'none',borderRadius:12,
          padding:'14px 28px',fontFamily:'var(--ff)',fontSize:18,letterSpacing:1,
          cursor:'pointer',width:'100%',maxWidth:300}}>
        ✅ Ya pagué — Activar mis monedas
      </button>
      <button onClick={()=>setEsperandoPago(false)}
        style={{background:'transparent',border:'1px solid var(--br)',color:'var(--muted)',
          borderRadius:10,padding:'10px 20px',cursor:'pointer',fontSize:13}}>
        ← Volver al pago
      </button>
      <div style={{fontSize:11,color:'var(--dim)',lineHeight:1.6}}>
        ¿No se abrió MercadoPago?{' '}
        <span onClick={pagar} style={{color:'var(--acc)',cursor:'pointer',textDecoration:'underline'}}>
          Intentar de nuevo
        </span>
      </div>
    </div>
  );

  return(
    <div className="scr fin">
      {/* Header */}
      <div style={{padding:'18px 16px 14px',
        background:'linear-gradient(180deg,rgba(246,201,14,.07) 0%,transparent 100%)',
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
              {esReset?'Paga $20 · reinicia todo y vuelve a apostar':'Acceso completo · $20 MXN una sola vez'}
            </div>
          </div>
        </div>
        {/* Amount card */}
        <div style={{background:'var(--surf)',borderRadius:14,padding:'16px',
          border:'1.5px solid rgba(246,201,14,.3)',display:'flex',justifyContent:'space-between',
          alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,letterSpacing:.5}}>
              {esReset?'COSTO DE REINICIO':'PRECIO DE ACCESO'}
            </div>
            <div style={{fontFamily:'var(--ff)',fontSize:48,color:'var(--gold)',lineHeight:1,marginTop:2}}>
              $20
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
          <div style={{marginTop:10,padding:'9px 12px',background:'rgba(229,62,62,.08)',
            borderRadius:9,border:'1px solid rgba(229,62,62,.2)',fontSize:12,color:'#FC8181',
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
            {['🏆 Campeón del Mundo (80🪙)',
              '⚽ Bota de Oro y Balón de Oro (60🪙 c/u)',
              '🏅 Ganadores de todos los grupos (25🪙 c/u)',
              '📊 1X2 · Total Goles · BTTS · Doble Oportunidad (10🪙 c/u)',
              '🎯 Marcadores exactos (15🪙 c/u)',
              '👤 Jugador que anotará · Hándicap (10🪙 c/u)',
              '📈 Estadísticas personales en tiempo real'].map(i=>(
              <div key={i} style={{fontSize:11,color:'var(--dim)',padding:'3px 0',
                borderBottom:'1px solid rgba(255,255,255,.04)',lineHeight:1.4}}>{i}</div>
            ))}
            <div style={{fontSize:11,color:'var(--grn)',fontWeight:700,marginTop:7}}>
              Total máximo: ~755🪙 · Siempre te alcanza con 1,000🪙
            </div>
          </div>
        )}

        {/* Payment method selector */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:8,letterSpacing:.5}}>
            MÉTODO DE PAGO
          </div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {[['card','💳','Tarjeta'],['oxxo','🏪','OXXO'],['transfer','🏦','Transferencia']].map(([m,ic,lb])=>(
              <button key={m} onClick={()=>setMetodo(m)}
                style={{flex:1,padding:'10px 4px',
                  background:metodo===m?'rgba(246,201,14,.12)':'var(--surf)',
                  border:`1.5px solid ${metodo===m?'rgba(246,201,14,.4)':'var(--br)'}`,
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
              border:'1px solid rgba(246,201,14,.2)',textAlign:'center'}}>
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
                Al hacer clic en <strong style={{color:'var(--gold)'}}>Pagar $20 MXN</strong>,
                MercadoPago generará tu referencia OXXO.<br/>
                Válida 24 horas en cualquier tienda OXXO del país.
              </div>
              <div style={{marginTop:10,fontSize:11,color:'var(--dim)',
                background:'rgba(246,201,14,.05)',borderRadius:8,padding:'8px'}}>
                💡 Comisión OXXO: $13 MXN adicionales (total $33 MXN)
              </div>
            </div>
          )}

          {/* Transfer — SPEI */}
          {metodo==='transfer'&&(
            <div style={{background:'var(--surf)',borderRadius:12,padding:14,border:'1px solid var(--br)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:9,letterSpacing:.5}}>
                TRANSFERENCIA SPEI — VÍA MERCADOPAGO
              </div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.7}}>
                Al hacer clic en <strong style={{color:'var(--gold)'}}>Pagar</strong>, 
                MercadoPago te asignará una CLABE interbancaria única para este pago.<br/><br/>
                ✅ Se acredita en minutos<br/>
                ✅ Sin comisión adicional<br/>
                ✅ Funciona con cualquier banco de México
              </div>
            </div>
          )}
        </div>

        {/* Pay button */}
        <button onClick={pagar} disabled={loading}
          style={{width:'100%',background:loading?'rgba(246,201,14,.5)':'var(--gold)',
            color:'#000',border:'none',borderRadius:12,padding:'16px',
            fontFamily:'var(--ff)',fontSize:20,letterSpacing:1,
            cursor:loading?'not-allowed':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            transition:'all .2s',fontWeight:400}}>
          {loading&&(
            <span style={{width:22,height:22,border:'3px solid #00000044',
              borderTopColor:'#000',borderRadius:'50%',display:'inline-block',
              animation:'spin .8s linear infinite'}}/>
          )}
          {loading?'PROCESANDO PAGO…':esReset?'PAGAR $20 Y REINICIAR TODO':'PAGAR $20 MXN Y ACTIVAR'}
        </button>

        <div style={{fontSize:11,color:'var(--muted)',textAlign:'center',lineHeight:1.6}}>
          🔒 Pago simulado · Prototipo de demostración<br/>
          En producción se conecta a Mercado Pago / Stripe
        </div>
      </div>
    </div>
  );
}

// ── Bets Screen ───────────────────────────────────
function BetsScreen({bets,placeBet,credito,onPagar,onReset,betsSaved=false,onSave,currentUser}){
  const t=useLang();
  const [tab,setTab]=useState('largo');
  const [exact,setExact]=useState({});
  const [showReset,setShowReset]=useState(false);
  const [confirmReset,setConfirmReset]=useState(false);

  // ── Payment gates ──
  if(!credito) return <PagoScreen onExito={onPagar}/>;
  if(showReset) return(
    <PagoScreen
      onExito={()=>{onReset();setShowReset(false);setConfirmReset(false);}}
      onCancelar={()=>{setShowReset(false);setConfirmReset(false);}}
      esReset={true}/>
  );

  // Coins
  const isAdminUser=credito?.isAdmin||false;
  const coinsUsed=isAdminUser?0:bets.reduce((s,b)=>s+getBetCost(b.id),0);
  const coinsLeft=isAdminUser?999999:COINS_PER_PAGO-coinsUsed;
  const pctUsed=isAdminUser?0:Math.min(100,Math.round(coinsUsed/COINS_PER_PAGO*100));

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
        style={{background:sel?'rgba(246,201,14,.18)':'var(--surf2)',
          border:`1.5px solid ${sel?'var(--gold)':'var(--br)'}`,
          borderRadius:10,padding:'8px 6px',cursor:betsSaved?'default':'pointer',
          transition:'background .15s,border-color .15s,color .15s',
          display:'flex',flexDirection:'column',alignItems:'center',gap:2,
          fontFamily:'var(--fb)',width:'100%',boxSizing:'border-box',
          opacity:betsSaved&&!sel?0.4:1}}>
        <span style={{fontSize:11,color:sel?'var(--gold)':'var(--txt)',fontWeight:700,
          textAlign:'center',lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',
          textOverflow:'ellipsis',width:'100%'}}>{display||val}</span>
        <span style={{fontSize:10,color:sel?'var(--gold)':'#6B82AF',fontWeight:700}}>{odds}x</span>
        <span style={{fontSize:9,fontWeight:700,color:sel?'var(--grn)':'transparent',userSelect:'none'}}>✓</span>
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
      <div style={{margin:'6px 0 0',padding:'7px 10px',background:'rgba(246,201,14,.05)',borderRadius:8,fontSize:12,color:'var(--dim)',display:'flex',justifyContent:'space-between'}}>
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
        style={{background:sel?'rgba(246,201,14,.18)':'var(--surf2)',
          border:`1.5px solid ${sel?'var(--gold)':'var(--br)'}`,
          borderRadius:8,padding:'5px 8px',cursor:betsSaved?'default':'pointer',
          transition:'background .15s,border-color .15s,color .15s',
          display:'inline-flex',flexDirection:'column',alignItems:'center',gap:1,
          fontFamily:'var(--fb)',boxSizing:'border-box',flexShrink:0,
          opacity:betsSaved&&!sel?0.4:1}}>
        <span style={{fontSize:11,color:sel?'var(--gold)':'var(--txt)',fontWeight:700,
          textAlign:'center',lineHeight:1.3,whiteSpace:'nowrap'}}>{display||val}</span>
        <span style={{fontSize:10,color:sel?'var(--gold)':'#6B82AF',fontWeight:600}}>{odds}x</span>
        <span style={{fontSize:8,fontWeight:700,color:sel?'var(--grn)':'transparent',userSelect:'none'}}>✓</span>
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
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>¿Qué selección levantará la Copa?</div>
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
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Máximo goleador del torneo</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {BOTA_ORO_OPTS.map(o=>(
              <SmBtn key={o.v} id="bota-oro" category="Bota de Oro" val={o.v} odds={o.odds}
                display={`${FLAGS[o.team]||'🏴'} ${o.v.split(' ').slice(-1)[0]}`}/>
            ))}
          </div>
          <BetResult betId="bota-oro"/>
        </div>
      </div>

      {/* Balón de Oro */}
      <div style={{margin:'0 16px 13px',background:'var(--surf)',borderRadius:14,border:'1px solid var(--br)',overflow:'hidden'}}>
        <SecHead icon="🌟" title="BALÓN DE ORO" betId="balon-oro"/>
        <div style={{padding:'10px 14px'}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Mejor jugador del Mundial</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {BALON_ORO_OPTS.map(o=>(
              <SmBtn key={o.v} id="balon-oro" category="Balón de Oro" val={o.v} odds={o.odds}
                display={`${FLAGS[o.team]||'🏴'} ${o.v.split(' ').slice(-1)[0]}`}/>
            ))}
          </div>
          <BetResult betId="balon-oro"/>
        </div>
      </div>

      {/* Ganadores de Grupo */}
      <div style={{margin:'0 16px 6px',fontFamily:'var(--ff)',fontSize:17,letterSpacing:1,paddingLeft:2}}>🏅 GANADORES DE GRUPO</div>
      {GRP_WIN.map(grp=>{
        const gid=`grp-${grp.g.replace(' ','')}`;
        const gb=getBet(gid);
        return(
          <div key={grp.g} style={{margin:'0 16px 10px',background:'var(--surf)',borderRadius:12,border:'1px solid var(--br)',overflow:'hidden'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid var(--br)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,fontWeight:700,color:'var(--muted)',letterSpacing:.8}}>{grp.g}</span>
              {gb&&<span style={{fontSize:10,background:'rgba(30,198,108,.15)',color:'var(--grn)',padding:'2px 7px',borderRadius:20,fontWeight:700}}>✓ {gb.selection}</span>}
            </div>
            <div style={{padding:'10px 12px',display:'flex',gap:5,flexWrap:'wrap'}}>
              {grp.teams.map(t=>(
                <SmBtn key={t.v} id={gid} category={`Ganador ${grp.g}`} val={t.v} odds={t.odds}
                  display={`${FLAGS[t.v]||'🏴'} ${t.v}`}/>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Tab: Por Partido ──
  const PorPartido=()=>(
    <div>
      {[...LIVE_MATCHES,...NEXT_MATCHES].map(m=>{
        const mid=m.id;
        const isLive=m.min!=null;
        const o=m.odds||[2.2,3.2,3.0];
        return(
          <div key={mid} style={{margin:'0 16px 13px',background:'var(--surf)',borderRadius:14,border:'1px solid var(--br)',overflow:'hidden'}}>
            {/* Header */}
            <div style={{padding:'9px 14px 7px',background:'rgba(255,255,255,.02)',borderBottom:'1px solid var(--br)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:7,minWidth:0}}>
                <span style={{fontSize:16,flexShrink:0}}>{FLAGS[m.home]||'🏴'}</span>
                <span style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:80}}>{m.home}</span>
                <span style={{fontSize:11,color:'var(--muted)',flexShrink:0}}>vs</span>
                <span style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:80}}>{m.away}</span>
                <span style={{fontSize:16,flexShrink:0}}>{FLAGS[m.away]||'🏴'}</span>
              </div>
              {isLive
                ?<span className="live" style={{fontSize:9,flexShrink:0}}><span className="ldot"/>{m.min}'</span>
                :<span style={{fontSize:10,color:'var(--muted)',flexShrink:0}}>{m.time||''}</span>}
            </div>
            <div style={{padding:'10px 14px',display:'flex',flexDirection:'column',gap:10}}>
              {/* 1X2 — 3 columnas fijas */}
              <div>
                <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:6,letterSpacing:.8}}>1X2</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
                  <OBtn id={`m${mid}-1x2`} category="1X2" val="1" odds={o[0]}
                    display={`① ${m.home.substring(0,6)}`}/>
                  <OBtn id={`m${mid}-1x2`} category="1X2" val="X" odds={o[1]}
                    display="✕ Empate"/>
                  <OBtn id={`m${mid}-1x2`} category="1X2" val="2" odds={o[2]}
                    display={`② ${m.away.substring(0,6)}`}/>
                </div>
              </div>
              {/* Total — 2 columnas fijas */}
              <div>
                <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:6,letterSpacing:.8}}>GOLES</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:5}}>
                  <OBtn id={`m${mid}-total`} category="Total Goles" val="over" odds={1.85}
                    display="Más +2"/>
                  <OBtn id={`m${mid}-total`} category="Total Goles" val="under" odds={1.95}
                    display="Menos -2"/>
                </div>
              </div>
              {/* BTTS — 2 columnas fijas */}
              <div>
                <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:6,letterSpacing:.8}}>BTTS</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:5}}>
                  <OBtn id={`m${mid}-btts`} category="BTTS" val="si" odds={1.75}
                    display="✓ Sí anotan"/>
                  <OBtn id={`m${mid}-btts`} category="BTTS" val="no" odds={2.05}
                    display="✗ No anotan"/>
                </div>
              </div>
              {/* Doble Oportunidad — 3 columnas fijas */}
              <div>
                <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:6,letterSpacing:.8}}>DOBLE OPORT.</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
                  <OBtn id={`m${mid}-dc`} category="Doble Oportunidad" val="1X" odds={1.4}
                    display="1X L/Emp"/>
                  <OBtn id={`m${mid}-dc`} category="Doble Oportunidad" val="X2" odds={1.5}
                    display="X2 E/Vis"/>
                  <OBtn id={`m${mid}-dc`} category="Doble Oportunidad" val="12" odds={1.25}
                    display="12 S/Emp"/>
                </div>
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
      {/* ── MEJORES GOLEADORES DEL MUNDIAL — 3 × 32 = 96 monedas ── */}
      <div style={{margin:'0 16px 16px',background:'var(--surf)',borderRadius:14,
        border:'2px solid rgba(246,201,14,.3)',overflow:'hidden'}}>
        <div style={{padding:'11px 14px',background:'rgba(246,201,14,.06)',
          borderBottom:'1px solid rgba(246,201,14,.2)',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:20}}>🥇</span>
          <div>
            <div style={{fontFamily:'var(--ff)',fontSize:16,letterSpacing:1,color:'var(--gold)'}}>
              MEJORES GOLEADORES DEL MUNDIAL
            </div>
            <div style={{fontSize:10,color:'var(--muted)'}}>
              Selecciona al 1°, 2° y 3° goleador · 32🪙 cada uno · Total: 96🪙
            </div>
          </div>
        </div>
        {[
          {key:'goleador-1',label:'🥇 1er Goleador',rank:1},
          {key:'goleador-2',label:'🥈 2do Goleador',rank:2},
          {key:'goleador-3',label:'🥉 3er Goleador',rank:3},
        ].map(({key,label,rank})=>{
          const picked=getBet(key);
          return(
            <div key={key} style={{padding:'10px 14px',
              borderBottom:'1px solid rgba(255,255,255,.04)'}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,
                marginBottom:8,letterSpacing:.8,display:'flex',alignItems:'center',gap:8}}>
                {label} · 32🪙
                {picked&&<span style={{color:'var(--grn)',fontWeight:700}}>✓ {picked.selection}</span>}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {SCORERS.map(p=>{
                  const sel=getBet(key)?.selection===p.n;
                  return(
                    <button type="button" key={p.n}
                      onClick={e=>{e.preventDefault();place(key,`Goleador ${rank}°`,p.n,32);}}
                      style={{background:sel?'rgba(246,201,14,.18)':'var(--surf2)',
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

      {[...LIVE_MATCHES,...NEXT_MATCHES].map(m=>{
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
                  style={{flex:1,background:'rgba(246,201,14,.1)',border:'1px solid rgba(246,201,14,.3)',
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
                      style={{background:sel?'rgba(246,201,14,.18)':'var(--surf2)',
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
            <div style={{fontFamily:'var(--ff)',fontSize:26,letterSpacing:2}}>MI PRONÓSTICO</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>
              Paquete #{credito?.paquetes||0} · {new Date(credito.paidAt).toLocaleDateString('es',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
          <button onClick={()=>setConfirmReset(true)}
            style={{background:'rgba(229,62,62,.1)',border:'1px solid rgba(229,62,62,.25)',
              color:'#FC8181',borderRadius:10,padding:'7px 11px',fontSize:11,fontWeight:700,
              cursor:'pointer',fontFamily:'var(--fb)',flexShrink:0}}>
            🔄 Cambiar
          </button>
        </div>
        {/* Coin balance */}
        <div style={{background:'var(--surf)',borderRadius:12,padding:'11px 13px',
          border:`1px solid ${isAdminUser?'rgba(246,201,14,.4)':'var(--br)'}`}}>
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
                    <span style={{fontSize:11,color:'var(--muted)'}}> / {COINS_PER_PAGO.toLocaleString()} monedas</span>
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
                  ?'✅ Te alcanzan las monedas para todos tus pronósticos'
                  :'⚠️ Saldo insuficiente · Compra otro paquete'}
              </div>
            </>
          )}
        </div>
        {/* Confirm reset modal */}
        {confirmReset&&(
          <div style={{marginTop:10,background:'rgba(229,62,62,.08)',border:'1.5px solid rgba(229,62,62,.3)',
            borderRadius:12,padding:13}}>
            <div style={{fontSize:13,fontWeight:700,color:'#FC8181',marginBottom:6,textAlign:'center'}}>
              ⚠️ ¿Cambiar todos tus pronósticos?
            </div>
            <div style={{fontSize:11,color:'var(--dim)',marginBottom:10,textAlign:'center',lineHeight:1.55}}>
              Pagarás <strong style={{color:'var(--gold)'}}>$20 MXN</strong> y se borrarán tus {bets.length} pronósticos actuales. Recibirás <strong style={{color:'var(--gold)'}}>1,000🪙</strong> nuevas para volver a apostar.
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
                🔄 Ir a pagar $20
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div style={{display:'flex',gap:8,padding:'8px 16px',overflowX:'auto',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
        {[['largo','🏅 Partidos Mundial'],['partido','⚽ Por Partido'],['especiales','🎯 Especiales'],['stats','📈 Estadísticas']].map(([k,l])=>(
          <button key={k} className={`tpill ${tab===k?'on':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>
      <div style={{height:10}}/>
      {tab==='largo'&&<LargoPlazo/>}
      {tab==='partido'&&<PorPartido/>}
      {tab==='especiales'&&<Especiales/>}
      {tab==='stats'&&<StatsScreen bets={bets} noWrapper={true}/>}

      {/* ── BOTÓN GUARDAR PRONÓSTICO ── */}
      {!isAdminUser&&(
        <div style={{margin:'8px 16px 24px',padding:'16px',background:'var(--surf)',
          borderRadius:16,border:`2px solid ${betsSaved?'var(--grn)':coinsLeft===0?'rgba(246,201,14,.5)':'var(--br)'}`,
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
              <div style={{background:'rgba(246,201,14,.08)',borderRadius:12,
                border:'1px solid rgba(246,201,14,.2)',padding:'12px',marginBottom:12}}>
                <div style={{fontSize:13,color:'var(--gold)',fontWeight:700,marginBottom:4}}>
                  ¿Quieres cambiar tus pronósticos?
                </div>
                <div style={{fontSize:11,color:'var(--dim)'}}>
                  Compra otro paquete de <strong style={{color:'var(--gold)'}}>$20 MXN</strong> y recibirás 1,000🪙 nuevas para volver a apostar.
                </div>
              </div>
              <button onClick={()=>setConfirmReset(true)}
                style={{width:'100%',background:'rgba(246,201,14,.1)',
                  border:'1px solid rgba(246,201,14,.3)',color:'var(--gold)',
                  borderRadius:10,padding:'11px',fontSize:13,fontWeight:700,
                  cursor:'pointer',fontFamily:'var(--fb)'}}>
                💳 Comprar otro paquete ($20 MXN)
              </button>
            </div>
          ):(
            /* Estado: PENDIENTE GUARDAR */
            <div>
              <div style={{fontFamily:'var(--ff)',fontSize:18,letterSpacing:1,marginBottom:8}}>
                {coinsLeft===0?'✅ PRONÓSTICO LISTO PARA GUARDAR':'⏳ COMPLETA TUS PRONÓSTICOS'}
              </div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:12}}>
                {coinsLeft===0
                  ?'Has usado todas tus monedas. Una vez que guardes, los pronósticos no se podrán modificar.'
                  :`Aún tienes ${coinsLeft}🪙 disponibles. Usa todas tus monedas antes de guardar.`
                }
              </div>
              {coinsLeft>0&&(
                <div style={{background:'rgba(229,62,62,.06)',borderRadius:10,
                  border:'1px solid rgba(229,62,62,.2)',padding:'10px 12px',
                  marginBottom:12,fontSize:11,color:'#FC8181'}}>
                  ⚠️ Te quedan <strong>{coinsLeft}</strong> monedas sin usar. Debes usar el saldo completo para guardar.
                </div>
              )}
              <button
                disabled={coinsLeft!==0||bets.length===0}
                onClick={()=>{
                  if(coinsLeft!==0||bets.length===0) return;
                  onSave&&onSave();
                }}
                style={{width:'100%',
                  background:coinsLeft===0&&bets.length>0?'linear-gradient(135deg,var(--gold),var(--gold2))':'var(--surf2)',
                  border:`1.5px solid ${coinsLeft===0&&bets.length>0?'var(--gold)':'var(--br)'}`,
                  color:coinsLeft===0&&bets.length>0?'#000':'var(--muted)',
                  borderRadius:12,padding:'14px',fontSize:15,fontWeight:800,
                  cursor:coinsLeft===0&&bets.length>0?'pointer':'not-allowed',
                  fontFamily:'var(--ff)',letterSpacing:1,
                  boxShadow:coinsLeft===0&&bets.length>0?'0 4px 20px rgba(246,201,14,.4)':'none',
                  transition:'all .3s',marginBottom:10}}>
                💾 GUARDAR PRONÓSTICO
              </button>
              <div style={{fontSize:10,color:'var(--muted)',lineHeight:1.5}}>
                🔒 Una vez guardado, los pronósticos <strong style={{color:'var(--txt)'}}>no se podrán modificar</strong>.<br/>
                Para cambiar necesitarás comprar un nuevo paquete de <strong style={{color:'var(--gold)'}}>$20 MXN</strong>.
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

  const catColor={'Campeón del Mundo':'#F6C90E','Bota de Oro':'#FF6B35','Balón de Oro':'#C0C0C0',
    '1X2':'#4F8EF7','Total Goles':'#1EC66C','BTTS':'#E53E3E',
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
              {data.pend>0&&<span style={{fontSize:10,background:'rgba(246,201,14,.1)',color:'var(--gold)',padding:'2px 7px',borderRadius:20}}>⏳ {data.pend}</span>}
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
              border:`1px solid ${b.status==='ganado'?'rgba(30,198,108,.25)':b.status==='perdido'?'rgba(229,62,62,.2)':'var(--br)'}`,
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
  const t=k=>TRANSLATIONS[lang]?.[k]||TRANSLATIONS.es[k]||k;
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
  const [betsSaved,setBetsSaved]=useState(false); // predictions locked after saving
  // credito = {coins:1000, paquetes:N, paidAt:timestamp} | null

  // ── Push Notification helper ──────────────────────────
  const requestPush = async () => {
    if(!('Notification' in window)||!('serviceWorker' in navigator)) return;
    try {
      const perm = await Notification.requestPermission();
      if(perm === 'granted') {
        console.log('Push notifications activadas ✓');
        // Notificación de bienvenida
        new Notification('⚽ Mundial FIFA 2026', {
          body: 'Notificaciones activadas. Te avisaremos cuando empiece cada partido.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        });
      }
    } catch(e) { console.warn('Push error:', e); }
  };

  const login=async u=>{
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
    // Guardar en Firestore — con reintentos si Firebase aún carga
    const saveToFirestore = async(attempts=0) => {
      const saveFn=fbSaveUser||window._fbSaveUser;
      if(saveFn){
        try{ await saveFn({...u, sessionId}); }
        catch(e){ console.warn('saveUser error:',e); }
      } else if(attempts < 10){
        setTimeout(()=>saveToFirestore(attempts+1), 600);
      }
    };
    saveToFirestore();
    // Admin gets unlimited coins automatically
    if(u.isAdmin){
      setCredito({coins:999999,paquetes:999,paidAt:Date.now(),isAdmin:true});
      return;
    }
    // Check if user has gifted coins from admin
    try{
      const users=await dbLoad();
      const dbUser=users.find(x=>x.email.toLowerCase()===u.email.toLowerCase());
      if(dbUser?.gifted){
        const giftedCoins=dbUser.giftedCoins||1000;
        setCredito({coins:giftedCoins,paquetes:1,paidAt:Date.now(),gifted:true,giftedCoins});
      } else if(dbUser?.paquetes>0){
        setCredito({coins:COINS_PER_PAGO,paquetes:dbUser.paquetes,paidAt:Date.now()});
      }
      // Restore betsSaved state (locked predictions)
      try{
        const savedFlag=localStorage.getItem('wc2026_saved_'+u.id);
        if(savedFlag==='true') setBetsSaved(true);
      }catch(e){}
    }catch(e){console.warn('login check error:',e);}
  };
  // Listen for language changes dispatched from Profile screen
  useEffect(()=>{
    const handleLang=e=>{if(TRANSLATIONS[e.detail])setLang(e.detail);};
    window.addEventListener('wc_lang',handleLang);
    return()=>window.removeEventListener('wc_lang',handleLang);
  },[]);

  const logout=(reason='')=>{
    if(reason && typeof reason === 'string') alert('⚠️ '+reason);
    setUser(null);setScreen('auth');setMatch(null);
    setTab('home');setUserBets([]);setCredito(null);setBetsSaved(false);
  };

  // Check session validity every 30s — detect if logged in from another device
  useEffect(()=>{
    if(!user||user.isAdmin||!fbGetAllUsers) return;
    const checkSession=async()=>{
      try{
        const localSession=localStorage.getItem('wc2026_session_'+user.id);
        if(!localSession) return;
        const allUsers=await fbGetAllUsers();
        const fsUser=allUsers.find(u=>u.id===user.id);
        if(fsUser?.sessionId && fsUser.sessionId!==localSession){
          logout('Tu cuenta fue abierta en otro dispositivo. Se cerró esta sesión.');
        }
      }catch(e){/* silent */}
    };
    const id=setInterval(checkSession,30000);
    return()=>clearInterval(id);
  },[user]);
  const placeBet=bet=>{
    setUserBets(prev=>{
      const next=[...prev.filter(b=>b.id!==bet.id),bet];
      saveBets(user,next); // persist so bets survive logout
      return next;
    });
  };

  // Called after successful $20 payment (first time)
  const onPagar=async()=>{
    setBetsSaved(false);
    if(user?.id) localStorage.removeItem('wc2026_saved_'+user.id);
    setCredito(prev=>({
      coins:COINS_PER_PAGO,
      paquetes:(prev?.paquetes||0)+1,
      paidAt:Date.now()
    }));
    if(user&&!user.isAdmin) await dbUpdatePaquetes(user.email);
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
    ['home','🏠',t('nav_home')],
    ['cal','📅',t('nav_matches')],
    ['tabla','📊',t('nav_table')],
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
        {screen==='splash'&&<Splash done={()=>setScreen('auth')}/>}
        {screen==='auth'&&<Auth onLogin={login} onLangChange={setLang}/>}
        {screen==='app'&&user&&<>
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
                                  credito={credito} onPagar={onPagar} onReset={onReset}
                                  betsSaved={betsSaved}
                                  onSave={()=>{setBetsSaved(true);if(user?.id)localStorage.setItem('wc2026_saved_'+user.id,'true');}}
                                  currentUser={user}/>}
          {tab==='grupos'     &&<GruposScreen user={user} userBets={userBets} credito={credito} onPagar={onPagar}/>}
          {tab==='perfil'     &&<PerfilScreen user={user} onLogout={logout} lang={lang}/>}
          {/* Bottom nav */}
          <div className="bnav">
            {nav.map(([id,ic,lb])=>{
              const isPremium=id==='pronostico'||id==='grupos';
              const isActive=tab===id;
              const svgIcon=id==='pronostico'?(
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M8 21h8M12 17v4M5 3H3v3c0 2.21 1.79 4 4 4M19 3h2v3c0 2.21-1.79 4-4 4"
                    stroke={isActive?'#F6C90E':'#E2B840'} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 17c-3.87 0-7-3.13-7-7V3h14v7c0 3.87-3.13 7-7 7z"
                    fill={isActive?'rgba(246,201,14,.25)':'rgba(226,184,64,.12)'}
                    stroke={isActive?'#F6C90E':'#E2B840'} strokeWidth="2"/>
                  <circle cx="12" cy="8" r="2" fill={isActive?'#F6C90E':'#E2B840'}/>
                </svg>
              ):(
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 18h18M5 18L3 8l4.5 4L12 4l4.5 8L21 8l-2 10H5z"
                    fill={isActive?'rgba(246,201,14,.25)':'rgba(226,184,64,.12)'}
                    stroke={isActive?'#F6C90E':'#E2B840'} strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="4" r="1.5" fill={isActive?'#F6C90E':'#E2B840'}/>
                  <circle cx="3" cy="8" r="1.5" fill={isActive?'#F6C90E':'#E2B840'}/>
                  <circle cx="21" cy="8" r="1.5" fill={isActive?'#F6C90E':'#E2B840'}/>
                </svg>
              );
              return(
                <div key={id} onClick={()=>setTab(id)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',
                    justifyContent:'center',flex:1,cursor:'pointer',gap:2,
                    position:'relative',paddingTop:isPremium?2:0}}>
                  {isPremium&&(
                    <div style={{position:'absolute',top:-1,left:'50%',transform:'translateX(-50%)',
                      background:credito?'linear-gradient(90deg,#F6C90E,#E2A800)':'rgba(100,100,100,.8)',
                      borderRadius:'0 0 8px 8px',padding:'1px 10px',
                      fontSize:8,fontWeight:800,letterSpacing:.5,color:credito?'#000':'#fff',
                      boxShadow:credito?'0 2px 8px rgba(246,201,14,.4)':'none'}}>
                      {credito?'VIP':'🔒'}
                    </div>
                  )}
                  <div style={{
                    display:'flex',alignItems:'center',justifyContent:'center',
                    width:isPremium?38:28, height:isPremium?38:28,
                    borderRadius:isPremium?12:8,
                    background:isPremium
                      ?(isActive?'rgba(246,201,14,.18)':'rgba(226,184,64,.08)')
                      :'transparent',
                    border:isPremium
                      ?`1.5px solid ${isActive?'rgba(246,201,14,.6)':'rgba(226,184,64,.3)'}`
                      :'none',
                    transition:'all .2s',
                    boxShadow:isPremium&&isActive?'0 0 12px rgba(246,201,14,.35)':'none',
                  }}>
                    {isPremium ? svgIcon
                      : <div style={{fontSize:18,filter:isActive?'none':'grayscale(.3)'}}>{ic}</div>}
                  </div>
                  <div style={{
                    fontSize:9,
                    fontWeight:isPremium?800:600,
                    color:isPremium?(isActive?'#F6C90E':'#C9A840'):(isActive?'var(--gold)':'var(--muted)'),
                    letterSpacing:isPremium?.5:0,
                    marginTop:1,
                  }}>{lb}</div>
                </div>
              );
            })}
          </div>
        </>}
      </div>
    </div>
    </LangCtx.Provider>
  );
}
