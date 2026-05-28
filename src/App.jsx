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
const APP_LOGO="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAIAAgADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8NvcjNLtIGRQFPpxTvbNeu2cA0A9xSgEcD86XIzjv70YB5zU6CDpyT9aQhc5ByKN244xxSk9xSAaQmNwFICN2DgUpJ53H8KTI64/OgpASM/KKRlDdaXpzSL7nNJsoXocUnGc96UE9iKY4wST09zUNjSuDHPzEdKTK9KdHBPP/AKi3kkHrGhP8qsx+HPEMzYh0W5Oe5jx/OtIUatT4It+iuTJxjuymxRRwefpSYUcjGa018FeK2+YaHKffen/xVOHgbxcz/J4fmP8A20T/AOKrb6jjf+fUv/AX/kJVqK+0vvRlgD06mnHaDgVsJ8PvG0g+Tw1cNj0eP/4qpB8M/H7jK+FLo5/2o/8A4qj6jjf+fUv/AAF/5B7ai38S+9GASCcE00qOpHSuiHwp+IjHaPB93/31H/8AF05fhD8SiOPB14fo0Z/9npfUsZ/z6l/4C/8AIPbUf5l96OaJzx/OkIA711MfwW+K85/c+AtRcf7Kof8A2an/APCiPjCMn/hW+qH/AIAn/wAVU/VMUv8Al3L7n/kWqlN7NfeckcH2pQncnvXWf8KK+MjH/knOp/Ty0/8AiqcPgP8AGMDn4baoPqif/FUfVcTf+HL7mPnh3RyTBTwKQjmuu/4UP8YwdzfDvUQB6+WP/Z6jl+CPxXiPPgS+H1aMf+z0/qmLf/LuX3P/ACE6tPuvvOVIA70ZA4/pXSyfBv4nxNtk8GXQPoZIv/i6b/wqP4lc58IXPHrLF/8AF0/qWM/59y/8Bf8AkL21H+ZfejnfYj9KX5TkYxW23w28dq2G8NTZ6Y82L/4ul/4Vx43A2nw3Of8AtrF/8XT+o43/AJ9S/wDAX/kL29D+dfejCIUjnFAB/Ktpvh5415B8OzHHbfH/APFU0+AvGGOfDk4+rJ/8VR9Rxv8Az6l/4C/8hfWKH86+9GR1+YAU7I/yK1h4E8WhQP7Bm/F0/wDiqa3gnxarZbQ5f++0/wDiqPqOO/59S/8AAX/kH1jD/wA6+9GXnHYUuVK1of8ACHeKtxxoc3/faf8AxVKPBXiwjB0SX/vtP/iqPqOO/wCfUv8AwF/5B9Zw/wDOvvRn+hc0jYJ4FaZ8F+KDwdHk/wC/if8AxVIfBfigdNGk5/6aJ/8AFUfUcd/z6l/4C/8AIPrOH/nX3oyiceg9qUYxuxWl/wAIT4r25/sSX/vtP/iqcPBPisddClH1dP8A4qj6hjulKX/gL/yH9Zw3Wa+9f5mXznOBz2pcAmtL/hDfFKMQdGk/77T/AOKoPg3xRncdGkx/10T/AOKo/s/Hf8+pf+Av/IX1rDfzr70Ze0YORzRhQf8APFaR8I+I8H/iTyf99p/8VQvhLxGemjynj+8v/wAVR9Rx3/PqX/gL/wAg+sYf+dfejPXkGkZQc5AGBWtH4L8UnONEk/77T/4qg+CvFRyV0dz/ANtI/wD4qn9Qx3/PqX/gL/yD6zh19tfejHYAfxUoU9QBWo3grxWDhtFkH/bRP/iqG8GeKOp0WQf9tE/+KrP6hjv+fUv/AAF/5FfWcNb4196MrAJOacCp4WtBvCfiJDg6Q/vl0/8AiqQ+FvEH8Okv/wB/E/8Aiqf9n4//AJ9S/wDAX/kDxOH/AJ196KBwWxgfnS5XO0GtAeFPEZOf7Hk/7+J/8VTJfDXiGEFptHnx6qoP8jQ8Bjoq7pS/8Bf+QLEUHopr70UuvGKMDt3qabT9QtjiewnX/ehYf0qEFSxXPOemawlGUHaSsWmpK6HhTjjHSnKePmPSm/Q8d6UEDoKQx3Bb0xSDAyetODbhg/nSNjOAc+1ABhOvH0pQCG4X8KTGRleo60u7d8vSgBpx3NIOv9aVsgn5uKaMjkc0AGFP+NJuJ4z9KU5z15pCpPf60ATkblwD+NGMDml+71FITnpWzOcMgH60EAjB6fWgjIGaD3+lSAmVB4/I0ZDcEc0MQBzTRnOBQOw5QBxmkYZyBwRSrtxxVvRND1PX777Bplt5km3LEthUX+8xPAFVGMpyUYq7YrqKu2UhjqT9eelbGg+BfEXiBVmtLLy4G6XVydifh3b8Aa3otF8LeDEWXUWXUL8DIUrlEPsp/wDQm59AKo6v4v13VyyvdNFGf+WcbHke56mvpcFw45WninbyW/zfT5HFVxvSn97LA8G+C/D+T4g11ruUdYLYbR+mW/MihvEPh6yUJoPhiCIqcrLIgLZ+pyf1rDZscA/WkB4wo5r6KjgMHhv4dNLz3f3s45Vas/ikzTufE+rXBJEqxgnoi1Ul1O/mzuu3x9cVCQSvzGkLZ4Arp1IHfaJcECZx9HNMa4m3cyuP+2h/xpp4JOPxzSPk84/WkwJVurlelzIB/wBdD/jSm9vF5F7N/wB/m/xqAHOBmnEc4FNATrqN+eTez/Xzm/xpRqV+BxfTj/tu3+NQDI7UYz1qgLKazq8PKatdL/u3Lj+tO/4SPXx/zMF//wCBsn/xVVMEnk0hwGzUtLsNNlz/AISDXWPza5et7m7f/Gl/t/XD11q9/wDAx/8A4qqYIOcGkZlxkinZIV2Wf7e1vkHW7z8bt/8AGmNqmoyE+Zqdw3oTO3+NVnHvxSEcZWi4E7394x3NdzH3Mzf40gvLnGftcv080/41CN+N2OKXGOnftQBMbu4H/LzJ/wB/D/jQbu4J/wCPiQf9tD/jUZ54wRQQ33aV2Gg97mbdhriQ5/2zSi4lHSd/++zUT8DgfrQCCapysFkT/aZs8TP/AN9mkM8pxmV8f75qE8fxUoIyAKLisiTzJRn96/P+0aaZpQf9Y/8A32f8aUk9qY24Zyc1LuPQX7RLnDSv/wB9mnebKBnzG5/2zUZB7ij60XaDQlWaQjBlb/vs0nmOR8sjZ/3z/jTFB9f1oyRxnindhZDhNIM75W/76NAeXB/eN7fMaac9DScii4WQ4yP/AH2/76o8xxwJDz/tUnAHHNAxnHWkBIskg4Ejf99GkWaTnEjZ/wB40xto4/rQd3c4p3aAebiT+Jmz67jTlmcr99h/wM1COMEU4Fs4NAD2lcHBdv8AvqkaaUHG84/3qadxNJgjv9KYD/MfP32HoNxp6TzA4EjcdPmPFRYBb5moQHpmi4GhBreqW53RXrj2zU51+K7DR6to9pchhhmeEbvz61lhj0P86UuGGOn41NRKorTV156iS5XdFxtH8F6j8kb3Onv6q29Pyb/EVW1HwNq9ohuNNkjv4QM7rY/OB7oefyzUeWxweKmtL+7tG3W07IQe3SvHxOS4DEbR5X3X+Wx008VXp9b+piZxwVwQcH/Cg4PygfrXVyXOh+Jk8jxFAIrg8R6hAAGB/wBrsw9j+YrF8QeFtV8NsJLjbNbOcRXcP3G9j3U+x/AmvlcdlOJwXvfFHuv17Hp0MVTrabMziCODSk8YpByaUgjofxryjpEOCMY+vNAAAwT1pTnofwpM0wQg4zil4zS5BPXFGR0PSlqPQfk9BSkHGQKCQB60hP8A+qt3scwUMcdR2oJJBGaAcjkVIDSSehoRiGIBpxC+nStHwv4bvPFOrLplmwRQN9xOwysMYPLH19AO5IFXTpzq1FCCu3sJtRV2L4c8O3viO6aKFhFDFg3Fww4jB6DHdj2H8hzXQ3ev6folj/YfheARop/ezZyzt6k/xN79B0AqPxNq1jp8Y8MeGlMVtBlZHzlnbvk9ye5/AYArALYOM9B0r7/K8rpZfTu9Zvd9vJf1qeTXrSrPyJJZJJHaRySzHLEnkmmfdJINJkf3uaQ5AJJr1W0YpWF9C1BOW4H60mQMc0u0jLYqBgeARjn60H0BzQTx1o68560AIxwOtIQW+tK3Ix1/GmkEHA4oAApJxmnqAThuaQ5PU07BIyf50ALjA4/KkwM5zikz160hznIoAUYPC9aOAeelGMZIz09aMHqTQAgIJOG4ph+tPIwODim7Qx4agA69KQccH05oPBJzQGI4zRYBy8dDmjCgZxzSKSDkCl4zkUALuAHzDFMLHGOtLjceuOKTGc89qTuApwBxzTQMZOaU+h9aT3PPtRZ3AUHNG7JAODSEfl6UAHORx+NPoBIrAnBH4ZoA+bdSIcjilyxbFAARhcimAnPWpCM9qaCOc8UWAQEA5FKG9Rx603qaO3SgBxAbnFDEqcDpSZCjg/WgMcZJzQAEAHnn2oyvXb+NGMknNA+UfKeaTQDsbhnNNUHJXPFBJPegt6r+VFmA8gY4owPX8zSBhjaOKRsYxnn1zTAdhVFITkcUhOMA85pC2RjPFJ6AJ3/GlDBRwaawIPD5pR7mjcBzEkccU4DtnNMJGMKaC2CQh4J79qYDvvHBpQSpximnOQc/rShvnxSsgHhiTjHHpWno/iKSwjawvY1ntZF2yQyDcCPTHcVmgA0gBySG6GhxTVmLW4/xL4WXToRreiOZtPc85OWtyezeqns34Hnrj7h9166bQtbk0yRopgJLeUFZoXGVYHg5HcY7VneKfDiaRKl/pjF9PuSfIYnJjPUxsfX0Pce4NfE5zlP1b99RXu9V2/4H5HrYTFOp7k9/z/4JlA4ytIM4zS4LEcUEDd1r547xN2WxjHtSEqTjNOYc9MU3Azye3FAybB2/0oPTg/nSglhu7460i56lc1uzmGsSO9CpxkU45Y8D60mSDz+HNSA5YzIwjjRmZiAqqMlieAB7mu4vNngDw4nh6ycf2hdDzL+ZDna3TaD6LyB77jWT8O9PgW9m8T6guIdNTdFnoZiDt/75GW+u2qWoX9xqN9JeXDEs7d+w7CvseHsCoUnipLV6R9Or+ex5uMqcz9mtupCW420hwBkGnELnAH40YYfLx+NfSehykZDHkfnS4JXDUrIxwPQ0Y4IB6d6VmADHQGgn0oGe9KVOKQDec8nFAAJPGKGHc0vbpTAU7cZ70hOCSxoAJOaPWnYA6/xUpIxgU0juDigKB2otoJ2FJwOeaAGPU04KDxjGfWv1B/Yr/wCDYD45/td/sueDP2m739qrwn4Th8caOmq6Xoc3hq6v5YbOQt5LSyxyoodlAYoAdoYAknNcWNzDC5fBSrysnsbUKFbEtqC2Py7yScGg7l4PNfol/wAFMP8Ag3b+PH/BOT9m+T9p6++PPhnxxoFhrNpp+s2+k6JdWVzZC5cxxTkSs6vH5u2M4YEGReCCcfni9q4bBq8Ji8PjqPtaErxIrUatCfLNWZHz/epMOO/Wvvr/AIJk/wDBv/8AtCf8FH/gfd/tDwfF3QvAHhh9VlsPD8+taNcXs2sGE7Z5o0idAkKSZjDknc6OAAFye/8A20f+DZH41/sh/sweM/2mU/ay8H+JrbwTo76pqOjx+G7uwlnto2Ak8uWSV1LgNkKQN2MZBIrinnuWU8R7CVRc17W8zpjgMXKlzqOm5+Yx3Y60zac8d6+vv+CTf/BIf4k/8FV/FfjTR/CHxi0XwZp3giwsptR1PVtLmvDPNdvMsMKRROh+7BKzMW4wowc8e3f8FHP+DcP4mf8ABPX9lLVv2q9Q/ar8MeLrDRNTsLS+0e18NXVhOwurhbdGjd5ZFch3UlTt+UMQcjBt5zl/1hUHP3nZW167ErB4n2fPbQ/NYcHnpSAnBBHHrV+08PalqmqW+iaXB51zeXMdvaxbgPMlkcIi5PTLMBn3r9itN/4M6/jPJpcD61+3b4Ptb8wKb20i8CXsqQzbfnRZPtK+YFbIDbVyBnAzitMbmmDy/l9vK19icPhq+ITcFex+MwO4cdqFQsMjNfSHij/gmt8TtE/4KXH/AIJlaV470TUfEp+IVv4Vi8SRRypYl5VSQ3DIcuqpG5Zk5IKFQTwa/Q6b/gzw+K0ELtH+3z4Qd8fuw/gC+AP1P2k4/I1jic5y/CqLqztzK632+4ungsRVvyrY/GJkYDgUm1unWu+/aO/Z/wDiF+y18evF/wCzn8VrKKDxF4M12bTNTEDMYpGQ5SaIsAWikjZJUYgZSRTgdK+pP+CUX/BED4pf8FU/AXi/4m+Gfjx4f8D6P4V1uHSA2qaNPfzXt28AuGASJ0EaKjp8xJJLEAcZrpxGPweGw/tpzXLpr67GVOhWq1OSK1Ph0gDgnFIRjivvD/gq1/wQs+If/BLT4U+F/i54k/aO8P8Ajay8T+JW0WOz03w/cWE8EotpLjzMSSSK6bYyDyCCy8EE47H/AIJ1f8G4Pxp/4KA/sraN+1XaftNeGPBuneIr+9i0fSr7w9dX07wW1xJbPNI0ciKm6WKTCc/KASRnA5pZxgI4VYhz9xu1/M0WDxDq+ztqfnCqYHIxSsMDjnNfsvF/wZ3fF91Jb9vjwfnt/wAUBff/ACVXk37Q3/Bqd/wUI+EPhm68UfCTxl4F+KC2rM39kaBfT6fqcsYBO5IbxFikbj7izFs8ANWNLiLJ6klH2qXrdFyy7GR+yfmEEOMnvTGjPUmtvxp4I8YfDzxbqHgPx74V1LRNb0i6a11XR9XsZLa6s5l+9HLFIAyMPQjuD3r6X/4JSf8ABKD4i/8ABVb4r+J/h14K+KujeDbTwn4ej1TVdX1fT5bvd5s/kxRRwxMpYltxLFgFC9yRXq18VQw9B1pv3V1OWnTqVKnIlqfJjcEClIwRgV+nv7e//Bs18Tf2F/2TPGf7WGp/tf8AhbxJZeDLSC5utGj8KXVjLcpJcxW4WOV55F37pVIUr82MZFfl/K7RyhCawwmY4TGQc6UrpafM0q4erRaUkOYHBb8xTUBbpX1T/wAErP8AglR8Yv8Agqp8SfEng74eeNdL8KaL4S0yG71/xRrNjNcwxSTSFLe2SOIhnlk2SuBuACQsSegP30n/AAZ2fFFrcmL9vvwm0mDtDfD29UE+5+1n+Vc2JzzLMLW9nVqWfzNaWBxNWHNGOh+L2BjHX3p23IwTXfftMfADxT+y5+0D41/Z28b3dtc6t4H8TXei393ZBvJnkgkK+bHuAbY4wwyM4YZrnPhz8PvEvxV+IegfC/wbBDJq/ibW7TSdLSeURxtc3MyQxBm/hXe4yewr0/a03T9onpa/yOVxkqnI1qYWD0x+NAOB1r9mbX/gzv8AjMIkj1D9vDwhHOAFmji8BXrqr9GCsbldwB6HAz6DpX5QftJ/A/U/2bv2hPHP7PuteI7HV7zwN4rvtCutU00MILqS2maNpEDcqCV+6eQcjJxmuHBZtgcfNwozu1r1N62Fr0I800cMGwM7aQZJzjj60ucc9KCVP1r0DnEA2tyPpTmXnp1poXHP9aXqTtPWgBMAHDGl2gcZ+lJgr1FAXd0PShIAyRnFBxg89+lLsPXNIEO7BOKtIA7YIoXJOM4pdpH3aArE80WAeGwuP60YIbrmmgknBPNOBI6fzp2AcCT1GK1dEure4tpfD2rEm2uRjI6o3Zh7g8j8R3rMQb+CcUqhlwVfkcis6lKNSLi1dPchOzujN1PTrvR7+XTLxQJImw2OjDqGHsRgj61EMbc11fiu3OveF4PEsajzrEiC7Hdo2Pyt+DHH0celcmMFiDX5rmODlgcVKl03Xo/6sfQ4eqq9JS+8HYEcGmk9804hhwMUwhsctXCbrctMijj+RpvC9OPxpcjbg8n1zQeuK3ZzDSA2TmmkqvJbgVIMdCataHp6aprdrp8p+SSYeZj+6Pmb9AacISqzUI7vQTairs3NRZ9F8LWOg42yTL9oucf3mwcH6DaPwNY4K5569jWh4luftmsTOW4U7QPT2/Ws/Zk9OK/UKVGNClGnHaKt9x4jk5NyfUB8xztqRcqcgZphzuwOlOLc46VoS2bmjfD/AMQeIvCWreMdKije10gr9qjDEyEEZJAHZRyc44zjODXP4IBIq3p+rajpFx9r0vUJ7eQggvDIV3AjBB/vDk8HINQyogjWWIjDdUH8J9Pp6fl2o0Oen9YjVnztOLa5bKzStqn311v52toRbTgEmn8DgUzB3c/zp5VvWpVjpew1/vcU3cCaXB70jKuRg5o0QXDPGDS5wcBuKQYzyKMnnFPQWgpwOeppc7lxnnvQFBNLhVGc07EiSMsVrJMD/q42b8gTX9hv/BPbwVF8Nf2Cvgl4AiBxpHwl8OwMSpBLnToHc4PT5nav4/tF0S58S39v4csuJtRuY7SL/flcRr+rCv7X9E8NW/hnRrPwxaECHS7KGyjwP4YY1iH6JX59xvVcoUqfnL9D6DJYpc0vQ8o/bz+ANt+1r+xj8Tv2aZbZJZvF/gy9s9L8wcR6gsZmspPql1HAw+lfyPfs7fBf4g/tP/HPwn+zt8PtJd/E/jDXrbR9Pt2Q4hnlfYzv/dSIb5HJ6LGxPSv7K/BvjjwR46tL7V/BPiK31BNI1690i+kgJIgv7Kcw3EDA/wAUcqlT27jINfm7/wAE4P8Agktpv7OX/BYz9pD9rXW/B723hzS9aaP4QvNbFYmk1qBb6/ngz1FvHM1mCMgGeVeq14+Q5t/ZeGrqb1tePrt/kdmNwv1qrBpep+gXwF/Z58A/s1/A/wAJ/s+/DO1EOg+DdAttJ0z5cNKkKBWmbHV5H3yse7SE180f8F9beTTf+CPXx1nt7jyzJ4csIGYHGVk1exRh+IYj8a+p/wDhanha4+IVx8KrXVQ+u2uhRazdWKrkw2UtxJbxSMeg3yQzBR3ETntXxH/wcp+M7zQP+CQXj6yguxE2teJfDmnMp6yo2pxTMg+ogz9FNeRgL1s1pOW7kn+Nzrr3hhpdrHzj/wAGf3w/itPgn8dfiJNPufUPGeiaaq7T8q29jcTde+Tdj8q9k/4OpfG8Xhb/AIJbR+HROFfX/iroVpGgP+sESXdyw69AIQay/wDg0/8ACc2hf8E1fEPiqaRifEfxe1SVQVI2pbWdjbDnPOWVzXDf8HeviQWv7LXwZ8Bjbt1T4kahqDsXIb/RdNMY47g/azz2IHrX0Dj9Y4tUY7c/5L/gHAn7PKW32Pxi/Yr8HRfEv9sz4Q+ALi3Mset/FLw9ZSxr1aOTU7cP3/u5r+x6dbd9QkJPD3JAPsWNfybf8ER/B1x44/4K2/APRbW5ERtfHa6mzHulna3F2y/iIcfjX9Wh1JLG3GoXMoSK3XzpXY4Cqg3MfyBp8ZVJLFUqct7P8ycljehKS2P52P2NNUvfjR/wdMXOvEJMI/j94w1WRhMCogsodR2sDnDYEUeMV/RI6ySEFQelfzg/8G32in4t/wDBZtfiZNcyO+n+G/F+vJIDnzWuG8jLc9CL0nvziv6Ptc8QeGPA+gzeK/G/iKy0nS7Xyxc6hqVwsUMReRY03O3C7ndFGe7Ad68/iacquKpQ/lgl80dOXJQoyl3bPw9/4OxP2DZ9K8WeC/8AgoT4F0ci21dY/CfxCaFOFuUVn027fHJ3xLLbMx4/cW46tX0v/wAGpPw7fw9/wTN1bxM9oUbxD8XNZuPNP/LWOC2srZT16AxuPwNfoH+1/wDsreA/2zf2ZPGv7LXxJjEemeMdDlsTdbAzWN0CHtrtQf44Z0ilHumO9eDf8EP/AIAePv2Vf+CZPgb4JfFbRJtO8TaRrfiVdcspoyvlz/25ep8ufvIyxq6t0ZXVhwRSnj1UyNUKkvei0v8At3Vp/LYFQaxrqRWj/M+Hf+DvDxcbbwj8AvhiLrEN1q3iLWbmDPDGKOwto3/ATzD8a+7v+CK3g+DwR/wSZ+AeiwQBDcfD+HUZAO73c890zde5lzX5N/8AB3z4/u7v9rv4XeCI9QG3SfhNcXawB8+XJdancDcRnjctsn/fNft5+xb4Gk+HP7IHwm8AXFmls+ifDHQLKa3RsiOSPToA4B7/ADbq6syTp8O4WC+05P8Ar7zPDWlj6jfSyPnv9vP/AILb/sd/8E6vjnZ/s/fHrR/Hlzrd74bttcWbwv4egvLaK2nlniQOz3Ubb8wOSoUjBXk5wPZP2LP24/2Zf+Cgnw0m+K/7L/xKTXtPsrsWmsWVzaSWt9pdwV3CK5t5cNGWXJVuUcA7WODj8FP+DnjxQ2v/APBXDxPo7jC+H/A3hzT4vnzwbM3R47c3J4/xr1b/AINGvE2u2f7ZXxZ8M2V9IumXnwniur61U/JJcQ6rarA5H95VnuAD6SNWlbhyhDI44zmfNZNr1IhmU3j3RtofW3/Bz7/wTz8A/Ff9lWT9u7wl4fgg8c/DaS2j8R3tugD6voM0ywFZsffe2lljkRzysbSryNu3xz/gz58MwLdftA/ECS1A2ReGtJhmx3LahcSIOfaI/lX6M/8ABWG50+6/4JlftBRa64FqPg9r7MW6BxZuY+/XzAmPfFfDv/Bo14WvNP8A2J/ij47mnLf238WFtEix937Jpdtk59zc/wDjtTQzCcuF61OWqjJJejs7fgVUw0f7ShJdUz6D/wCDmHxzZ+Hf+CPXxC0ppP3uv+IfDulwAHqzanFcN3/uW71/L5dW0gDXJ4Cglj6Dua/ok/4OvfF8ug/8E6fCXhHymP8AwkXxfsA0glxsW2sL6bBH8WSV+mK/Hr/gk7+x4f25f2+vh3+z5qNo0ug3Orf2p4vKg4TR7MefdAn+HzFVYAf70617/DKpUsiniKjsryf3JHnZm5Sx0acfI/fX/ggf+xLP+xn/AME3vBul+JNGW18V+PU/4TDxaSmJEkvEVrS3c9QYbMW6FT0dpMdTX2n4b1nw/rsVzJoet2l6tnfTWV41pcLIILmJtssL7T8siNwynkHg1kfHn40+BP2c/gj4u+PnjoR2+h+CvDV5rV/EmFHk20LSCFR6ttWNQO7AV+c3/Bsj+1j4z/aY/Zb+LV78RrhZPEUXxw1PXdSkVsZbWYYr1xjJIAnW4A9iPQ18LVp1cSquMfRq/wA/8j3oSjT5aPkfm7/wc9/B2P4T/wDBV3xL4lgsY4bT4heFNH8SQNG+RJKYGsrhj6EzWbEj3z3r5y/4JQ+EbXx5/wAFNPgD4UuG2xXHxa0WWU4J+WC5W4I49fKxn3r9Lv8Ag77+Dk13YfA39omzRf3VzrHhXUW2MWYOsV9bc9ABtuhg8/Nxnmvin/g3j8AT+Nv+CwfwdRJAqaLcatrMxI5ZbbSrtgo56lmSvvcDj/acPRkukWn8k0eBXocmZWfVo/qXtpkuNRhmI/1lwpP4sK/jI/ap8YS/EL9qP4nePZi27W/iNr1+288/vdRuH5596/sZ8c67H4L+Huv+LroqI9I8P3185ZwoxDbSSckkY+71zX8VCTTXUQvJ2LSTjzXYnJLN8x578k153BFLmqVqj7JfqdWdTUYRihCxHakyF69aXBXnFBPbvX6DY8BWA88Hkd6Q5U8Uu0/3qFBB5NKwxMMev55p4AA+akGecfzpw3dDVIQHnqeO1JtDNtJ/HNBYg4IzQGYjaOtMNgPHKmkOT1NGSeD/ADoZgPlJ6UCEEbgb8HbkgNRvIOCc0jEHgUnzBgoPXvVJpC16k0bDoVqTzMcE8etQhuML26mnA55B4HXNGgmbPheeGaafRb5z5F7C0cgz0yMZ+vf8K5W7tLiyupLK6TbLBIySD3BIP+fete0uHtbhLpOsbg1P8TdNe08Si9KbUv7SO4T3PKMfzTP418vxRh08PCst07fJ/wDBX4noZdNqo4d1f7jncjOD0+tNJA4H5UvIPynNI24H69818Q7nsqxOn3evbrS9aBwPwpAQG610M5g+YHd19RWz4DiDa890T/x72crfnhf6msZvTOOeua3PBzm2tdSm4/1KLu/76OP5V35RT9pmVNed/u1/Qxru1JkErGeRpm/iYn8zTTyNueKVfu49qXbznFfo9zynEYeRkDH40hOeh/WnMuOCTyOMjrTduDx2qb32M3dCd/lNOZjjGaQYA6UEelGoXNb4f6j4K0rxxpWp/EXw9d6toVveo+raZYXYgmuoAfmjSQghCem7BxWZN5bSO0SlULHYrNkgZ4BPfjvUe4DqKGckYU00ZqCVRzu9UlvppfptfXV9dOwMVB5NMOM+tDEk5JoGfu+tJmisgYE8KKVcYzRvwNuMUp4GAKSuFw3HPSlynUHNIoPTNKCCeBj3qhHr/wDwT88FJ8Sv27Pgt8PJgPL1r4s+HbWXchYeWdSgL5A6jarV/Yz9sF3f5Iws1zyB6M//ANev5SP+CBXg4+Nv+CwPwN03DbbLxJd6pJt7Laabdz/llF/Ov6otf1y08I+FtS8VXbBU0rS7i9kLH7ohhaQ/+g1+YcazlLH04R7fm/8AgH02TpLDSk+5+Z3/AAb4/tiX/wAfvi1+1r8JdW1ASyWnx31TxnoqmbP+hapd3EMqJz91JbOJvTNx71+lupPZaRptzrXiHVI7OxsbaS4vby4fbHbQRqXkkYnoqqGYn0Br+XL/AIIef8FGvA37AP7eEfx8+NGo6jF4N8VeHdS0vxe+mWTXU0a3BF1BKIVOZNtzFHkDkK7EZr9Af+CwX/BxV+yl8eP2HPEP7PX7EXjvxHe+J/HkyaRr19qPhi400adorAtd7XlwHkmCrb7VzhJZScYGZzThuvUzSMaUXySUdbOy01+61zTDZjCOHfM9Vc96/wCCF37UVx+3r+1P+1z+1lNFcrper+LfDOleEI584ttDs7fUVs4QDwrMree6j+O4YnrTf+DqzW7DQ/8AgmHpehv9/Wvi7osCYPTyra+nJPPoleef8GlEM9p+xV8U9eGCL34tJAjAdoNJtePzlrJ/4O5vHF/B+yN8JfBCOBHqnxSuruTPU/ZtLlVcc9M3J/Spp06FPiuFKmvdjJL5JClKo8rc3u1+Z9P/APBuT4d0zQP+CO3wuuLWeOR9U1HxBqE/lsDteTWLpNpx3CxLx9K+K/8Ag8Ok8Tyy/s9rBp850VF8Sq12qHyhfMbDbEW6BzEjMB1IDY6Gui/4NUv2+PBWu/BbVf8Agnj458QwWPirQdavNc8DW1zOEOsaddES3UEOT880E4kkKDkxz7gCI3I/V74x/AL4O/tIeA7j4WfH34WaF4x8OXUqy3Gi+IdNS5tzKmdsgVx8jrk4dSGGTg81zV8XUyfiOVeUb2lJrzUr2a+80p0o4zLVBO10kfznf8GyvwW8YfEX/gq/4b8d6do80umfD3wxrOr63eKp8u1M9lLY26s3QO8t18q9SEcjhSR/RJ+054ob4bfsx/Ef4gyomzQfh7reoESS+WG8nT53A3fw5KgZ96u/s8fss/s4fsp+E5vA/wCzf8EfDPgfSrqcT3dn4a0lLcXUoGBJKwG+VgCQC5JAOBivzv8A+Dmf/gp74C+Cf7OWqfsAfDDxXBdfEL4hW8cPjCGxmDN4e0IsskizlT8k91tWNYj83ktI7BQY91YmrW4mzmnKELbL5J3bYqShlmDlFvufJP8AwZ9eFTP+1v8AFbxPd2JdtO+E1pbJckf6kz6nCSvXqwg/JK/Tv/g4H8ct4H/4I/fGi+s79bee903S9NhkL4bNxq9lGQpyPm2FyMc8Z7V8K/8ABoLpF1Z6T+0L46MQ+zzXnhnTIZ+5kRNRnkUc9AJIj+Ir33/g6R8fQaH/AMEqb/QriciTxB8SfD9nbqD95o3numzz0C25/HFduZ+zrcVxpLVc0F91mzHCqSytzfZn0X/wRx/b5i/b6/YB8G/FzVtVSfxbo0J8OePkDjeNWs0VGmYdvPhMNyP+uxHavpme9kueXJY+ua/m3/4Nk/26H/Zn/bsX9nPxZrHk+EfjPDFpW2eTEdtr0O9tPl5OAZd0tqcfeM0Wfuiv6T7K2G4tKmPqK8HPMBPB5hKMVaEtV6dvkd2BrxrYdSe60Z/Nb/wc56p/ws//AIK/r8PrR2jfTvBXhbQ3dpNwDzmSbIH8OBdrkeoz3r+kTRbQeHNJtvDyNuTT7SK0Rj3ESCMH/wAdr+c7/gotZt8e/wDg5nn8J2Vstwlx8cvBugLDIcq6240yKQHnp8kmelf0iapDE91PPHwGmZh9CSa9TiGMoZdgqae0Lv52OfANOvVl3Z/Kp/wXe8YL43/4K9/HjWPOQpa+LYNPDE4Cra6faW+OvbyzX6ef8Gqv7DPjz4OfBDx3+1/8UPCVzpEvxKex07wbDf27RTT6PamSWS8CtyIpp5FCEgb1ttwyrKT9/wCp/sFfsJap8Trv4za7+xn8ML/xdfak2oXviTUPBdncXk92zbmneSVGLSFudx5zzXoHxj+Pvwi/Z4+GWo/GT4+/EfSfCfhfSYN99ret3QhhQAcIneWQ4wsUYZ2OFVScCljOI1jsuhgaVO1lFebtba3dk0ct9hiHXlLufHn/AAcWfG3Svgh/wSm8faI2qxQat8Q7qx8JaNA5G64+0TrNdgDPIW0gnJPbI9RWD/wa/wDgOx8P/wDBJvR9cgh2P4g+IviO/lJ/iK3EdqD15+W2Ffjr/wAFrf8AgqjqX/BUL9pOy1jwbZXuk/DTwVHLZeAtHvvlnuPMZTcalcICQk0+yMBMny4o0X7xcn91v+CD/hbV/A3/AASA+BOnaiuHuvC1zqIwAPkutRu7hM/8AkWujH5fPKuHKcKi96pO7XbTRfLT7yKGIWKx8nHaKsfE3/B4V4nSD4ZfAP4cxE+ZeeI/EOqkCbgLBbWcHK9+bg4PbBHej/g0q/ZDv/DPwl+IP7cfijSyt34rvx4V8IyyJgjT7RxLeyqe6yXJiiz62bV5t/wdnar4n+JX7YfwB+BPgjT3vdbuvBlyuk2MTZae71DVltoYwuerPbqOnOfav2h/ZL/Z98Gfsifsx+A/2YfCEMZtPBPhi10oyxJj7Vcqu65uMf3pbhppT6mSssVXeF4eo0k/4l38r6/fovkXSpe1zCU7fCcJ+37+yDa/t5fsxa3+y74j+LGu+DtJ8Q3Vo+ral4ftYJbieCCYTfZiJsr5bukZbufLA6EivIv+CW//AASJ8Af8EutS8bXHw5/aC8XeLrfxzFYjUNP8R6daQRW8tq0pjmjMAB3bZpEOeCCPQV8n/t3/APB0drH7OH7XPj39nr4L/sw+FPGOg+C9efR08S6l4qu7eS9uYUVbrCRRMoVLjzYgQTuEee9b/wDwTR/4OO/F/wC3L+2f4M/ZU8d/sq+GvCdr4wkvLeDXtN8W3VzJDcRWc08SCKWFVYO0WzluN2a4f7GzyGAdRR/d2u9Vto/Xsa/XcBLEWb97Y91/4OMfgkvxZ/4JJ+PdVttLku73wRq+keJ7PylLNEsN2sFxJgEcC2upifRQT2r8t/8Ag1f8MRa7/wAFUv7ee280eG/hhr16ZRJgQtIba1ViO+fPZce+e1fvr+1r8IrT48/so/Ez4HXNuJh4t8AaxpUcbA4Ms1nKsXQjpLsI5HIr8RP+DRHwtcXf7Unxj8fXClW0v4aafp75PKyXWpq7Drx/x6H8q9PKsV7PhvFUnutv+3rL9DnxVFzzKnNH7J/8FK/iB/wrv/gnl8dfG0Cq76f8I/EDRIx4LPYSxAdR3kr+QZrKVIIo0TIWNVyD6DFf2e+NfAvgv4o+D9S+HfxH8J6dr+g61aNa6vourWqz2t7A2N0Usbgq6HAyDxXlEf8AwSj/AOCYjR5f/gnp8HPx8A2f9Erg4f4hjlUZKUObmdzbMMveKas7WP5EZ4ZIT+8XGaZhz05NfrP/AMHT37PX7H/7Nvjf4KeBf2af2evCPgXVb/RNb1HxCPCOiRWKXdr59tDbeaseA7B0ucMRkAkZr8mW2g/Ka/UctxqzDBxxCVr9PnY+axNF4as6d72AAmgKFPJoByeTQTg12W1MLigbjkU4e/8AOkU8kChip6mqC4rHA6c+tIRn+LmjcrZFIGxkGgBCR/EaQnPIGaUkMc9fXmgkZ/CgZPoul3Gu6va6La3FvFJeXKQRS3cwjiRmYKC7HhV55NdZ8cPBfgj4f+JbPwX4Q1v+0p9P05U13UEkzHLfM7M6oOiqilFwM8g5Oc1xXLsSR+Bp+QBz29BQrWfc46lCvPGQqqo1CKd4pbt2s299Fey7u/RCDAIUHvUqqcAjv1qMKXb0qeEYIVTRF6nYlzMcsYCkZxxXfftBadYXPw18A+MNOtlXz9Pmtbhh3cLE4zz6+Z+tcKpUDiu98ef6f+yj4dnLEtZ+J3gGT0ylxkfltr5viuLlhKcu0vzTPpMk9l9XxMJLXkTT66Tje3qmzyEnDcmkpw4+XbmkDFTxXwjZqticgEc+lNIUDHegZXGOnelK4PynHHOa6zj6AME+9bmgqT4c1Bs/8tkH/jtYh64Fbmhhm8J37pwBeR5/74r1ch/5GkPn+TOfE39iyvgjgUqYDAOTjPJHNMaQ5yrUoJHzA1+gTTa0PNi7SPqb4h/Brwv49+Bun2nw8jSV9OsVudBmCANcAqC6N/tSc5B6SCvliQGJzG4IYHDKRgqfQj1r134O/tRy/C/wHd+ENQ8PPqLxu0mkP54VIy33kfvs3fMNvOSRxkEeYeJvEepeLfEF34i1dovtN5KZJjDEI1z7KOn+c561+d8FZbxHk+KxeDxi5sOpuVObacnzO70106u9rSva99P3Lxg4g8PeLMoyjNcn/d490owxFGMGoQ5Eop8ztqmrRS5r0+XmcWrPPAz8oGfekO4jFKSVXGeKbuzy2frX6GfhAjbeg/EUpUY4NJ1ycZ5obpjFACMccAdKbvJPzdKceRyMVc0Lw5rninV7bw54a0S91LUbx9lnp+nWrz3E7eiRxgu5+gNTKUYq7Gk5PQpAjsfpmlDfNhjX2L8FP+CBf/BWb44W9tqWhfsfazoOn3IBXUPHGoW2iqqnPzGK5kWfH0jJ6V7n4e/4NQf+CnOq2K3mq+J/g/pUrDJtbzxtdSOvsTBZOv5Ma8utnmV0HaVWP3o6oYDF1FdQZ+ZI5zzikcY71+mHir/g1P8A+ComhQLJoV38Kdec5zFpvjqSJl4P/Pzaxg5+tfNPx9/4I3/8FN/2ZbKfWPi9+xj40g0y3DNLrOhWaaxZoi5y7S2DzBFwM5fbxV0c5y3E6Qqq/qiJ4LF09ZQZ41+zX+058b/2QfjZo/7Qn7PPjVvD3izQhOunan9ihuVVJomhljeKZWSRWR2UhgfUYIBr6l+IX/BxD/wVq+KfgLWvhx4r/aR0saVr+k3Gm6mth4C0u3ma2niaKVUlSDdGSjsNykMM5BB5r4mktHBbCZ2OVbnoR2PofamqpXGK1q5bgsTUVSrBSa6tJkRxNenDkjJpDY4BEgjh4VQAB6AdKkSRwd2elISepNM8wk8V3+7HZHPeT1Z9K/sd/wDBWf8Abs/YK+HupfCv9mD4w2mhaBq2rvqt3p174XsL9ftjxRxNKrXETuhKRRggHb8ucZyTh/to/wDBSz9s7/goJH4es/2qPivb6/a+FpbiXRLSy8P2enxQSzqiyyFbaNPMYrGi5bOADjGTnwlAG61IkfGQa4v7NwTxHt1Tip97K/3mv1muqfI5O3YueHdY1nw3rNp4i0DV7vT9RsLlLiw1CwuXhntZkOUkjkQhkdSMhlIINfefwa/4OUP+CsXwg0GHw5f/ABu0TxjbW9uIrebx14Tt725QDoWuIjDLK3bdIzk9yTXwLFGSeK6D4a/CP4r/ABr8Tf8ACFfBz4ZeIvFusEZGl+GNEn1C4A9SkCMVHucCrxuDy6vS/wBohFpd1t/kKhWxcJ/upP5H2t8cv+Dkn/gq/wDGrQpPDVn8eNL8E2k9v5Vyfh/4ah0+4k6gsLlzLNGTnrG6YxxivhPXfEmq69ql1rms6vc3t9fXDz3t7e3DTTXErkl5JJHJZ2JOSzEkmvtL4R/8G5//AAV3+KtmNVuP2Z7XwpbSIGifxx4sstPkcHt5CvJMp9mRa9dg/wCDS7/gpJcQJNcfE34LwOwBeF/FeosV9srp5B/CvKp5rw/lkXTouEe9rfizslg8yxL5ql2fG37HH/BT39t39gfRdd8MfssfF+Pw/pviS+ivdYsrrw/ZX8c1xHGY0lH2mJyjbDtO0gEAZHFW/wBsT/gqb+3Z+3t4J0v4cftR/GmHXtC0fVv7TsdMsvDlhYRi7ETxCZzbQozkJI6gMSBvPGea+mvG3/BrF/wVY8Lb5PDXh/4c+KArlUXRPHyRPIME5C3kUGB2wTnNfKf7R3/BOj9t39kGKS7/AGkv2WPGnhOxjlMZ1i+0dpdPLD0vIC8Bz2+fmjCTyHGYr20HD2nfS/8AmKtDMaNLkafL+B41oWo6p4c1S017QtTns76xuo7myvLWUpLbzRuHjkRhyrKyqwI6ECvuRP8Ag5J/4LGQWS2j/tX2km2PaZJfh9ohduOpb7JyfevheZDGAwxg8qQeCKrySHHJr2MTgsBikva04yttdJnFSxGIpfBJo9Ju/wBr79oO7/acH7Y1x8SLiT4kr4tTxOPFDWkHmDVFlEqz+Vs8rAZR+72bNo27ccV9QSf8HJX/AAWNuj8/7WFqPXHw/wBEH/tpXwec9qeqkD0rCrgMDiWlVpRdtFdLQ1hiK9Ne7Nr5n234g/4OHv8AgsHr+lTaTJ+2FLaLOm1p9M8G6PbzqP8AZkS03IfcYNfLvx4/ac/aN/ag8TJ4u/aJ+OXirxvqMJP2a48S63LdLbZ6iKNj5cI9kVa4kEngigqd2QKqlleX0XelSjF+SSFLF4iatKTY+2mnhcHd3r7Q+B//AAXv/wCCoX7PPwb8O/Af4YfH/Tbbw14U0uPTdBsr/wAD6XdSW1rGCI4vNkgLuFHALEnHevi9IWY5A/HNb/w++GPxG+LXieLwR8LfAet+JtZn/wBRpHh3SZr65f6RQKzY98YrbFUMHXpJYmCkl3WxFKpXhP8AdNpvsesfFv8A4KQ/tl/G39q/wv8AtsfEf4sQ6h8RfBn2P/hGNW/4R+yjt7AWskkkIW1WIQsA8sjHcpyzZPQY9t1H/g5C/wCCxNzbSQf8NO6TGzoV86H4d6OsiE/xK32bgjsexpPg7/wbsf8ABXH4uWa6m37Lh8K2skYeObx14js9MdsnGPJaRplPfDRivWI/+DTn/gprd2yzXPjb4MWshXJgl8aXzMvsSlgV/I14GNxHDCUYTcHy6JaO3kejRpZtrKN9T8xJL2/v7qW+v76S4nnmeWe4mcs8sjsWZ2Y8kliST3JNdV8IfjD8RfgP8TNA+Mfwn8Ty6N4l8L6rDqWh6nDGjtbXMTZR9rgq4zwVYFSCQQQTX3X41/4Nbv8Agq/4Ohmn0HwN4B8VeXjYnh34gwK8vBJ2repb9OnJFfJ/7Tf7AH7aP7H4aX9pL9mLxl4QtRIUXVdR0hpLByOy3cJeA+3z16uDzTKsTS5ITi79Lr8jkrYTGUp8zi/U+gLn/g5K/wCCxiA+X+1Tp+7qrN8OtDJU+o/0Svnz9kP/AIKN/tkfsLeJPFXin9mL4uL4dvfGqwjxLJLoNjereeVJLLGdtzC4jKvNKfkC/fx0AA8TlLMR0IPIYHg09IjjO3NZxy3LnCUadKKjLdJKzt3KeKxN05Td15n3HY/8HGv/AAWEhbJ/apsz/veANFP/ALa1ot/wcjf8FhguwftTWA47fD3RP/kSvg8DbwKC4I5J/OnDJMnitaEP/AV/kJ43GP8A5eP7z1r9sD9t39p39u34jWXxV/ak+JreJtb03R10rT510u1s47e0WSSURrFbRxoMySuxbG4k8nAAHkgK5ORShs4y1OwpOcfjXfRo0qMFCnFJLojCVSc3zSd2NwcdKNpFOJCxmQsAqj5mY4Ar3P8AZu/4Jn/t9/tdWEWs/s6fsmeNPEmmTnEOtjS/senP15F3dNFCw4PKuamtiKFCPNUkkvPQqFOpUdoq54Xggcmg4xgfrX6ReB/+DWT/AIKqeKbeKfX9K+GfhppId7Ra14+EkkZz9xhaQTDd9CR71s6t/wAGnv8AwU10+wlvLDxd8Hb+VFylpb+NbtHkPoDLYqo/EivKfEOUqVvar7zqWXY23wH5iMAPxpMEcmvuD4vf8G6v/BXL4S2Nxq7/ALLJ8UWdsAXn8D+JLLU3cYP3IFkWdsYxxGa+Q/ib8Ivij8FfE8ngv4xfDbxB4T1eJtsml+J9Fn0+cH/cnRSfwzXdh8wwWK/hVFL0ZjUw1elrOLRzIBzgUu3rzT3hdGwynNdgf2evj0PCel+PG+Bfjb+w9dkSPRNaHhC+NnqDMkkirBOIvLmJSORwEJysbkcKcdE6tOnbmdrmcYzn8KucYRxkNj0oPBy3er2reH9c0OGxuNZ0O8s4tTsVvdMku7R4lvLVmZFniLgCSIsjqHXKkowzkGqW35ueapSUo3i7oTTTs0CHLYU4GKsxrgVFBEQ5J9OKn4HANNKyNKauPBBHBr0ZoUuv2MtamkGWs/G9r5Z/u7woP/oRrzbI616bZAH9ijxVKf8Aod9OA/KPNeFxL/yLb+aPZyr+NNf3JfoeKEPndmmk45JpxLAEimF8HkfrX589ztWxOTjhfSnK3GM/Wmsc4Wgkfd3V1nGthzcfdOfet7w6d3g/U+el1H/6DWAR1ANb/hvA8Haqdp/4+4uf+A16uRa5nD5/kzDFfwWUvmB49KQFgchuKcNx6U3k9M1+iW0PJYrZJ65o4x1oGeopeh5FQ0S3YaVQ855PalaMbeOKeMA5FIcEYpcpF2QlSpzSgM5IUc04qWO0Hn3r7r/4IL/8EtYv+Cjf7UsmufFXRpJPhV8OWgv/ABmNxVdXuHLG10oMOcSlGeUjkQxsMgyKa48djKWAw8qtR6I2w9GeIqqEep1H/BIj/g3z+NP/AAUHsLL48fHbVr/4ffCOZw9jfR24/tbxKgPP2GOQFYoOo+1yAqTxGknJX9/v2SP2EP2SP2GvCcfhL9l34GaJ4X/cLHeaxDbibVL/AB/Fc3smZ5STk4LBRnhVHFeq6dp9jpVhBpml2EFra2sCQ2trawrHFBEihUjRFACIqgAKMAAACrCAE8mvyDNc8xuaVPfdodIrb59z7LC4KhhY+6te4jK2c9SepPWkaMg5B4qUMAcZzQ4U14p2XI1baMEVLbyGFvMgdkb++jFT+YqMp7/hSZKjGcUbCPmP9u3/AII+fsG/8FA9IvLn4ufB6z0XxbMjG2+IHg+3isNXikOcNK6L5d4vqlwr55wVPI/nc/4Kkf8ABIz9ov8A4JffEKCw+IBTxH4H1u6eLwn8QtLtWS1vmALfZriMljaXYUbjEzEMAWjdwG2/1gK5Jwa4f9pH9nP4R/ta/BLxF+zz8c/DKat4Y8T2DW2o25AEkJ6x3ELEHy54nAkjkHKso7Eg/RZPxDi8uqpSblT6rt6Hn4zL6OJg7K0u5/GKyNu2FaesODuK167+23+yV41/Yf8A2pfGv7LfxCl+06h4S1c28GorHsTUbN1EtreKOcLLA8cm3naWZeq15MxCn5uK/YKFSFekqkXdNXR8ZUUqc3B7oZtA6Vp+DvCPizx74o07wR4H8NX+sazq95HaaVpOlWj3Fze3DnCRRRICzuTwABUXh/QNa8V67ZeF/DOj3Woanqd5FaaZp1jbtLPd3EjhI4Y0XJd3dlVVHJJAr+lv/giL/wAET/Cv/BOTwJD8ZfjPp9jq/wAbdfsAuqXybZYfC1u6/Nptm/Qydp7hf9YQUQ+WuZPIzzOqOUUOZ6yey7/8A7MBgZ42pbZLdny5/wAE0/8Ag1h0m2sLH4s/8FLdYknupVWa2+FHhvVCkcHfbqV9Edzt2MFswAxzM2So/X/4PfBD4Pfs7+Dovh78BPhX4e8GaJCoC6X4Z0mKziYgY3OIwDI3qzlmPc10/lFeRk/0pwXjBP61+S5hmuOzOpzV5adui+R9hh8Lh8NG1Nf5kflIOcUBc8j+VSgjkEc0ABcjI/GvNsdDeoIx+7inTFLmzlsLiJJLedCk9vKgeOVSCCGQ5DDk8EEUxmC8CkMjDvTTcdhNXPz+/wCChP8AwbpfsKftl2F/4v8AhN4at/hB4+lDSRa94QsFXTLuXn/j800FYmBOcvB5UmTkl8bT+AH7d/8AwTw/af8A+CdnxYHws/aR8Ei0+2eZJ4f8SabI0+la7Ahw0lrOVGSMjdE4WWPcNyAEE/2A4JGWP4V51+1h+yL8Cf23fgbrH7PX7Q/g2PV/D+rJuR12rdabdAER3tpKQTDcRk5VxwRlGDIzKfqMm4nxmAmoVm50/wAV6P8AQ8zGZbRxEbxVpH8anlFjjbgUvllTgnpX0L/wUh/4J7/F/wD4Jt/tLal8APiev2+0ZDe+EvFMEBjt9e0xmIjuUHOxwQUliyTHIrDJUozfPspBPHbrX6zh69HE0Y1Kbumro+QqQnSqOElqiM/Kcnmli2u43dCeO+T6UojLkA5Nfsd/wbH/APBJjRPihqX/AA8e/aC8LR3mjaHqr23wo0a/h3RXeoQNtn1d1bh1gkHlQA5HnLJJjMKE8WaZlSyvCutU/wCHfY3wmGni6qhEP+CUf/BsTrXxd8N6d8ev+CilzrPhfRb1UudI+GGnSfZtUvISNyyahMctZIwx/o6Dz8H5mhPy1+1vwD/Zs+AP7KvgmL4d/s3/AAd8PeCdGiQK1r4e01IGnI/imlH7yd/V5GZj3Ndkpfklie5JOeadlum39a/IMyznHZpUbqy93olsv8/Vn2OGwdDCxtBa9wOQxIA/CmYBapMZPH60eSOcmvKsddxigHjt9KivLC31Czl028t457WdClxbTRh45VPBDI2VYexBqwSuMLSq6j5cflRs7hdn54f8FD/+Dbz9iX9sXSNR8a/Arw9ZfCD4iyo81vq3hyz2aPfz4JC3unphFDHrLbiORSdxEmNp/nq/a3/ZD+Pn7EHxu1T9n79ozwPJoniDTQJYyH8y11G1YkR3drMMLPA+DtccghlYK6so/skMhAzmvkP/AILMf8Ez/C3/AAUs/ZM1Pwjp2iW6/EfwtbT6l8NNZZVWRL0Luewdzz9nugojZScLIYpOqc/X5BxNiMFVVKvLmg9LvVrz9DyMfltLEQc4K0l+J/KOzAUgKjirN/pt5YXUtnf2MttNBK0U9vcIVkhkUlWRgeQysCCD0IquVwen51+qq80mfJv3XYVVB6rXr/7Fn7Df7R37fXxntvgb+zZ4IOq6m6CfVNQupDDp+jWmcG6vJ8EQxjoBgu5+VFduKzP2R/2VPi9+2j+0B4b/AGbPghoS3viDxNeeXFJOxW3sbdRunvLhhnZDFGGdjyTgKoLMoP8AVr+wB+wP8DP+CdP7PGnfAH4JaYrFAs/iXxLPbql54h1Dbh7y4IyfURx5KxJhF7k/M8Q59HKqShT1qPby83/Wp6eXZe8VLml8KPnD/gnN/wAG8f7Ff7EemWPjX4q+H7H4s/EeJVkl8Q+J9MV9O0+XHK2Ng+6NAD0mmEkuRkGP7o+++saxEDYi7Y0H3UHoB0A9hSgBff1py7M/MtflOKxeJxtTnrScn/W3Y+spUqdGPLBWG+UuMk4oLAdBTyARjP601hxxxXPYsaF8wcjv3rL+I3w0+Gnxj8KzeBvi/wDD7Q/FejXCFZ9K8S6TDfW7gjB+SZWA69Rg1rKrDkml8x5JBEgAZmwCT3pxcoO8dxNKSsz8Bf8Ag5D/AOCaP/BPH9iHwn4O+J37OWlX3gzxj401+a3j8B6dembS5rKGMvc3qxylpLXY7wRhUYxsZcBV2k18J/syf8FHfjR+yhqPw6uPh/p9rdw/De/8R3dnY6hql2bbUH1e0W0cSxLIFQQxqfL8sDmRyfvGuy/4LfftyD9vH/goT4y8f6DrRuvCHhSU+FvAmyXdG1haSOslyvb/AEi4M02e6tGOwr5BDN61+z5TgpVcrhTxl5u13fzW3yTsfG4vE8mLcqGnp5HtH7a/7avjn9uDxt4R8e/EDwb4f0K78J/D+y8J21l4Ws/sth9mtbi6khMNsPktlCXATyk+UeXkY3YHjcZJbnpSJuzjFPGAcqK9ilQpYemoU1ZLZficdStUqzcpu7Z9C/sifsfR/Fuxl+InxGt7qLw8mY9PtYXMUmoydCwbqsSnjI5ZuB0NeU/G3wt4R8HfFfXfDPgXUzeaVZXpitZWlDkHaN6bhjdtcsu7vtrY+H/7UfxV+G3w31T4X+H9VC2Wogi3uZHYy6eGGJPJOcLuH/fJJYcmvPy67gAMDoOa+IyDK+LFxTjcfmeIX1d2hRpRfu8t0+eS6S6ebcvs8p+l59nHA74Hy7K8nwr+tpupiK017/NrH2cWt6f2uytH7XMNbrgV6nYL/wAYN+KSOv8AwnWnj/0XXlpOeMfU16pYIw/YZ8UtnA/4TvTsflHXv8S/8iz5r8z47LH+/l/hZ4a+4EnFRynNSMCuWJ/Co3Ve/c+tfnlj0Cc4Iz0pBwORTz2AH40pBA5FdjRxpjV3kYzxXceA7EXPwi8VzkDMN9ZEE/8AAga4k5xgHHrXoHw2wfgv4xBbBN7ZAfma9XI0/wC1KdvP8mY10nSaOWMWzKk9KYydwfxq3JGpByagmQLztr9IcWeNJOJCcHvzSqMcn+dNJyD25pwJPAaosYuVxV+fvQRngfrSh+MCgkYyevalyk3ESJSryTNgICWPoO5r+qT/AIILfsqWP7KX/BLr4a6PLpa2+u+N9NHjLxRIV+eS51FVlhVu/wC7tBaxAHpsPrX8rbLugktyeJI2Q/QjFftX+zT/AMHb2n+FfDeleBvj1+w/ttdK0q3sodQ+H/itR8sMSxLi1vIwFG1VwBMcYxXx/FeCzLHYeNPDxur3e3y3PayfEYWhNyqOzP3Az69qVgMcLXw18Ev+Djf/AIJM/GZltdU+P174EvXYKtp8QfDlxYqflyT9oiEsAA6ZaReRxX1z8Kf2hfgN8edNj1P4GfGrwj4wt5CAk/hjxLa3w5YrkiGRiBkHqB0r8xrYDGYb+LTlH1R9RTr0ai92SZw37an7d37Mv/BP34Vj4vftO/ERNF0+4na30jT7aBrnUNXuQu4wWlsnzSsBgs3CICC7KCK/NPxj/wAHgvwhsvEM1p8Pv2FfFWp6UrYt73W/HFpYXEg9TDFb3Cp9PMNfm7/wWs/bb8Qft1f8FA/G/j6PXJJ/CfhXUp/DHgKy8wmKDTrSVommRega4mWSdm6kMg6IuPkfYy/MG5r9Byjg/CSwsamKXM2r7tW8tLHzuNzqrGs4UtEj+oz/AIJ2/wDBfH9ir/goN4vsvhBYRax8P/iBqCn+zvCvi0xNHqjhSzR2V5EfLnkABPlOIpGAO1GwcfcG1X6DFfxP+HPF/iLwRrNr448LatPp+raHdR6hpV/bSFZLW5gYSxSoezK6KwPtX9nPwR8eap8T/gz4Q+Jeu6eLW+8R+E9M1W+tVGBDNc2cU8iewDSMK+b4myShlVSM6L92V1Z9Hp+B6eWY6eMg1Nao6RoyOnFICeuak+UjgfrTJFJHHH0r5Y9U/CP/AIO8fgzpeifHj4P/ALQthZ7ZfE/hLUdA1WZIcK8mn3CTQFmzy5jvZFwRnbEOcDA/HJojK5VT+Nfun/weBzqvwl+A9iW/eP4v16RVz/CtjaqT+bCvwzsbS8v5Es7C2M1zLII7eFeskjHCoPcsQPxr9j4Wq82SQlN7XX46Hxubwtj2o9bH67f8Gqv/AATst/iX8UNc/wCChXxS0NJ9J8DXbaL8O4bmIFZtaaMG6vgD1+zQyLGh5xLcEjDRCv3uRVUbTxXj3/BP79ljSP2Jv2Mvhz+zBptpFHceF/DMEeuSREEXGqyjz76YnvuuZJcH+6FHQV7EQMYBr8xzrHyzDMJ1PsrRen/B3PqMFQWHw6j94o29Ov40FMH5aagwcZrh/wBpb9o/4W/skfAfxV+0f8a9Zaw8M+D9Ie/1KSIAyzYIWK3iUkBppZWSKNc8vIvQZNeZCEqk1GKu2dLairs6Dx5488E/C7wte+PPiR4x0nw9oenJvv8AWtd1KK0tbdfV5ZWVF/E5NfL2v/8ABd7/AIJEeH9el8O3/wC3f4OkuYZfLd7C3v7qDd7TQ2zxMP8AaDEe9fzt/wDBRb/gpd+0d/wUp+Ltz8QfjX4inttCt7t28J+ArW6Y6ZoFuchUSPhZZ9uPMuGG92zjau1B87ASb8hvwFfoWC4G56KliKj5n0VtPzufOV+IIxny046d2f2TfAn9p/8AZ2/aj8PyeKP2cvjl4V8cWFuAbmbwxrcV01vnOBLGp3w/8DVa7xF3HJFfxnfBX41/FP8AZ/8AiNp3xZ+C/j/VfC/ibSplk0/WdEvGgmjIOdrEcSIcYaNwyOMhlIJFf02f8EWv+Cqenf8ABTn9nK81PxjZWWmfEvwRNBZeOtMsRshuRKrG31KBM/JFPskBTny5Y3UfKVz42fcL1sopqtCXND8V/mvM7svzanjXyWtI+yF6kgYpyuScbsUwkkHJoViOcV8oesfGX/BeL/gn/Z/t8fsF6/p3hrQ1ufiB8P4Z/EfgGWKMGaaWKPN1YKepW5gQqF6GWOBv4a/lcDxyKssDlldQwNf24xu0cizgjcrAjPqDX8mv/BYf9lbTP2R/+Ck/xb+D2gQxRaM3iM634ehgjKpDYalGt7FCoPaPzmi9P3VfoXBWPnJywsntqvyf+Z89nlBKKrL0Z87fD3whr/xC8a6P8PPClt52q+IdWttM0uL+9c3EyQxD/vt1r+yj9nv4H+C/2ZfgV4Q/Z38AWqR6P4J8O2ujWWxNvm+RGEeUj+9JIHkY92kJr+Pv9nL4yX/7N/x+8E/H/SfDFhrV14I8UWWt2ukaozrb3cltKsqxyFPmAJUcjkEA84xX7ZfA7/g7s+AOvrFbftE/sk+MfDdwzYuL7wdrFtq9sMk/MEn+zSgdOPmPXrXdxdgM0xns1QhzRV72a306ehzZNicJSjLnlZs/X/YOucUhODwa+Ufgl/wXC/4JXfH+SGx8G/tk+GdLv5pEiTTPGazaHOZGOFQfbUjRzn+65HvXtHxu/am+FHwQ/Zn8bftRT+JtL1rQfBXhi81i5k0rVIriOcwxM0cAeJmUNJJsjHPJcV+c1MFi6dRQnBxb01TWp9LGtSlG6kmjyn/goJ/wV1/Yv/4JuwW+kfHrxteX/iu/tftOm+A/Ctqt3qs0ByFmkVnSO1hJBAeZ13YOwPg4+EYf+DwD4NP4lWzn/YR8YLpJlw16njqya6CZ+8IDbhCcfw+aPrX4ofHr43/En9pL4u+JPjz8X9fk1PxR4t1aXUdavZGJzI/SNAT8scaBY0QcKiKBwK4wO8fUn86/TcFwXgaVFLE3lL1aV/Kx8viM8ryqfurJH9cn7Av/AAVC/ZH/AOCknhS91v8AZ08Z3S6xo8aP4g8G+ILUWuraYrttWR4gzJLCTwJoXePJCkq3y19DhGPPev5Rv+CIvxn8ZfB3/gqr8DtS8G6hNAde8b23h3V4Ym+W70+/P2eeJx0ZcMsnPRolYcqDX9XocMAR6V8NxDlNPKcWowd4yV1c97LsZLF0eaSs0RFCDndTt7xfvEfaynKn0PrSykgcfzpjhiuf614J3n8qX/BeL4L6N8BP+Cr3xi8HeGYI4tN1fW7fxJaQRJtWL+07WK8kQDtiaWbpxgivj+NQzbmGRnmv0h/4Ol5LK4/4KsXEdsqB4fhf4eS52gAl8XTZOOp2lB9AK+JP2S/2ftY/aq/ae8A/szaG7RT+OvFtlpD3CjPkQyygTy/8AhEj/wDAa/b8sxDWTUqs/wCRN/Jav8D4fF01LHyhHufvV/wbDf8ABPaw/Z1/ZMk/bF8d6EieM/i9brJpLTx/vNP8No+beNSeVNzIpuWx95Ft8/dr9Pwi9j+BrO8LeGvDvgnwzpvgnwdpkdlpGjafBp+k2cQwtvawRrFDGPZY0UfhV/JB5Nfj+Y4yePxk68+r+5dEfY4ejGhRVNdCTy8Hmue+J/xJ+H/wb8Cat8Ufir400zw74c0Kza61jW9Xu1gtrOEdXd2OBkkADksSAASQK3ldywjVSSThQOpJr+b7/g4t/wCCoOu/te/tUap+yt8NfFUg+Fvwv1V7H7NaTEQ67r0JKXV7Jg4kSF90EIOQNkkg5k46clyirnOM9jDRLVvsv8zLG4yODo88t+iPrj9qT/g7g+D3gnxVP4c/ZF/Zk1HxxYW8rIfFPi/WG0e2uQMjfBapFJOUPBBlMTY/gFeH6H/wd+/ta22tRz+Jv2RPhfe6aGPm2tjqup207DBwBK7yqp6c+WfpX5MvbvOpZE3VVazuN3ywk1+mf6q5JhYKEoJvzbv+f5WPlv7Xx1V3Tsf0Bfs5/wDB21+yl46uLfSv2lv2cvGHgCWTCzav4fvYtesIzz8zIFguVX/djkI969N/4Kqf8Fpf2YvDn/BMbxX8Tv2PP2jvDXinxJ44T/hFfC39h6oPtunTXcbC5upbZ9s9u0FsJWHmIuJGi9RX81x82FtrDBBpJXMh3soyRgtjnFc3+p2WfWIVabaSadt07dNdfxNlneK9lKE0m31GyCLy1jiTCooVR7UwYBxnHtTsg96TJzxzX1kYKCsjyeZyd2KuM7d1LyOVaj5QMj8qGG3j16UwuLyCGz3qRR8uDUYH8JPNPjJxjHP1pJWLhKz1HqM969asNn/DB3izPUeP9NA/75jryReuBxzXq1ixH7Cfi0A/8z9pn/oKV4HEr/4Tf+3o/me5letd/wCFnhu3LE7v1pkgzkYpxG35qazDOOee1fnx3FpRhdxH60AktkDr704rn6etGB0ruaOMYRliAK7jwA7L8H/FaluGv7P+tcQSOhrs/BMmz4S+J03fev7X+Rr18gjfNYfP8mc+LfLQb9PzMkOGHH86R1XbkH86hjkI4zUm8YyTn3r9Hex5TqRkiFkxnJFMGcnIrTltzfaU1+HBe0KxuuAP3Z+6eOuDkZ9xWe2WNZRtK/kckaik2uwgGfutTjz0pAnrSqBj5aGhthj0oGc5B4+tLj/61Iyg9/1qRDlmePO1iPxpba5nsbxdRsJnt7hTlbi2cxyA+zLg/rUfU04YPAPFS4Qe6GpSjsxFfJxu9+TTokErYNNWBpWwo/Ovvr/gk1/wQS/aD/4KH6hp/wAWPicdQ8AfB1n8xvFM1sov9eVTgxaZDJwykgg3Tjyl/hErAqOfGZjhcupe0rySS/rbqbUMNWxU+Wmrs82/4JHf8ExPiF/wUq/ak0vwNYaRcQ/D7w9fW998S/EhiIgtLAPuNmr9Dc3IUxRoMkBmkI2oa/q2is7ayiW0sbVIIIkCQwRLhYkUYVAB0AAAA9q4b9mX9mf4F/sffBzS/gL+zr8P7Pw34Z0lSYrS2y0lzMwAe5uJW+e4nfA3SuSxwBwAFHflt5zmvxzP85lnOJ57Witl+rPtsvwSwVHl6vchLMpwTStIuDlqc4GeFryz9sr9rL4R/sN/s6+Jf2mPjXqQi0fw9aZgsUkCz6tevkW9hAD96aZ8KP7q73OFRiPDpU51aihBXb0R3SlGEW3sfij/AMHaPx/0bxz+2F8O/wBnfSbiKST4d+CJr3WGjclorzVZkkWFhnAK29rA/ricdsV8O/8ABJ74M2vx7/4KX/BD4U6nYrdWF/8AEWwutSt2OBJa2bNezKeRwUtmFeZ/tE/Hn4hftN/HLxZ+0L8WLsXHiTxlrs+qaoyElI2kPywx56RxoEiQdljUV9i/8G0vh7TNe/4K7eCL3UIdz6R4U8RahZ8/dnXT2iVuvZZnr9klhVlHDzh1UH9//Ds+KVZ43NE1tf8AA/poM5nZp2O5nJZj7nmlWTjJFMXKjaOlLznOa/GOp9sKTk5BxX4zf8HeP7T+qaJ8PPhR+x34e1QpH4i1C68WeJ4I2IMlvaEW1ijeqGeS5kx/egQ9hX7MF8c7a/nG/wCDprxtceK/+Co58LSXczweF/hholnDDIfkiaY3F05T2bzlJ9xX0nCuHjXziDlrypv+vvPNzWq6WClbrofmjvaR97mpQy4wM/nSMgGcUKcds1+zxSgrI+Db5ncdv2jI6ivvL/g27/aM1X4E/wDBVDwh4Wl1JotI+J2nXnhPVoWf5JJZIzcWbEZxuW5t41B6gSsB1NfBi5zkmvYP2CfFz+AP23/gx43h8wtpfxW8PT4ifazD+0oFIB9wxH415ucUY4jATg1umvwOvL6jp4uMl3P7AgwKCTb2zRkE/KwBp90gju5oFbhJWX8mIqPlTgV+DdbH6GKcZw3avwO/4O6fhrb6J+1z8KPi3biNT4n+G9xp1wiqQzSaffuQ7HvlLxFHtHX74AkElevvX41f8Hf9raN4E+AN88Kfaf7d8RxCXaN3l/ZrFtueuN3OPWvo+FK0qOd07dU1+B5ubwU8BO/Q/DOcnec0iZ/vcfWnSqwkNN2Ed+a/aV7yTZ8E9NB/muIzGDlSOVIyKZFfXlhaT6fYXU0FvcgC5treVkjmwcjeqkK+DzyDzSMBj5QfzppXdyBUyhB9C4SktmIJSV60qKshwzdaFtJJXCRISXYKiqMlmJwAAOSSeAB1Nfr5/wAEjv8Ag2i8afFSbS/2hv8Agopot54b8KHZdaV8LjI0Oqawv3lbUGGGsbcjH7gEXDg4byR97z8yzfC5ZR9pWfp3fp/XqdeEwVbFztBGZ/wbCf8ABMXxv8T/AI/2f/BRD4n+G5bLwR4F+0x+A3vIiv8AbutOjQNPED96C1R5CZOhnKKpJjk2/wBAADABMYwKoeGPDvh7wZ4csPB3hDQLHSdI0qzjtNL0rTbVILazt412pFFGgCxooAAUDAq+W71+MZvmVTNcY6zVlsl2R9xhMNHCUVBfMcNu3FMeOWRhFEDuchVHuTilMqqeRXxT/wAFyf8AgptoX/BPb9kjUNM8H+Iok+Kfj+yuNL8A2Mbgy2Ssuy51Zh/DHbo/yE/fnaJRkByvJhMLVxuJjQpq8pOxrVqwoUnUk9Efgb/wWZ/aBsP2nP8Agp38ZPitoN/Fc6TH4rOiaNNBMXjltdNiSxSRSf4XaB344+fivoT/AINbPgxZ/Ej/AIKfj4i3qRtH8Ovh9qmsQBxnF1cGLT4iO2Qt1M2f9mvzke2CjakrOo/idskn1J7n3r9qf+DPzwLCr/H74ozODMp8O6LCpQfKh+3XLkN15IjGP9kGv17Pqby7h5009FFRX4I+Oy+axWZ81t3c/bVY1BxnGOlOAUnBqNTuGd1OXH8P41+M31PtTzr9sP4u3v7Pf7KPxK+OmhoH1Hwl4G1PUtJh8suZr6O3f7LGFHLFpzEoUckkAV+GP7A3/Brp+09+0BpVr8Uv25fHF18LNJvv9J/4R21t0u/Ed7v+ZnmWQ+TYFi27EnmS8ndGhr+hbK4+ZQeh5APIOR+vNNnKSDDHNepgs2xWX0JQw+jk0+broc1XC0sRNOpql0PiX4L/APBAP/gk78FtOS1t/wBlCy8XXa7TJqfxA1a51WWRlHXYzpCgPUhYwDnpwMem3n/BJb/gl5rWnvpuof8ABPb4QiJ1wzW3gyCBx9Hj2uPqDX0MIFB4NL8qVzSzDMKk+adWTfqzRUKEY2jFH54/tJf8Gw//AATD+NGn3V18K/DXiX4VazMC0F54S1yS6s0ftusr4yoU9VjeP2Ir8gf+Ckn/AAQZ/bM/4J32F58Sbuyt/iB8NrZsyeO/C1s4/s9CcKdQs2JktBnA8wGSHJA8wE4r+owu7HAptxbW2oWstjfWsc0M0TRTwTRh0lRgQyMrZDKQSCpBBBwa9fL+KMzwU1zS549U/wDPc5MTleFrx2s/I/iYeJkOOuehFIFK9RX6j/8ABw9/wRv0D9ijxnbftbfsy+GEsvhd4w1P7LrXh+zU+T4V1ZwWVYh/BZ3GHMa9IpFaMYVolH5ePEVYgnJHev1rLcwo5lhY1qez/DyPj8Vh54Ws4SIyrdhx9acAepNKQR1pfl2FeM565ruaOcZwXJpy45HQ+tIARyOv1oUMx4/KpHuPU5Gc9+K9W08E/sMeLT6ePNNx+SV5UsZ7t+VesWMZT9hPxbIR/wAz3po/RK+f4n/5Fv8A29H8z3MmT+sS/wAMvyPCiScgnHtTHIAx/WnEjdkjtTXIzgD6V+fnpmh8pX8KQgHkGlBwPWl5A6V6DRxXsQuh3cjmuw8Fgn4Y+I0I4+2W2f1rlSARya7fwIob4TeKPlz/AKXa17XDkb5tD0l/6SzhzGSWFfqvzRzBGBtApRk8VI6YJxTdjDnNfpDpniKRd0B9IGtWi+IpZ0003UY1FrY4fyNw37evO3P5V7j8Tf2VfDuo+G4ta+DEEjXSR+bHatemVNRhYZUxs3STHK9mBxwcZ8BQdm/nXsv7OHx+sPBtq3gPx9fvHpeS+mXzIXFmxOTG23J8snkEA7Wz2PHgZ1QxkFGvhpO8d10a9Op8vxHTzilGnjMvm3KnvDW016Ldr77bapHjbROCySRsjqxV0dSrKw4IIPIIPBFM2YzivRP2ldQ8Daz8UZ9f8D6rBeJf2kU2ozWhzEbo5DEHuSoVm/2ia8+wT8vevRw83Xw8ajVm1se7gcVLGYSnWcXFySdnur9BhHOMUmCrY/nUiqF+tBQ5OBzVs6+bUjIKjBOK1vA/gTxl8SvF2meAPh/4U1HXdd1m7W10jRdIs3uLq9mY/LHHGgLO30HA5PAzXsP7Bv8AwTr/AGn/APgox8Vx8Mv2dfBnnW9m6N4j8V6nui0rQoWPD3MwB+YjOyFA0smPlXALD+kb/gml/wAEhv2Vv+CZfg9X+HWjr4i8fXlmIfEPxJ1i0UX92D9+G3XLCytif+WMZywA8x5CMj5nPOI8NlMeRe9U7Lp69vzPXy/K6uM956R7/wCR8V/8Enf+DZTwn8NRp3x5/wCCkel6f4h8QxlZ9L+FMUy3Gmaaw5DalIh23swP/LuhMCkfO02cL+vlvY2tjaxWNjaRwQQRLFBBAgRI0UYVFVcBVAAAAAAAwKejEDPSnqxI64+tfk+PzLF5nW568r9l0XofYYfD0sLDlpqwwpg4IoJaOpSyHgivh/8A4Kl/8Fy/2Yf+Cctje/DrRJrfx98WRDi28DaXegQ6W7DKy6ncLkWy9G8hczuMYVFPmDHC4LEY2sqVCLlJ/wBa9kVWrUqFPnqOyPo/9rH9r/8AZ6/Yi+Dl/wDHb9pP4h23h/QrMmO3Vv3l3qVztJW0tIAd1xO2OEXgDLMVUFh/Mv8A8FV/+CrPxl/4KhfGhPFHimObQPAmgSyJ4F8Cx3O+PT42+Vrm4K8TXkgA3ydEH7tMKCW8v/bM/bb/AGlP28fi9N8Zf2lviLNrepBWj0rT4EMOn6Pbk5+z2duCVhj4GTy7kAuztzXkeQG+br7V+s8O8LUsqtXrvmqfgvT/ADPjcyzeeK9ynpH8xSuW5GT61+hP/BsaYYf+CtXh4SHBf4f+JQv1+zRn+QNfnwrKDmvr3/ghF8ULH4Wf8Fb/AIKa5qU4jttU1+50GZnn8tc6hY3FrHk9/wB7JF8p6nAr18/outldVR/lZxZZVUMdBvuf1PKxx6+1Gdw5Ximqzqo3LjjmnIATknFfgmp+iBjLYIr+bj/g6A8LXvh7/gq7rGsXTIYtd+HHh29tQr5IRIprY5HY74G49MGv6SGyDwK/En/g7n/Zx1FdY+Ef7XOj2jvay2154N16VYhtikVmvrIs3U7la8UA8fu+OtfUcIVY085jF/aTX6/oeVnMHPASfbU/FQg+lBRd2Bx7VK8bIfmNIACdtftCsz4JtpkeAOgr1v8AYL8K6j49/bd+DHgzR4BJc6j8V/D0UcZYDONSgduT6KrH8K8oMZY4Ffe//Btt+zTqXxz/AOConhrxvdaX52i/C3SbzxTqUrx5RLgRm1slz03G4nEij0gY9q8rOqscPgJ1G9k3+B2ZfGVXFRiu6P6Zrl0mupZk5Dysw+hJNAXJ5/DmoIy0ahTnGMVLHIOufwr8CUrn6Naw8odxI/KvxO/4PAfFMKXP7P3gcxv5m3xNqZfjbtJ0+AD65BP0r9tAd4zX87//AAdcfFGz8c/8FD/D3ww050f/AIQL4aWdveFHyVub64mvGRhngiIwHpnDD2r6jhGhKtncLdE3+Fv1PLzmqqeXzv1svxPy9lz5hOaaV3LxTpInDHdSIHY7VWv2a/LGzPgtW9BpjJGCK9H/AGVv2Rf2h/21Pi1a/BT9mn4Z3viXXbgCS4EA8u206DODc3c7fJbwr3dyMn5VDMQp+mv+CUX/AARA/aB/4KT6pD8QtdurjwP8Jre4K3vjW7s90+qFTh7fTIXwJ3zlWnb9zGc5LsPLr+i79kz9jz9nT9iL4TWvwW/Zp+G1l4d0eEI17PGoe81W4C7TdXlwQHuZj/ebhR8qKigKPkM94qw2XJ0qHvVPwXr/AJHvZdk1bEWqVdI/iz5V/wCCVH/BA39nT/gnvFYfFr4qHT/iL8XYlWRfEtzaH+z9AkxymmQSD5WHT7XIPObGUEIJU/fZQH5iSSSTkmlRV69aeUBHHX61+WYvGYnHVnVryu3/AFp2Pr6NGlQgoU1ZDAgB+ZvpT+AvPTFQ3U0NtE891IkaRIzySSMFVEAJLMTwFA5JPAFfkv8A8FVv+DmP4f8AwV/tP4F/8E9bnTvF3iyPfb6j8SLiNbjRdHkGVIs0PGozqc/vD/o6kD/X8qLwOXYvMa3s6Ebvq+i9WRiMTRwsOeo7H1//AMFSf+Cs37Pv/BMj4cC98aTJ4g8fataNJ4R+HljdhLq9PIFxcMMm1sww5lYZbBWNXbO3+ZX9rD9rD43/ALaPxz1n9oX9oDxYdV8RayyqREpjtrC2TPlWdrFk+TbxgkKgJJJZmLOzMeV+JfxU+IXxl8ear8T/AIqeNdT8R+I9buTcavrms3bT3N3JjGWducAAAKMKqgKoAAFc+zM3GcV+v5Bw5h8np8z96o93+i8vzPisxzSrjZ8q0iug+Odd2C3Nfvf/AMGilrF/wyf8Yb5IwJJPihZI745IXSoiB+BY/ma/AsRkNx+dfu//AMGgnilbv4AfG7wSICHsfHmk3xkLdRPp7xgY7YNsfz9q5+NOd5NK/Rx/M1yHlWOXo/0P2DjXk5GafuC8AURgg804lQeDmvxs+3IpNwU4/nXz5+2D/wAFRf2Gv2C72HRP2nfj9p2i63dW/n23hixtptQ1WSI/dkNrbqzxI38LybFbsTiuo/b6/ab/AOGN/wBi34nftPwwRS3ng3whc3mkQXEe+OTUH2wWaOO6G4lhyPTNfyK/ETx740+KnjbV/iZ8TPFt9rviTXr573XNb1KcyT3ty5y0jsfyAHCgAAAACvqeG+G/7acqtSTUI6abtnk5nmawCUUryZ/RLo3/AAdQ/wDBLzU9fXR9Q0v4raZaM7K2s3fgmF7dQM4YpDdvNg+0ZPqBX2b+y7+2N+zF+2t4Gl+JP7Lvxn0fxhpdtIseoCwd47rT5GBKx3NtKqzW7HBwHQBsHaTX8dwldW+Vq99/4Jo/to+Pv2E/2x/Bv7QfhLXbi30+31WCx8Y6fCx8vVdFmmRbq2kTOHwhMiZ+7LGjDkV9JmXBOEWHc8NJqS7u6flseZhM9rOqo1UrM/ri2se9PRSRgnmpZxDFO8StuCuQG9Rng01XQHNfmVrH1N7nnH7XP7NXhP8AbC/Zk8c/sw+NYI2svGvhy406OWRc/Zbtl3Wtyvo0VwsMqnsUr+OzXtA1nwvqt34b8RWbW2pabeS2eo2rjBhuInaOVD9HVh+Ff2sPc/Z2E6DlCGHsQc1/I1/wVa8LWXg3/gpp8fvDOnSM8EHxa1qSPeACPOuWnI44wGlIHsBX6FwHiJutVoX0spfPY+e4gpx9lGp12Pn1wxBzimHmpOpPP601mIIwK/Smj5ZMQrjnP4VNFCM7t/bpUaLukwBgj3qfk/OPyqGdVCClqx5VNo7HP516tbeWP2CvF/qPHOmkD8Yh/WvJiARljXqFs7n9hXxeAeP+E403j8Y6+e4l0yt/4o/me9lbTxMv8EvyPCiSSefzprg9c4xQScnj8aRiG/ir8+sdRp4wMqego2knmlBY9DxikIz2r1TzxAAecd673wIF/wCFReKQev2u2/lXBjJPXvXb+BiT8K/EyKCc3dtz+Br3eGf+RzC/aX/pLPOzW/1N+sf/AEpGBsHvQy5bAqTawGGHT3pPL3fMo7V+kSSW54qbZGYgDkd6PmXNPAzxj6UjEYIA/Cs3GLC7GM+etKUyME0BGY4Tr70Z5xn8awkncdw28Y96+5/+CPf/AARM+LP/AAUs8Sr8SfGl3f8AhD4O6VeGLVfFccI+1a1Kh+ey00SAqzD7slwwMcPTDv8AIPjn4U+Cv+FlfFHwz8NRO0Q8R+JdP0oyR/eQXN1HASPceZkV/ZP4L+H3gv4TeEdN+F3w58N2mjeH/DtlHpui6VYRBIbS2hGyONFHQAD6kkk5JJr4ri7O62V0Y06PxTvr2St07nvZLgaeKk5z2XQ5z9nn9nP4JfspfCfTfgh+z78OdP8AC/hjSl/0XTdPjOZJCAGnmkbLzzPgFppCzsepxgDuY0agIuOf505WI+UV+QTnOpNyk7tn2aSirIUADgjmsP4k/EfwF8H/AAJqvxP+KXjLTfDvhzQ7Q3Osa5rN4tva2cQ/ikkYgDJIAHViQACSBW2evWvAv21P+Ca/7L//AAUBfS4P2oIfGGsafoyg6boemeObzT9Pimyx+0m2gYI8+Dt81wzBQAu0ZzrQVCVVKq2o9bK7JnzqPu6s/I7/AIKp/wDBzR8Tfizc6h8Ev+CeGoX/AIO8JEvBffEqeAwa1rC4IP2JG50+E84kI+0MMEeT0P5K3Op32q3c15eXMs81xM0txcTymSSaRiSzu7ElmJJJYkkk81/SvP8A8Gyv/BI+Z/MPwh8aZP8A1UzUf/iqWL/g2Y/4JGQ8t8IfGY+nxM1D/wCKr9EyviPh3KafJRhLzdld+rufNYzK8xxkuackfzT+QxG7vUMwCDn1r+l25/4Nnf8Agkl5Z2fC3x0pPQD4mX3FUV/4Nlv+CTLPtf4W+OHHfd8Sr/8AoRXqz46yhrSMvuX+ZxR4dxf8yP5rN+eCK6L4XeO9e+FPxA0D4p+F+NU8M67Z6vpuSf8AX206TxjjsWjA/Gvt/wD4L7f8E8v2Xf8Agnx+0t4G+Gv7MWl63YWGv+AG1fVrHWdbkv8AZML6eBHSSX5xuWJsqTgFRjqa+EUMMRw5xg19JgqtHNsEq0fhkr69jysTGpgMTyPdH9lnwj+K/hT47/Cjwx8bvAt0JtG8Y+H7PW9LkDA/uLqFZlBx3XeVPoVIroiw6dK/Jj/g1v8A+CgGl/Ej4H6r+wL481tR4g8CGbVPAyXEvzXuiTSb57dMnLNbXDs2O0VyuBiM4/WUkN1PNfhma4Gpl2PnQktnp5ro/uP0HB4iOKw0akeqAMRkZ715b+2d+yT8Mv25f2afFX7MnxZR00vxLYhINRhiDzaXext5ltewg/8ALSKUK2Mjcu5Dw5r1Jk4zn86Rs+v61w06s6NRTg7Napm8oxnFxezP5Ef24P2Ev2iv2A/jHdfB79orwZLYz+a/9ia9bxM2m69bg/Lc2c5G2RSMEx5EkZO11BHPik0Nwr7DERmv7N/iX8Kvhf8AGzwbc/Dn4yfDnQvFmgXbZudF8SaTDe2shwQGMcqsAwzwwww7EV826n/wQa/4JAaxqX9uXf7C/hWOYY/d2uq6pBBx/wBMI7sRkf8AAa/R8Hx3T9go4im+ZdY2s/k2rHzFfh29S9Kenmfy/fB/4T/E747/ABG034R/BvwDqvijxRq0wi03QtEtDPcTHuxA4RFHLSOVRACWYAE1/T5/wRf/AOCY+jf8Ezf2XZPC3i27stQ+JPjOeHUviDq1kd8UciIVt9Ogf+OC3V3G/wD5aSyyuMBlA9t+DP7NX7OP7MGkTeHf2b/gV4S8D2dwALuPwtoMFm1zjOPNkRd8v/A2auxa/mHV8c189n3FWIzaHsYx5Yfi/wDgeR6eXZPRwT573kbFxOkbfIQfxqB7twTsGPrVH7eqLvmkCL3aQ7QPxNEGvaDJkDWbRiOu26U/yNfHTxGHpu05JerSPZjTqS1SuS3viTTdCsp9Y1/UorKws4JLi/vZ3CpbwRqXkkYngKqKzE9gK/kh/bq/aok/bQ/bE+Jn7TbiQW3jLxbc3mkRzfei05cQ2SH0K20UII9c1+9//BwH8a/2hNG/ZAu/2a/2Ufgr478Va78TLOW08R674Q8J32oW+jaEDi5RpreNlE9zjyAmciIzMcZXP84/j/4YfEP4Ta0vh/4n+Atd8M3u3KWPiLRLiwlK5IBCTohxwe3av03gGlh481dyTlLRK6vZdbev5HyvElSpKKpRi7LVu2lzPW1QoZHIVVGWZjgAetfrP/wRU/4N6B8edL0z9rr9vTwxeWfgq4Ed34M+HNwGgn8Qxn5lvL/o8Vm3BSEbXnHzMViwJfkL/gi7+zx4d/aS/wCCmnwi+GnjfTLO90WPXZda1aw1CASQ3lvp9tLeGF0PDq7wopU5UgnIIyD/AFPtK7MXlOWY5Jr0OMuIamF5cLhtHJXcuqV7WX3bnJw/lkKqdeprZ2SKGj6DpPh3SbTw/wCH9ItbCwsLZLawsLG3WGC1hRdqRRxoAsaKAAFUAADgVdUsv1pd4IJGM/Wmjk896/KXdu59ouxNHIc5YV5b+17+2z+zV+wn8KJvjH+0z8R7bQdMJePTLNV86/1e4UZ+zWdup33EnIzjCoDl2Rea9RQDODXyR+1F/wAERf2Ef2yvixe/Gr9o3SvH/iPxDeZRLif4k3yRWcGcrbW0Kny7aBeojjAGck5JJPXglhHXX1mTUetldmFb2qh+7WvmfiV/wVC/4LsftP8A/BQ2/wBQ+HPhq7uvh/8ACh3McHgnSr3/AEjVYweH1O4TBuCev2dcQLwMSEbz8LXEbSNu444A7Cv6VP8AiGU/4JIoxYfCjxv16D4mX/8AjUqf8Gz/APwSOC4f4P8AjT6/8LN1D/4qv0jA8V8O5fQVKjTkl6L/ADPl8RkuZYqpz1Jpn8zjiRDgLRhu4r+mhf8Ag2Y/4JDkZPwj8a/+HM1D/Gobr/g2Z/4JFxAzx/B/xk20H5W+JeoEf+hV1f675StUpfcv8zJcP4rbmR/NCjDIFfrr/wAGjHxXtPDn7UnxY+B13fMn/CV+AbTV7KBn+V5tOvNj4H97yr4n6KfSvzy/4KPfAD4f/sw/t2/Ff9n74RtfHw34Q8ZT6do41K686dIljjbY8mBv2s7KCeSAM5OTWr/wS+/a+f8AYW/br+HX7SurSyDRNH1n7J4qSPJL6Rdo1tdnA+8UjkMoHdoVr183pPNsmkoLSUbrzejRxYN/UcwSk9nZn9crEdic0wsTk1VstXtb+2jvrG8iubeeJZLe5gcMk0bKGV1I4KspDA9wRUyu55Nfhj3Pv1seI/8ABSr9nbX/ANrD9gb4u/s9eFQX1jxP4Iu4dEiCBvNvottzbR4PHzzQIme2/Pav5C7pLyElLu2khlVik0EqlXicEhkYHkEEEEHkEEV/bGS/fIr86P8AgpJ/wbf/ALMP7cHxB1L48/CHx3P8KfHesytca9LY6Qt7pGsXLZLXE1pvjaGdj9+WFwHJLNGzEsfr+F8+pZW5Ua2kZNO/Z7Hj5rl8sYlOHxI/mwVHzxXpv7H/AMAfGn7VP7T3gL9nD4f2by6r4u8U2lkjKhYW8HmCS4uHxyEigSWVj2VDX6W6R/waEftUS66Ide/bM+GdrpZlw13Z6Hqc9wE9RCyRrux28zHvX6W/8EyP+CMf7LX/AATDgvPFPgK8v/F/j/VbQ2uq+PfENvHHOlsSC1taQR5W0hYhSwDM8hA3OQAo+uzXi3LKOFaoT55Pa19H32PGweTYqVZOouVI+vrhFe5kkiJ2GRiueuM8fpSohHGPzpFdRyzUpfHIP4V+RH2KHxWn2iZLdjjzHC59MnFfyC/8FJPiBZ/FP/goT8cfiLp5RrbVvitrklq0cwkVo0u5IkIYcMCsYII7Gv6jf+Chv7Xug/sO/sa/EH9pfW7uJLnw9oEqeH7eRgDd6vOPJsYFH8Rad0JA6IjnoDX8hF1dXV0TLfXDTTyOXnlbrJIxyzfiST+NfovAOGmp1cRbTSP6v9D5ziGouSNO+u5G5B+UjHvUZYZx6U7BJ5BrsvgP8Edf+O3xJsvh5oc625uA015fSIWW0tkGZJSB94gYAXjczKMjOa++zLMMLlmDnisTJRpwTlJvolq3/Wp4OX4HFZljKeEw0HKpNqMUt227JfM5rQNC1vX7t7bQ9Hu714ozJKllavM0aAElmCA7RgdTxTLpREVWOZWyM5XpX6lfDH4TeFfgt4Xh8F/DnRzYwIB5jq2Z7mXp5ksgwZHPr0HRQAAK/Oj9pibw5c/HzxlP4QMP9nDxFcpam3ULGQrbWKgcYLBiMcc1+W8CeJlPjrPcThqGHcKVKKlGTd3K75VzK3ut7pXezP2Tj3wsq+HXDWFxeKxCnWrScXBLSNld8sr+9bRN2WrVjh84zuI5969UsUQ/sH+MX7nx1puP/IX+NeThjnGP1r1OxYn9hzxXFu6+NdP4/GGvvOJo3yy3mvzPy/KK3+0yv/LI8M45FNYbTn9akx1XOKYwyeK/Oj1TS6/x/Sgsy8ZpC3cn8aTJJ4avWaPPH4GMgfrXoPwzUN8HfGYbtdWR5/4FXnoPGCfyr0L4alf+FOeMiW5NzZ4/M17fDf8AyOKfz/JnFmCvhZfL80ZOiaJe+ItXtdA0u2M13fXMdvaRKeXkdgqr+JIr9AvBH/BOv9nXw/4Mi0Dxr4bl1vVXhAv9YfUZomEmPm8lY2CogPTIY4HOa+F/gn4mg8I/GTwr4qulVodN8RWVxKHbA2LOhOT24zzX6y3Ksk7xE52se9fjf0l+LOKckxWXYPLcROhTmpzk6cnFylFxVm007RTTtezctb2R/SX0aeE+Fs8wuY4rM8NCvUg4QSnFSUYyUm2otNXk1a9rrl0tdn55/tgfsO6n+z/D/wAJz4M1CfVvCc0oR5pwPtGmuxwqTbQA6MeFlAAz8rBSVLfPrRBflJ61+v8Armi6P4r0a88L+JNNS807ULd7e9tZfuyxOCGX24PXscHqK/Lb47/Cm++DPxW1v4cXlwZk0y7xaXDgZnt3UPDIcdyjLn/az6V9F4E+KWM4ywdXKs2nzYqilJS29pTuldpfai2k31Uk7XUm/lvHnwswPBeKpZtlEeXC1m4uGrVOpa9k3ryzSbS1s01ezSXECJRnmm7RzjtUzOFG0HFRMQDwc81/QjSP51TbPfP+CV/hGTxx/wAFLvgD4YW2SVZvi5oc0sbdGjguluH/APHYWP4V/XAxEpMpPLHJ49a/lU/4IcaVNq3/AAVy+ANrABlPHDXByf4YrC7kP6Ka/qqWaJYwA68Ada/H+O5N46ku0X+Z9tkCSw0n5gVA+63P1pQAO9IJ4gMb16+tIZogfvg/jXwh9ALzuJNGffNJ5kQ+bzV/76pGmixw64+tACkMe/60jcDafzoE8RGBIPzpDJF3cfnQA0oW68+1TWtsu7f71GJoyeGH50v2hY1JWQD6NTTsxPU/n5/4Oy9cS5/4KI+C9FjTB074LWAdvMBz5up6lIOO2BX5WTyMWOM5zX6Mf8HP+tNqv/BV3UbNrreLH4Z+HYQu77mUuJMY7f6zP4+9fnY0Y3kmv3fh2Djk9FL+VH53m008fP1/RHTfAv43/FL9nL4u+Hvjp8GvFk2i+KfCuppfaLqMPOyRcgo69JInQtG8Z+V0dlPBr+pf/gmH/wAFN/gx/wAFMfgND8RfBEtvpXi7SIYofHvgh7jdcaLdkY3pnmS0kILQzYwRlGw6Mo/lA8vDZb1rvP2cv2kPjZ+yX8XtM+On7PXxDvvDHifSSVg1CzIZZomIL288TApPA+BuicFTgHAIBHLxFw5TziinF8s47P8AR+X5G2V5q8BO0leL3P7GwMjrimGPGSScfWvzK/4J8/8ABzT+yt+0Dpdj4D/bIjtvhP40KLHJrDl38N6lJ03pP8z2JPXy58ovaZulfpFpnizQvFvhy28WeENcs9V0m9iEtlq2l3aXNrcIRkMksZZHB9QTX49jsuxmXVfZ4iDi/wAH6PZn3GHxVDFQ5qUky1eXy2vAPNZ0+sOz/fx6YqtqF1Gkcl1dXaRxRIzyzSyBURQMlmJ4AA5JNfHH7YP/AAUIk8H+FNfl+FE0yWOkaZPPc6tD8lxdBFIxET/qIy2AJD8xBLcAYr4nibi7KuFsPGWJd6k3aEF8U3tpfZX3k7Jeuh9Bk2R43O6zhQVktZSeyXn59ktWfUvjP41+DvBtxJpkspv9Sj/1lhaSDMP/AF2c/LF9Dl/9mvEfif8At0+A/D0bjVfHCK5LLFpnhuPzZpCM5XcGLHHQkmNR+GK+BvE/7T3jb4keGdPs/DNpd2mnGzhf7Hbxm7M88sZctK0TETFmJKoSQy5LZNVdM0DxXdxDVb60vo5Lq9uLZotSjkjlVoAu8FXCZjJkwiqm3gjJr+ec98QOLs3c3OaoUlpyQb01+1Pdv093sj9byvgvJMEo+0vOXdrf0Tul+L8z6M8Xft6+KtY1iGLw7Y6V4bsnYst5qrjUr+ZVzkKGzHG3HoQO7VX0v/govomkaq6eL/iZ4vu4pInVPJuo4lRucMsYXa3HGMbATnJArxyf4L3fiPRLjUIp7q6MBy0FhYtPMgAYKh3skEQGCTuLbRggdqi1L9mDWLi4F1Jpk90FJETNc+dgrkujyDYAACpbChQD1Pf4GObUudSqVW2+i7+nXfqfUTyrL1T5YxSXnv8Ae9fxPqX4Z/8ABUDTPCUb6X471PxDeaZqF1LP4U1+70oQ/bbIEoTIu8K7JKGjMsJ2HAzyK988GftJfA79p7Tn8C32naX4kiu4snQ9dt4ZkvVJYBVt74bJSQD8qvyAcCvzau/gx8VNY8Uxaf4x1bW7zT9P22li11qCT/YbBQxMNjGZAhjVcERDaMsGOc5OtBrGq/DDxMlx4N8J3v8AZsO5JIfEtxFLJM25gJTHDtS3BAUYUsVOcE5r6vDcaZlllWm8NXcoRto5JS26PW1umjPAxXCmV46EuaCjOV9Urx8rrS9+q01Pu/4Tf8E4/wDgnX8O/wBoyx/ah+A/wA0zwR8QPC/2qG4Phcz6dDELu3kgdLrS9whUPG7FWEa5IBVzX0dI91BH59yitFyDcQklB/vDqn48e9fEXwg/a31H4thV8WPb+FtZ8N2jvovjfTpJbuLTYixzbagkxzc2UuFDRbiy/fQo6K6/QHhj9svwVomj6m/xY+z+F9b8Pab9t1+xbUFktnsmyItQs7glVu7GZtqxyj5kZtkgVgRX7Zk/iNHNcKqtavzcunvbryfp06SWsX8UY/mOY8J18tm4QpWe9l+em6enmno1rFy9gVRgSBs5GQQeCKerYOWrmfB+ofEHQbLVdR+LdlpVnHLq802n/wBkTM1mliwzBh3wY5go/fBgInf5o2AbFdNNJCyCSKQYPTjFfoOX5nRxrcPhqLeL3t0fo7HzVbDzou+8e62JRIByf504SBuBn86qJdIrbDICfSp0mjHVxz716dzmsSYxkE0mRg+tIZYs5Ei/99UjXMeMbx9RTuIXcV+8TRGzPIIiMBiF/PilEqEfeBqW08hryBWP3pkGAP8AaFNJt2QnZas/kr/4KseKofGP/BS74/8AiBItiv8AF3XIFXdn/U3LW+fx8rP4189YSYlCwweor1X9ujUDrH7aPxm1h3DNdfFrxJKTn11S5NeR72Qjaa/ofLm44GEHskl+CPzXG64ucl3f5n9CH/Btn/wVH0T9oP4MWP7Bnxj8SKnxA8A6X5Xgy4vJvm8Q6DCPkiQn79xZpiNl6tAsbjOyQj9TjGVG4HNfxbeDvG/i34feLNM8d+BfEt/o2t6NfR3mkaxpd00FzZXEbbkljkUgqwPQiv3V/wCCZP8Awc/fDL4iaPp3wi/4KNvF4V8SxIsEPxPsbM/2RqpAwGvYYgWsZjxmRFaBiSSIRxX5xxNwrVp4iWKwkbxlq4rdPuu68uh9TlWbwqU1SrOzWz7n66gjGTTHk5yDx2rM8G+NvB3xK8K2vjz4c+LdL8Q6Hex77LWdB1GK8tJ19VmhZkP51ob0ZeD+Nfn7Ti7Pc+iTT2Bn5xtxQqlRkHj0pfkA9/WnGRW+UDLdgOSaAEEW/r+FJJtiUlnVQqlmZ2ACgAkkk8AAckngAGvLP2pP23v2U/2KvCr+Lv2n/jroPhKERl7bT72736heYz8tvZx7p52PT5UI9SOtfhJ/wV0/4OHfir+3Bo+pfs9fsx6RqfgD4V3itBrE9xOE1rxPCesdw0ZItbVh1t42ZpBxI5UmOvZyrIsfm1RKnG0esnt/wfkcWLzDD4ON5PXsZX/Bwt/wVg0X9vD442nwE+A/if7V8Kfhzeym31C2kzD4l1nBjlv17PBEpaGA/wAQaWQcSrj842ZWbJHXrRK5c4xjHCj0qMkgYNfteW4GhlmEjQpLRf1+J8Niq9TFVnUl1JlCNwK+zf8AglJ4GaXSvGvxJntwB9os9KtZivXCvcTKD/34z9RXxXvYnCnHvXe/CD9pj42fAfRNY8P/AAs8bvpdvrmw3YFvHKY5FBAliLg+VJtJXevOPoCPk/EfIs34q4TrZZl04xqVHDWd0uVTjKSuk3ql2d9utz6ngHPsDwrxTQzTFwco0uZ2ja93FpbtLRvvpuffH7YP7Snhn9m/4f3dkuqRt4w1Sxkj8P6XG4MsBcFftko/5ZxoCWXPLuAACNxH5mM+w4MhbnlieT71Lq2q6pr2qXGs65qlze3t1KZLq8vJ2llmc9WZ2JLH3JqvnbwTXL4d8AYPgLKpUIT9pVqNSqTta7WyS1tGN3ZXbu23vZex4j+I2ZeImawr14+zpUk404J3snq231lKyu7JWSSWg5d2c16nYhf+GIfFRJ/5naw/9pV5Yp5r1OwdT+xB4rB6/wDCcaeB+UdfRcSf8i9/L8z43Kf95+TPDnGCSPzppyec1IcgH/Goz71+bnvl9cbfl/PNOAyeKRFAXI6U8Djjj6mvYPPG4OSVBxXffDg/8Wk8YLnrcWmR+dcGAe5ruvhy4/4VT4uQHrcWp/nXt8Na5xT9Jf8ApLODMnbCv5fmjItmRQY2HDcHmv0o/Y8+O1p8a/gzYveXok1zQoY7DXImfLsVXEU574kVc5/vq47V+aLMd2Qfx9K7D4IfGvxf8CPH1t478HyK8iKYr6ymciG9tyQWifHbgEMOVYAjpzx+Mfh4vEPhn2GHssTSfPSb2btZwb6Ka0v0kot6Jn3Pg/4iy8O+J/b105YasuSrFdFe8ZpdXB626xcluz9VY5UX7xxiviP/AIKn+Hbax+IXhnxjawlX1TR5ra5f++0EgK/jtlx9AK+mfg3+0L8OPj14fj1fwTrCLdiMG+0a4kAurR8chl/iXPR1yp9jkD5b/wCCnfj6y17x/wCH/h7p94kraBYTT6gqMD5U85XCH0YRxqcdt9fyb4HZTnmVeLNLC4ijKnOnGqqsZJpqPI1r5c/Jbo3azP6z8cczyPM/CCvi6VaNSFV0vZSi01KXPFu3moKd1ule58usTkoDSYx06e9PwS5YU9VB+UDn61/oA4tLU/z1ujS8EeN/GPw28X6Z4/8Ah74q1HQ9d0a9S70nWNJvHt7mznQ5WWORCGRh6g+or35v+CxH/BUpFCp+378Usf8AYyn+ZWvm3Izmkbkf0rkr4PC4hp1aalbukzSlia9FWhJo+jW/4K/f8FR5OW/b++KmPbxS4/kKB/wV8/4Khjhf2/8A4rZ/7GyT/CvnAqSfb0pCjMfp6Vg8ry5f8uY/+Ar/ACNvr2L/AOfjPpH/AIe+f8FQycH9v34rdP8AobJP8KQ/8Fev+CoeOf2//iv/AOFZJ/hXzhjBGR+NKehHGKP7My7/AJ8x/wDAV/kL67jP+fjPo8f8Fe/+Conb9v74rAe/it/8KX/h7x/wVBZuf2//AIr+/wDxVkn+FfNxDDv9KBkHn1o/s3Lv+fMf/AV/kL67i7fxH959KD/grl/wU9kHy/t9/Fbp/wBDbJ/hUTf8Fbv+Cnefm/b5+K3/AIVkn+FfOisCD1/Ol3Gn/ZuX/wDPmP8A4Cv8iVjcZ/Oza+IfxD8e/FvxvqXxK+KXjbVfEXiDWLjz9V1rW757m6upNoUM8jklsKFUDoAABgACsViQ3WnDLDJPApCCxwOfeuqMIxilFWSOeUpSleT1YmTmkzjkGnEHHpijG5eRSYh0LkNuU4969J+Bf7U37Q/7NF42s/AP45+KvBsobfIPDuvTW0TnuXhVvLk/4EpzXm6qW6flX2n/AMEXP2Qrb44fHO9/aD8feGU1Dwn8MJLee1025UGLWvEMxJsLMg/ejjKm6l6gLEikYkr5bjHiTKeEeHMRmuY29lSjdp21e0Yq/WUmorzZ6OS5djc3zOlhMLfnm0l+r9EtWfo98Cf2gP259J/Ze0Twb+2l8UtQ8ZfEHxtaDW08KyadZ2D6Ho/CxJqV1DCuzLMssvmBmUlIkSWQOo8n8f2Wvaq11H4n+L2unVJryO5sZPCWoS6TbaTLHI7KbaNGLXAIba0l4Zi6kgJEDtr1/wCPfjy+0yS5s77W1u75xv1TU2x/pk43EvkHlASyovTHvknxbwzbzeKdefU5yRliI1Y52Lzx17nmv8s834tzbibN62dYhqEpO65UrRSd4wp6e5BdlZy1c272X9t5Bw9hMoyynhUuZJa3vq+spd2+l9la1izp/wAIV8fXcD+LbzWfEBjQxouu67c3ESD5xlYFdIEGGIyka+1eofCb4T+IrPxJq/w61jxXc3ekaPZW154eh1nWhcTaZpt2ZibTDfvvIS8huQrs8mxZEjXGBXpXwO8AQCOOeWIA7eV/udefy7e9ekfFf4Iy6foHh344+C/AVpq3inRdafSdNi+1CC7vNOvIy13bQOZFBZTBFcqhB/1LgFTIWr5/A5jmWcuvhPaPklB9dE4tST1aSV1a/RMrMa2DwlSD5UmpWX/b2jLvw2+EWkw6TBBpumMZI0y9tGm8ocMPMMatwAcndnIGFxXVwfAq21W7bUr+w1e2Gms9lZRojzC4tWG6WWHYwPmSOCCGztCAE5rqvhl8NtX8a+GFb+3Lm1S7IknR/DsmmOsgLfME3rKXHGCzsrbTkGt7wxq/iTwFFc6N8d5NH0u9t7iU2mu2ReDTNStskpKu9mNrIAVWWGRvvnKM6sMfU5FwV7fDLEVV7uzk7Wb++/zbV3pvo/iMwzup7aUac/eXTW/4rXrfR2Wu17eN6v8AAPQdM8Qa3q+uS+ILHSriC0Fxcahp8awG4j8xDdIgdn2BNiyH75Cr1rm/Hv7MulXAIttVtLq0JOy9sJxKmCCwXqCpKgNsbBwa+nLbV9L8aaNfmTT9RtbYXVxZXcGsWL2ryLGSDKquRmI/eWTjcBmvI7vwZBbWXiDVfDllLe2+nMtpfR6ZkvqADszhWVuZ4VIkidhxggkhiKnPOFoQmo01rJNqSbXLyrW61vGy9V3eiNsuzzEx1lK1rJprR3st9LO/y9NWfE/xJ+DOreG4LjVdQ1u7e5+3zNp9jHN/o1tCN4CKAQS45cs/YjjpV74O+NvFusXFz8M7rSNA1x9P0671fRrHxRFDLarJEQ93APPcL5F3EGR4j8hkSKTAdNx9v+N3gWaC3Nzqc/mzyw+ba3hUp9qTacSBSxKqV++OzKa+ePH3hHwtZeCtKv8AVvCcJ1LU7y+uzqV1eeZGbSKdreKGGIMVUFkkZ2YbiWjAwBXzOT43HYXF1HW0dLdLTS6SWnnZ3+Z9vUnSx+Dgo6870e+tm77p9Gn16H6T/skfGH4ceP8A4dW1h4R0HTNN0+eHMel2Kg2ymTdugKB2VGGcPGPl44rxr9sP4ffHH4nfBfUPCP7Gf7UGveC5V8SXln4T8WaBqcsVtY6vBI8TaHqZZWzZzSb4YrpR+4nWNDkEB/mT9mH45aV4N8a3cWi+EWg1GDSbi8sL3RNRe0IvUWQW1tNDv8mWOWVgipgOzZwTg4/Q79mP4geHPG3wa0rwXqE9rezweHraHWrdipWZpI/3pYA8rISzBv4sk9RX7rwPxjKvXw0cTKKrwbcG7Xeq91pJLlet1ZppJpXWn5fxRw+svdWcE3TnZNX7p6p3butLNtO7aejP5sfiZ/wVC/4K3fC7xzrPw48fftm/FnRNe8P6nPput6Rf+ICs9ldQuUkhfg8gjqCQRggkEGuYf/grb/wU8b5v+G+fiqPXHiuQV+j3/BzX/wAE4Gt/Ctp/wUD8D6Y8+o6Nc22h/Ei4TBfUdPkxFpmqTY6zQtixmckl1NuxwENfi3tYHBPXpX95cK4/KOJMnp4uNCCltJcq0kt1+vo9z+c85pY7KcdKiqjcd4u71T2Z9Cf8Pcv+Cnynn9vv4rY9/Fkn+FNf/grj/wAFPAc/8N9fFfOP+hsk/wAK+epVwT7VA5xkZr6R5bltv4Mf/AV/keYsfjH/AMvH959Dv/wVu/4KfHg/t+/Fj8PF0tVNU/4Ku/8ABTDVrCfTNQ/b1+LMkFxE0Uyf8JnOu5WGCMqQRkdwRXgHXtSMu0YLfrS/szLv+fMf/AV/ka/XsXa3O/vEnmklZpZpmd3Ys7uxYsxOSSTySTzk9ahIyOKewYjgU3oPWuyyML3EHTpSiVo/unFI49+tJnPANTZFI7b4I/tJfH79mrXH8S/s+fG3xX4KvpG3TTeFtfnshMf+miRsElHs6sK+q/A3/Bxp/wAFd/BVidOuP2mbDXkBG2TxP4J026lUDt5iQxsf+BEn3r4cAIyKQA9D07c1w4rLcvxjvWpRk/NJnXTxeKoq0JtfM/Qy6/4OdP8AgrHc2TWqfEDwBC7AgTw/Dm28xfcbnK/pXknxc/4Lj/8ABVz40w3Gn+Kf20/FGm2VygSSx8IxW+jRhcYwGs4kkGe53818njPQnNIc854rmp5FlFKV40I39EaSzDHTVnUZe8ReJ/EPi3X7rxP4q16+1TU7xi13qeqXj3FzO3q8sjM7/iTVAyDGNxNISMZ6/jTSQRjFenFQgrRRy3cndsUgDOTn3pH4GB1pYoZJZVhijZ3c4RUQsxPoAOTUup6VqmjXZsNX065tJ1VWMF3btE4VhlTtYA4I5BxyDUOrBT5L672LUZct7aFYcGgsemKds3DJpCvq1VYlNMaVJ70oBPWk5PJoJIO4/nmnbQoujTof7KOptq1qHFwI1st7ecwIJL4xgKOnJzzwK9GtCF/Ym8UKGHzeNbAgZ/65V5YH3MB0r020LN+xj4mUHj/hNLH/ANp185xDFxy2V3fVHsZXKLxCsrWi/m+54wSSTnikYDGKewGKjcMRk1+ds9o0hyOB2obAzxTkU4z3FI2SfmP416zPPGgtjg9O1eifDHSVuvgt451fziGtbmxHl44YNmvPDjPBz+NenfCR/wDiwPxEUjGbjT/5tXqZJUlSzSm15/imc+KpxqYeSfb8jjN2Cec03cclh+tByD0+tKibm2qwz3Ffp+reh82lYmsNU1LS7tNR0y+mtp4jmOa3lKOh9QykEVHPd3FxO9zczvJJIxaSR3JZmJySSeST60skXHXFN8lj0yfwrP2MFU9pbXa/l2H7WTpqDem9ul+4Lyc0YwSAa9u/ZW/YZ+J/7Sl1a+JZWj0HwaLwx3viG8Yb5whPmR2kXLTScFdxAjVvvNkbTV/bB/Zev/gJ8SPE03g7RtU/4QbTtYs7DR9W1u8haa4lntFn8sbQnnFSJQzKgC7RnBIzwLN8BUxjwqlea3++1vXyPLWb5a8f9TVWPtLXtdd0rf4tfh33PHS2V+br6+tJx0AqNXzxjmhWJPtXXzK56TTuOJC8A80AMTzXpf7JfgLwP8TfjhZ+DPiJZ/atPu9LvfKtRdNCZbgQkxhWUg7h8zAdyoyD0qx+1F+zXqX7PXiW0ksr+a/8P6uHOlXs6ASRun37eXHBdQQQwADKQcAggcP9o0FjPq0tJWuvM8iWdYCGbrLJytVceZXWjWuifdWba7bX1PLCB+NKCAMUDk8/lSsozzXYeqIRzgY96UKCeKUYxjpTsY6DikAg3Z6YFbQ8ISP8PW+IA1FNqeIF0o2flHdk2zT+ZuzjGF24x75rIQ8c13kdgf8Ahlq51Qt/zVGCEDP/AFCJW/wp3tY87H4idD2fK/inFfezgj12449aGx0BpQQDk96btOeTQ9zuTADJ2mpFABxg8U6NABuxTgO56VnK7JlLoA/dRtcbSQgzgck+39K/dP8AZx+E1h+xN+yj4B/Z8trdbfxZLpZ1jxYOjJqt3Gst5JIQekCmK2UnoIAO9fkj/wAE+/hDpvxx/bR+Gnww15R/Zd74rgudXyMj7FahryfPsY4GH41+onx6+ON3q3iLxn4/1LVN0ut6y1jpys3MFnES0gU5/jlZmJPYAdq/iz6V+d4rFRy/hyi7Rm3Wml9qz5KUfS7qTa291dbH794GZJSr4zEZnUWlNKC7Jy1b+5W+Zy/xy8eQa7qkscOoiKFWxB5jHLAZVehznOSOw5Peun+DOl+ZDbl23N5YZivPUE/l6ewNfNC/EaHX/HlrNOQYPtgEaMeAOQD17cY9OK+h/gr4mlTRbG9glADWiK5Le2CDz65z9RX8o51ltXL8phSS/r+kf0nSqQqN8p9ffBa4jkkSAkgocE7uvX8x/TFey6r4q0PTvihpvhfWiz/2T4Ut59Pt9+B5l/PP50/X+5ZxQK2DtJkH8RFfNvwh8Xw24jljJyThUB5yewHc54/Gt641W0/bQ+IFtpNt4s1Xw74a8APdade+LvDWqm0vNaupSpn0yOdclLK3dEMs65f7SxjiZPKlLeBwdUhGviqU3yXgvetdL34+6/OXTzXa7XyGfYebrQm1da+uz1X5fM+ydW/aK/Z/+CGmwL8ZPjZ4S8KNKuYk8ReIbezeUDP3I5XDsvHBArQi8WfBr9qn4dPqnwz+Klp4i8M3E01rNq/gzxKrxTyBWSS3aa3Y/dD/ADISCCQeCBXCfAD4P/Af4BRS3nw3+HGkafd3pzd63BGtxf3zcnM15MzTzv7u5+grD+Kep/AS0+IWqfEH4bfFHV/h54wMDDxN4p8PaG13o9y0SMQmtW4Rred0QHEjGO4RflEyjAr+nsnznKHlUMPUnFO1rNqLendu342te7PymtgJvGOVJSutea10vVRTa9U2/Ij1H9mz4v6L4Fh8JXn7U+spBoNreWei3lvoMV3c6lZSQ7I11VLh2F/cxBdqSxeTuPzMCzGvOx4WsviT4ctfBniPxJqOl6Homhu4+HJ1w2+qyzSZH9o61NbPkXTE7obJXCR7izl2Cqne+F/2jfEniXX7n4W/FbTtLtvEFtpSapYal4c1Dz9J8S6W5KLqOnyM25VVvllgkJeJiuGdWVznfEvxNp+g6S6XF1FHcalfeTZRRp5bzyYw0528yqifxEgA9xivzjjXiDD4KtVp0YpS5Gm38VmrrW/ktt+t9D6TLqOJq8nO/tXVklrd66LzfmtbW1PEfG1h4B+EPhB9O0a1urTSraRpDHbSz3k8Zk8wlnZ3ZgCWO8fdBzjrXgnxv+Il5rXhnRfCfhTQzdMIbuNdSutb8m00yaEXN3exzRMSIoZLYw3SMSGYW7qqljiu6/aD/au+HGi39x4Nt/G+g292bVibjUfEkVtbSAq4EBRXJLBQS/ODtOMnFfFXxF+KkPi3xFqWgnWdNt9M1XRLrQLWOy1CN7WykcM9k7Mrr8wuooxlgzLFO4zgmvheF8vxOMxE62Jg3Gad5S6rRq2l91/wzP0Rr2OHg0rOLTS/Da67mR+0P+0c3h3xd4a8K+ANfSx0bTVttT+1/afLvbzUZEYrf3YBOyUAFIYBlIIiFyXkldvvv/gnr+0jc/ErVtK1JvFc2karpx2vd2yCSO5t/mLwTxE4li5IVxho2bIzjFfjt8Xdfg1jXtJ1/UEWGW60ZUuIbg5aOSJmjdD8xIdSAB6DFfS3/BOv47ar4O8UW8mnSFpLa4H7uWXlcZOw89CDtAP8Rr9A4iyH2OTUMZRVqlFp3Wmz11Vu3Rry1PMp1I4qdTDPaV99d11ve979fuP3g/aF8JeAfjT4BuPg38U7MXHhb4haJqGgavA7gjyZYQdwOeGUMzq3UFAe1fyafGz4QeL/AIBfGLxZ8C/Hakax4L8R3ui6g4TAlkt5mj80D+66qsi+quDX9T1p4ut/HvwKufEugOLiddDXXNKjZsEXFqN7xgZ48yEvGffNfhN/wcM+CPDuj/t//wDC5PBupi80z4reAtG8UwyLjCy+U1hKvB5ObJWPfc59K/o/wE4qxWJ4nxGBm7069KNWK/lnC0ZJesff/wC3knqfz34g5PChlkK1rSpycX6PVf5f9uto+DWGBUMg2j1q05DKcDHvVdwc5Nf1ufj8WR4I5P8A+ugRM7fIpJxnFK4CnI/GkUrzliPxpNmqYxz8pwM+9QvtDnYcj1qcjKEg1Y8R6QNI1Z7BbkyhYYX3lccvCkhGPYuR+FTKaU1Hq7/hb/M6qdKcqEqiWiaXzd7fkzPPIyaQj+6D+dKQfSjoOeaGQNIwM00nsKUfeyT+tb3w8+GXjT4qeI4vDPgrQ5bqV3AnuCpWC1U/xyydEX68noAScVnOpGnG8nZEVq9HDUZVa0lGEVdtuySXdmAxOOKaVweufxrU8W+G7rwd4p1LwnfXlvcT6ZfS2s09o5aJ3RipKkgEjIPUCssnn/69UmpK6LpVYVqanB3TSafk9RmTuIA605FydpP40Y9aDKiA8Et2OelQ7mtz7w/4JWfCjwVpPwv1j9oi/lt01qLWrjT49RuZUVNLsoYY3kbcxAiMjSfM5I+RMA4LZ+dP28vjh4d+PP7Ruo+MPCcyXWm2Gn2+k2mqJu/4mIgDZuPm52szMEz/AAKleNhzsKEttfG9N3DY6ZHemsSTxz7V8XgODaOG4rr57WrOpUmuWKtZQjppu77abLfS7ue1POajyiOAhG0b3b7voIHBOQaTaXfAH4UqADivSP2avgDqXx/+ISeGort7XTLSP7RrWoIoJghzgKueDI5+VQenLEEKa+lzbNMDkmX1MdjJqFOmryb6Jfm3slu3ojLJcnzDP81pZdgKbnVqyUYxXVv8kt23okm3ojnfht8G/iV8W9Ql0z4deELrVJIBm4eIKsUOegeRyEQnsCcnsK3PiN+yr8d/hZoreJfGXw+nh06Mfvr20uYrmOL/AK6GJmKD3YAe9fod4O8FeGfh94ftvCXg3RIdP061QCG2hHfuzE8ux7uckmtWaC1uoJLG+tY54Joyk0EqhlkQggqQeoIOCO+a/lLGfSMzl5vzYXCQ+rJ/DJy9o135k+VN9uWSW13uf2ZgPor5DHJOTG42p9ca+KHL7KMu3K480ktm+aLe6S2PyZ8kq/Q/WvSrKNh+xj4nkDcf8JlYf+yVk/tA+AbL4Y/GjxJ4G0sEWlhqB+xKWyVhdRJGue+FcDPtWzYn/jCrxUW6/wDCZ2AH/kOv6Qx2Pw+a5DDF0XeFSMJr0klJfgz+Q3l2KyfO62BxCtOlKcJf4otxf4o8XcHBBqNt3QnIqTO7K4xTHHHX618M9j0Fc0t2BjsaCPU/rQCzcihgOOa9lo80Q4xjr+NenfCIF/gD8Qvl/wCXnT/5mvMsEHP616h8JGx8APiCR/z82GfwJrvylf8ACjT9TOr/AApejOK2bTzXe/DbxL8PLzwNrfws8c6VaWc2oSi90XxR5OZbO7jQhIpWHJt3BKkDoW3HOBjgXkyeP50OCen86/S6kFJJHx2MwkcZR9nKTjqmmnZpp3T89d07prRpolMqN/XnNXfD2kan4i1uy8O6JYvdX2oXcdrY2yEBppnYKiAsQASSByQKzVGOTxW98OPFkfgTx/oXjhtOF5/Yur2999kMuzzvKkD7N2DtzjGcHFOpUnGm2t7DxPtYUJukrySdl3dtF03fmfcfwJsf2p/gx8FPD/gv/hUFvdXukT6hHcWd54nsooZrWV2lhAkjlZ0kSR3J4xg4yc8eL/t6QftF/EJNI1TWPhBrmneHtLtp9R1RoJo763hvpXKyO8sBICrEkYUsBgOx4ya9i+Hf7Rvx9+MXhnUPGfgD4N+FZ9K06MvcXV54rlhwRCZnjG6L5nRMbscA49a4v4oftrT2fg/XPhv8SfhBqOian4g8JTDTLrTNXiuIjHdQOsUrBgjBDu5xk4zx6/C0KNsY6kIXnfX5u7/M/AsmxHFFPihYiWDoTqxm3NRqe/Hn+J8vtpbKTfwto+N4YywznFPEQLcVKVVAABjAprEDgHqOvrX3Kioo/oPmbZNo2sap4a1e18QaFqElpfWNylxZ3MRw0UqHcrD6EV6z+0p+2J4g/aI8EeHfCN14ai0o2LNc6+YWVo768XKxyRZG6JArOTHk/M55IAx46xOcmmvkGuKtgsNWrwrSj70dmclXLsDicXSxNWCdSnflfVXVn/T2eqFGO1KBzuHNMVTnDH9alRB90fr2roR2vQACSSRTseh6dqUDIp64BOTihambYirgbq9WtfCuo3H7Dmo+L/7QtxaW3xbtkNqYG81pG0149wfdtC4PTGcjrXl6op6civdLGA/8O0dalxx/wuC2Yfhbov8AWoqK1j5riPEzoLCcv2q9KPyctTwTg9RSrGDznFOVccnrT0TPNXa59G5DQrHgGnhckUuDnJpCdilmQt6KvUmpnJQV2Qvedj7A/wCCLWlWU/7X+q63OuZ9G+FviG6slAyTNJHBajHvtuZMfWvSP2hPjBaX+kGLwxptxqVnb3k0M+ppfw29o0qlvMihkkYtcsrHDNGpQEY35zS2/wAGPhz/AME/PDdr4M0HWZ9Y+KXi74L+MYvGutWN/utbC+8mwkh0y1VWAxbqX8yUbmebdghAoHnH7UVlceE9R07wLZWyW9toulRWUNvGoCxCJShQAdtyn8T71/A/iVmGV8YeIccxw8nOlyKFO90mqbmpyWzs5SajtfVvoj+sfDnB47h/heeHqx5ZSlzS01V0rLttZv5HNWnj7xBD4gsk03Ril3PIklkj3yzeYNx27REPn5HQHORX0n8EPiZrfh2yhg8caFf6Rps0rJYalqNjPBbM5Lfu/OkVU5IJHzZB4NfKHhDxTeWC2skCCG9s5Z/s2pxyss0cUqgNGhz8nIY7h8w3kAjJr3L4N/tK+OvhVdmXwr4r1C3gnQreWEl601pdo27MdxbSlobiNtzB1dSGz+NfGcRZXTxND2Xs18t93Zq9+lvxR9xgMVVvzKWvZ7fOyPrXw1481D4gfEO1+BngvxbFpqOI38Y+IIb/AMo2EEoPkWMUy58m6uMHMoz9nhzJje8ePr39l3W7zwFBD4Ntfg7p8v8AZULWVx4JswIbzSVg8wAWEm7FzHjbwoZ8Eu4+bcfzz8CeMPhD4D13W1+DfhWPRtAvfFF7NbaY9xvW2aRAzwli/wA8YOVjBOVTYOdvP0j8Of2pvhr468L3mg+M7Qj7LZPJY3t/czpvWFXRPPKkzW0kY3CLUos7FPlSgqFr8qo4V5ZmcZ0INU6eqbSvKVndyTUo3d7RTTSSsm7ty7M2wlXGYP3tXLdLprpazT062abeuiPqj9qj40+HPD/wWvtS+GMHj3wP4h1LU7XSNH1C58KmS0NzcXYtvKJbMUUjB2KOxT5tpA7Hxzxj8VPF/wCyhqXib4RazFr+hW1/pyNHPfSGUa9DbSI1xq1q8hZWvGt/PF3asctGm5ehp/xw1X4/fG/9mLxH8KNO+MOsJb67oUUnhXUPEWlx3MEV/HN9pspYtWtGAkIkijIeQfc+8ATXHfBH/goZ8E/+Ch/wt1L9m79qDSbbwZ8WtIMkXiPwnrM/2fzNRt0cS3umTt92VXCyCIkOAWHzo2T9tVxGFxuFqY3BxlBwVpqMIwaUotOXLG6s1dX0XdRbTfx9DD1cHKNCvFTi5fzOWzi46tK9mndO/WzPk34DfEz43/Bz9qLxZ8LvCMVxqvhqDxFZ6XG1nIss9nDd3PmWcliDKR5ssUzABfkdthxxmv0j1L4ZeApdD1nW/jTpFwlvcWT2+n6JqOuPdXNsnmSPLcXciSKhvZANqwx/uogQAXbJr8+tV/Zj/aL/AGWv2rfh54wvry8bwf4g8ZaR9l1S9XyE1RNKuZo4meIzBozGssC9gyupGNtfZHx9+M2sa54auLDT/H2moRmabS4x5DTLGWdQ8hbIfIGNp5APNeBxHVwWHxNOfs4OrOnF3cVe/Ko3alqndtq3Tlb1Pb9hiMVOLpzfJzSu03/Nsmr9rO/W601PJf24/wBqfTNO0G78BfB/w7pFpHZJ9m8228O2jXQZVMabY5Iy0aeY6wxxqDJLIpYnrn4e+IXwp8TQ+LPGNn+13a67Zy+DPBMetr4Sh12ytbi6v724jgsYL0wkmFkM5nngUGbbHsOwEkereOfGmjfCz4neHvHreNx4fvvEXhrU7vwvrWoSMLe1mt0lzrs37x2nTzmkgtFwGe4xKSFjXd8seAdc8BfGj40eFfhhr3jO30KLWrZrabXJpVldNUmhmkiSZ5JiGkkuDHDJMzZBkBxxX3HDeX18LhvrM4vna5+Zx1jGz0XbZpW1V07X35cTUw0I+whO1NaPe8nfV3/B/cjzDxHrD317c2uv3El1JK7TWt6X+aC46FuT80TgAMvHIVgcqQ3uf7P/AMIfiN8OLLwr8T/F/wAQfCPg+58blT4E8M+LtWuIb/xLbPI0aXSpDDKLS0eUCOO6ujEkrA7CyqWHzj4Gtviz+0t4stvht8Ff2dJr3W7icia6hvZzsKbzKZZJGWGJEAYux4VUJJGDXSePPjb47+Jv7aut/GOL4iaf8Qr3Srq2vTcadpclrZapbWUUcbW1nbbt4tII0xFgA+VB5mwciv0PF5ZKtQnhJ8qtBylFtNrZRWl4xU3fVtfC7K/NKPzsM0isRGVBt3klezXra9r28r9F2P3K/ZQ/a+k8E/B/w34p+J/w48S6Z4WudUn06fxnZxwatoFmWmktpkubyzldrVRINu+eJIlZuXxzXw3/AMFOv2Lf2kf2pLP4Y+G/2dfg/qXi3Wfhxp+v6B4vtbG+tll09n1FbqygZZZwXZ45ZGRUBJBGByM/Un/BLTxv4qsf2ffBHgrxVdWcfhfTvh/4lt/ENmZ45/ttwdTjZnmYOxlgNtcFkbOGEp+WvKP+Cak3hz4C/s5wfEf4jaxqkdj8QPiwPIvZbtnitJNK0WXUhI7tLw0kcLwgdWZEGCBXwXDefw4FztZplXvzw94+zbcoz504yas00owjJ2u7tL5753k8s/wFbD4tcsaji+Zbppy5d1q3rf1Pxx1rStX0DWLzQNe0m6sL6xuZLe+sb23aKa2mjYq8UiOAyOrAqVIBBBBqngkYP519Nf8ABVf4ifDD46ftjax+0V8JtDvdN0v4iaHpniK4sL+NFkhvJ7YJcZ2HadzxeYSMZaRuK+Z2U5Of51/orw9myz3JMPj3BwdSEZOL3i2tYv8Awu6+R/KmZ4GWWZhVwsndwbX3dfmRsM8A4FNZQBhR9alAznNNkXK4x+Ves9WcSZE6nyWb0Bx+Rrrvjx4eufC/xMvdGvrZoXjsbFtrqRkGzh5Ge2c/lWb8O9Bn8SeOtE0GK3803mr20RjxnKmVQw+mM16r/wAFDdNaH442uqp9y88OwYPqY5ZkI/LbXxeNz72PGOEyy38SnWf/AIC6bX4KR+m5Rw68T4Y5lm9/4VfDJadHGspa+soHg4Ck4yaTbnPPfvT1UZ+btQw45Ffactz86vYfpNnbX+q21je3wtYZ7qOOa5ZciFGYBnx32gk/hX1f4r/aJ+Cn7OvguP4dfBlodYvbRWEMdpIHgSbnNxcTDiVyeSq5JwFyigCvkskDnFC8AKBgdMCvNxuWUsdOLqSfLH7K2b8z5/OuHsJxBVpfW5ydODb5E7Rk9LOXXTXa2+/cuprm7nku7ydpJZpGklkc5LuxJZj9SSarMMdamYk/epssefunj6132VrI+jjZKxGSAcmkyrd6GVlBOKYOeBWTdjRJC9G4/nSjlyKbknkjFOXIGegoSuN6EsYCHe65Hev0O/Y8+E8Hwt+Cunie0Eepa5Guo6mxX5gXXMUZ9ljK8dmZvWvhb4OeD1+IXxM8PeCDMEXU9YggldhkKhcbjjv8oNfp2qRhz5KBVz8iDsOw/Kv5k+kXxFVpYLCZNTdlUbqT81DSC9G3J+sUf119FXhmjWx2Oz6rG7pKNKn5Od3NrzUVFX7SY7JB5qOZyXwq5J4Az1NWBGAvI5rzP9qL40W3wP8Ahde+JIblV1a7VrTQoieWuWU/Pj+7GMuT6hR/EK/l3KMsxec5pRwOEjzVKklGK8338lu30SbP6/znNsFkWU18xxsuWlRi5Sfklsu7eyXVtI+JP2q/E1n4u/aI8XazZOGiGqG2jdTkMIUWHP4mMn8alsXx+xh4oQnr40sOP+/deczuZJDI8pZ2JZ2dsliepJr0W0G79jLxLj/odLAf+i6/0Or5dTynhulg4O6pwhBf9uRUU/wP8r8VmtbPOIsRmFRWlWnUqPyc5OT/ADPGySRzx70004qykkH8KackYzzXxTOq5o47L6UoUjrS/dXNKMkZH417jR5ojfL07179+yT8NbH4l/Bjx/o97q89mJdRsYfNhhWTblGYHBI7ivBFHqv519OfsF3Qt/hn46Tudb07/wBFvW+CnKni4Sj3PNzmpVo5RiKlN2koSafmkcd43/ZE+JPh2KS/8LTQeIbeNS3lWamK6AGf+WLE7/ojE+1eTFzvaNlZSrFWVgQVI4IIPIIPavvO2LzH5eCT69K8k/at+AMWvaLcfGDwrZBdSsU367BCv/H5AOs+B1kTqx/iTJPK5P2mEzaU6vs6mz2Z+KcOce1K2MjhMyt7ztGa016KS212TSVnurO6+alBfG3r9adEhLU/yQCMH8c09CqN0r3JQezP1By00PvX/gntpT6D+zN52qWEt/a+IbrXLiTTLPVonmuLeNYbZligOGWVgko27gWUqRgkZ8J/b5+Hll4e8caB8TfC/iufWfDnijQLePR7i4ZS1uLWKOIW+VABURmNwSAx3Nu5BJ9a/wCCXPxDutZ8Pa38PL3UY4bfwxew6npot1SFy945Ezyy4LOFNtHtXoNx68Y8h/bZ1iWHwR8OfBGjSmfRo21/UbXUHk3NcN/ak9qg+ixRg57+YOmBXzFB+xzOSSuz8DyWnj8L4sYmDdnKbUl9lwnTqVY77SShT2395PRaeBSOAev60zcD0OKAmOWOacqGvpU2z980SE2lhkil8sAgkVIQRwRQoXPPX601a4rsQQFseVGzMThUUZLHpgDuSa7r4m/s5fFL4T6HaeJfFGmQSWM8cf2mazlLmxmYcQzqQCjZ4zyhIIDZFcQszwyCaGVkZWDI6NgqQcgj3BxX1/8AAn44+Fv2iPDz/DrxzAo12eza21O0dfk1SAjDyx+jjh2TqGAZeOnjZxjMTgIwqU43j9ryPlOJ82zbJoUsVh6anRi37VfaUdLNdra3evS+lz4+XBHT8adwG55qxq2kT6BrN7oF0SZLC8mtnLdSY3ZCT/3zVcZ3cnJr1INTipLqfTqcZRUk9GSR8kEevQ19SWGmeC5P+Cb97YReE/Fq6O2of2vc+IWl08q2qrMkIjWHz/NFt52yLdtLbSXxxivlmPdnOO9fX2k2jv8A8El9R3DjzWcZ9tfT/Csa8XJ6dv8AI+C47rugssa+1jKEd2rXctdGtVbS913TPkPGedv5GhdwOccVI0e04z+NNYY6DFdko2Puk0xy5wSCMD3rc+HEGmN8QPD0mtYFmniGxN5uPHk/aY9+f+A5rAC84zip4JpYvmh++Dlecc1w46k6+FnBO101f1VjShU9jWjLezX5n6kftYeGNR8L/tZ+G/ivaWXneE9L8eXFpr1nEAYILTULt9Ju5j8/yqSbIAdNzZ7jPm37evgeLSfH2pSzuBPDlZWY8MQSrkep8wZ+jV9oeBWtfjP/AMEo7fxH4AubOO+8cy61ZNLrU4DD7XDBeW2W35M0b2kPlnn94CevNfLH7RVrrfx1+HS+MNZ0qS18R25n07xPYyDD2mr2p8m7iYBjtywWVeT8sgPNf5gVVVyzNMJGtLWjelLulJ80br/Fzpvv8r/3FgatPGUqzprSWsfO1k381yteR8Rtrgtb57cybRyyH278VZPxGuLWEqs2fLB2Nk+/v/k1znjK0v7O/JmRoZYmZZVY4IYE5+nPFZAvruWYO0mCGB+Xr/P/AOtX7DDA0K0FJ6nylTFVqUmlofQWpfEvxF4T8QRXB0zXYtO18CazbVoVjWaQD999mcF4brYVIBRty5AYL0r3P4RftGeLPh5A93oXjPULOW4aRzYvaxTI6FHDTKjiRGDKxV4wYw3Q5xXxt4N+JHjb4W6dqvg/Sdcs9Q8N6nqDPf6Fqtgl3pepSISFme1mGI5wDjzY/LnUEqHArqtT+Jvwk1HTk8ReFWn8I38DKNR8Oz39zfWUxLH97YysGnTk5a1uWfaoyk78xr87mfC9HF00qa+5Xv6rp+Pm1sehhM7qQbjiFdPu9D9C/hp+1f4I+DWk/wBpeGdZtJIdTuJrmaz+Hnj7VNAvrJz5m4XWm3MU9ieeS0Y2dAOAK+df+CnHi/RfjNqVn+07cax/ZfjmyuYoNPubDQUiu9Zjjd8G8vLOQW4uLeIKySNHHIyY3Z4x4Fa/H2yheeS08S2c8aIwR7WB42C/PyVbawTGflJbr1rofjh8Ufilf+Bm+CPiu6urOy0GzMNjo8F1F9nAmjM5kkaHHnylJFKyMxKqSp4GK87Lclx2XZpSrNtJaPpeOiaaa1WuunzTszTFV8Fi6cnDWT67tdVbe2p+j2vftNan+1t+zD8Of2gfjJrl42raNoAsNajtQsSWtusyQX1+qiUkyM5tJxIxICxMQegrzp/2qr21udW8KfEK7t9Pu9Gu7jT7zWbbQ21gGZI3KMbVJAWeRSjo+QvluOnNe/8A7BOm/BzxL/wT4n0b4i6tHPq0XguK11XTJHEFyLeSEW8HlPv2iA723M33mQE8KK/LX4+eOZ/hj4t0HW9XtbyKTVfDstrqs0d+w3alo97PYsdyyMW3Qpa7xwSCDwp5+KjkS4jzWpLEe/NtuGqk0k2lH/wGEm009o6Hp4PMaeXUnh4x5YRdnpZXaTul6tfeej+Ib7xf4FluP2hND8KfDq18L215FJdaBqWt2Go3t+sU8xigvNJluTdANKysYIwqIqg4IGa+an0Lxj8aPEeoeOfG7afoXhvwtbWlh4l8W2nheKGy0CCaaSG1eWCwCNdXLu2Iwu+dghZjtjZhB8a/E/iDWPH01rCJEvxpytHaXN1BLNIrLvXZLCcSSsrBgAc8kdQBXkOoXsXiKWRtdvrsMiSPbSRDd+++bAdSwOeSC/3gOMV+08PZWqWHU27NxV7ataWTu7306u6aS3Ss/i86xjq1ny6tN20tpe9v6tuaPxF+Ofx2+KniTTvFviLxTr97daTpq6VpuoWrsv2a3RHUxR+SFWPKOxkGNzFyXYkknsv2bPgb8RbHxvp/i+8/t7wfpw1V9PtvGr6dLFFpN8sbSrscMoeVQBuRSxEbnIOcHgJPBvhfSfDVnqGmeKDdarq7u+oWdm8yDToEdlWGYsFWaWUjzPkLKiKgJLOVX2b9izwpr/iTx4PCfhjSzcahqk32W3QEttRs+Y4XPyJjBaQc4UjvmvVzyvTy/Jav1flhGMWvhSVvnpZXb1TT3s09fLyqhPF5lB1rt3vv/W+n/Dn6OfDr4rN8N/2Itb+JGpTxW2oa14dcYt1WFPtU8SwsqIhCxqRGkjRqAFeVePTotT8DwWP/AASv+JPg7xL4qjsPs/hPQtRsoL+XEOla4t/b24uUO7chliu1t3A6+VJnuK82+LOo+E5/FPgH9k/RLVtUtra5fWPF0ay/6rRtM/f3UrsG25mkXYOeyCvWv2z4NCsf2ENT8J+OPFEcd/8AFH4iaDot0La4UTx2WnQTa9fyqvm4LCMqmGwd5TcOQa/mzhvD4itn+GcbxVWpOu/KjTdo2XZNS063XRn6vxDUpU8nlT3lenG3ebavr6W19T88P+CqCeBtE/aF8PfD/wABQsLHwv8ACTwvpbSvEUNxItl5pm2k5HmCVX+jivl1/m6Ve8ReIb/xRrNz4hvdUvbxrpwY7jUrgyztEqhIldiTkrGqLxwAoA4xVEbienNf6g8G5LV4f4WweXVZ886VOMZPvJL3n822fxPxDj6eZ53XxUFaMpNpXvp019CNlZQOaAMjce1TmNWODXTfDz4bW3jqa5iuPF1lpSW6of8ASYZZHl3Z4RI1JOMc5I6ivbxtZYOg6sk2lbZOT1dtFFNv5JnLlmAxGa4yOGoW5pX+KUYLRNtuU3GKSS3bSPoz9gX4C+FZ/DyfG/xDbzy6o17NDoqGTEUMaqEaXb/E5ZnUE8ALwM812Px3+DHgf4radcal4m0e4nvtLs7uPTpbe7aMr95gpA4b5gMA1V8FfHPwP8IvAOk+BdB8P6rfjSbFITcmJIElcZLth23AMxJ6d+9ULb9p+RZi2reECVe4eRHs7kM6ZdmAIYANjOMgjPpX8m5lwd4yZ7xVjOIcPg60Ixk1SvJU5KleSUYxk4yScd1bdvq2f3Zw9x34AcKcG4HhLMMfh5ucU6/LH21N1uWLlKc4KcHaStGXM1aKs7I+ImceSrdyOaTk8kfrXffGHwBpWj6lceJdF1RTa6hqcpg0/wCwyxtbBtzhSzZUgdBg5OOlcP5BTIHWv6xwVSvXw6nUhKDe8ZRcWvK0knp32fQ/hzMsNTwOMlRjUhUS2lTnGcZLo1KDkte17rZpMjWM9+9SQ2kk06QwIXeRwqIi5LMTgAAdcmlRM9/rW38OYhcfETw9bA8vr9io+v2hK7YQUpJHk4is6NKVTsm/uRzskbIShGCpIIPUH0qIvgkE1q+NreeLxjrMTnJTWbxT+E8grLMBxWFTmjJpLY6KVRVKUZd0mdn+zv8ABHW/2h/jf4X+DHh4us/iHVo7eWdRn7Nbg755jnjCRK7/APAa+/P2gP8Aghp8M7jwZLd/sz+OtZtfEFspaGw8VX0c9tqIwcR+bHEht5DxhiGTnBCj5h81f8EmPin8L/gz+17ZeJPiz4gi0q2vNCvNO0rUroYgt7ycxqnmv/yzVlEibzwCwzgEkfsXeTCOMow5x1z2/wD1V/DX0ifFHxA4L49wNHKa0qNCFNT2vTqyc3zKSatJRioxtvG7as2mf0F4YcKcNZ7w9XljYKpUlLl396CSVrW2bd3fZ2trqfzxeKvCeu+C/Et/4S8T6VNY6lpl5Ja6hZXKbZIJo2KujD1BBFZ+STgmvpX/AIKy6PpOkft1+NH0i4ik+2w6fd3qRuCYrmSzi8xG9GyAxH+3XzSu/PSv6+4Pz2XEvDGCzWUOV16VOo12c4KTWvRN2XkfjueZdHKM4xGCjLmVOco37qMmkz1H9jTyIf2mfBz3ZAT+1SFycfOYZAv/AI9tr9E42YAD2r8rPDXiLV/CeuWPiTRLjybvT7yO5tZcZ2SIwZTjuMgV9YX3/BTLSf8AhGYprH4YXDa00P76Oe9VbNJO5Url3XvjCntnvX4R43eH/FPFGe4TGZXR9rHk9nJc0VytSck3zNaPmevS3mj+nfo9+JXCPB/DuOwOcYhUZc6qxbUnzJxUXFcqd2nFadebTZn0t448eeE/hn4TuvGfjbV47HTrNMyzOclmP3Y0Xq7t0Cjk/TJH50/tHfHfxB8fviHL4t1GJ7SxtkNvomlGTcLS3znnHBkc/M7dzgDhVqh8Yfjt8TPjfra6t488QGeOAt9i0+3Xy7a1B6iOMHr6sSWPcmuOyx4HWvrfCvwkw/BMXjsfJVMXJW0+GnF7qN7Nt/alZaaLS7l8T4w+NWI8QWsty6LpYKDvr8VWS2lJK6UV9mN3r7z1sopkl+Tk16ZZIv8Awxb4oOef+E2sMflHXmirhst1FelWjA/sZ+KOf+Z1sOPwjr9O4iX+wP5H4tlf+8fJnjJbA600n5v/AK9OIJB4/GmjGCDwa/N3c941Rg9B+Zp+wjr+dATPIH4ZpRgHJNe80eWJnjAPSvpD9hJ1k8DeNLQSgu2racwjzyw2uCQO9fOBYHgCvVfgvNcWvwA+I95a3LxSxz2JjliYqyHnkEcg104Gn7TGQje12cmYUfrOX1qO3NGS+9WPrSztWh+c8eorQg1GG3JE0SSIwKvG4yrqRgqR3BBIP1rx/wDZl+PifEPRl8D+LdRB8Q2aEW8srANqMI6MD/FKo+8OrABufmr1CSNnB65+terXpTw9Zwe6P4/zbK8VluPnhcUrSX3NdGvJ/wDAeqPjD4u+EIfhx8SdY8F2xP2a0ut+nsTy1tIoki+uEYKfdTXMmVnOc5/GvXf21NGWy+IOh62nD3+hvHMPUwzEKf8AvmTH/ARXkdvH2Lda+sw1eWIoRk+x/ReQYx4/JMPiZO8pRV33a92T+bTZ6/8AsX/FHx/8OPHPiDT/AId6FZ397rHhi4kP2tZHNt9iV7rzY40P72QAOAh4JIz059R/bH+D914a/ZB+DXiC6jla60u3lstSeQfMrXsQuxu9/MRx9Sa4n/gnLaMP2s9EkjJBXR9VIIP/AE6PX2D+3L4cHi79krxjZsoebSrWLVrYdcNbTI7Ef9sjKPoTXj4hrD5nGTWl19x+O8YZ1DKfE/L4U4Jc8qUpy6vmVSgr+UYS0sfma8YViCMmkIGNucVo6DoOqeLtetPDPhu2Fxf38vlWUBlVDNIQSqAsQNzY2qM8sVA5IrOn821uJbO6gkhmgkaOaGaMo8bqSGVlPKsCCCDyCK+llKnGTjfU/cIzjKfLfVK9utnonb5P7gkdRwCAQORnmot3PB47816DrfhI2/7LXhbxy1tGDfePtbtmmCrvZUtLAIpPUqCkuB0Bz6muL8O+G9d8XeILTwt4Y0qa/wBRv5xFZ2dsuXlc9h6ADJJOAACSQBXKq8al7dG0Y4THUMTRnUvZQlOLu9uSTjK76bN+SKQznKirem3+oaVeRappN/Na3UD7oLi2lKSRt6qynIPuKS806TT7qaxllhkaCVo2kt5hJGxUkEqw4ZeOCOCORTAABgZrZR5lqjpk4zj3TFBZmJLFmJyWY5JJ55PenKMtTVAwcnFPj67cfjVpJEMljjO4D9K+ydMtlj/4JI3zcZazkcD/ALmAf4V8rfCTw/oXi/4r+GfB/im+lt9O1XXLe1v5LZiJVhZwHZcBiDjPODjrivvLVPDf7OGnfByX4FqfHUXhSS2ML2sNjqjRhftBuOJXtSR+9G7P4dOK5sTUULH5P4lZlToV8uoOnOUoV6dd8sOZclNyTV7r3nfReWrR+d0wAJB7H1qPbuOGOOevpW/8XtC8N+Dfi14k8IeE9RmudK07V5YdLnu2zLLb4DRsx2rkkHrtGcdKwdwbp+Fb86qq6P1DDVo18PCtFO0kpK+js0mrro7Mde28dndPbxXcc4TgSxZ2txnjPNRxsQ/HY8U8Lk/zp6Rgf1qJUnKnytm7qR57pH6xf8E3vHPhT4m/8EpfHPhK51q/j1zwJa6beCKBWkjjtbK/uFmJCuCn7i/RmYjATaedvHmfw28f23wu+L2qeAPiFqKjRPG9+ljJf30+VstZhQR2ly7lj8lxERbTNnG8ROeOa8T/AOCWH7Xh/Zf+LmqWms20994d1/TJIPEOiwMSdRsPLdL2AKGG52tGlkQf89LaP1r0H9tP4bX/AIH1zU/hhriRavAtvb3Wk67BchrbWdIlh3WWowPuIljubYodwPEsZU4KV/n34l8H1co43xWErQtQr3lGSttOXOn6wnfyfLFdz+vOAM+pZjw1Tq837yNtO0qcYwkvRxUX/wBvs8+/bN+CcnhvxXdajaWjxGSVvNhcYZXGQwI/vDHPr1r5s1i0uNNBmUCRMdVOeOeCK9h8V/tJ/EC48O2/w++KM8erw2kflaZ4puSwmeNAwWK6IPEygBRKfvgAN61jaRoHhnxtE0M4+wyHh8nKkc8g56qeR1G01rkjx+UZfGnjbSUdFJappbPv8mrrqd2ZewzHFOWHVpPdPSz/AK67PoZfhXUbf4q+F7fRfFOitb3ccZFn4k0+L9/cWsAZWWaAsqXxjBCqyslwOFJlXaFxfiR8DvG/w21qys9Wa21Cz1eFptC1fRpmnttSiDMp8o4Db1YbXiZQ6NwR0z9tfsa/seah4z+Az+GfD6aTNrya/rF94dvbrxPLZXFo8cEG42kSpIt4H4R4HCjLqa9u8b/sKaDqXhOHxZq+q2d4+o6clx/wj1rpEVjG0iRBLm2VRKTFdh8BJ0Cs7qwcFAMfM43xJynKMznSUkoc0o23badk4/yp262jpLRL3jqp8MVsZRipu07L8r/5+frsfmj4G0nxzerp2h2Op3Vx9ikktdNsr3EkVmZWYyIqSf6rLZJHA3ZPXNe5fsxfB22+NPx7svhprxFr4b8PRXOs+MtSQAeTpdmrS3Dt82A7sBCvOGLgd69w8SfDbwxNaWT+FNWm8Wa5rCtBojx2eNRuslxskUHe8keNpeQYUAnOATV/9oH4Qn9lP4GX/wCzBoujLN8TvEUNl4m+KV/camqW1pZo+/S9BiZCTOJ5P3sgBALqnUYolxM86pzcI+zbvFSenK27OWqXw30TSvLQ3qZXHK+WlGXNKXRdlq9L/f8AJdTsv2Ev2j/DHxR8RroHh7xG2kPqJ1TSNUidBILO1nDvBMsbvtkjjUFRGQziQfLXw7+1nPHr3h34gXVj8RT4vj8N+Nk8R6F4jntJLZ7y1vZjp99uhmYMgLjT3ZNuN0bH+Krn7OHxEv8A4T/Hi+1/7c1p/Z+vRav5NvM2Ft2IaYId4JADkoGx9wkjg17L+3t8JNW1L9qTXPDuo/ERtcl+IPhLUNOszqUtjBJAJrIXmmbbe0Ijjhdorby2b53fzPlyM1OX4LD5BxA3DSm1GavrZK05xTt1jdbpWbVpO1ubH1auYYd/zNNfNNxT+9x9LbH58SafJ4mgil0O0gskD/6RFbsUO87udufUn5gc4wO3PVz/AAi8e3GhS6rceGLxrpFWVmRQzzwklcuincrKcZbHIODzycHwu9hbWC3t7PLBJnJj4DR/Lkhst0znjqDX1d8C/g5+3P8AtNfCSa3/AGd/2aPGXifQbe2lEmswWaW8F0pD5RLm4dPOJwBshJ3EdM1+mZtjsXg3D2XLy81m5vlsvVvX0/yufL4HDYKonKvJp2vp/kfNNz8P7zRPEyeHL3TdTt7iOJFubXUIVSXzSpJVVVjgZ6E845OM19L/AAe13w5+z/4I1K+0zUrrRNe1ZTaXetLqyv8AYLIgl4YVUrycBpHJ+XhcHNeEX+seIvglrOpeGfH3hPUdG1+wmkiuNG1OwktLu35YZYSkMrMQQHx90cV6V+y78C/F/wC0rrtl48+LNq0Hg1J2k03Sp5miXXGjJYqT1TT4yC082N0m0ouWOV8HiJKtl7q46py4eNm2vttapRV7O9tndW1b5U2e1lFWjh63Jhoc9WWy6RW12/L/AIbU+3f2Fvhhquv6JqXxq1zw+bC++JS2aWyzzHzdI8G2LB7WAFjnz9SuIxMVyC0cIJ4kBqz/AMFoPGz/AAi+GXgbwb4cuYrLUdB8Iaj4hv7yG4DSXereK7h7O3jZfMYqYtJsb5+pAzDwOK91+Dvwv+IvibxXo/wg8DqGvLpLaW6mllEby3NxjBeNZAI1trRGCohzCuxVB28/nl/wWo+P978ffjOnj61sxa6R4n8U63faPbpMHB03S518PWPRjxnTb2cDAx9tavB8Fcur8UceyxNeK9lJxpRTV1yQTqzjru+SnGD62ld6tnF4iZlHKsjtTneSjKbaevPK1OMn/wCBSkl/dPilYikYjA4XgUwqVbBH61Lu+YkHHtmmlZJWPlIzEAltqk4A6k46Cv8AR60IxufyP70pDPM2H5fyr1b9my/SG1112kwMQbj/AHRiQmvKJIy3Q16V+zmrx2eusqZIMHyk4zxJxntXrZFOSzOCXn+TPE4kjGWS1f8At3/0qJ3V5Nd6ros2o2mlMLn7NIbe1n6s2PkXOR8pyM/jWR4ni1+1s0k0O0huJzcRK6TvtTyif3hznjjODzzjg10Jl1VfD9y4ksxqQjlWNon3wCbJ2DnqMEZz3rN8WalNDp8b208sZFxCJZLRA7hNw37QQeP6Zr7uvSjUpNybT5V2/q58DhZyjWjGKTXN1u+34dur1OF+Md15HheO3L7mbUUK56r8j8/jn8q8xM27PP45r0/44XMlz4aiUOSiapwqhdv3Gxk9Tjt9a8tEbNxXw3EDazDlXZH6Nw8k8tTfdku9dn3f1rr/ANnjwhf+NPjPoltaTCKLTbpNUvJWGdsNu6vge7NsQe757VyEVu7cKCa90/Ya8PXb+KvEPiE6fO0X9ira28qWzsJJHuEZ1UqCCQsfPpkV5uAw/wBZxtOMtr/lqTxNjnl2Q4itF68tl6y938L3+R558fvCv/CF/GHXtCe685ZLw3sEu3bujuB565HtvK/8BrinCLkg/SvYf25tB1HSvjBa67caZcRW9/4etMTvbsqeZGZEZdxGNwAXjryK8bD5+Ug59aWPhGljKkOzf3X0NeHMTLG5Dhq7d3KEbvzSSf43GSzOAVA4PUGvrb9kL/grr8YP2cvBDfDX4geF18c6PY2bJ4aa+vzFdaa4U+XE0u1jNbA4+RvmVeEcDCj5MEakcD8TTfLIPHAr4Pi/gfhrjnL/AKjnWGjWp3uk7pp94yi1KL6Npq6undOx9vknEGa8PYr6xgKrhPbo012ad016rfXc1/H3i/xJ8RvFmq/ELxbqTXep61qMt5qNw55eaRi7H2GTwOwAFYJTPerILyKYQ3DdveocMvbHWvpcNRoYWhGjTioxikklokkrJLyS2PLdWrWqSnN3k3dt9b9SPBBwKUlyOOB9aSQ8/wCFNO7qD+Bp3RVnYJDt7Z/GkTGRz+tNKsW6H8at6Ro+r69qcWkaFpk95dzHEdtaxF3b8B29+gocktWEpQhFyk7JbshC5Oc5r0exK/8ADHHikZ/5nGxP6wisW6+DPjbRGj/4SzTm00S58tZGV2bHXG0lR+efauk17SYdC/ZZ8RafavIwfxFp8jNI2csZFB+nQV5ed4apiMmniKdnBdbruaZRmmBqYuMac1Lmuk1qvvWh4njK4yMnvUaoVJOM/WpgNoIpj5zy1fmD3Pr0ai4AyaR2LHg0bsc0hbJ45r3WzyxrMRkE16t8H3H/AAzj8Sc8E3FgB+RrylsMcmvUfhEx/wCGd/iOAOlzYZ/WuzLf9/p+pFT+FL0ZwkE89pcx3lpcSQzQuHhlicq8bA5DKw5BB7ivevhZ+2TLaWiaN8XbC5uii7U1vT41aVh/02iyA5/21OT3UnmvBPlzknnFKpJbBOK+8rUKWIjaaPhc4yTLc7o+zxcL22e0l6P9NU+qZ3f7RHxRsPiv8RP7V0LzTpen2S2mnGePY0gyXkkK/wAO524B5wozXER5DDJ70qJ3HT1zTwoUg9q0o0o0oKMdkdGDwmHy7BwwtFe7BWXy7+b3fmez/sI+IofD/wC1d4NmnuREl9d3Onsx6Ez2s0ajr3coPxr9B/Gunp4k8Kat4eeESJqOlXVq0TDIcSQum38d2K/LDwH4mm8E+MdG8a2rYl0bV7W/iA7mGZJMfiFI/Gv1la187WIZLUExPOjRj1UsCP0Irw8+Uo1oS7o/nDxqwssNnuEx8esHFetOXN/7kX3H476fpfiCPwvaeILnQ9SWxdNi6kLCXyC6cMBKF2ghhzzkEV9A+BvAXhv9s3wonj7xF41tPC/iLQtQtdK8UeKry3aa115JQ3kylYzubUFVdrKP9cCrkg5Jp+Nf2efjn+z/AKl4c134FeN/EVzpvjPSrrUY/wCz71bUQyx3LrLA6GXy5FCtE4Yj5g/I4r3/APZu1O68K/DTRvH3xGvLO48YXpvjBcazqEFra6PapKY5JyYV8uLdhdzxq00zFUBwDjCtjK3sYVI76fkfpHFnFMJ5ZTx+WzjKbm405Ql761kpxlTlBrl9yUZOTaUoqag3GJl+K/2d/gNq/wAHrb9nCx+NXi/SYfDOuXGoafr+t/Dm6FnNdzJIJVkdFB8rjhh93j79eSfGHw1qv7J3gyz+FHhbRbVtR8Z6U8uqfEOyvkul1uzLlWtNPZP+Pe3yAsqn985yr4U7T9iav4i8SaR4TX4jTfHHweumyhfLvrzSZIrCQuxVUE6XJlGWyucMcg5XgivG/wBqnXvHlh4W0zxV8K9WbwT4ntfEU1hrVlJqtrFDFJNapOtxBeEBAk8QjkSaPyzKvDfMvPLgcVWhXip/C366s/O+GOIcxrY+nhqsvaUZVJSkpy5Y+1s5NyapQdudpyTjUgpON1GTiz5M1f4R/EzQfDZ8W6/8P9U03TBtCXmpWjWySbjgCMS7Wk5/uA46nArl5Bszmu58ReA/ix4g1SXxH4v1ew1a+kBea/uPHVheTP3PzNdMx+lcW3lzcoa+zpVYVYXT1P3/AC7Eyr0m5VITf9zVLy+KV+uul+yK5ck8UyW4eJWfaWwDwKnEWWOKntrNJnCkZxzgnrSmpOLsejzRR9wfsyeP/hL+zX8O7Twt4F8Oar418Rzxm48QeJPDWipDbvM+f9HS8vHh3xxjCAR7kJVm6tXX6z+1br127TH4E68o55/4SbTi/wCXm/1r2L9k3/glR8Wv2nfht4d+OniT4raR4N8MeJdJh1LSbDTdJbWtVltZVJRnLNFbWpIwQv78gYyFPA9ZvP8Agip8FHZrZf2v/Ha3BOCv9m6DgH/c+y5/DdX5dmPipwnl2JnhpVpSlFtPki2k07b8u/o2fmNDwF4k4iryzPE4eHPV95utVlzu+u1Nxikui5VZWR+ff7QfxB+Gfx2+FmseDfEnh9/DHimW3jfw9rHizRU8sTRyrJ5Iv4PNESuqvHlmVBvBbjkfGNvIzAbhg9+QcfiOD+HFfrl+0l/wSe+Mn7OvgvW/ix8PPizpnjXRvDelXGr6ppeq2J0XUxaW8bSytEyNJbzMEVm2nyiQpAySBX5PXoW4uZb5gqm4leYgHgb2LY/WvruFuIMq4mw0sTl9ZTirJ6NNO17NO2tvJI+pyLhLOOCY1MuxtFwg2px99TjqrPl6qPurRt637sroxHU/Sn7+OaTao4UUKuSefzr6rVHuOzLWha/rPhLXbPxT4bujBqGm3kVzYzDnZNGwZDjuMgZHcZHevr29+P3w/wDBXha2+FPxk0XUL74WeIoYdc+Gfi3TGM2pfD2W+iZ5bMRk5utOEq3ELWgIw9o0kWHyD8dQrl9p6Zr6Y+F3iHwPr37JVte/ETw3PrOleBvGn9h+J7CzkAupPD2tJLcxS25Y4W4s9Qsp54CeN9y6H5ZWB/CvHDIqGJyqhmLi5OnLklbR8s9ItP8AmU7RjfT941L3Wz9R8Mc1qUMxqYG9udc0f8UNXfycL8yW9l2NPxt+yR8SLKxT4h2+n2174O1KNm07xhp1z9u0a8iLOB/pke6NWO3/AFUuyRCSrKGGKPh5+xGk51DUbH4kah4XmSPzbIWVol7ZMfn3GaNmygzxhTnnpXlvi3w78av2O/H99a/A74z6hZ2uqWkN5a6r4cvngsvEenTIZLa5MBJjmjdGz5cqnbIHQjKmt3T/APgpV8RJNQuJfjD8CPh14nj/ALJa1ZLfRn0Sc3G11F4ZLB0Bny5LZTaxxwDzX8xVsv4kxOF5sqxEZwkl0SlbSycZ3g3095r0R+/U8zy6hJLH0HzJ7pu23RpqS+R9NfA/4U/tI22v2eh+EPil4M1O40+9a5s307Trw3UE2CDKI4ySrkKuQTztGa+v9K/ZH/bW/aB0Xb49+LvilNOj37otH0m18PwzfK5KC5mV5ySCR8qHv3ryj/g38/4KR/s+a74+1T4WfGS/i8LfEPU7f7J4PnkuY7fS9SgMrO9tACF8vUGYqd8rMZVUBSCCp+xvG/7TX7YHxC8Qa/8AB34QfD1fCvibVddmls9b8UQmWXwvYra75Y2sd269v9yPJbeVugcOXZv3bKfg8x4VxSzNSzKUYTi3a1OF7dJKfI7cz6QV/O+3o1OKJ4mm6WAheEUvelOXz0vsurb/AEPAP2gfiH8Gv+CQvgjSNH+DPwr0bxv8WvEzRSXFpdzTNDpWmPK8a3N3O7efM087iKKNiglGcqoXB+a/EfiD4g2PinXtV+L3i6XX/iPr98tz4niumaFo794pHUShHMdrbRRLGIowAYzECBgV98+Ov+CXfww1b9nU+EtQNz8Qtes9Rub/APt74halIlxfyzu/mrcywEMhiQho0AIjZAfWvHfj18DPG0zPoc8nhO4u761WLw9rENu8eo6XHFO6yxzXEYzdWbWr7RJL84AHOTg45njsLg6MMLKLhFuTcpNt1H7vK3Jty095yjo9rNtWJyte2xLr83PN6PpyrVuy0SW3/D3PgT44afaW/wAaNC1LTtFttNtrjTG0aL7LrJvprkqr7HuJmIDSNlWO0f6tl6Zr3D/go7qvhfRPg/8ABz4+eC7m6We203RTBfJ4HltoRe2sB+0KNYLr9sACD90Sdm3g9RVb9sr4Sadpet+Idb1uGDQJ/C9jpepeHdKtb3zo/KW+hsDEG8wHfJuMuCpIQRjjmqOtT61+0n/wS+1W10nw3e3s3ws8S3M+t38viorbaVpxd5IVj05pNrM7yPG0qkEYYANmvYyrEwx2Hwte14K0JddHro9b+67PXXVXN8whCi3yuzv5dVbW/wDeStbW70uclpHwT8A+M4ZPFep/ArwnFf6dr0Wm+DdRgtQkmr/afNnMmpRCXyZ5LWCZH37ASQm/eBX6Of8ABO6/8Vjwp451Pxb4/wBL0HQtBsWtpvG3iWeGQw3bLNtFujP5MEIicusahedoAr85fBfxZRvhR4L1vUdSki0ux1fVNAv75ZCFtbq7tYBZTsQ/yjZC0e84wQ2K779gX9vb4faL+0utv498Kwa/4Y8KQzx6/d3KG6hjup5GV9TSFmIMdsRtUlWIQnA6V59TCZniswjXxEealRbvdztFXdPRptpXtJxjq+fSytboxNLBzyydKi0qlTZJRblb37WejbV0m7pW1uc9+0x4J+B+pXviDw9qfjLTviFa+E7iXVfB3ijVrC4R28mfbdWcqTM0klvMj71RykKzxllI8wqfo74H/s1eJ/C/gzw98VdT0iXxXHr+mR38cnh6HzEh3LI8FpKAQsUaLy6qFUEqM1zX/BUr9tz4I/Df9qbw7f8Aw7v/AAzfjxb4YvtL+IUWmXMV5a6j4fvFbyxIFKhLhgDOoVVZXQD2r1T4N/EbQvhp8JPB2veFPidFqNp4d8FkX+i20M7Sz6dAZGkjuJ/MEG+VhAY2LcqWXkGuDOqNevllJVHPklzcr2XKpKPu36O3NbS6kpPU5MHi5xk504pN25r6ttxb97lSs76X29D1/wDaE+KUv7Dn7DXxV/aw1bxho1j8T/7BbSPCOhpqKvJo+p6k628AYFz5kyRAzqmDtjgbkgmvwW+PvxGvfFPg34ZfDnUL77ZP4E8FzWE140jO7Nd6neaiI2YsclI7qJTjo25eqmv0w/4LH/EnwxfaR8Nf2Zte+Hh0jU/AXgi4+K3xUNpMHMurXUSw2NlcN5m5mzIqEsWKpNGqcV+RWpzzXVzLdzNl5pGdyP7xOT+tf1p4AcL0aFKFZwUVhldWvd1KsWpczerkouSlstYWVkj8N8Ss05cJyOXNOvLy0p03aNktEm/h1btzX1dyuXBOAadC88Exlt7uaItE0UginZRIhIJVgD8wyBweOKYkRY8DrXRD4Z+K/wDhAo/iSNO3aTLetbLOHywZcfMV7IWO0N0LAiv6oVF4iNuW9te+3X5H4hPFU8K05T5XJ8q1tdtbLzeuhgFgevavSf2fp0ittaJfGWgyQfZ680uIpVOK7z4E+b5Grx4PzPBjB9nFepklRwzOGnf8meVn8FPKKmv8v/pSO/8A7T1i58PajJ/Y8MF3DJOLGCNSEk2jMbfN1ye/ANc/4mn8SNoAm0m3V9SCRkxbwAG48zqceo6/StGGaa+8OatIviGBHElwkVzBGVFoFHAPqy8kmszxFbC68MJFL4p+xblgP9pg47g7uo+9/Wvrq9WU6b3+Hul/wz89j4/C04U6yul8S6Sfb5teW7OV+LjXH9jadbLKwR7lmdNxILBOPyJOK4aOPB6V33xecLp+m7hz9ok4/wCACuGDpnc3AGc18jnUV/aDd+i/JH3OTSf9nR+f5s9z/YC+G3gH4lfGTUdK+I/hG11yysvDU11b2N7JIsXnieBFdhGylsB2wpO3J5BxX220Wk+HILPwxo6WunWzeYun6bZoIY/kG5wiLgcA5PGTnnOa+dv2GvgB43+FOqL8ZfFur6JDY+JPC6RaXZJfs1wwneKdGYbNoO1Puhiea9pbxT4U8T3+g+LLPxNHcwveXdtpEunwM0U0rRMsisxGcBY29BkV6WV0HRo6qzb+dj+bfEXHf2xxTUdGrKpQpxS0bcVNRk2kvhTundronroeYftpW2+Pw0rnzFd75HjcblcFIs5U8EV8o/Fbwf4a0TQo9Y0jSFtbh79YnEMrbCpVyflJIByB0xX0l+1p4s0zx/4I8JeMdG1K5k0++v79LeaKH7PIoVQh4OTnKHr1xXz58RtP1LXfCUdhooa9azuFmmbzV3+WqOC55GevaurM40KmBn7t5JXT3fTY/R/DxV8HlWGhOTjaU1Jarack09tnpZnmqkbcmmMSeV4xSwozc9RXS+BPg38VPipDqlx8NfAGp64mi2f2rVTp8If7PF83JGRuJCsQq5YhWIBANfAzqRhDmm7I/YqtWjh4OdWSjFdW0l23fnocsznOcYxTmiR8MXHPqaiZi465B6Uh5I3ZrObbVkdMdGehaxqHwb8PfB4aP4fgTVPEesxQm/uLiMn+zSjbm8tiBtJ+7tGcgksegrz35DgNwaHUgkikKnG4V5eWZfHLozSnKbnJybk7u76dkkkkkux7+e59UzudH91ClClTjTjGEbK0dXJvVylKTcpNt6uyskkrOl6Tf69qdtomk2rT3V5OsNtCvV3Y4A/z0FfWvwu+FWg/Cfw8NJ0tEmvp0B1PU9vzXD/3R3EYPRfxPJ48k/Y+8HJqHiXU/Hl2mV0mJbezyOk8oO5vwjBH/bSvoN3Rv4a+f4izCc6qw0Hot/Nn4Jx9nVatjP7OpP3IJOXnJ2aT8krP1euyOY+J+lWWo+CL9p1Aa2iM8TH+Fl5/UZH415D46MbfsyeIDjk63YH/AMjJXo/x28UWfh7wmdNuL2OJtRYq29wMRKQWP4nao+p9K8l8S6/baz+zT4hbTkbyY/ENhH5jjG8+YhyB2H1r0sDUlQ4MxEaj+OXury0Tf3nveG2ExM3Cpry8za9NvzueLyFSCKi6Egn9albaMtioScknrX567H7sarDGB1qNiM5/On8gYPekI29Bn3r3GeWRkg8q1etfBiEv+zr8SiR0uNP/AK15Nn5vm6+1ewfBJgf2cviWB/z8af8AzNd2WW+vw9TKvf2MvQ88aDb17UqROzYIFT4Qj5mA3dMnrSsmzgrg1+icqPl3J2Oo8I/B3xr42+Hvin4keGtPtrjTPB0FtNrub+NJ4op5DGkiwsd8iBhhmUEJkZxkVyEkuD14pZWV1K889RmoXUjg1xweJjUqOck4392ys0rLRu7u73d7LRpW0uyMV1PXv2XtFjsLXxB8btVsI5YPDsaadoa3EYaN9WukYI5B4byYRJLj+95dffHwf+Jdx8RPhToFpoF2j6/faHHHcy/eXTNg8iS6mx0O5GMafekfGPlDMPmf9mfwT4R+J/7IPh7wHaeKFsLy28f395r9tb2jT3t0THiMQRJnefLMShmwi4bcQBz9A6baWPwy8KJ8NvhKYtJnkjlnu9QnuFkGmQBisl7cTD5ZZhkRx4+XzDtQEIAfj8diKlavJyve9j+ZfEfFYbOcyqU2mq1OrKMbr3Y04Jxu+8ZSvUsk73t2T89/4Kr6N4W0z9njwV4V8LaGLi30PWJVhKxeaba0gtVgd3OeBvkiVm6FzXGf8E69R0TXYLbT/GVlb3a2vh6ZdBt72NXSJI707iikkDBc449a+htO8BjxXe6bqVzZmXThqsGiaVp+oLvE2mW8dxJdGZW6m4mDM6nkLDGDzXzza/AT4ufC/wDaR1LRPhRps7aN4cN3b+FMbWiWIRpdtaNuYGV/Lnww6kDI5Gav28vZxil/X9bfI4cizLA4rgutw3UrctWnz1faSla95SuvKSlJKVm7rnttr9S2dr4ButTm8AWvh+FY9OhOqJYtobLZpJM0gZ0lK+U0h8xyyDON5OMk18bft0aVonhr/hLvBXh7TjBp8194a22kKs1vazQw3rsAMlYgY5IgF4HPA7V6prf7bHxQ06AeD7X4VW1prjt5MSyNcSYlJIG22YBi2exYj6ivK77xff6r+yr8V/FGs3jXmoar4o062v5rvDtuaaPMh5wCDkAjgZGKvC8kq8fJnRwZk+c5JmkMZiV7kpUYKPtFLmlKtT/eXWiSabSd29r7s+Xjp1srfLbRj3CCpVfYOD9aszjeSRxzUDR+9fbOCpOyP6eU3Ne8Ks5J2+tTRTmM7lOTULxtC210IOM4YYoR8jBpwmmtyZJPY9IuP2rP2jbn4ZaV8H5vjT4iPhbQrWW30nQTqTC1t4ZHLvHtUjem5mIVywXJCgDivRl+FegRfEbTdLvNGhTdpF1LcwyQqH3rJCBkHkHDnFfOb5eJ0QHJUgfWv0o1myt0/wCCgPhSGW0iZn+Hl55m6MHLpcooJz3A4z6V5uIo4bC1VyQSvq7aat6v1fU/M/EHOcVlk6Lhd3pYiW9v4cItL8XbsfFbftQ/H/RfAevfB3RPi34gtfCmuI9rqPh8ai7W7weaHMYVi3lAlVDeWV3jKtlSRXmk0zSsdxrR8aSTW3jHWbWRcGPWbxGHoRcSD+lZqHzWGRzXq4elhqSbpQUebV2SV3Zau278z9AoznOhDmd0kreSGEMc89PelTc3QV0fgv4X+N/iE91F4K8OT6g9nD5twkLKCAeijcRuY84QZY4OAcVT17wn4h8LPaJ4g0aeza+slu7RZ1AaSFmZQ+M5HKMMHB46VKxGGdf2KnHnX2bq/fbfbUqE1V5lDXlte2tr7X7X6X3M+Pr06V9A/sT2d9428JfGT4PWEqm81j4ZSazo9uWx597o97bX6xqNwyzQC6UDvu+tfPrbh0NexfsC+ONO8IfteeDP7etvO07W5rvw/qMBk2h4dRs57EgnIwN06nPtXx3ibgp5lwLjqFJe+qbnH/FSaqx++UEj6Pg/FxwXEuFrSdkppP0l7r/Bjzf6hqsM37L/AItljbUtKlN58NNRklGyaK6AuDpjOCQI7gN5kPOI7gOo4lJHkesaG2oS+TOn/HzIY7S7myhimDENbXA/h5yAx5DcHivqX9vn9mS38K/CrwR8WfDnnW+iLplrpF1LPdZmtBMrPbksGOBbahDeWofsBGorwiXU5PirpN34lvGEfiO1TZ4ys9u0Xm3CLqKqP7xAWcDlXAfo5x/HeS42nUwixdHSMm1L+7O+r8lN+81fSUle/Pdf07j6Ddd0JbrbzXb1jt6J7cuvlt34fuoXcRW8lsY5tk8UsmTE4zgH0GejDpkfWv1a/wCCRP8AwW7t9HttN/ZS/wCCk2oya74WgeOHwh8StTmd7/w7IpIiS6uFPneSpP7u7U+bbkncWQkr+dFh4KW71a3sHAlS7DQmOW6ETGTnYA7ZAcnAXPBOB1qebQYWSOW2sXtrhIdt9BLIWYzLlWfaeUJx86HO1s9jXuYvF4bF0vZ1En59vv8AT02PKjl04zbV16afNef/AAeh/T1r/wARF+CVol3q3jC/8Z+FtWIkstUSGO41TTBcbzC8nk7V1Kxl+VY7hBvHy+YZAdy+UWfinUfGPivxFrnhvwTr13JpLy21vNqapaLpzxb5vspizidsLGwjHUNyOK/LL/gmf/wU1Pw00ax/ZE/ag8d3MXgW0vGu/h9r2oXMjWvhbUTnFverGwaXSZiSrpk+QW3qNu7b+mfwx8W22jahdvonhmTwp4d8Wxiy1Tw3qeqx366B4hji3fJL5vSe0ZbiORQwlgCshBbaPxjjzLKrqKpXdqMNY2V27q19U9E91e6vpofRZN7OlSnGKvUe99FZO+yad2r7KztZ6u8vkL4++CPDviLxzrd/dSRaut94PtprydboGWXf4osYhJNiXEMoR2U4XaoAGc5rxP8AZ5+EHhltA+IHwt+Jtjo1jJZapqaXOqavb3Oou00BkAsYo7dgXlJPmxu4IXDE4ANfYvwe+Ftz+1v4s1i0g+IV94W0bSvCLS3Wm6VotvaQSW41NbmOJvMPmlbm5TzVYkMqx7T1rn/2OtW+HGif8FTvil8LfFmlGc6h4v1RdEKzN+6ulkZgp+cFlli89CoOW6HgV89lFXGwy+GHd0mou7bVuWcY307Xd9GtN7H0uNnQpV6iesoptpa6ct0tVa/lrY8g+DX7KUfgO28V/Ab4ueGLqXStQ1C2stX07VcQSRrN/pFjMA0hMcsiSNGrnhZWhAGM1rfs4f8ABPO2/ZE/aD8feAtI1STxFp/iHQbbVvCuqXcIMlxprSOrrPGHA3Qu22dQMcJ/er7y/ad+AHhKbXbj4z6zdXpsL7URN41nuLwvIdPdPs4MShvla0Eduw64dSw5NfMnxQ+IsFx4W8R+E/G/xK1X4eXfhq6vrv4Z/EfTW+13OjyuTG1hcpyJo51aOQxEfNG6sPmUVOeVMyhUxGBlWcaeIavfe6cXGXLFN62Slyp7Ws9DkwGKp4iNPE06acqaeiWzas0n1s9bfyu++h+R3xw1jwpbfGnx38RNK0y2SBNcu9P8NWUaAR/aHdg02Ax+WFCzDsHdO1fqv/wR3l1n40fD6PxP8UdRg0vwd4f8K2cfiUl2aD+y9JmN1PM/7zO6V44EJwco0g7V+efgL/gl/wDH3x78UbK38a+OfD/9jtqMiJfWurhmm3u7O/l43K3AZwwLBSBjOK/Sb9pHwx8OP2Rf2f8ATP2Y/CHiyUNr+if2l4308Dalp4d0aGW8jtHBkOJr678kMwYFkOwjnn7nO8dkuP8AqmDw01X9laUmndKMVZQ13c2tUrv4tjyKVLGxjWc06bqNqKa13vKemyitm9L2R8VftgfFvxR8f/hv+0/+1Jq+olpvFHjjQdHaI3G5oYWvGuVthhj8sUVpZxdODCwPWvg6OMyFQ2enQ1+h/wC1n8JdA/Z7/wCCVtjpPiAqvinxz4h0G81eUyktdX2Ly/lOCx4jguokPAIY4Pavz6leKIDZjgV/YP0fJ08fwficXFtxliqiUn9rkp0YOS8nKLt8z+fvFdPD8QUsP/LShoul3KVvlc7b9m/wf4c8X/GnR/D/AIp0yO+sGW4lubKQnEgSB2UEAg43AflX1tqWi6RqPhk+FNR0aOHTbm0e2ls4rcKkcTZGFUcDHDDHRgDXjH7Pt7p9l8LNMujDBDcPNdk3KxhZG+dhjePm6DpnoDW1eeLNIuYRe297dGORJpFl3SgYjOG6nOeRjjmv6gy7CU6OHU0172vystD+Q+K3i85zu8XKKpe6t2uaMpe8tkm/v93fQ+YfFGm3XhjxFfeF9WXZdafdSQTo3BJViA2PQjDA9wRXV/BWdQuphHxueEZz0+/zXSftOLFqvgfS9fjgDSzapFi5kiHnNGYJMKzH5sDA4JOMVyfwTjZf7SB/6Ykj/vuvMwtCeHziMN13+TP0p4z+0uHHWkrS0TXmpK//AA3Q6+wv3l8Pam7aMhKz3QW2ERUXCjpkfxbsYJ79qoeIrtv+EbglGlRMS9sZLSWEusYLKGG3r8oJx6Y5qzZ3+oy6DqF0DmaKadbIAA7lUfLjn5jnNZ+u6hrcfhq2e0lC38zQrIcquSx+Yc8DI4r3a2lJ3f2ey7nk0Kb+sLRfF3f9W8zB+MOw2NioY5F3IMk/7FcFOxWNsEn5TXZ/E6Qy6VZblwRdMCN2cEp0z3weK457d5FIAzwa+SzhueMly+X5I+zyZKGAin5/mffGn3it8OPgYjMNxk0VVycZ/wCJbJwKd8GTLcfDP4b7I2Yv4tvgxUEjGy+AJ9BnH5ipvCuq3ej/AA1+DujpplvOusWOmWzSTploALIEPH6NkYz6GpfCvxY8Q33h7wxqENnbwpqfiq4064t4wdqxoJtpXng/ICfqa+rwtL3It+X6H8w4tVqmHqwhC655u/N54lbW85f+A+enlvxa0650H9mb4aR3kDRSfbdTlZJVKsAZJSMg4I4xXjfhCJf7Fd7jl28NO5Pc5LmvePjP421zxf8As8+A/FfiK4hubuXUdTWR2gUBihcDjtwMV4daeJrXUUDNpMUcl9o7kyQyEbVAI2Y7jnPaiVKMIpt30/yP1LhmWInlVWMo+97Wrez0T9rUbSvbTf7tjyh544YQyjO2MHGevFfpJ8CdS+HX7MH7L+h+LdRmjsdOtdNt9W1O/TAe+vZkWTCt/HIxKxRjnAXsAxr83haL8oJ/hH8qtfvvsy2rXMrRRnKQtMxRD6hc4B96/Kc6yeecQhTlPlind26rsfa8VcOriXD0cO6zhCMuaSSvzK1rXurNa2dnq720IfGuup4l8Zav4lTTobIalqlxdi0txiOASyM/lqPRd2B9KzgwxRfqy3sgweCOPwpoyOo+ldnLGn7q2Wh9jShGFKMY7JJfgO680nAOKVgQDjr2qMZU8/rSlpsWkfRn7F91aXPgjX9JiYG4h1lJ5IwefLeBVVsem5GFdx8T/ih4V+E2l/a9fn828lUmy0uJwJpz64/gTPVyMem48V8k6H4g17w3dtqHhvXLzT53jMbz2Vy0TMp6qSpGRnHFV729vL66kvtQvJbi4lOZJ55S7ufdmJJr5ytkEMRj5V6k/detuv3nwWN4IpZhnk8ZWq/u5NPlS1ukla99Fp016abmt458ba78Q/EUniXxNOrSv8sUMeRHbxjO2NAegGTyeSSSeTXRwIp/ZO8SyqPu+K7Ff/HozXAYkY8H9a9DtoR/wx94oc9vGGnj/wBArqzpRhlkoRVkkfpWT0KeHqQp01aKVklskjyBskEbqjOATk04kheDUR5ODX5oz6s2ADj5mxSHdnPFOwPuk9vWggDoM/jXvWueWRsAOetetfBneP2cfiWU6m801cfXf/hXlB74r1v4Lhm/Zr+JuxgG+3aXgk+pcV04C6x1P1RFS3spX7M+2fhF+zv8LPh54AtPC8nhDS9SnmtEOqX1/YRzPdyMuWPzg4QZwqjGAPXJrx/9qr9h3RV0a5+IPwQ01raW2Rpb/wAOwkukqDJZ7fJJVgMkxcgj7uCNp91+Dvj2z+Ivwx0HxnpzKVvdMi85VOdkyLslT8JFYflXTh5XbAYj3z0r+IsJxzxpwpxZWxjxE3WVSSqxnJuM2pNSjKO3krax+zY/0Lx3AnA3F3B1DALDQVF04ulOEUpwTinGUZb31u73UvtJn5UKATuRgQeQc8Yp8apu3H869w/bi+C1t8L/AIqDxBodmsOk+JY3vIIo1wsNwrYnjA7DJWQDsJcDpXh8jqhIz0r+/wDhjPsHxLkWHzTDP3KsVLzT2lF+cZJxfmj/ADp4q4ex3CvEGIynFL36UnG/RreMl5Si1JeTPYP2cP2jvij8LblPh14MlsZ7DXdSRZLTUIiVjmkAjMqsrK3QKShJVtoyPX6X8EXfizULu88Valr1xf6te6ouneE7ecr5X9oBSZL7ylwoSzhLMuRhH6fMRXwZpfiG/wBA1W313SrnybqxnW4t5TyEdDuB9xkc1+jX7OllY2nw1T9of4nIdOW40QTWls/P9nWLYkbYOpkuJDv9SDEtc2c0oRqqpHS/5n85eJ2CwmTcuOp0Y89b3XZe/Oelo92mrc1t4pp+84nqXhbUrOw8Z6R4N0nIs/DegSSspOSGnIghDc8uyR3Dknklie9dX4p0HTdf8ONJp2omwvU1Zr6w1KNdxguggXzCuR5ilMxup+8hK8HBHnHwPg1PxD4Kn+KmsQeRf+Lrxr/7Puz9mtlHlWsAP+xEgOf70jHvXod7f3dt4TtIYrN7hp5ne3tYR+8mlbcFiQ54baCxzwqhmPGM+JWqTpQj/eaPwH+zY18zqxpy96jF3e6ck7yv0a53LfRo4yXxfbtfSReOVh0XUbBN87XE2LaVAeZYLhsBkP8AdJDrnBXIyfnfWP2SfFHw++H/AIz8O/Ce8u/FGgeJ9DeOaz1aNLGWK5e6/wBDlg8xh5yo3ymVhGG4256j6B0q903UNfm8Q+IrqPUJdMWV5r5FJ07S9oJeK1DcSSAA7p/mbgjcuQg3cx6vpd5/wkUD+f4giLairN88cewLHEM9PLQj/gZY963p1HGam90ejhM7xXDlRxwi92Tg5RavFuEuZWWk1y6yT5k02rpppn5ReJPDGveD9buvDfijRbrTtRspTFeWN9A0UsLj+FlbBHr7jkZFU7G5FlfR3b26yrG+TG/Rq+2P23vBNp8TP2drr4la3Zxnxd8PriK2vtQQAPdWQuFtpo3P8SgywXMefuiSQDhq+JJOCRjvX3GDxNPMsM3a3Rn9UcJcRx4oyf6zKHLOMnCcU7pSSTvF9YtSTT87dLlvxNrcGsyo8duQVz+8frz/AA8dqyss529MVKVHXvQy7huUYxW2Hw0MPTUIbI+ppRhSpqEdkWvDlml74i07T5OlxqVtEfo8yKf51+kPjS8jtv8Agoj4ac8AeCdU79vtYP8ASvzz+EWlLrnxe8I6NNOI0u/FmmRM5GdoN3EM192fEHWAf+CgHhmZzzJ4D1D/AMemkP8A7LXFjnfExXaP6n5H4mL22Mo010w+Lf3wiv0Phr4xWUunfF3xbpsxG+38ValGwB7i7lrBjB3YI57V3H7SemvY/tG+P7WVgXHjC/YlTx88zOP0YVx8cQh6dfWvWw8GqUW+y/I/S8vrKrltGa6wi/vime3fs6fGj4feC/DjeE/FJOmytcvMdSCM8cxIAAfaCylQMA4I+hrg/wBoXxr4c+IXxSu/E/haItbvbxRS3jRFGvJVBDTEHnptUZ5IQE9a40SEnnn3qREMh61xYfJMFRzGWMjfnlf8d/P8TzsLk2GwWaVcfTlLmqKzV/d3TvbfpprZdEV2Rjzu/WrOg61qnhXWrTxZo0hS70q6jvLVwcYkiYSKfzUVKumsyGQcKOSSelew/s0fsAfte/tYodQ+AnwH1jW9KVys3iC4CWWlxkdQbu4ZImI7qhZvarzetl+EwUpYypGEHo3JpLXpd6arofR4KOIxFdLDxcpLXRNv8D9H/wBoH4K+Jfjj/wAE6LbVIru1vdI8d6B4r07SLby4xNbagsr+INJ8tvM3lSY5ogD82WBAw1fJv7Tn7MGq6h+zf8Lf+CmvwI0a2i03xR4NsLnxR/Z9uGTTtVhiezvGmhyQ1vJLDtlzxul+b74r74/Y9+F3xN+Gf7Hnjb9j/wAc6poR+J/w91fTNV+3abfm6hSaK0t77TFExZN4a3hktmUAbuRkjOaH/BODxF8P4vGnx8/4Jga7plo+j+H9cn+IPwn03UZR9nvPDGrRxz3OnH5sGFRMqnGcF3PVK/zglOOX47GYfCayw02+XpOGlOe62mlTcdH56XR/YNPGOrTpYiqrKpv3jze/F76OLclfy8z8nNf0HQtf8Pz+JPDmjm0sJpjDd6OZzL/ZV1tJMIcnLRPy8Jb5goKnJQk83qesavqUsN1q7wm4trNbf7TDHiSdUyEeTn55AMKW6sFXdkgk/Sv7cP7JPiz9ib4y6hb+GNPur7wJrl1dW2lrNLuaSGIiSTT5WJwt3bho5YX/AOWkLxyrkM4rxn4mfDu00VbLVdD1mHULHUbSO+0y9tjxLA4YqSM/K6kFHXs6MK9/AZhQqRg1K8Z6xb384u/Vdb6u13dp29CthueDlDdb/wCf9bPyaPPLxE1y2fV9NtTFLa7RqVuz54J2iYc/cJIVl/gZlHIYY/VX/gkv+1H4Q+J37L134G+IPiCK08ZfBzT1ihv9Qt2uIdV8IzO8UK3SKS5XT7m42eaoLR286qAV3Y/NSw023s9Qju9VmmtrKdGh1RrNd0ot24lKgnDbeJAvfaMYPNej/sT/ABVn/Zk/ag0vWfEWqSxaBeNcaB4qe3LKZNJ1CI2s0oXcDhRLFOoPOUXvSz+hSzbJa+FSv7rce+nRPv0+aOShTnhq0ar3T/rTbVX6eZ+w/wCzpDqHgqfWfh94Ytn1yxv/AA7pzax4v0vWWj0jSxF5jW9jDLchTdCdlUZU7gZWAFfCv7SfjbW/gX/wWC1Txql69h5XxXjmuzDLgeVKYC6lg3QBznngO3rX0F+zp8U4tU+Iml/s/wAXxobx5ongiyub3WdQh0qW20rRLmAtb4SKVlmmCYjI3ZVJBlc818y/tsPoHxK+OXxE+JOlXgv/ACPGjXVrfLMXV7fc8AfLOSQTGo+uO3Ffl+UShh8RLDVk7cjh8pyutGrr3pXXNr+B79ehUrYh14v4ld6PW1lr0u4x2SStbfVv9F/2y/2ndRWOL4V2HmLZpCLjX7mJSIxuMxtzJLuCQWbOg82WRhkEYBJzXwt/wUE+J994G1VfCXg+XTJtftdUvby8tLrW0xpUZt4lbO2dlmSZmLW2eUVY1xmsX9t34j/C+90WbSPFXjC41/TJdEXUdP8ACej67NG0eqPE8QuL+dmaGGKKJVD2uGdyAVZAzV+duteNfF3g/wAax+KdFEMl3olyt+lvLb+dbp5chcGSIsVaPcV2h+CMZPY/V5BkS4j5cZiHea1SktLWaUd07a69H56o8fEV/wCwoqFNaap23bdtf66aadf0E+D37deqfB8/bPil4S0yw8S26MdOitdKA1zUUKTuJ2TJSywMtNdTNvKMdqnArP8AGf7T+mftOfDfxp46+If2SzXXfEfhbwjZ/wBmTv8AZtMtJrmTVLuJGZwZvLstNjYykEkynPBr85n+LvxH8Uza8ms+NLy5fxPfi88R3dxIGn1CQM7FpJT85Vi5LICFbAyDgV9feGvBsZ8EfCb9ma4LpKbL/hLPGjPKRm/10RGCNsHhbfQ7S2PH3ftklevjODssyOp9Z2qN3929oqPvNpPZc1o21+JapPlXDQzurj5WStHS7fbrf5K/T/PF/wCCln7V/ij9oXxP4P8AB95YLY6b4c0D7dBp4lLukuov9oj84k8yraC0Uj+HkCvl54ZGcgZr7o/aK/4I+/tb+Jr7Wvjp8Atf8MfHTQ9TvZb2XUPhxqQe+hQk4jbT5is2UUBQkRlOFHHavjHXNA1TwvrV34c8QaVdafqNjIY73TtQtXguLdwcFZI5AHQ+xAr+4vC3CcNZTwfhMpyytBujC04xlrGbfNU5ov3l78pfEk2fzBxjj8bmufV8wqRfJUk3B7px2jZrR+6lse0fAqyiHwv0M3E00Zaa92GNQQCJHPOenFbKpaPHHsv7l5ZNNMscoWMcOV+bjv04rI+Cuponw20GMtwL28BwexMtTwXxW2t5wpYx+HM7d+Nx3DjP4Yr99wns4YSmlrovyR/OmOjUnmmIb/nl/wClTOf/AGpZLGw+G+nW32kMY9XjVpHYEsRFJkkjjnNeXfCTWlEmprbuDhISCD/v16R8Y7ua48IWDrGEC3sZ8sHIQtC2RnPPWuF8L27vdXMgiCloo8kADoW6142N9pLNYzht/wAA+zyPlp8OyozV229b/wB5Pb/glyz1HSYtG1BVklNuJJReDcxYH+ML6fhT9Sm0Obw7bi73mzYRCFQGLeqA457c0y3isY9I1KQad+7jlnM0StnziBlj1/ip+bCSxsYJbNHtpLq3VoSeAhOAOD2zVxU3H3rbfr+R1yUVUur/ABd12/My/iBZq2i2rg5AvWx/3wa5IxGIH5ecV33xZiWwVbAqV8vUZl2kYwFUD+tcHJOoBJHrwa8vNo04Yl/I9jKJyqYKMls7/mfe3hVILv4f/Bm+udUtbb+zbXTJvLuZCrTn7Gy+XGADuc5BA9FNUfDei+FdK8M6BA3ji0uVs/H09xbyWsbsssj+cPs/s4D8k8cVm6dqcNx8O/g1t/huNK3c+llJWH4M86Dwjo9oh3M3xVlXBb3l9/avpqdRujFLy/Q/nhYScoVW5Ne/LTT+av1+b+/0Ob+NUdhov7PvgHQ9I1+PULdNc1hRexRMqnLMcANycFiPcjivFdJshaSW3k6rFNHBpskadQ75746Yr2X4pWJg/Z0+H1u4Jm/t7VW2KMnmST0rxrR7CZPskE0bLLBZSebG4wVJfvmvOqRk2v67H6twy0ssqLmv+9rXemv7yprsvwstTkI490S5PRRU1vaGUkbsD3pwQKq7VP3RXT/Cp1TxM8rRofLtHILKDtyQMjPfmvhc2xqyvL6mJceblV7Xtf5n7JwrkkuJ+I8LlcZ8ntpqHNa/Km9Xa6vZeaOm+Gn7GPjb4y6De+I9J8R6fpk1vcJH9g1OKVXkVkyJAVBwD0AIycH2rrfBv/BObxtB4ssT4z8Z6YNMWXddf2YZGuCoycIJIwuSQOTwOeDXsH7Lq6Lr2ieIfDms3sQN60atC84V5EMTKSvOTjJ5r0kfB3wpp1nqNtBDdeXqc6yzhZym0qcgIVA2LkZwOuTX8ccXeLXF1DOMXhY11ThdKKVKMrRlGN7Sun7t21dPVb9v7+4Z8AfD6lgMHXlhpVqkPjk6soqUoSduaFpK0rJNJpJfj8a+N/2AvjvpHiG/i8IeFn1jS0u3Gn3v2yCOWWHJKs8ZcbWxwR6ivPfHX7N/xv8Ah3pk+u+MfhnqNjY2wBnvX8tokBYKMsjHqSB+NfoVaaGmhanbTadqN1DFbxSJLbNMzrcBiSC+TyVycHrXC/tT6dcXP7OXjAXetzXqpZmeETxqGiX7RE2zcv3wBkAkZx6128LeNfEuKzPCYDEeynGc6cHLlnGbUpKLfxuN7a9Fr8jw+MPo48E0Mox+a4V16c6dOrVUVOnKmnGDmlrBS5brl3bst+p+e6g85zx0pduRub1xk1NMqoxJPHaoSqyN8vTuM1/WPkj+EuuoL94ZavSrVQ37F/iuUEf8jnpwH5x/41z6fCHxmfA0Xj6KxjktJWJWBJN0/kjP77YB/q8gjOc98YINbSSPD+x14ogcnbJ4usWT3w8QNfP5pjMPi8BVVGaly3Ts9mt0dmV4ii8YkpJvbR317M8cVWwdw70xk5JC0+Js9/zocgE4brXwEj6pGgrHpj9aVic8H8KMELnP4UmSK952PMAg4yTzXqvweZ1/Zu+Jik/eu9LIwe4Zj/WvKwuRkmvSfhZfCD4C+PrPODLdWJI+ma6sDHmxkPUxxE1Toyb7W+89N/Yi/aasPhRqUvw5+IN9s8O6rcCSC+fONMuiAN7f9MnAAf8AulQ3Tdn7kEVukSTpKrpIgeOSNwyupGQwI4II5BHBr8mhcFPunGa9d+Av7aPxQ+CUEPhicJrvhxDhdHvpCGtgev2eXkxf7pDJ1+UE5r8h8XPBirxNi3nGSNLEP+JTdkqmnxRe0Z9He0Zbtp35v3jwe8cKHDGCjkmfJvDx/h1Fq6ab+GS3lC7urXlHZJq1vo3/AIKH6XY6v8A21x2An0bWLeWA+0pMLj6Hcp/4DXwmrtId2Dk19E/tWftaeE/jX8O9P8GeCNN1K1E98LnWF1CJF2CMHy4lKMQ4LMWJ4+6vqcfPiQKrYHTtzX2fgnkWdcP8FrC5lTdOftJtRlvGPuq3zkpSXdNPqfGeO3EWQ8R8arFZXUVSKpQjKcdpSvJ/hFxi/NNdCFbcearzQebGJFMsW7G9QwLLntkZH419ofEb9oWT4/6RaWvgWJrTQpbmK307TyQH+0MRGvmqOF8vdtVBkDG7JyMfHCbVJA7e9e6/sR+GPE3jnxPqHhzwrBFNdW11ZX6i5crDEqO2+VyMkKAFzjknaoySK/SM0oKVJVFuj+XOOMBgq2Dhmde3NhruLb91Kbim306LXor+q+29O+JWmaFp1v8ADbwbZHUtY0+1htLDSYmxuCwrskkbpHEBgvIeAOOWIFd9ong7Ul8PWmneJ/Fcmp3a2H2W/uo4xCrxcs1vEBgxwsx+c/6ybA3tj5Bz/wAPfhzpvgqCZNPzNeXsvnanqUkYEt3L6nnhB0WMHCAAcnJOuuoa94tu77wt8P8AVo7U2AZdZ8RCJZk09gCfs8Kk7Zrth0U/u4R88p4CN85OrTjHnq9P6+9n8h+zrY7FPC5W7czvOb0v3k3b3YJ3aXxN6u75UnXnh7T/ABPrCeCbC3j/ALP0x4pNcMahY124kgsFA4BY7ZZFH3Y1UH/Wip9U0rzfGENp5hPl6XPPJk9S00Sgn8mrQhn0Lwdplt4d8O4itLRGG1neR5JGJMkjyNzJKz7meQ8uWz7DmJfG1pH4r1zWdV1K3tLPT9Js4pbm6uFjiiBM8rlmYgKPmj6n0rVONtTglRxEqrhS1jBNLvJyai5Nd5N7a2SSu7XfB/EvwbBr2s+M/hhq20WPi/w0hhbPKyywyWbseeqvDauPc1+Ysd3cQRCG/hdZ4/3c8WDuWQHay49dwIxX6d/Ey/h8ST6L468LazBf2M/2mwF3ZXAkjkBIkXDKcHbJAyn03V8reNPgv4b0z4/6r8SbC5inhkm+0x6aq/La6mSfOY9iqn94oHR3IP3K9HLca8JOaezX4n754XZ5SyqjiKWJTvKEWo9p0703F9nJWbb25fkeL+MvhR8RfAVnHqXiTwy6Wrwq73NrKJ0gJGTHKUz5TjoQ2Oe5rnY3Eo3IwIPcHg19X6Xd2pvHtLbVUF5HCJJIlmHmBDkAkZ5B569ayvjF8NPglpfwO1Xx1r3hq2sfEd1qMdr4avNLzA1zc7leVZI1ISSMRbyzFcqSmDlgD6+BzqpUqRp1Y3baSt5n6BguNG69PD4qi+aclFOH97ZuLd7JatpvRN2PIf2aNIGs/tG+ANMIIEvjLTicei3Cuf0Wvsb4jWqx/t7eEJgcA+Cbgfmbo/0FfMf7F2kJe/tZ/D+IDIj8RLN+CRSP/wCy19O/F2YQftx+E2iPKeD5x16fLdn+lenjoWxCb/lf5nyPH+IlU4gjSX/QJXf3qS/Q+Vf2voIrT9qv4gRRDhvEPmAA/wB+CJj+pNed+WZDntXpf7ciXFt+1Fr91LGEF/ZafdIR/EGtI0LH3LRtn6V5/wCD9D8QeNfEdj4O8IaDe6tq2p3K2+n6Xp1s0091K3RI0XJY/wBBk8V2YfE0oYSMqjsktW+nqfpXDUKlfh/A8iu3SpLTvyRX5lJ7ZhyOg5PtXv8A+yh/wTo+PH7T2if8LPuL3R/APw5hci7+I/jm4NrYOFzuW1j/ANbfOMEYiGwEYZ1r2/4Z/sf/ALP/AOyBoFt8Rf2wZbDxP40ly2leA7d1urGykXkrMqtt1CZTjflhaRHhmmJwOx+H2gftDf8ABVn9pLS/gp4Z159LsEtTdatfn99b+HNHhZUecqAqs3zLFDBGI42kZVACqzj8szzj7E42rKhkNuVaOvJXh5+zjo5tfzaQVvtH9LcMeC/s8u/tTims8PSS5vZxV6rXTmvpDm6J3k/5T0j9if8AY3/ZJ1zx9J8O/wBkH4Of8Ln8RaK8f/CUfF/4w2Rj8L+H85w0GlR/LcTMOY4JDJI2NxKICw/UPS/AK+CfC9voeo+NNR168jiVZtSvUjgQYGNlvawBYLOIdBHGvTG5nPNWfgX+zb8Lf2X/AITaX8Ffgt4b/szQNIjPliR9893M3+turmTgzXEjDc7nrwAAqqok8YCe2mH7zIHGM9PrX5tUpvFYv2+LqSr1P56ju1/hXwwXlFIrMMbl8Kf1bKcOsPQXRazl51J7yb7aRXbqfG3xx8cxfsnf8FFdG8c+IdIiu/CXxZ8Haba3009yUXTtR0q+8k3a84Z44Lu3YqeqM3Py186f8FAPCvxJ/Y3/AGhPCX7YvwWiaTxP8FfFa+H9ctpZjt1XwzqJku9Lab5jvidZb2wJ6BxEONor6U/4K1eFYvEn7LMPxNERe4+HHiSLWJtg+Y6fcxvp96AeuAtxBN/27A9qt/tPap8K/if4B+HvxK8eXyah4W8XeFrPwP8AE26tZcPFZ6jawXdhfglv9baahv8AmGdu8DvX4xxxhY5TxP8A2jCP8SKbW3MvgnHzdrNedup9jwxV+t5PCi9bSlF9bWXNH77yj56Gr8XfhD8Nv21PgdP4mBvZPBHxC8MWGrx+JoMSv4cu41Y6XqqASt81tmSyuUUbniCZ4Br8mvjF4J8bfDXxjffAv4keFLfR9S0BpprLTbOUyWskcvzvNayk/vbW4ZTcQspIAkkXgjFfoL/wTG+LN1+z78bdY/4JYftNa1Kuq+HNXutZ+DuorOyWuuWlypa5soxvA3MVNzCmcCTz4+qKDv8A/BQX9iWH4oaAvhH4Tadoup3+saobvw3qkUmxPDWpQtLLdW8LglxDfCQotq3yrKAVr4SniIZViVTnK9Gfvwl25tpK32Xez6rVX3R9Rg60oVZQ2a0a6NLzb3UV5J2SWq1/Ka78PW8+htruhymf7BPH9o3dPLlB8psZ5BYSRE9M7B3q7qPgG38f+Ebe+tZSb02s+i3jFzklYTPYTE55LQ+ZEfVrNTXY+FPB/iHQPEbaVrmkNbreG70fVtKm+Vod0m2RHG75XikWOZeu0xsa6n4QfDy90LVfG3gPxdaBdR0fTDe7Vbg3Vhcq+V+blWhknUeqvXp4jN44WDnGV3GzWvRvld+6T100+E9mnhfb2Uo6P/h/x2+8+rv2KPjj4P8ACnh3xR4z8PeBn1O/8V6NpGpeML271EwJDexaUVubWNMnzY5J0DMAeZLkA9q8G8LfDCDxpoPi7R38QnTmk8KzyQPOxCC5h1GNY4GO/O5pDsHX7w75r2X4Szxv+yvrOjeEdGv5LzRPFd3b32oWuoJ5Nta3Xk3FuPs+7duklt/s4nyFVjtpbCCfSfi/rPiu28ESatZ6deTXX/CO6WSZb1rTS3mkhj2OSxe7KOMbgdueor4WeOrfX+Vu13Hl9FJWW3mmuyVvN9tPD0qdOpKC1V7+bS9bK/y7nz7+1p8TtIvfF+peKl1LR9Q1jxH4hW9g+H3hvwHd2Y0lxEYEt3vrxY4EbMWJGjSRnBY7xwR8QfFzxxrusaOPB141npthpTXUIsdMWIl3mmM0n2iaMmS8kLLH+8ldgqKiqFGBXofxp8R3/iq3z45sH0u6sE+z+IINYurm/ge7bf8A6RErElZxny3jYkLjJ64Hk/i7UNIudFu/7M8Ix6Z5l6pRRrbTNbxlTuhMRAAZ5F3k8EAIoGBX7nw3gY4SCk4+87Xta11orO9ndO+ib11eqR8DnFZ1VyX0V7X7fd021ZX/AGWPg/rP7QX7RnhT4LaOpik8Sa7BaTTE8W0EkqxyytyMBEZ3z2C8Cvr/AMHa74u/aB+Jfxd+Mfwg8K3l/DD9sn0HT7JczC2u5U0+wjjTcCzRaVbysqrk/uzgHpXlf7AdrrPgjRfiv8f9MgS3bwt4CntbXUScOmo6o39l2cS/MMMDdTT4wf8Aj2B/hr6H/Zw0LRfh5+zjpcOmSiCXxRrtzqAlDYb7JZD+z7MdenmJft/20Br1MLGGf8b0cHJXjGUIfcvb1k/8VOMEvPU/O+Ps4nwd4cY7M46y5HGK2vKo/Zxt1927lp2Z578BPGXxxsdduNb+DreKItR0+XF3deHILpJrVwT8spiGVOQflb0PFfZujeMvFX7YmgW3w9/b2/YlufinDEhhtfF9lpp0rxVpy4xmK6QKJsY+44UN3LV4pq+veJINe/4WB4U1NbTxTDGEkuXlKw6vED/x73gBHmDrsm/1kTEHLLlT6Z8IP2mPCPjayWbXLWbR7yKVorqG/O5IZlOHjduqMp4O4bTwQxBr7vjvF5pleNjiaeHhLblqrmVSL6rmjKMl5Wdmt07M/NPAThXg7xHyirUwmZYjDYul/Ew9qcoOL2mk4vng9m7RknppdN5/xl/4Iu/Ef4XfDpviR+yTqGtePvBdpNNcTaHqmkPaeKNBDZZormzwPtIUk/vIRkjnyyvz18dzaRLDcGMu37uzkixj7pDE9z2x09a/Xn4J/HH4ieBL+21vwh4qmWLA2QTyme2mTJONu7GOuCjAjtit79pb9hz9m7/go/o174y8GWNl8O/jH9naae7iQ/YtcIHJuEQDzR6zqomTILrKor7Pw78f6lGpDAcRRXs9o1Y3uu3Ouq81r5Se3qeI/wBH/F4BTx+Tz53vKPd+X8t/O8b9Y9fxI+KltK3gu1lvJleZ72JpHVdoZij5IGeB7Vwvh3at3cIGJPkryT/tGvbv21/gj8Sf2eNTl+E3xd8Kz6JrunXsTS2k7BlliYOEnikU7ZoXx8siEqcEcEEDwXQb8RX9wh52xJx+LV/UkcwweM5K+Hmpwkk4yi0001umrpn4Nl2ExWHwFSjXg4zjJpxas07rS3Q0ZLqOO0lMamMec6hd27ee7DB6H9MV0/wL0XQfFfxLt9D8TaJDqFh/Z93JLa3IJXcqDY3BHIJ49M1x8d3EI5T9paVoiyNIw6Zz8ox1HIGete0/AD4c6n4I1691fxlBHaXj2f2e0tBcpIyoxDyM20kKfljAB55NJP2rSTOPP8VTwOVVm5Wm4tRs7Su9LrrpdNvocZ8dJPhMdSvvDMfhW5hudIaSCAwSskbSvHv4O87v4eWHY18/6XMNUg8yNwxxhwP4WxnFfUXj/wCBlj8RvG/iHWZPFosUiuY28iK1ErbxaqdzZb5RnsO1fPieHNXtFDQaeJFZcjyGU/p1ryswwdaVdTktNduv3Hr8I4/A/wBneyp1HKajBvmb0cld2ctNXd6H1lYJqNj8MPhYtiUEpm0xA7qDsBtWyRnv71X0DVRrdlo1/ptsbaD/AIWK2E35zIFlDP17tk47Vd0jULV/hr4Bjvr4Wz2402S3VoyxldYMGPjoTk8+1L4eHgjR9Gsrb/hI5mih8ZGWJltySblvMIhOOg5PNfVU4wVNW20/Q/JJSajUvBuXPLZN6OVS/l1Vvn5nC/Ec3T/s4+DLo3LeZDrOplHY8g75D/WvKrDxLdakkEs0+UmikDoQMkjPORXq3xV+yp8BvDFrp14ZoIdbvk80qVLE7ieCeOeK8dFlbWjo1qzLHEjhYyfXNcOJk6duXb/hj9E4cjTqYGpzLX2lW2m15zfy3RjaTpVxrd9FplhD5k8xKxoWAzgEnk8DgGvQ/Bfwvm8PNLfalqf7yWLY0NsMgLnPLn6DoK898FXMsHi2weNiD9pH65H9a9Bn8ZeKX+JNl4Vso1NibZZbr9zkspViWLnpg4AxX4Fx1mWaVK7wdCUY0+RzlfdqLel3fytotep/bfgdk3CGGwDzzMaNSriY4iNGmotuKc4pqTinHa8rttq1rRufRPwC0rwwfh3ey6l4Zsrvbqsgaa7hV3VBFGeXbkKMnvxXSDw94J1GIT6fbzQxvkCTTdamRPw2SYrmvhn4Vm8b/s5+LvCemyRpeaml3bW5kbC75LdFGSOgzwa5f4G/AnxX8Ffgr4k0fxOkEN9qUkj29paXAcJmERIARxuZvT2r+S8wwscTi8ZiPrrhVVaEY07u8lK15fFtH0tpbS6P7iwuYYnC18HgYZWqmHlRqTnW0ShKF2ofC7uWltb63s7M9I/4Q+1t582HjnxJanHQas0o/KRW4o1z4d+IfEeg3WjX3xAub2xvYWiuLTUtMtplkQ9Q20IwHTkEEYr54/ah8dfFL4c23gzTvDnjPUtKUeGFmuI7ScxmSYNt+f8AvYCgYPv616t8QvHHxtvfCvhXUPhUrNNcpDNrPkrDkqY42A/eHhSS+dvNbV+Hc6w1LCYl4mm1WlPllJRXLyPRuTi7XtpZvWx5VDi7h7F1sywiwNZSwkabnCHNLn9qtowUldK/vJpXjd2tofOv7Yvwa8P/AAg1bQLXw3YWsIv7a5ec2sspEhSRQCUlZihG4jhiD7Yrx0TNHGxHZT39q+iv+ChN8tz4+8PO7kxnRJdg3ZAPnnOP0r54AVz2xX9VeGuKxWN4OwuIxVRzqSUm222378t2+y0P4F8acFl+W+JePwuCpKnShKCjGKUUv3cNkkkru723d9z6D8Y/FXwz4O8NWUDOsty9hF9nsLd/mUeUACT/AAqBxzye1cLqWs3viL9lrxVquolAX8XWOyONcKg3odoHpXmkisSWUV6FYQyN+x/4nnJ+UeL7AfrHWtTKKGU5fU5W5Slu/n2PyPhjIcJltfmT5pPVt/p/Vzx4nPGOlRyF9307VOQCeBzTWVf4Rz718nJH3yepqADG3PWkA28gZ+tPBLJkkCk4zgmvdPNEK8bga9C+GVnK/wAFvHN2GBRJrIMPqTzXAbR+HavUPhHGr/AP4itjlJLFv1NdeBfLios5sVTVSg1/Wh595bHJ29OppwQDjFBUbiTn35oZgOAK+oukeBclVwoxg4+tNZx1Ddf0pmwv0/KntGztu4B7gDFHtJXsQ0iOecQxNO5O1FJbHXFfp3+xN+z9a/s//Auxt9at0i8R+Ili1DxFJIcMsrIWhtRntEhxt7uZW9Mfn7+zdo3hfXP2hPBWl+NVU6Q/iKCS+jkxtlWPdKsRz2d0RPfdivvrxb8abjx94zsdM+HlwZLu1iZNGeaMqJNSuFKPcFT/AAQIZMZ64kPQivIzSvKyh0Pw3xkxOYY6nQyfD3jTadWpL7Nk2oRb7cycpLpaMvsno+q6rfeKtTufBPhvUZLSC0kEfiHVrd8SwEgMLSA9rhlILyf8sUYdZGUL3WjTeHPCfw//ALG8P6bBaI/+iadaW64W3t0OZCOc8t8uTksdxJJzXA6NaeHfhP4Ij0i3aSW10yI7mdt017O7fM7Hq0s0r9e7PXTJcXMlrbR6lcJLcxWyR3DrjaXAywXH8IYkD256kmvn68Odwj5pv5bL7/vsfzxRxVPCwm6KfJZxh0u3pKb8+XZfZ5ktdW693CHjaRjwB09K5nTvDeja7H4itdc0+C8tL/U3guLW6j3xyxxwxRbSD2yre4xkYIzXXXZi2wqs6Eyn5k5yihsc9uecY9K88v8AxfF4V0Oyjgt/t2rar9ourHSo5NrShpnJldv+WUKlgGkPH8K7mIWt1O+pOGjiaqcKLak+W1tLfavfpblvfS255bpng/xR8G/i1cfD631yafwzqtvNqmi2tzOsmyaIYCnJBV1DEFhjzFKNz28lsvEVtqNskhvlknkXzZwx+cu2WYnPXknmvbPHVtcaNolh4gurpLvU7XxNb3eoagVEf2g3Mq28/BPyxhJFVVJ+VY0Havna/s7rSdXvNGlJ/wBBvp4MntsdgD19BW9GpeTR+z8OJZjTnWqtOdoxckrc0oc15W80466NvtsdPpckNzfGCyiia4lQuVWREZwikklj1AArlv2i7azuvAME2uX1zDe6SIp9KguboMYjdN++smjX5A2FWdXByFyrfw46DUIh4bsNGvFtEXWbi6+1W7r8rW8SjknB5BDAYPGS2eBXi/xQ8RN4x8TMYLgvZ2juIDniV2Pzy/ieB7AV6mWYbEYrFRlTdkne/p/mfZZBg5YnM4V4O0Ya366NxaXS0lePe1+i17P9hS7uW/at8JyouTbtfTn2CWNwc/nivpX4hN9t/bd8Myyjr4b8vP8AvRXn+NeF/wDBPHQo5v2lLW58rP2fw5qch9sxKn/s9e+eONOvbv8Aba8IWul2EtxPcadbJDBEhZ5GP2hQqgdSScfjX1GIlyVm6r0S1v0W589xnV+t8aSw1KN5fVJpW3bk56Lz7Hkf7ZXwQ8X/ABW/ah8J+DfhvoLahq3iPw5Fb2luJVRd0dxcbnd2O2ONIzueRiFVVLEgCvQBq3wf/wCCf3g2T4ffArVbfxN8SdatDB4l+IEaMg2N9+008NhoLMY+aU4kuNu5tqbUWb9tz9pvwv8ABa6l+Hfw0ntNQ8X3Fu2na3rNs4lO0Sb3s4mH/LtG+N5U/v5RgkpHXg/wd8AfE74z+PNP8C+CfDGp+LfG/iaby7LSNMiE1zcuOX5JCqij5nlYrFEoGWABJ/Gc4zWpxZFJNxwUdo6p1mn8Uu1JdI/a3l0Uf768HOBIeHOQYKObxTzJUoym5W5MJF6xi0/ixDi1ptTv1dybxJ411rV7q48T+KtcuL67eMfabuXLMyjOEReyDOFjHr0yTX7sf8Edv2Nrv9jL9luK8+JGitZ/Ef4gPDrPjOG4TE2mxbD9i0s55HkROWcf8955euBXk37C/wDwQS+CHw20NPHH7bmnaX8Q/Fd1EDH4SimkfQNFyOhwUbUJx3lbbCp+4jECU/XMn7NGqeEoAPgd8Y/EvhlIxiHSNUvpNa00AdEEV4zyxL2+SUADtXh1atNQ9lTdkvLS3ZW6fK3bQ97jXi2GdRjhMLd0ottt7zl3d9/nq3qz1CS5jl5Vh+Nch4904ibczIsUq5Xb1J755/yK5X/hPPj38NiV+LPwsi1fTlPz+IvBjvKir/ekt3/eR/y96n+JPxo+Etj8Kbj4oaz8SdK07RbFx5+pX1z5aROePKZT83mHoIwCzHoDXMlKMldfcfnFSvRVOTlLlsru+lkvXp57HF/FnwJofxL8Ca98L9fTfYeJdFutKvQBnEdxE8RYD/Z3Bh7qK+Rv2KNLufG37EPin9m743QvH4i+EmvN4c+IOmRSHzjpuZdlyrbuyzSyxv2NrHxwBWf+0H/wVcur+W58O/s9+Hr6GE7o21+6CQXEnUZj3Z+zr7hWkx3TpXh/7EP7RWs/Aj9sWH4n+ObO0HhrxtbPoXjy2huGeNraeQmO6mLksxjlbLSHna7CvzjxNw2Dx+RuVGadaleSS7W11287Lqjj4E8UeH6vFMcooVeb2rST2Tmn7qj1fNrFOyV2tbFn4y+B/HX7UvhXU/AHj/URo/xa+D/iMWGm+INJuWN3aTrtaxvkm3B2huSkczOoIRmWQEFyD9Jf8Ez/ANtXQPj3oPiXwr+0wL60+M3hDfP4v8I29ybT/hK1gBSG/tEBA3xsSZolHBIkA2sMU/25/gJ4v+BHiWH9pb4TfvvEnhLw/NpHii1k+ceJfCvKxzuEYl57MERy4ywRYpFzsArwf44eA/hJ+01pNh8df2bftPgnxVoaxN4b1ZfEJl1COSKJf+Pu5U4WV3bMToMFCMhhmv5+rVcFDDxhXilRck6bab9hVkvei11pN62d+jSbTv8A0pShLMIvkbU7atac8E9Ot+Z9GtV1s7HaftE/Afw7oP7QsVroFjbWFj4rubfU4LUT5hsndzHdQhi/IUl8gnJyAelcV4q8MWUvj64+IWhXnmrrBkQuQQJYXili3AMc4ZEQjP8AhWZ4a/ay+IP7Rep6b8F/2oPDVvonjzwjJcxi6gjFrDrFqwLXEvl7gBdIE3nYdj7iy4JxXp/hjS4vFdh4dvIbMJFd2lzLBHvBwzP5caYzwoBTjtvHrXzONeY5TNU8U7ytZtNOMou7Ti1o1JRTVtmmnrdH1ODdHF0IyhuvvTXfrc82vtN0/QdO8ReEoDbvf3vjO02xxyt9rg0tIZbyQyKHAEby3ESrnnejYxjNerytofwB/Zh1rx9498W6pb3fjO2utO0vT/C8Ia/XRllxqVxFKxMdqJW8qyS4kH7lXmdVdgBVIeCNL1X4pa9rek2EUlzcXkFhFPxuuHiXy4wW3cqZGA9yD6V8hf8ABT79se3+InxH/wCFZfDDxHr1j4a0fTrfSdSWSKOGK6FpG0cMaMpMk6tIbmdnLKrfaEG3Klq+t4QU8+zZKlH+HGLbfSTSu+utrqK0u2n0Z4eeyWAwn7xu03fTsto+V3Zt9k11OR/aM8eTeKtNupv7Ptrfw9FJ9l0fwnp91vs/DOnTytKbOxd2DtJIFjZ7lw0ksjbm+9x82fFJ/Ft/4Rg8SaiNHgtrnXb1LK+ZANR1fG0O8jqczQ24VIvMbaPMZwAzB8avj/4o6jdaPZaBqvjS4vp7fDrbsR5NoXU/MCpzIQoXHJwFA9K0Pil4a0XWIbXUNH8QXuo2CWqweGzNpTwSyaVG4toLlo97LAk9w1zKynk4JyWav3LKaFXL1GVfXmk9bO3lbRWv3tt3dpHwOPq08bLko6WXe787vr+d36o7fwfqt74C/wCCfunJHrZku/H/AMT7vU3sI3OGtdDsfs8O/wCfBZ7vUmIxkHyvUV7L4r1NPDtxpvw10e+Mtp4S0W00WKVTjzJYYgbl+v8AHdvcv/wKuc+Inh1V+BH7MF34mMQ0fTvAHiTUrywgAWOO1sddu7iXJDHfJIluAznJJZR6V89fDP40+LU8bTap4u1h7n+3L+SfUfNb5UnmkZ2Yc8DexyB2r9A8H8j/ALZzLGZolrB1Eu3NKrKEX6xp0XG/aXmfj/jhSxGL4RpZdSermqjXdQg9PnKd0u8T7J8GXt5q9oPtpJZW2qxPJH51o+KfDj+Hr5fiTpvyxSLHba6qt0AwsVz77eI39VKE8IaxPCerWiWMa+YANuevTP8An+Vd94Y1Gy1TT5LW5CSxtujmhkGVdCMFSD1BHGPrX6Jn+W0swwcsPV2l+HZ/I/irgrjvOvDHjvC8SZdHWhNOUNlUpv46bt0nG6v0dpLVI0Phx8Ydb8AyM/hzxLJaCQ5kt96mKQ8/ejbKE++Aa99+EX7Zy2mqQyeK7b7M0L+ZDqek7keBxnDGPJI5/jQ8f3GGRXwl4x1yw8G+LdR8D3OpIgsLgJZtcTY86F4xJHyxGWVW2t3yue9bXhLxrqdlcIq5lXHMDSgEj1Qk9fQV/NOaZLicLiJ0Z/FBtetv60P92MDPhHxG4Xw2d4OHNSxNOFSMlaM0pxTtK32o3s07q6e5+pn7QHww/Zq/4Ksfs7L4H+K2qw2ut6Wz/wDCP+NNMgU3WjXDHHmhcgGJiFE9q5VWyGQq21l/EH9pb9kP40/sbfHbVfgv8aNESC/ihW403U7Ri1nq1mWYJd20hA3xNgjBwyMCjAMCK+6/g18Z9a8FajF4r8K6/LbTISjypjcODmORTww55RsgjpX1X4g8P/Ab/gqj+zrqPwM+LEdpoPizw/bzah4a12BN76VIV+a6gyd7W5O1bi1JIK7WUghWX6vwz8UcbwJmkcLmMnPBTfvLeVJ7c8V1j1nHrutd/wCVfFzwWrvC1Mfl0b26+XSM/nopLTo7H4ZeHrRbjXLW2kTcsuqRK6noQZVBH419R6pLZ6braH7EokvLt44zEgBzgkknPTAHHXivI/iZ+z58S/2df2gpPgx8XNDXTte0jWbYTxRSCSG4ieRXiuYJBxLBKhDxyDhlPOCCB7HrV01vfRRC4VVMmXiIHzt5gXg9QQG6DtX+gWUTw2OoRxFGSlCSTUlqmnqmn2Z/nfx3CtRzClh6sWpRU009Gnpv939blHTp9OuNX1y0g05YpYFia6nUD9+zwkjJHUhQBz7V8421vbJDGuB9xf5V9I/23E7arYRxqptWCmQEfvC0W7J+mcV8xtcvsRg/RR/KvSxPs6SVtd/zI4QhOTr6W0p9b/Zevz3t02PetR8lPAPw7eP+K5sAcf7rCuU0tHitZIwT8vxKj/i/2JKZ4i17UYfCvg2GG+kRILW1eNFIwsg3Yb61nWes3Z0CG5juiJZPGayu3q3lPz+pqObngrPsRhcHVp0JO+8pf+lyYeN9R3fs/wCgozZI8QXXf1Mgrzi0T7XMEUE5ByACT0Nd34lsppvgxpULOcJrU3X1Ic1iaBaPa6apeUqrO52jjJGR19OP85r4ji/PcRw/l0a8YczbjFJuy1Tf6H7f4O8E4fjfOK2AqVnThF1akmkm7KaVldpK7ktenZnP+Gfhzq9lq1vrd+Ehjgk37HbLt16AdPxr2/4D/C+PxzrFzrPiONjpOnR7XiDlRPOwO1SQc4Vcsceq15/a6t/aWqvo1hYSzlFVfOiOVkmJx5a+vJx9eK+qdG8Lad8JPg2LDXZxbm2tHk1WYKW/0iXhsBck4JVBj+7X8heKXFePqYanB2WIrtQgo7qLd5NK7d9Ul1vJW2P9IfCPgbIckws6WAnKVCDc6kqj0lKKsk3aMeXS+itZO7dzlNC1n4P+HjLH4Y8d3FjHLJueKHVJUQt0ztkBB6dR6VL4812O68B32s6B49vLr7Fi6t2SSJ0M0Lh1BJTnB7VhzWPwl1xbaTVp4pXt7NLdJJrW4Q7FBGMBR7/nWH8V/FXhfQfBw8IeCr9GW6fbJDDbyqkUe7c53OBkkjGOe9fFYXKZV8fRVONZ1OePM6sYuPKnq+bl5noutux+sYrGwoYWt7SWHVJwkoeyqTU3Nq0fc5uVavo337nRfGf4VeAvi54A074oeL9d12+t7bStyPYJCJI4pDubciRjdtbOT2wareE7ubX/AAnezfD3x212+h20aR6dq/h9Ud41XCkbGViCoOCOpX3rd/ZO8Rw614PuvCd2+46fNvRG5zby5IGO+G3j8RWfqsEPws+IWn6vPHp0EMd61lqJs9TWR5IZ2OxnjzuTaQjc9PpXPL64qtfJ6jcpUJN0ovlcXF+9ZRcbpyVleLWslpoc0MNhXNZokqftopVpRUlNyXu83OpJNQu2lJPSLszk/wBoH9lPxx8dBpGq6d478OJJp8Mqx3EVtcpHcRSFWUgZfGNp5B715Drn7CXxg8N2FxfHXfD979mgeUw293MjyBVLEKHiAzxxk19bat8LfAg164kutL2NdAz25juXjB7SKArAcEhuOz+1UW8Aad/bNpcafrd1DFbpLHNYpcb4rnzOAZNxJyvOMHvXRk/iPxBkWFhh8LiF7OKbSlRVrO8rXjK+rbW1k+1j4riPwR4U4tzKrjcdhZSrzajKUK7TurQUnGULaRSlZO7Xds/PaFY5QGU5BGRXqFpaRr+w/wCLZgBkeN9OH5mOvMtVs30XV7rS5CN9rdSwsuehRyp/lXpenXo/4Ya8X7/+h501f/QP8K/rbOa0KuVc662t6M/ztwWHqYXMZUpqzjdNea3PCiSjcGmmXB61I4Dc5zmo5YskY4r8+ke6jZ6DAPHrQPlOCM570YOePSlC56jn6177R5i2HKCASw6nrXp/whfb8BPiOuerWP8A7NXl5bnAb869G+F97Db/AAM+IFu8gDyyWW0Z64zXTg1fExMMS1GhJs40FccmvZPhF+z14H8Y+A4PFfinV76WW/aTyk0+4WNbYKxXByp3PkZIOAOB714o7sOter/sxfEyHQ9Xl8Ba7dqljqUu+ylkbCw3OAMEnoHGB/vAetZcYPNFlDqYGbjKLTdt3Hrb8/kfnvE0czWVSqYKbjKLTdt3Fb2/PzSscn8Tvhbrvwv1z7Bf5uLGdidP1JEws6jsR/C47r+IyDXPKeM19VfG7RLC++D+uW+tlUEVv51q8pxtnRgU257nleOu418rTIsTYDdPSp4Oz2tnuVurWXvwfK30eid/8/Mw4ZzmrnOX89Ve/F8rfR6LX8dV3+4dGTkMrMpUgqysQVI5BBHIPv2r7P8A+CeOrax46/tTxx4gRpJfD0X2GO8Y/wCvmnGQ+OgdYlYMe/mA9zXxPLeJbI0shwFBJPoBX6G/s1+HIvgH+ydo0moWRa/v7X+2L63H357u72mGAe+zyI/bDH1r1s1q0/YrufI+LNanS4bjQSvVrTUId7PWfyaXK/OSfQ7zWfFC6j45t9N8ppbfRNt1chXwDdup8lffy0LS4/vPGf4a7LR9Wjv4TNazH5fvI3BX6jNedeDNJvNN01F1W5E19O7XGoXAHElw/Lkf7IPyj0VVFbVxdT6QovbM/vzIsdupbAeVjtVT7ZOT7A14DnZXP5qxVGi5RoU9o6J9+7+bu/JWXQ6tr+eaeV1b7rFEwem0Y/nmuH8GeG00aHVZZ9Rn1C8l1WWC41O72+dNHDhYkO0BVRASFRQFGScZYk9RCF06GOyEpfy1VPMY8t2JPPc81zPhHXI7/QZL5X4n1S/kB9vtUqj9FFDk7o58N7WFCr7P4W4p+e7XnbS9tr2e6Rj/ABh8L6f4j+GmuaPf2/mxSWDOYwxHzRkSKcg9coPyrwPxBb2958VdRW6dRbvcLeXEjn5ViaMSHPPTtn619I61Kb2xubHbkTW8keP95SP618i/HLT9VF9ompWd/cQxaz4cSK9iilwsxibaQ3POQV49q2oO8mfp3AaniJTws52TvbybSbdu9ofgjkvjd45fxr4vi1u3mkW0ks9tlGWK/ug7DJGf4iCfoQK46OYE7iprb8f2q2us22lLgtYabFBMB0EhLSMPqN4H1FZUNrvHLD8K/RMppyp4KnZdD93y6nQw+X04U1aKWnp0/A96/wCCe98lp8VNe1YLk2vhZ0BHbzbmEfyQ19P/ALT1n45/Zw+Btv8Ato2XhS5+0+INPfQ7DXInXzPDunOXBvFQncJLsyG3jmxiJVJ6zoR5n/wRq/Z4svjF8UfGV14kuWt/D2l6Xp767dgkfuTPK5iB7M4QqPQEntX3V+0Brdp8Yr+60XWfC1re6JNbf2fa+HZbcNA1oQI1tvLPGGG1cduO4Ffy/wCP3jBR4bzTDcP4aPtZzkpYiKbT9jsoJraVR62d1yxtJOM9f1XwK8KcZnXiJieMa0EqeGioUHNXi6vInzNPdU29P72u8T8mP2Kf2Rv2gv2/PjZH4J+D3hYalrl2olu7q7kaLT9DsQ21rm7mwfIt0ztHBklbKxq7Gv6GP2D/APgnL8Cf+CfXw2bwv8O0Gs+KdTt0Xxh48vrUR3msOOfKRcn7LZof9XbKSBjdIXkJap/2F/2TPhZ+wT+z7p3wN+F3hq2s53xe+LNQjO6bU9TcEu8khyzpHnyYlJISNAByWJ9efXhKwiByzEADPUntXv1sYq8FGK5Y2Wn6P0P0PM81xmMbpzlfVtu9+eTesm9G79OyNqCGND17etTyPFBGZHbAHb1PpXF/Cf4yeE/i5ol9r/g9bmaxtNeu9KtbtlG2/e1YRyzxc/6kS70Dtjd5ZI4Iz2GwyOJZmGR90A8L/j9axlTlCVpKzPDp14VoKdN3T69BBcsp86RirD7oDfd/+v71+Hn/AAXx+Jdp4h/4KR+GPh14TRLSDw3aabDrMdodiXmozJLdPLKina8iQywxhyNwGRmv3Ggsvtt5Fbs20SSqhb+6CcZr+cT9rX4lxfHv9v2++KLRbBrnj3VL+CIy7/LgRJ0iXPcCNI/oCKiU/Z05t9mfA+I2YxwWTKnvz87+Uacm/wAbGhZW9yYjerC4RPlaUHgE54PPWtnwk19retR+G7KGEz6jb3VrbxztmN5Ht5AityOrbR6jIIqlqEsVpZsoCnKjIPbGeRzWf4A8TrpHxV8N6rLeeWtt4hspGbceFFwmecjqMivzbMsP7fLqzS15JW/8BZ/NPBdb2XFeAxWqUK1KX3Tiz7Q/YJ/bf8b/ALZ37Mmm/D3xxr9r/a3gCBNJ1e7XYNSjRlCabq0kkhCi2RQba4HJZ0QsDvr598Zx+Kv2Ovi1qvj7TtGkh8I3NwLfxr4f0/j+xnkdvLv7VCceV5nnbYn4idpIXwGWvBvC+q+L/wBiL9pvXvHGhXc0mm2vie/8PeItOSUhbmwuC0kY+9jLRgSRE9JbcEV+kOp3Hw+/as8E6F8cNP0oSp4n0kafLdW+oJeQzyKjQXhcOyFLx/LinltJAwKkuDvw1fh/EcMNlVWeMgvaYWuo3j0s9XG/Rx0lB9E9LpNP/VvA805+ynFQknLVWVpXbva+qlrzWXQ+XfjNP8NfjVpeg/Ebwc7hrPXVkF0uo7mjD7gkMkBIe18vHzgFk2yKuDw1eu+D/ifY+GPCP9qTTgTaXpIbTEEnDXV3c/u1HzdBtDDPBVK+VPit8FPEngTV5/FXwuWQWOkXTy3+k2ty87aWN0gE6YIM1o5G2OXBKEbHGRz7z8JtJ0f4jaro9zY311caZDJBe6y7kiNJIomJghAPzxRknLnrI4UDINfPZvgsJHLaUo1HKjDmaT+KPXle+rT06O+mlm/oMDUlKrKDjaTtfs/M739oX4veEP2Sf2VvE3jt9SC+KNT0VfDngm25Lvq2oxSCW84bhbW0+0XBJ6SSwDvX5H+PLG+XTLS9azmje5tybN2uVZXswTFGVTcSuSkg5xuYggAdfrX/AILX/G1Lr4+eG/2ZNJ1mG3h+H+kPqHi2UkvGPEOppFNJAQrHeLayisrcDs5lHrXxvPqNpqF19otm8u3gzPNcNF5bXAQt85XPyqSQAPTr0r9j8PchnkvD1GpUglVq+/PR31vyp/8AbttNd9up+eZ9mdPMcfU5ZNxTtHtZaXXk3dmJ8PPDNp4l+NGheFPEayNpcusxR6uy5LfZS5MpODnhM5I6V9vftLfAnxX4e/Zr1Pxxp+r3Wmadpq6ffWiypFaTakIALe2utQDEtG5gISw0uInyoA00h8x3c8Z+wZ+zLqmpeP8AwX8WNagtJbXxK1/d2ifbkkzZ2pdZvPVX3QNI/wAih8bkycYINfdv/BaH4VeGfhv+xxF4fvrPUdRmTSVv45oJmjt7C8le2H2i7beVubueOaWG3QHEMSOck4Fb5zn08ZxHSw9Bpwp8im9HrKpytJPreLT1vporoxweCWCy7mqfFUcmt9oxve66K/pr8j4U/am8Qvo//BPf9nPUU1WEz634O8RaJHGLgNOsK+I57u5dhuJAZRax57+Y47GvkKO8aG4/duTsYEEdjXu37Zevof2bv2avBosZIpNM8A6zdSSNPuEwudZmKuBuO3/VEdBnFfP+nTbtTiVj8vnJu57bhmv6s8GqUcBwbdL+LWxE35/v6iX4Jfifh3HtZ4jPJJ7QjBJf9upv72z7N8N6/e2v2WV5GJMKI8WeMMAWHXrk5z7V7n+zf8J/iR+0T8VtI+DXwyTdqOr3B826dSYrG3QZmupSOkUafMe7MVUfMwFfLPgP4saJq/iF9JsbG5uplZI9PW2jMj3szP5YiiRfmZixVVA5YkAV+9H/AATL/Yvf9kf4PHV/H9jb/wDCxPFcMc3ilomDjS4h80WlxuOCIyd0rDh5icZWNDXrcS1YYCipzS5n8K7+fov+AfzdkXAGJ4jzmMMTTcKMLOb7p6qK83+Gt9j3j4Q/s2fBb4WfBHTf2f7DwRpWs+G7CAi4tvEWlQXg1Kd/mmup1lVlaWRiWJxwMKMKoFeNftDf8EXP2C/jdp8up+CPCd78MtZkUlL7wNMFtN/P37CbdCRnqI/KP+1X0hZySLyTz7VZa5jt4WnuLlIo9wBeWQKoLEKBk8ckgAdyQOpr8rxEKeKv7aKlfuj+u8hzjNeGFFZTXlQUUklCTSstk47NeTTPxn/aU/4JFft6/sxSXPiz4UC3+KGgWyMzXvhCJhqccIz/AK7TJiXkHtA82OoAryj9lz9si/8AA/xLstUuoDp+r6TfEY+ZUMgJWSCZHw0RZdyMjdjziv3zSLD5fOQc+4P9K8D/AG2f+Caf7Ln7cFi2t/EHRpfDnjSKEx2HxG8MBINUg+UhftBxtv4VJB8uYMcAhHjJzXyWccH5bmlFxS5ZdH2/W33n67knjJjfZyw+dUfbQkmpONotpqzvH4X8uU+Sfj3+xx4S/wCCgf7GVr8R/hhffbfiJ8FtZu4vD0sbB7jV/DxK6hBpko3FjIkE37gt/wAtIJEH+sOPzr8U6wl1rdlLFICguDIjAnuP5V7t/wAE/wDxV8XP2GP2v/F/gj4qeJGtfiFFrNxo97cvcN9mnktZy0MCqTh4LhMSoSM7ZIwpHFaP/BT74L+DtN8aaf8AtS/BnShZeFfHd5L/AGrpESgDQdeUF7i1wPuxzA/aIugOZQMBQK/evBbiaeSxhwzi6vPovZyta8kk5w16byjt101SP5v+kl4ZY+o6XGeHouNGsnJrdxjVbcJStZXeztorpdNfml42tTqt8Lov9rk80p/zzxFsx19s188xTsYlyD90c17Xp880mp6yTnDRpjJ4OIzXikZCRrnsor+hsU3Lla21/M/m3hmk6TrKWr9z/wBJf5bHofiOVp/BnhQopHlx26s2ev3vequmRvLoUCg4H/CRh+f+uZ9/erfiXMfw98NSg4BjhI/8eqGwKw+HVkaQKU1VnYk9AIzzTpqENW+lwoKU6PLBXbnJL/wJmhqN9YXngJPBpilSaDUjdR3YAKkHeGQqSD0IwQcday1i0yG2WzFoJlRSFE8mRySSSq9evfpimyC8uLdZreGV1IzuKMo78HcQKseEvDer+LfE1p4ctbqKA3MwWVkcSOkYyXYAfKMKD39K/l/ibijGZpz/AF2ulSptysrK1k9dPedlfc/0q8OvDjh3gfCQqZZg5e3rRSlOTlJycmm0uZ8kbys7Rij0b9nT4U6jc69YfFTWsNaWF2ZNP06KHHnFQwEucgBVkxgdSVPpz6v4/wBZ1vVrVNNscIgv1lulupvLM0SHKoD82MtgnI7Ve0qC106yg0vSLqe0iiiWGGKJxhVA2gc+3WvNLe68S+Nry+164+IOp2lk9/Mmm21lBER9nRyiOx2EkttJ+hFfy1Vx1bibOp5jVcYxpWUFJSdk2+VWineW7b8t9Ef1Zg8Dh8ly6ODgpznUu5csopuyV3ebSUdopee2rOyi8VeJoU/dWFjjGAP7Xx/7Srkvi5pPjn4p6BD4dtZdIsAL6Odru41CSc4UMNoVYl4+bPJ7VBrBt/DkEc2t/FzVLdXYrELmKLc7AZwFWEn+VUfD/i/w54l1YaD4f+MOqS3xDtHCLFF3bAS2GeEDj3NelgctxWGksdhYx9zVT5KzSt11Tjp53MsyzPA15LL8VOanUtHkdXDqTvskk1LXpaxxvwU8YP4C+JNqk16rW0sz2F3OoIVlZ8LJgnOA4U+wJr2z4hfCL4c+M5brxDrumzWlxsaW/vLC4MRkVVOWfgg4A6gZ4rwv4t+A9N8Fz2s+k6tc3IvmnWaS4CgrMpDHaVwCPm/Aivo34Q+LLPx34CsNdvlRpJ7byb6JuR5qjZICPc8/Q108YYrEYeeHzvL6souXuScW4t2el152ktVbRHNleChN1Mtx1OMrWklJKSu1316NPR31ZjWWreCPjNZXng6xl/taDT7e2vYDG7KbhV4by2O1iR91umd/vVCLwZ8G0fEekSxqO6S3Efr3z/WohZ/DD4X+Ormfwzq13pV5ocMdxLb3aMLS5t3I3QwyEnL7XB2Hg7TjpWt8T/iY/gGS0ZNGub2x1N5DaSWTKfLbG8xkHqCDvXB6E+leHiI4qFSFHLJ1VTqJSjFycG3ypyv9l3VpK3droXRng6znVxvspVIe7JxXMlq+VfzKzvHXsjgvjr+z98E9V+EfinxfoWmTvqlnolzcQXEt4ZSkkY35JkG7OAR16Gvmu1hB/Yh8XxA9PHGmvjPsv+FfVz/GvR9TsZrG88LahJDcRMk0FxbKyOjAgqwzggg4IIrzn9pvw54BP7JfibWvBXgyTQ1TxHpMc0EFoIoJpDI2GwDgMFBGR7cV+lcCcUZplWCqZVmkKs3WqQ5JOSko3tGz1vZu2y+R+A+Nvh5h835OIMrlRpqhSn7SCi4ynZuXMrRs2k38TTPimEvuzinyk5HOKna32nd2qC5znI/nX6m1ZH8mrU1xtBx39KCcDOfxpAT0A5pSMcDv3r32jy0NIJ5Bz64rsvA0m34YeKkUfelt/wBK44AheT+deo/A/wCG2r/ED4Y+L30bUrSJre4tYzFdFhuLhiCCAePlIrbC4ihhayqVXaKvr6pnjcQ4qjgstdWrLlipQu/WSR54IsnJqRB5bZx+Vdjq3wE+KOlr5sWhR3q8/wDHhdpIe/8ACSp/SuS1nSNc8PzGDXNFvLNx2urZ0/UjFetSx2Cr/wAKon6M8bD47B43+DVjL0ab+7ct3muanqUaJqGp3FwIxiNZ7hnCD0GTwKqSMzDp7VWhkDDcrZyfWrUakjaDxVpqKtFWXkbKnGkrJFW8t5JYHjjXJZSAGPWv0m+HXjGx+NtpofjPTJI20Wy0S1mt4EbO2/kjYSK3PBgUFAOxkJ9K/Om3gRnw3TNffP7ElhZaN+zLoTQRhGvLu+uZSP4mNzImf++Y1H4V5mZQ9yMmfkXjCqKyShideeM3CPpUjeXztCy9WeozRRQAFFA9Oax5dXFz4titFGY9Lh8+Q5486QFY169k3t/wJa0r7VLHT7O41XUJtsMEZeQDk7V7D1JPA9ziuU8ZeJNI+F/gdvFXi+fy7q9kadraM5lmnYcQoO+1dq56KFya8Z2Z/P2BoTr1ORRcpS92KW7b3+5fddHQa/460vw3Z/2zq9w6xLKqRxxoXlnkJ+WKNBy7nBwo9zwASMP4XSTXPw10fUJ4jG93ZfaWQnlTM7TYP034/CsTQ4dag8K33xK8fxKusHSLqa0swf3ekwmFmESesjAAySHk8KMKuD0/hsRab4H0rTVYD7NpNrFj3EKD+f8AWm27no18PRwuFdKnq+dXa2vFS0j3S5t+vTTV3Ldd1wu9yfmHf3r5w/aHhv8ARvh74X8QaRcCKW21S/sHfYGIG4kYznB/dnmvoY6gsTeZuHynj2rwL9pGeOX4QXSpJgWHjlyF/wB9phjr/tiuvLJx+v01JXTaT+Z9DwYpxzqldaOcV98Zx/8Abjy/4Q+Hk1nxbJrepWpuodMjNzKJF3iWYkhA2euWyxz121zfxAjh0bxzq9nbxLHDFeOyIgwFUjfgD2zjHtU+lajqlirnTdQuLcyqBJ9nmKbhzjODz1NenfsZ/A63+PX7TXhrwnrdsZ9MhvG1bxCZMsGs7VTPKrH0cqsf1kFfVZxmX9h4fE5ri6lsPSpOTS3UYLmb7Xdml8kf0Lk+W4vMOIIUqT5nV5acI+bat+LfTb0P0H/Yk+Erfsu/smaR4M1SAW2u+JVTxD4xZhhxNPGPslm3Q4htymV7SzS17z+yn4ZtfiB8fNHW+jV7XSC+rXqsMj9zjylP1maL8jXkXirxNe+L/Fh1CWfMW9rmTniSQ/d+qgk4+gr6X/4J9eGI4tH8VePLgnM9/b6bAx7LFGZpAPYtLGP+A1/mTwpTxviD4orN8yfNOrUlXmuiUfejD0VowS/lsj/R3OMsocAeGbwmH0cIKmns3KbtKXrrKR9Ny2bTyhIcs7thBnlmJ6fnXzd8If2udT/ay+OXxC+GnwUht7XwJ4GtjpeoePUcvdahq0u9ALBT+7WOPZIRI4beUDAAMufWfjxf+JpvgF47tvAV15OvSeDdUi0NxIFIvGtZFh2sT8pLkBT2Yg1xH/BPL9lTTf2SP2bdH+F0jxz6xIP7Q8V38LZSbU5UXfFGf4o4UVIVPcxs38Rr+zIQpKlKT+LRL9X+h/J2Jli6uMp0oaU7Nzffoor1er8kejfs9/DfwD8FfhjY/C/4UWph0jRpJYo4pNRNxI0xcvK0spJJkZmJbOMZxgDAr0a1v5HULKu1j1RmH5Ajg1y9hNp2nCa3sdPtrQtcPJKltEqB3brIwXqWx1PJxVpdVcdDuH90n/69KUnOTlJ3b7nTQpxoUY04JJRVklskuxv67r8Wj+HtU1MuY2s9Ju7jPTb5cEj5/wDHc1/Lv4a146n+0b4dgEpb7N4cvb2Yk9C0SRgn6mSv6TPihrVynwv8VtA2HHhLVtgJ6H7DP71/Mt8ErwXvxK13xcXTZb+HrCyilduFDlpW7+iLWNaHNRm/I/NvEqm54LnlsqdVfOfJD/2657lq2uMxMZkwAOSTXLazqawb763nAeEF0IJ4Ycg9fUCsjxN8Q9NtAVgvRK44Aj5A9t3SuL1L4g/aZT9omAU5+QHgCvCpZbUmnpofiGT5Niac1UirWPtX/gop4AsPEvxNvrm00kWr/ED4bw6zp6/aA63mpafAmoxSrtbgzWr3EQTqOB6V89fs3/tEXv7JfxSF7rVk/iDwJqrg+IdI81vMhilTEeoWzKf3VyiN/rF5Kqykcg19ieOdft/iL+yt+zn8ddc1FrjR/BcXh4TyhY1WCF5H03UEkkD75CwSMjd8oVHHtXzn8ZP2cU+GzzaFqESD+x7+60qRC24ymzufJY8Nyr20sUhY9QvsK/nLJsZhsNhZZTjFzRUpU2n/ADQbjv0cYRp27PU/07oqpmWCpYuDtOUIy0b6pN+erk7/AJ9T1nxp418DfE3TblIdegnvdYvp5tI1azuC+IZNxmnjZZMm38o/OrAHzGLYFe420Xhb9lL9mXxJ8Z52ijPhbwnJqEUDOmXuwpFlbKrON6tPLHlBkklzg4r5a/YN/Z7Twf4E1rxLexmWXXPETafpxJy0dlBJulZfmwPMkITjAbaoPWuJ/wCCs37W2lfE/wCImj/syeDrwJo/gO+ml125WQ+Xda042MB83+qtox5Qz0keY8jFeJh+H6eb8VwynDTc8NRk51HbRqPLpbpeXu273ktLnrYrMp4HJPbyio1anurra/X7tfuPmbXNb8ZfFrUtZ+LnxP1VNR13xHqdzd6pqUuI3uLqWRpZ53VSBnJ4wBgnHAxVLw58KvGnxV+JOj/BTwLptxdatrGLrUI4WG61skUuAxLYU7AZWyepQdTT9U8VaZpccYsoftNx8kNvaxcmaRj+7jIyc5OCw7nFe/fsb/CnTfDvjrXdH+JPxJt9H8Q6zp+29aeKSRJ7mWQJ9lleFt8CQL5k7sCqjyBnIUA/uGYZnPKsFUxFrNJ8kbN66JPlWvLG6btZN21Su18LhcvhjK0aK2VuZ+Xb1lt5K7Pof4T/AA9+H3wh/aS+D3w3/Z1iks5fHXhOdvF8k0oIOnx3iQ215IPNOyaUpJkZAPAAANenf8F//ijaeFPgjq3ws8a+LNS/t+c6dcaZpMeTHbGW7WeaC5McvlxbILdBCCMlUc9Ca5H/AIJlaRYftIfta/ET426x4thg0jUry08KeE57zcirpsTZiWMK+VbybZJFOPvFiea5X/grL4j+G3xt+Ifg79mj4e+MLi8vfFfxLl1nXbnVHc3QsjssrJ7lnkJ3iBbqfBA2w+XwMmvzLK6DXENCOIcpTpypyqS5ru8FKrLmurtQ54009FpbRvT2s0quph2qaSTUlFW252oxs9ldRbtvqfGn7X/gX4u+OtX+G+g+FPBd7qdh4U+D2gaYRYsjslxLC99ONm/dnfd4OB1FeJap4X1/whOIPGHh7UNIlJwo1SwltiTzwDIoB/A19ky+MrPxT8SNT8YQgR2+p6jLNZxMf9Vbk4hT6LEsa/QV9Ufso3ti97I/i5YNRsDGc6LfQrPasCSCZY5AyyAg8IRjBz7V/ZPB2b4jhvIcPhpU03GC5l/el70tf8TZ/O+dUYZrmlWrF6OTs/JOy/Cxx/8Awbu/sX2Xj340J+1h4/0lJrDwzaznwZaygMov1YRm/IJ6R7nSH/poHk4Ma5/brT1SLA39OBjtX52fCXx9Z/sm/HDxX4A+D2i2Ol+HrK/R9M8PLF/osen3USXkMSKGyio8soUqflC45HFfengnxZP4k8N2WvzWccIvbdZovJuBLGysMgq4AyPqAe2K58+xtXMca8VU2lsuy6L/ADMcl9lRhLDxVpRbv567nd2NxARtdsEdietfMf8AwWV/a48Lfsq/sKeIppdRgXxZ4ukg0zwDpzviSe/juYblrkL1MVusXmOw4BMaZzItfQtgNQwt81hPJArhmPlNtYA8jIr+cT/gph4P+Mfw9/bi+IHw1+NnxU8S+MLzw7rT2/h3WPFGsS3kx0WcC6slQyMdieTMmVXA3Kxxmvc8PuHMPxNnqpVp2jTtNx6ySa0v0V7X62egcQ5lUynL3UjG7lon2f8AV7H9AH7Iv7cPwk/bh+Cdh8dPhXq0O2dFTxHo8ky/aNC1DZumtLhf4cHcUf7ske11JBOPSodZi1G0ivrC6jnguI1kgnhlDpIjDKsrAkMpBBBHBB4r+WTwB8V/iT8LLLXV+GXxG1zw82v6FPpWtf2Lqb241CzkRle3mCnEkZyeGBxk4wTX9NP7LN7oupfsq/Ce70eSEQXnww8PyWMSuuXQaVbEhBn5sDrjOBXTx9wP/qlVjVhU5qdST5V1ikk7N9d9H1S1M+Hc+/tmm4uNpxSv2d+qPzG/4L8/Aq58FfHzwv8AtI6MjJa+NNK/s7VHiJUx6lYKoR9wPBe2eHB65tmNcV+z38Uof2ovgl4g+B3j7UYv7Xu7FIrieYgCSRGzZ6gOeHjlwkhH8Lns9foN/wAFkPgvZ/Fr/gn74w1IW27UfA1za+JtPJ4KLbv5VyPxtriY/wDbMelfiX4L8eav4B8UWvivwxe+TeWM2+I5+V+zI47owyrD0PqBX47i6uJwWNjVw75ZxanCXaUXp+K18mf3J4d4XKfEbwjnlGZRU3R56LT3cGuaP/ksuVdnBPdFhtOvdIvb7StTs2truBpLe6t5BhoZU3qyH3DAjHtXgioqxruOSFAr6b/aA8Z+GPFHjZfiJ4UmRB4jskvdQsS3z2t2P3c6t67iqybu/mE18y31pNZ6pLpnmqzRzMm4cA4J55r+2Mlz6hxHkWFzClG3tI3a7S2lH/t2Sa87XP8ALnOOEMfwNxfmOSYzSdGfL6xV3GXpKDjJeTOu1jxBNfeC9J0acosNnbK8TqvzZwe+eev6VHcatcwqXhuzGgB5TAAAz1xyf/r1HGmnz6JbQHUkytsEfKNkcfr160kpsC5Ml/IxBPyx2+Bk59T/AD9K/IPEDiHAZvOlQwtRyjHm5klK19Et1Z2s9dT+r/AXgTNeFKOLxmZYaNKpU5HSlKVPmSfO5PSTnG943Vk3bXYrXEs15ieedpN/3NzEnvxyf0r3n9lj4bzwaHc/EC6iAF0WtrH/AHFP7x/oWG3/AICa8n+G3g+38c+OdP8ADNuJjFPcb7pmcfJCuWkPHTjI+pFfT83grwCVEEHgvTY1wFVVtlXA6Dp/Ov5r8R89pYPArLItxdTWTSTtBPa3NH4mu+yemp/YfA2TSx2M+vVLPk01b1k13s9k/wAV2K3j+a88O+Er6/tCUuXjFtZlhgCeU+WnPsWLf8BrI8PWGn6NpNtp1rdQiO3hWOPMozhRgd/auR8GFfifJfa1b2UEOjW+pSQ6TFNCZzIEyDIRIxUDJ7Dj1rsLf4d288fliKJM/wDPLR7Ucc/7BNfAzwuFymhLB16tqnNeXuvTRWi7N6x1vq9W0fpWW1ni/wDbsNT54SVou9tE3dq9tJaNOyuknYtyahbeS0ZeF4yMMrFWB/OsfUbvwvo0Mmpmw0mwVFPmXXlxQ7BznL8Y79+as3fwl09/vSKM5yTpNv1/74rNuvg/pE58qae0Kj7qy6BasO/qnvVYaWUJ2lipJdUoy1/rzR1YivmvxQwUZTWzco6P8H9zR80+ONd1DX/iDfa9Y6u1xbf2tJLZ7Zy0ZQnGVUngMBXvP7MXiGax8Tz+DJZR9n1KIz2eW6TKuSB/vJ+q1o33wd0qyie5S404KiFmZvDlmABg5J+Tp715lL4pstA8Vi/8Ga7a3T2F0sltd2CqsSyD5toC/LgHjA4Ir9HxmMyri3KXgcHG3JCylZ2vpytvlSTvr53Z+W5Lk2P4azKpVzCreVaXMldXvrzKK55O1nbytE+ppfD2r6lPJZXljGbZl5Z3DiQc8bDxnk15X8J/G2l/G7wVqPw1OgnTL7TI1vPD7SXZmwEkKqrsQCGGdjdirkdq9AtfG3irxLo1jr3hDXrG2hu7ZZSt5YmUgkZ4KsMYPH4Vwun+DvGvg/xpe6n4U1DSBLqjvc3EQsTFHJOTgxKckx7s78Zxnce1fmOURwywOJoYlxjXXJKk+aS5Jwl73MrOLutNeia0ufWZnhsZ/amFxGHk/YLnVVKMZOcZRXJyu/MuWSvp1fWxz1rp3jJwJ4fB0mxgdpOoRA8EgjBIPBBGPaqH7T11rtp+xb4lstU8OG1h/wCEo0mTzmvo3JPm7cbVJ498967TxoPEBntdd0W8itbfU8+bDc2/meXOVLbeoI3EMMdNyn1rzn9sCPxlD+x3rs9/q+nyWjeItN86KGzZJNwn4wdxGOR2r3MprTq51g5S9mk6sNFz8ytNab2ureh8/wCJU6z4CzGLdSSVKWtqfK/cvfRKVmnfb12Pi+a4jk4Wqkx3dDSISw5PajD8/LX9Eyd1c/zsSszXLBsZp+eMgUwA7f6U7LDjb+tfQnlIRi+eK+gv2NQP+FbeOt3P+mWH/oMlfPxZT8oHPrX0F+xsMfDLx2cc/bbEf+OyV5ebO2DkfE+Irf8AqvU/x0v/AE5E9DRlZcHH0NEyJPEYJQrRngxuNyn8DxUUJy2CfrzViNCzYxXxUm07n4g/dehzOs/BT4Z+IyXu/CsVtISSZ9PcwNn6L8p/KuV179llstN4P8UhlwSttqUeD9BInH5rXrUKNn5Vxj3qcBx1ruw+c5jhH7lR27PVfid1HiDOMI7U6zt2fvL8b2+Vj5g8UfDjxv4JLSa/4duIoVP/AB9RDzIj/wADXIH44r7i/Zu0a/8AD/7Pfg3T7uNo2bQo7hgwI/17PP8AykFefDzV3AHKsMMp5yPf1qe2u9fsrRrTQPF+q6SCuFWyvD5a8Y4jbKr/AMBCmvXfE0sXBQrxtbqv8ji4qzPEcT5dSw1Tlg4y5m9Wno1tq1a77/I7T4t/GDwt4BZbHVrtbu7t2Ey6LA/72eQf6sPjPloD8xLcnAwDXmfw01HxP8c/jFba940uPtUenqb27TGIYkVv3UCL2UuRx1IVicmuY134fazp8st/Lm+WRzJNdRFnkYnJLODlifU/N9a9h/Zp8PW+keBJdbVFE+q3bO3PKxR5SMHnjkO2Dg/MK9ClXo1Ic0JJnlYjC5bw/kU6uHfPVkuRT6py3svs6Xfe6V3ZJLovjNfzD4Z+IXQnfJpU0QOe8g2f+zVqXEzW0b2wPEZCAZ6Y4/pWT8W4o2+Hl7G7j97cWkRyf713CuP1rV1FVaeZVfJMh/mafM73Ph4crwFNW+3P8qZWnmfbgPmvK/iFpgvfBfj61u7dZViuHmjRx919kThxzwQeQa6jx98YPCvw8kksXU6hqSLzYQPgRenmvzs/3QC3sOteeeJ/Hfi9PBWo+KL5LCWz8QWEkupQIpjNpuXZEYznLdEBBySTXThU44iDf8y/M+oyHL8fCpCuo8sZOPK27czUlLT5J2eieiVzyO1gjVguePevr39hy3T4Ufs8/EX44QosereILq18JeHp2ABjTAur11z7fZ1z2718ZJqhJ8wHGMV9V2vii50z4BfD74cRjy1t9HuNWukU43zX07urH/tgkP4Gvm/pAY6b4Np5bRdvrFaEZ/8AXuF6sl6OUIRflJrqf3X9GzhqOceJdLEV1eGGhKr/ANvJqEfxlf5H1be+IrSCKIW2P9Smwoeo2ivsL9i/V5LL9nPS7lfla/1bUblvf9+Yh+kQFfCukxSXWgaddb8rJp9u2S3rEpr7N/ZL1+C4/Zs0KLSJ45vsl1qNnPLFIGEE6Xs++NsE7ZBkfKcEZBxzX8meC2BguJsRKO8ab/GcF/mf1P414qcOFKcX9qtH8ITZ6tqV4nizX4PC08zfZlmElwFbG91O4L16DH5/SvRdLnliVIVGyNRtVR0VfSvF7S/n0a4F3b3DRyJnbIp+Zeuetdr4e+LWmagkFpqM6xXby+WAFIVzzg56DPT61/TlWlKKTWx/LNKrFt827OQ+PNvr3w9/ak+HXxa0aW4/srxDu8K+JIYyShLtvtXYA4BDMcH/AGMd69mubaWCMqR9ef8A69UrbXA+BuyMg4bnBB4P1Fct+0R+0v8ACX9mD4UX3xe+MXiMWGlWhEVvDHh7nULlgfLtbaPIMsz4OFHAALMVVSwbqRlBX6IjkhhXUqSlaL1d9lpr8upV+M3xA8DfDf4e694l+Jnim10Pw/FpNzHqupXs2xIYpInjJ65ZjuwqAFmbAAJOK/l00Pxpqnwz1S58IeL7K9sVuJEa1uLy2aNblETYjjd1BUA+xJBr7p/bP/bB+MX7avjs+JvHl6dM8P2c7P4e8H2dwWttNXkB3PHn3BH3pmHGSECrwfHLy+8K61obeEvGfh6LU7DPMVzAJU784JyD/tKQa89ZxRpzcVHmR+P8RcdYDH1vq9Kh7WktG07S3Wsbq2ltnv3R4peeObO6j3ibeCPl2MP84rmPEHiidizRNtA6fNk16R4u/ZN8N3Yk1T4KeNm09uSdG1OZpIPorkb4/owYf7VeQeNfB3xC8H3P2Pxr4duLMEkJOU3Qy/7si/K3517OGq4XFQvTlr2ejNcjrZHjqqWHqa9Yy92a/wC3Xv6xbXmfqr/wT58e+GviR/wSh1Twj42SzWCztdf8PtrJB+0WU8dyL+0Eh3c2zm4jXsVkK44avQPjJ4Z8Oa/Z3XiW9DTpffY7wuZtzyGTTYlkQkucgrHJnnlylfNH/BGPxppGpfs2/Hn4L6sY57i20mHxDp1i8+3zop4f7PuGA3j7kq2Lk9iUPYV9rWfw305fjZP4QtY7m/0PwfqcNjZwG4AkuJoo4ppIpMsfMUH7HAR13lhkc1/FHiBRqZLxljqfM0lVlU8nGahPTzvJL0Xkz+4eBMXh8Tw3h6lr+4o/OPu/lFf0zzn9qfxrpn/BP79lq11Ozuox4m07SINJ8M2svzGTXrtWmeQqSdyW6PNcNnILCBT1r8i9Rvrye6uL+/ke4mYvJPPNIWJYgku5J56lmP8AtL3r6D/4Kl/tYyftLftUXWl+GNbXUfDngzztO0q4hcmK9vnfde3a8kbWkVY1PeOBfWvB/BXhHUfiHq8+jw3KxaTZ/vdav3JAlOSRCuD/ABEdB97H0z+teHuQTyDh763jtK1f95Ub3SesY97q97b88muh87nuZyzPHqlS1jH3YpbX6v0v17Iv+BrXXpfGejeI9JlK3+n4u9JDgMWJV/8ASGBP32YDYP7qA19H3HiKP4F/Ai+0nwHaPeeL/ifa3GhaNqb3GX07RoiDq+pECTPmSFvscTkDgXYHQZ8++EsHg7w34ovL/wAU6ndXeiaZGUitbNCl5fSMxWOztyT8s7n5Q3KxJuPUc+z6j8QvBXwS8O3nx3+OWlWbeLvEaCLRdB0icYW1iVkt7SAZPl6ZAy/vpSRJczcL8okdrzvHzrYynGNJztblgtOeXxRi/KN+aXRLR6Sbj34PC0qODcZT5b6yl2Wza85Wsv8Aga/an/BOz4ZaX8F/2T7zxVL4Wv7W10PT9R1j4h6je6ubFbDS7e2MAs7GTdsa6mJkYSbv3bqY+rA1+efxV+OHjD9o747+L/2zLfwBqGm6FqmqSaJoc8948q6c0liYoLZ5Sf3s6WCSZwFw0gf2O9+1R/wWB+PH7Xvwa0T9lzwt8MtG8B/D/TriFG8MeE5ZpJNevRhYI5XkbLqZP3nkIApd97biAa9I/aH07wp4R/YPX4GfD9LeW1+E2teD73xBqlq2V1PV9asdSkv7nOfmUPJaQIx6x2644IqMlyiGTZnQq46F8RiJKMtdIxlKKktLp3k6cdW7990eNmeYzxuErzoPlhBPl76J28lom1ZafieAeEYNW13V4rTTjtWNg8rE8Iinnv8Ahj3r7G/Z8vJrcBWyNy4PPJ69efz/AAr4r+GviFIdYinaUpg8c8fjz07/AEzX2H8HPEVujWsiDbvXPLdOvXn8/wAK/oHmufksaaifQnxfsZbL4t+D/GjLhPE3gQW07K3W4sLkpuPPXyriL8BX1F+xj8TL+0vk+GOs3RlsLpJJNNDtk20ygsyg5+64ycdiM9zXyn+0Hrdx/wAKW+G3j62YgaL4+u9JuMn/AJZ3unvIgPP/AD0sx+denfss/Ey10zxnaX90pkHlMBtblGKkBgc+mea0b9phNVe1/wADz3TVHNOZaXt+K1PgT/grp+0B8SfgJ/wVH+L958Lvi74q8LpbXOmXEo8P+KLuzCyvpNm7FRFKFBZ26Yxk18xfHf8Aa7+MH7VWuaV47+N3i2417XLDRU06PW9Tt4l1C4tFZniS6ljC/aGj3uFkcGTYwVmYKuPYv+C0/wAE/wBpTS/2yPG/7UHxZ+F8dh4T8deIIv8AhHdZ0rUP7QsAsVrFBDBNMFUxXBSAP5ciJkk7N4Ga+P4buRWO/qa/ovg3EZdUyvDVqcYucIRjzJLmT5bSV9/Vf8A+KznDVVi6sZOVnJuzva3TT9To1114jgPzXpfj39tD9oz4pf8ACvovEfxV1K2T4UeFLfw98P8A+xLh7FtHs4kCF0aFgxnkAXzJidzhEXhVC14uky53biSepzUkEzLIZQ4AXliT0FfV4x4fFuM60FJxva9na6s7eq0fkeRSjVoxlGk2ua17dbar7j+iD/gjt8Q9U/bL/wCCW2keD/in4uvPEV7I+v8AgnxLe6reNcXMiNJIsQmkdizkWl5BhmOSFHpX4xa7oeseDtVvfDOsRkX2k3c1jdxsek8LtE4P/A0NfqX/AMECf2cPjX+zR+zRf/Ff4jeOJ7HTviZ5Gr6T8P5rBf8ARI0QLbao8xIeKaaLP7lQVMJhZjuwF+Cf+CiVnpWi/tx/Fux0fTJrO3Pj6/uEt5wAVMxE7kAfws8jsv8AsstfxxxzTwsM8qvCtOHtJWttq7tdtHppp2P7m+jNmNeVXF5fXuuejGfpKD5b/NT/AAPGYNXTVrC21KHOyWNXKls4DjDL17Nj8q5yXQhPq15rF2xVZHYRA54JXH58frUPhLxdHZ3GjeH3nRIrnTZROTj5ZJJHMRz2GF/8fFa2pa3baoy3T20WGjBVQThcjnoe5JNff8M8Q1+HOHq2Dnfn5m6fZKV038nFyS7yR8d4h8C4LxI8QMBnlGUVTVNQxfdzo8kkklq/aRqRhfooS7a55icQiPYeBjOcfzoW3Pmf6xWKjBKnjvx16VIZbPnzLOA+4B/qa674K+FB418dW1ubeNLOwIu71lX+FW+VOv8AE2B9M18PjMfh8BhKmJraRgm38v1ey8z9lwGAnjcZTo0rNyaSWvX5bLd+R6l+yp8Ozp/hrUPHN5EVur1za2qyKVZIUwznn+82PwT3rr/itqWo+Evh5qep2EbNeyw/ZdOAQndcSny0/Abi3/Aat+K/FFrb+GdRvfECCa1S0kN1G3/LRSCNv4khR7mvDdJ8A+IZ7eO4jg0mEsgDRyvch16/KxVgDjjpX4RhVHiPNqua4+XJFTi1Bq6aX2Oa62SV/d633Z+6yw7yjLll2DjzScJXkrppu65rWa1b097ps0j17wH8ONO8L+D9O8Ow3V+EtbRIz5UzIC2MsePVskmr+oeDdNuYTa3F7rBjY5wupTLzz3BBrymD4f8AjYQkwR6SwHKql5dp68ffxVfV9N+IGnZx4D028IHCQeIpsnr0BfJrqnl1atXlUjj/AHpNtv3Y6t3v71RGyxMKOFUJYG0IxSS9+SslZL3acunken3HgXRIotkJ1lcdSNXuf/iqpL4NLSH7L4o8R2wx0j1aRhnn+/urgdN8CfHO+thqd3+z+tlZlubnUfFEkC45+bDPnHHpV6+m8J+FFMWva/oUM+0l4bDXb26KtzwTHx+Oa2wmTZ1jq/sMDXniZ/y01Gs16qFSdvmeBi+IuEMvoe3zKNHCwX2qrnQXydSjDm/7dudJ44+HMnizwxJ4Y1nxvr5tZTmUF4mMgBJ2uTHlkz/DnBxXiPiD4aL8OteOkwX4miuIvtCMITFt+YrjaWOOg6cUeP8A4vQ3sSxeF7G+spBIfNkm1WWRWXkYChu/Xrx71xV5468TXUvmTam5ZV2q5XcQuTxl9xxX7Rwp4SeJNKk44hxp0pOV4T5Ivm0tL3Oft32Pwzibx48D8HmKxGH5q1eCSVSiqk1y9Y/vVSX3Jq73Pp/9mbW49R0O+8IXLZksD9otMnkxOcOP+Avz9Hrub+A72LQuRnqAeozg/r1r4nsfiB400qc3OmeKtRtZShUyWl0YWweoymDjgflWfq3jHxfqpJvvFeqz5PIn1KV/5tWWY/Rnz3HZnPFSx9OnGerSjKevXrDd6+rPG/4nA4Ww1H2eGy2rUts5ShDT5c/ofWPxv8RavoXg68lstNWWMItyJ2kKm3lSZGPHcEdPTLetefftX6rBrP7FniXybqNtnibTcosqkj9+OwNfPW+V5N80jOT1LNmneLooP+FS6uBGuTfWfIHT96DXtUfo/LJMDTxUsepTw8va6Urc/Lyvlf7x2+G1/Pbv8VxB9KdcT4HE5VDK3COKgqV3XUuS/OuZJUY3+Pa/RanksMQVB8vQUkqdcdKnkXbkpyPSq8zbe/Wt5KyPxpO7NYEgZPSlySMj86NuBkN2pMAd+a+hZ5QmW3cYr6C/Yym3+AfHOnJjIms5T9Nko/pXz98oPHXPNe4/sS36NqPi/wAOk4a60SOZB6lHZf8A2oK8vNo82Bl/XU+N4/pOpwtXa+y4P7qkH+R6nHw3SrEYB+71+tZ8NyXUOp6gc1Pb3GGwf518TNH4dOEjUhGOg/GrEYVhzknvVG2lLD5T09a0LUOHAB68VzTOCrdFiGyRwCWYZ96m/soFflmbPuKdCSCM9qvwKDwx/GudzaZ51WrOLKA0eZmAFwo9M1HBZ3ml351HT7yaxu+91auB5g54dT8sg9mB+orYIUDGc+1IVQgqRkehohWqRlzRdmZrESat0Mvx94z8W6r4FudMl0L7XdRXVrcRSWJwswhuY5WDITuQ7UPTcDXn/iv9o3x54taWz0OOHQ4mkZZGtWaS4PJG3zGxs99qg+4r057QK26GUY7jPSud8V/DHQPFrveM5sL5hj7dbxg7uv30yA498hvevdwPELoy5cTG67rf5rr8tfJnqZTVyahJQr0Vu2nq0m7J3jtb3V006I4HSPDdrfeCrjUQXa58ySTzGfO4L1B9c8nPWpPi14b13/hTnhi/iv0GnBVW6twfnaQhjGSe6gBuPXBrrU+HniXwP4cFrq0CXFpN5y2uq2ZL285IYlMnmNwOsbgN3AIwa5/x9rb3H7OdmsZz5QtSPYiTb/U19llOaYXG4ijWoTU489r7+TXk12eqe6Po3UxcM0o9V7VWvr7s00mvLqmeMXMLwxuADkA4H4V9N+N9Rto9bt7PT5hJBY6RYWcbDpiK1jQ/qGFfMDXMkrbnz3zXufhfxLB8QNIt/FMCiNbtN0kQbPlOOGQn2I/KvhPG+MpfUqiXur2t/V+zt+Cf4n+gH0UIUnjszbf73lpJL+7epzfjynrfjT9qdvg5+zcPG0c8cmrW8H9naNbykHzLz5lhJGeVRR5jeoTHevkf9n/9tD9oX9mXx3c/EH4NfFTVNL1LUZzLrSvIJ7bVGJJY3VvJuiuCSScsu4ZyrKeao/tSeN5NZ8YQ+C7O5JtNAVlkAb5TdOAZD1/hG1PqG9a8xjZQS27k+9fT+CnAmXcOcPVcXVpJ1MY+eV1e0N4Qs+lm5esvJHieOfGFXPeLXgcPNqjhG4Kz0dT/AJeS+/3V5R8z9e/2Yv8Agu98M/iHDD4c/an8ByeF74ja3irwrFJeaax55ntCWubYdMmM3C5P3VFfaHw+8f8Aw8+L/h4+MvhB8RdG8UaWnMl/4e1JLpYT1xIqHfC3+zIqt7V/N/a3slq4lhmZXXoytgiuu8AfGLxl4G8RweKvDXiDUtJ1S3P7jWdC1GSyvIh7SxMpP0Jx7Gv0bMOA8nxsefB1HRn2fvQf/t0fva7I/HKecYmj/FhzrutJf5P8D+jr43/td/CP9mL4DzfHP40eJPsljbE20Vpa4e71O9AO21tYyR5kj43dQqLlnKqpNfi7+0d+2X8X/wBt/wCMcnxm+LtybXTLDzIPCXhW1nLWujWzH/Vx5xvlbAMs5G6Rh2VVVfEvjJ+1n8bf2hvGmjj45fEvVvE9loNqlvp0uqCJXhimctKcRKqs5YANIwLsEUEkKMdPbxwqqmIqEA+QJ0A9q/CeIqNfK8ZUwU7Xi2m1qtO3kfN8Z5/icVQjh6acacl83p1/yNi81ua+IU4jTtGDwP8AGqkrljVWS8jhQvNIECj7zHpWB4h8aZjWDSZ2UFiJJBxx7e1fNQhK+h+bYfBTqy5YLQ0fEGv2+kRFd26fB2orcr7k9h+tctqXxT8Wx2smm/25KLaUESwjBVhz1BzuH1rM1TUUiUvcSlQT97qc1z2p3q790t0JCfulRjj0r1sPStY+sy/KaPKueKl5tdfI9w/4Jt6za6b+3L4MFvJNHbXsWqQ6vZ2cmxby0+wTyPCwyNys0cfy+qrjBwa+9v8AgpX+1Rpv7HnwB1DwP4d1d4/HHii0utC024juDvjunbzNc1TO4krDJL9ihOcmfzWBPk18q/8ABEHwVomr/tI+Ovijr97a2cHhH4X33kale48nT5b6VLd7t8kcQ2q3UuewQn0r5v8A2vvjrqf7an7UF9q/wu0C8Gh21smjeA9EllJay0SzRhE0rMcKzL5l3PIxxvnkYmvyvP8Ah/B8U+ISliF+6wtOEqjezd5Sgm/R3d/spp2uj+oeDMwxWU8IRpwbbqykor7k7fd06vyPO9GtbnV7waN4diBkMBeaRj+7tbccNK5zwOcD1JA6mve/hv4Vtk8JJa+HLZ4bS1i84SXCZ2khgWm2n5p3IHlxjJOFA4XNcB4Y8KJ4e0seGfDRa8SeVZb++VCDqc43BQgOGFuh4QHnJLnBOB9C+GtM+G3we8Aad8S/i9Pdy6dcwNJofh+xu2hv/Ftwu5JDFIci1sUYmK41AjcwDW9qpbeyexn+N9so0qN229F1enVdOtr7K7dvet9ZlOHeHTq1dLLXy8l+vd7dCe++Gtn8L/hnaftYfFPwpNa+HZL59H+H+gvcFDrUsQJu0WcNuJyQJrkBgnmFEbcBXgf7Yv7U/jX9rT4oj4p/EbStE0Cz0rRoNF8PeHPDdn5Nlo+mW+4QWcQJ3SY3MS7ksxY9AAAz4+ftC/E745+IIte8feIDPBp0DWvh/QrLMemaBZliRY6fbAlba3BxhRlmI3OzsSx4fxP8GfilaeDIPiZ4q8MT2en3OvTaTZ2l5mK6NxFEJZWNu2HSNFdRvYY3EDnBrbJMmoYOtHFYyadV+7Ft/Cn9iF927XlL4m7t6aHHm+Y1sZ7lKD5Vd2XrvL8FbZbIyPhlq3jOf4laZrPgm5EOrW8xTQwQrGCeQGKMqG48wNJuU9QwB6gV+k/hPwO3j79g79qTxTp8WbCHxJY2GgSA/LPH4XtdJX5Pm+b/AEdLhsDPUn1r4L+CWkXngDV5fihPK9odGRp9LMZXe16QyW3U/NiQ+bkgjZETX6nfsO/Bm7X9k74G/sx+IPEl1Pf/ABM8H/EDxfqlvcSgrZR6vZnSNLU4fnzGUSjI5Z2rzONsdCjWo4ik0lTnT+fLNVpL5ezj85v555ZhZLCSpzTbmpf+kuK++7+4/Obw2JNKu45HOdrfdB6gdvxr6i+CPiY3UcQScKy7SuWzgFBjnPOSD9a+ULPVXltohMhSYRKs6HqkgGGU/Rsg/SvQ/g38RLnRNX+w6jeMLd1AEgJJXGcA+3P4V+2Q11Pzh7H6MeMtRs/Hn7CvjvR2lSObwtPo3ihZc/NJ9n1GK2lB56CG8kJI9Kzv2QPHL30FxJNdAtpG2N5HfllLHYTzz0Kk+wFcV8A9ePj7wZ4r+H017m08XeBda0jKt/y1ksZng79riKFgPYV4x8HfiFrWkXWn+LtOvTEZ7eKZ1DHayyIGKkZ5GD+HWuvDwcqc4ed/vS/yPMx7UMTTqPtb7n/wT9UorDwF8ZvA2ofDv4jeGLLXfD2t2ZtNZ0fUV3w3cLdUYZyCDyrAhkYKykEA1+FX/BRP9kNf2Gf2rvEHwG03XJNT0Rbe31bwpqFxIGnk0u6VngSbHHmxlXiY/wARi3cBsV+wHwE+Jb6j4b0/xCiSQR31us0cNw3zKpJwCc8+xrB+OX/BPv8AZD/a4+P93+0P+0Q/iHXr640aw0u10O211rGxs4LWJkHMAEspdmZyS4A3YA716nDGdz4dzCVSV3Tad0ur6P1Nsfg6eZ4VR+1pZn4VLdSRv8wwO2f89KZqE9xLp119nO4m3kxtbP8ACfev1y/4KdfssfsNfsr/ALIujfEn4R/sp+ErZdE+K/hmXWpYbZ7i8vNNFxK9xavNcSO7JMqBGUnDAgGvqC5+BX7BPxM8OR6poP7I/wAJ77Rddso7u0uI/h/YQGS2mTzI2BjiR0JRx0KkGvt6viXTlh7qhKzbW66WPFp8NNVre0V1Z7HrHw/1i5074aeFdHttRW5gtPCWk28d0j7llCWEChwcnKtjPXuK/JD/AILOrc+Dv2x/G/iFGKtq3hzTNWRiervp6Qsev9+Bvxr9TPAll4K+F3gbSvhv4IsfsWj6HYpZaVYG6km+zW6AhIg8rM5VQQFyxIVQM4Ar8vP+DhfXbK1+MHhS6t1VX1vwHb2rMGzuEV/e7v8Ax0gfiK/HVhZ47G04JXvJfmftHh/xBT4azHE4qUuVfVqyXrypxS83JJI/Pbw14kd7tLJXcp5QETs3JYc4/nivVPCslzd+HrO4d8t5OD+BI/pXh9vcm0uVnhbmNgwH0r3L4d3CXPg+2mDYBeQKfbcT/WvvuIqKpYaElrr+jOfwmxk8bmtalN68jf3Sjb7tTSMDdWOAvU57V9J/AvwGngjwWkl8u2+1ErPdk9UGPkj/AOAg5P8AtMa8Z+Evhs+LviFp/h+HTri9kkkMiWVrA0ss5XkIEUEkE4yegGckV9fXPwosfhtoK+Lv2jPH1j4K0+RS0VpcyrLf3GM8RxLuJPsAxHfFfz94j5zyuhlFK8qlXVQgnOpP+WMIRTlLVNuy6I/rTg2tw9kFGtnWaV401TXLFyaVtLyk7tJaNJN+ZwPjyFL2Cy0RFLNdXW/ygCS4jG4AAcnLFfyrrfCH7J/xZ1jRm8U6/p1p4Z0eJd0ureJ79bSNF55Ksd2PriuM8Xf8FF/B3wzEujfsq/CC1tLkKY28Y+J4xPeSDJ5SLJCDPI3MR/sCvnr4nfHH4tfGbVzrPxP+IGqazNvLJHeXZMMR/wBiMYRB/uqK+i4K8BvE7iXDw+uqGW0N71F7avK/alCShT0svfqOS6w6H5Dxz9LjhjKK1Slw/ReJn/M7xhppu9X30jZ9z6d8W/FH9kH4MwvZXvjnVviHqsQIa08LILSxVueGuZMll90DV5Z4t/bw8eTStbfCXwF4d8HWgyIZYbMX16Bz96e53AnnqEXFeGSOSNxqMFsE8H2zX9KcOfR18OMi5amMpyx1VbyxDU438qMVGivL922l1e5/KPFX0h/FTiupLnxzoU39mj7ll/iXv/8Ak3yNvxH4+8X+L7j7X4r8U6jqLhiy/brx5QpOSdoYkAc9sVjXV8zcDp/KmPKF4NQSybiVHrX7bh8NhcBh1Rw8IwgtlFJJeiVkfjNfEYrG1nVxE3OT3cm236t6kU7MzZz+tV5FCnOcfWp3Oeff1qKZsjGP1rCpYuOhWuMkcGqsjMD/AC5q1KG2nJ7ciq7KB1OTXm1dzqhZEbNn7pwO9M8ZXBi+E2pZHEmpWiD/AL6J/pTpMDIqv8Srj7P8KLaFQAbnXlz7hInP8yK+a4lq+yyOu/7rX36Hs5NT9pmVLyd/u1PNDKTnnNQuSMk1JhscGo9vXB+tfgktT9Njoza2kcGmlQDyadzt4akHtzjvX0LPKA5xnFej/sneIH0L432MBI8vVLS4spAx4yV8xf8Ax6MfnXnLcDdn6irvhjxHN4T8S6f4ptSfM069juVA77GBI/EZH41yYqHtcPKHdM83OcC8xymvhVvOEkvVrT8bH0xqGqvo+o3GnPEG8id0BLY4ycfpijT/ABJ9suRbw2kpc9lGas+PvDMsviCHWftaJZ6paJdW0iNuMikAZHYZG0/8CFGmR2thF5FogUdznJP1NflGYZ3hsPHlp+9P8F6n4VTw9KdCMprWyv5Pr+Js2hdB+8+X8a1baW0+UfaOc4wTj+dYcM4Ugls/jVyC4j+8X6dia8COf4pfHFP70efiMBSmtG0dTp6Nbus6BWIOVMiBh+RyCPrUwm2sc465wK5R5VdvMinkifs8UhU/4Gr0Gq3qgk3gmH/TRfmH4ivTw2Y0MVotH2PAxGX1Kave6OiW5DDBNI7j7oP61kR6vlPnjYEdcHNXEmGN3XI9a6+ZXPPnRcCbcQenX0psj4BUHNMSZiNuefXNP81DkA8+9Pm1IaL3hrxXq3ha6kezWCe2uU8q/wBOvYhLbXcX9yWM8MO4PDKeVKnmpfiT8AvD/wAWfhBf6d+zlplw2qQIs8vgaefzrpY45PMdrKQ4N2gAJ8o4mUD/AJaD5qx3fjIHQ9al03W7vSr6LULG6kt5oJA8U8MhVo3ByGVgcgg8gjpXI4Y7A4pY7Lans6yaburwny7KpG65l2kmpx+zJK6f0eT55LAuFPEU/a0k1JRvZxad7wl9l907xl9qLdmvl230qFLpIpUPEu1lxgghsEEdj2xXV6fqFx8JvEF6mg6WJ9NknWSTSzPsKEnkxsc4yOMHOePSvqTxr4J+Fn7YMUk/iHVNJ8G/E/bm18WTqINN8SP2i1JVGILg8BbxRhukqnhq+d/jx4M8T/Dn4l6j4L8eeHbnSdUs3j+1WN0vzIDyGBBKuhHKupKsDkEg0cV8bYbi2thsLUoulWhGftaMm2nrC06clZVIPpJWlHacYS0P9IvonU8lx2XZnisLiE6nNRdNrlVSK5aqlGUXe1m43TvGWjTa1PlHU/El7rmrXOq3k26W9uZJ5WP952LH9TRBceZnB6NjOag1mwGn6ldWQI/c3MkfHsxFV0naH7j8dSPWv6Ry/EqGHhy/DZWt2srH4NmdGr9dqqtrNSd2+ru7/ibEU3PLVdtbkKQeMVjw3UUgARhk9s9KsRTsp+9Xu0cUlqjxatK+jN+3eK4v1ZmA821ZPxVtw/RjXc2PiXUF06I2l7JECgyFPAPQ/rXlEt9NDLFOsmPKmBOT/CflP6H9K6nQdbIRrOWTOMshz+dfi/H2FvnsqyWk0n87Wf4q54uY4DnhFvW39f5HQX2s3k0xlnuXkJ+8XfJHvVSW/YhgxyD15rOm1iE8q2euRWXf61dGNrdpF+bOWA6j0r42FG+ljno4JvS1i1rWsyGJraUHzFbBOf1/GsKfUZCcNkntTpZi3LNnHvUVnDPq+pW+j6RbG4vbueO3s4F6yTSMERfxZgPxrrjCNON30PocHhUpKEFdn1np/juP9mr/AIJHy6T4eR4/GX7Svju5sTLCMzJ4X0bZFIiY+bFxfTNFx95UkXmvM4v2cF+CzxaV44nR/EMlsk2uQCQGPTpGXeti5DcugwZwRhZMRjJRq+zP2lv2afDP7K+l2fjb4nXwtvEPw28NWHhL4VabO6eRoun26yPeeIbhOSby+1CW+ksojhlU+eQdkZHxhq158Qfics5+HCGKA7zdeIdYuPKRRhyRGHJMspwQXAYlzhRnk/juV5us2Vatg58tOpUlOpN6KTdlCKfanTUYu13KadlZe9/ROV5TTyrB0lXjzTStCC1a/mdvOTer0S3be3e6b8QPh18E9csfF3i/wvp/i3XApmtPBV5PItpHkOY5dRaFgyx7iji0RleZeHaJT83rf7Pf/BOX9vf/AIKia/ffF7VdPstD0TUrwHVPiZ4yt3tLabYjLFa2NrEuXgiRNkdvbRrBEoA3KK5z9mr4K/Dj4NaX4d1/VhpN74m1SBdR1XxV40tjJYeHopmlW2RLM7jPcSBXlLSKxBQKqEkGv2d+EXjK4+Enhi3sdS8Rtd63qFnu0fRfFmpbdX1ouZgtxdQmWNNKsAm5miIDFUxgEYPz2O4hpZbjFDCQ5t06sunK/sx2Ub7cz5paPll7rPerYHFVaHPV0b2gune7792tF1srny74X/4JQ/sM/sH/AA4u9X1z+0fH/wAW9Pu/s+g+MNb09/Ih1vY0tmui6WHEF60ZYSSvNK8UCwtJNIiqVr53/au8B/E/9or47y3/ANrj1S48T6VbrpFtb3iGSewYbf7QuJUYKsmoTRT3UlyyKgs4/wByJA8dfo38aLC08XSy6d4V13SvEXiEwC38afEcIJNM0eJvMaTTrUEpDd+aGZItNixEWTfdNMflr44/4KcfFax+Enwx0v4BfBPwy0vjjxy839nWlm32rUvss2I5NSuJUlYz6hcBfJjmwVSPfHGEVST5OLzbG18ypU+ZSrSVk200urk7aRjFK8rS6ON9TbAYelRw7m07de/TRLTd/Crba2V7v4P1bwDa/GT426F+zH8C1TW5bjXBp0eq2aOqaleP+7eeNC3yWkSbwgblUVnJyeP0L+EPxntfGn7QHxG8Z/CiC1Hh74f+ENP8J+AbkThvtMWjy2iW+0ebjD3QklJA5WaBTy5r568JfCpf+CWf7Luq/FPxfJbt8b/iPplzovhC0WYO3huykG28vQ2fvrGRHu7SuFHAarn/AATFtW0jQrvQvE91ctba5pHiOGO1ExJzDoUd8s0a78790NrIhPX7O54yMRnbpZnlUqmGnzUoe5CT3m+ZSqTVrK3upJrT4raWOnDOVPFfvoWdm2uytpH1t+J82/t+fDSx+FH7cHxG8OeG4Ej0HVte/wCEl8LeV/q30rVo01K2KHoVVblouOAYmHauR8IWmLyKVlBBPSvs3/gsV8Abjwp+z98OP2wbPTJdRsfD1rH4W1t9PIbbpV6H1TQrjknbEnn31juY8GKBe4z+Y3in9pPxdqCNY+Fo00WAgqZIX33BH/XQ/d/4CAfev6T4Lx39vcP4fEw/lUZX6Sjo7+fX5n4lnVFZdmFWi+jdvNX0Puz4d/tjfCj9ku9sfE3j26e+uLKdLmHw1p8ga7vSpzsPaFXHymSTAAJIVvuny/4CfHfwb4+0OLSdOmNnqNnDsfSriXMixrkKUbjzVC4BIGQRyBwT8XpeyzO08s7SPKd0kjsWZj6knkn3q5pd/c6ffRahY3UsFxBIHhngkKPGw6EEcg+9ffYbL6ai1ze8z5TF4iVZpNaI/XP9mj9o+Dw/HH4C8R34S3Zj/ZtzI+BGxPMZOehJ49CfevojSviYHlHlytuBwVL4/A+9fkT8I/2pbDVlh8O/E26S1vM7YNYHywzenmgcI3+2PlJ6gda+uPh3+0b4k0fS4dK1SKK+CRgW948xDlMcZIyHGOh647mvPxuAnGem/wDWqOjA45Qjy1NujPr74p+FvAPx8+G9/wDCr4saMNV0HVJLeS6sWuni3PDMs0TB0YMuHQcjqCyngmuvtvF0NlCVVQiqu2OONtqoAMBQB0UAAAdBivmPw/8AtJ2a2xS/0mRJdvyyJc7h+Of5/SrV7+0no8dv/aFzfrDAjFZHkfAU8nB/oBk15c8POnG89EtfJHsUcRDEVFCkrylokldvyS3fofQd745mt3M1ow3A5aNpflK89Tn9f/11+Wn/AAXZ+IMniv8Aah8I+EYpt48P+AonuAGzslvLmacKeeD5QiP/AAOvozxn+2Dq9wXsvBNukCDIF9eKHkOcjKxn5VH+9k+wrwz4t/su/F39ufXLXWvA2kQ3Orrqn/E88W6myxw21osO1muJzgFECoFUZIC4GBXzuE444eyzOqary/dq6lUbShF27vftpv0vsfpUvCjiivwxXzGram4xTjTd3Unqr6LSOjv7zvpqlufC0cEr7VUMXkbbGqjJdj0AA5J9q/QH9mX/AIJ3eJPD/wAC9M+LP7ZvjNPhJ4VPmSRRawg/tfUFZiVSC1OWjJU5+ZWf0jxzWx4O+IP7HH/BODT/ALH+zX4bsvin8W1jZLz4m+ILcNp2kynIIsIc4OOgdTk95WB2V4B8V/jV8Uvjp40n8ffFvxxfa7qsxP7+8lysK5+5Gg+WNB/dUAV+gYThzjnxScY4eMssy5NP21SN8VWVmv3NGXu0YtPSpWUpPRxo9T8owfGOX8AV51cO1iMU4uPKn+7hdpvmktZu6WkLLvLofQXiT9ub4e/A/R7v4efsKfCuLw5bSr5d34316NbnVtQ/2xv3BM843FgM8IlfN/ijxZ4r8b+IJ/FHjPxDe6rqNySZ77ULppZG9tzEnHt0HYVmrKG5Y9OntT1bcMiv3ngnwy4O4BpzeVUP30/4labdSvU/6+VZXk/8KagvsxSPy3ibjTiTiyuqmY13JL4YLSEf8MVovXd9Wx6oAu5j9akyAPlNQNIR8poEwJ59fWv0FTitD5LlkyUk7iSc00t8pIbA9PWmLI2T/jSM7D5d3FNzBR1GyNuOTTCMk4GPxoLZfZGCzn+Acn8utaNt4R8V3qK9r4cvWU9GMBUfm2OKx5nJlynTpK85JersZThfvEVXncZwprpm+F/jiU86XFH/ANdbyMY/ImmN8IPGcp5ewX63ZP8AJTWFRz2Sf3ExzDALerH70/yOVfA5Jzjrk1BK4zuHNdbN8IfF8eczWDfS6I/mtZt/8NvGFuOLCKT/AK5XaH+ZFcNWnX35X9x00swwE3ZVY/ejnHkG4jqaofG5/smk+HdCEnKW89zKmehYqoJ/Jq6CHwnr1rqMQ1LRbmNA+WZoiVwOeoyMVwnxg1pdU8eXkaODHYqlnHg55QfP/wCPl6/PuN8RKjlPs5KznJL7tX+h9rwzThWxTqxd1Ffmcu2AcL+NMY8EkdPQ1ISMEAU1hgY21+Os+8W5rFtwwBx6UFiBt6fSjmg4xwc19A9jyhjEhvb1ppbncOfUU8qCef500gKw2/jWck2Wj6k+DniIfEz9myyjMu/VPBc32O4BOWa1xmNvp5eB9YTU0EhhHztn3zXjf7M3xYi+FPxJim1iYf2NrEX2HWVb7qRsfklI/wBhuv8Ass1e0+ONIm8H6/NopyYfv2kmch4j059un4e9fjXFGVTweZOUV7s9V+q+TPx7iXLpYDNJKK9ypeS+fxL5PX0Y5b0KeGwPrTo9S3NgMfpmsH7e2SwY4PXmpEvlPIPQ1859XPn3ROjTUiQBvH51PFqMgfKNjt1rnoLwuSc8/WrMN8FO12/WolSlB3W5hUop7o6m0vi/AbBHata3vt0agOM7fWuOTUCuHSTGPRulXrbWTJHkNgjqM17GBxM6r5Z7ngYzL+sdjqDeKEPzc1HHcXizOZpIXiP+rKAhh1zuBJB+o/KsA6tuXYGPPfNTxag2Q2/oePavWUGed9UlFG81wGGA1IBvO4nFZsOohjl35+tXI7lSv3voc1VmjGVKUC2sMRycdPWu3Gu/Dn43+D7L4N/tHzSx2ljGYvCnjq1gEmoeGiekZGf9JsS337dj8oJaMqRivPZr5o1HzfnVd70MNxfvXk5xktDOcOoVG4yi+aE46ShLbmi+/RppxkrxknFtP6bhDiviDgrOaeZ5TVdOpHftKN7uMl1i7fqrNJnyt+2Z+zN8Uf2WPjVf+CPiXp8Bj1If2j4f1nTZDLY6zZScrc20vR0PcfeQ/Kw7nyNnZXwT07E1+m2k+LPht8UPhlN+zT+0/pdzqvga7kaTS9RtVDaj4TvG4F/YM3bP+st/uSrkYz1+F/2uv2TvH/7IXxNHgHxlfWuqadqNmuoeFfFelsWsdf09yQlzAT05yrxn5o3BU54J++4J40r1KkcjzdKOKhH3JJWhXhFJc0P5ZxX8SnduPxRbhqv6TwWfYLjKhUzXC6TbvVg3eUJSd/K8JP4ZW/uu0t/MhcHqGxgZyDirFpq+47JiCezetZxLA5yR70DocnH41+oQxU4O8S5UoyWptSzLNE8efvKR19av6dfl7aOdZOWTJOe/f9a5lL94UKsM4HBzVzSbyW2tI1vonhWUloHkGAwPvXzXFfLi6VOolqr/AHM5K2FfszoDfMThj+OahnlJG4nvVVpscjP506Ngx5P15r4VQszlVNR6CzCWWMouR9K98/4JrW5+FHx1g/bA8W/DrT/Eug/DC6S7ttL1PxBFpwutZkilNiI2lR1meFl+0mM7R+7jywyAfDrRY0JeXlVGT9K99+MLW3w5/ZP8F/D/AEi8t3F9YNr+syWk4dJb29UOFYqSMxwJBER1BjYdzXLmFGjisJPDVfhqJxdm07NWdmtVp1WpzYjOMRldSj9XinUlNJXV0rattaX0Vt92js/2iP8AgoH8NP2hdK1Kz+Jugarf+LL++uZrvXNbmgntdM3Ngiws7PEazMqIn2qdpZFTIUAGuX0HxT+zvqfhu3vIvjHZQapb2+z7BfaZdxRxqA42JJsI3Hg/3cknqa+TrgpExCtg/rV/Q7maJvMjlOSem7p+tfNf6g5ThcIqOEqVKcU7pJpr0SlF2j5Rsuu7d/1qh4gZvQ/eVaVOo7W1TX/pMl+TP1R/Zm/aA/ZphfRrfxx+0l4J0jUNOto0std1TUI5JtOVXl3BBKDC0/lkKtw4LRlgVAPT9APDPx5/4J2q3h1PCf8AwUi+EPhjQ7rW7iX4kyP8RtMl1bXrQwyPCstzceZJI5ncCXAUFGIGMYr8APhfqeoNfQkStjcM/MP6npX6tf8ABJGLwxceO4IvEvgvTNUt2VTcjUNOtpgiEkEr5ikn2PtXxf8AxC/KqGYOvUrTmt+V8vLvd20Wj2av1dtWePmvjnmM8ZSwP1OEed8vMpPta7TTvbddnqfdOk/tQf8ABNCW8m1fxn/wUW+BmqS2l/cpoFppXxFtLC00/TDuMcHkRz7fOO4iSZdhcEqAASK+PPDnif8AYp+E/wAf/GP7WHxc/wCCiPwt+JPjjxXq0nl32ieIra2ttC0w5At7SETuzSCNEiTBVVAyTyxP0l/wVc+G3gbwb8GYJfAXgXw1pUt1LIZ7q18O2Mcjx7eERjCfmJPbuOK/C34+/wBt6BPPfaLqbKWvmjlheKPKdfmyBx1xjGBSzHw0y/M1OjDEypKa5ZcqjzNXTs5O7S0WieySemhnU8Y8bkfEUcvnh41JpJpuTUVe+yUf6Z69+2L+0p4A/aA+MGufE7xd8WNCU3Ub22l6bZao1ylhYIrrbWqPCCuV5eRh99nY8k1d/Zm/bt+B/wAB7iw1vQfGWo3viDwhrsOraPbWuhXMttqyxLNaT2JdmURRXFjO6l2GFMKZ4r4p1uTUbwvNe3kkh5y7HH4fSuba7mspWkglZGOQWViDivpsN4d5T9RhhZ1Z8kbWS5UrLS3wvRrR9Wup7T8UMyxXNKGHpptWd+aW/wA0fujqX7dvwV+PX7KniL9jr4f/AANm1fQNf8KXWl2tz8Q/GVtYtDp0s8k1qxt7GO5kZ7J2V42JVwYk5AzX4XfFv4Z+Jfg98Std+FfjKJY9U8ParPYXxjJKO8bFd6E4yjDDKe6sD3r2P9k74tXPgjxHZa/Yzf6RpmpLI6qxHmQn76deQVLcfWup/wCCu/hPSLf40+H/AIxaLe27Dxl4cibUYRODL9ptlWFZmXcSFlt/s5DcBmR/Svb4OyjD8J5k8DSbdOqm9W2+ePztrHslsfn0uKs5zriWrRxyjZpuPKra3u923re+58uWNwCCjDkfrU/2jacb6yreUsSm7r+tWkdm+ZgF9s1+qRqNSVjvqUle5da4Mq7Gf8Sf88V6T8CP2gfFHwx1ODSNUu577QGkxNaFtz24J5eEnofVeh6cHmvLYwWfaemOua6LwNp8ereI7OxbHliXzJv9xfmP54A/GrxNWFLDTqz2im/uNsvwFXMMfSwdJe9Ukor1bSPtNfihqtwjR6bbeRER8r3B3PjnnaOF+hziud1vxnFHcPPd6l5k/O5mkyV69ewH0xXmN74rvHRjcanIFwS37wgV7f8AD25+FH7KWkW3xK+Leg2/if4gzwC48NeALnm20fIzHe6qc8ycho7MfNjDSFPlB/DcTT4l4jxSo0oTxFSTtGlBWXrJu0YRX2pzdkurbSf9frE8AeGGVSrUKUaVlZ1JPmqS8lvJt/yxsurSV2u++GPwl8L+CvCEHx4/a+1a58OeD5ozJoXh5CRqviRsZCxRZDRwnu525B5Kg5PBftG/tx+Nfjdpa/DbwZo9t4L8AWh22PhHRW2rKoOVa5dcec3fbgID0BPzHx34r/GL4hfGvx1d/ET4neKLnVdUuzhppn+WFP4Y40HEcYHRFAArCiuogxPmj/gRxX9GeG/gjk/DeIhm+duOJxy1jp+5oeVKMt59601zv7Kpr3T+RvEbxg4g405sJh5Ojhf5U/en/ja6f3Vout3qaMriQ5LYOOnrSK+TjoBVYX1uo/1mfYc1JFcwTZWNxnHTvX9AqrDoz8TcJLdFqJwvzZyB71I0uDwf1qnNOlrEbi4mWKIfellcKo/E8Vi3/wASPC2nsQn2m/I/htcIh9t7g8fRTWdXMMPhY3qzS/rtv9w6eFrV3+7i36f1b7zo3uYyMvJjBxya09O8KeJdUhN3a6NOLcDLXVwBFEo9S7kLj8a84uPjn4ntzt8L6dp+kAcCaK3Fxcf9/Zg2P+Aqtc1r/ijxB4puPtfibXr3UZM533t00uPoGOB+FeRW4owcP4cXJ/8AgK+93f4I7qeQ5hV3cYLzvJ/crL/yZns02pfDPQTjxb8V9MiZSQ1to6vfSj8YwUH5mqk/xv8AgDo77NO8K+IdcYf8trspAh/4CWHH1FeJs+TgAAdgKTDKMhhXkVuKsxm/cjGK9Lv8Xb8DujwrhZa1qs5eSaiv/JUpffJntLfteSaWrQeE/hLpdpFk7DNeHcPr5SJn6ZrI1H9rz4n3IZbXSNAtvQiylkK/99y8/lXlvmZIwfrTWbk8V5tXPs2q71n8rL8kjelwnw/Tlf6um/Nyl/6U2d9P+078ZJ2yPEFjEfSHRbcf+hKaa37SXxmKEP4sgwe40i1yP/IdcCXyRgYpDIea5HmmYda0/wDwJ/5ncuH8lW2Gp/8AgEf8jt5/2ivjCRz4qiPs2l2/9EpLT9ov4pJMTe3enXa/3JtOVMfQxlTXELlnwxq7o2i3GtajFpdov7yVsbj0Ud2PsBzUf2nmafNGtL/wJ/qzT+w8mtb6vD5RS/JHr3hT4+eIbPwzf+Pdb8N2Ki1Ro7AQzOoeXorEMTuG8qMd8NXh5muLmRp7mdpJZGLSuxyWYklifqSTXX/FDVbext7TwDpR/wBH0/D3HPWTHyg+4BLH3f2rkEBJxj6V8VxBm+NzTERhWqOShdLbrvsfQ5XleCyym/YQUebe1/lu2SKvGQ1KCDwTn1puSvyr1pdy4yPxr549VGueeSOMUi9DjmnAgdTTe+SMfj0r6A8tCHI6im4ywZT9acRg4z+tNyq8L071DRQrAMCD0PY19BfBfx+nxg8Ax/DbW7wf8JF4ftydLuJW5u7RQBtJ6koMKfYI3Y189vtY4z+tWNC1vV/DGtW3iHQL57W8s5hLbTp1Vh/MHoQeCCQeteNnOVwzTC8j0ktYvs/8n1PJznKqea4N09pLWL7P/J7PyPemmmt5nt7iJkkjYq8b8FSOoNC3THvjB55rY0PWdD+P/hY+MfDMMdt4jso1XW9IVsb+wkTPVW/hb/gDcgE808piZ45gUdSQysCCpHUEetflNXDTpVHTnG0o6Nf107M/KauGqUarpVI2ktGu3/A7PqjUS+VTktgfWpY9UOchuvYmsI3ikYY9PenLcn7wJFYugZPD9zpo9WJUqT+tcV4/+Nl74e1GTQvC9vFJcxfLcXM+WSJv7oUH5iO/OAeOa2LTUDHOpySQe5rxO4lnnu5prliZHmZpCeu4kk/rX0PDOU4fF4qU6quoJWXdv/Kx6mTZVhsTWlKtG6jbTo2+/wB2x6P4W/aL8SW0iweKtItr2In5pbVfJlA+nKt9OPrXqug+N9D8Taeup6DerNHnDqfleM/3WH8J/wAjNfM0P3sk1t+FfEOo+GNUTV9Ll2uOJI2Pyyr3Vh6fyPIr6/FZJhqq5qa5X+DN824YwOIi54dckuy2fy6fI+j4NcVGzIPyOauwa/altscwBI+63FclFrEV7p8F/GjIJ4Uk2OMMu4ZwfeoZNQO7AP05rwpYGF7H5/8A2cptpqzR3D6i03rgdKVZ2Y5J/WuAumke7GqWV09teKoUToeGUfwuvRx9efQ1q6N46DSDT/EMCW0zHEdwjEwyn0yfuH2P51E8DKMLx1MquW1Iw5qevddf+Cv6aOnnnLISpIx056V0uman8Ovi98Mrn9mf9ox5W8K3kr3Hh7X44fOu/COpMMC9tx1eFjgT24OJE5GHUGuMuL0qMFse9VheKerDg/lXj5llVHM8Oqcm4yi1KE4u04TW04vpJfNNXjJOLafoZBm+P4fx8cXhXqtGn8Mk94yXWL6/erNJnyl+0H8BfiL+zZ8VNQ+E/wATLCJL+zVJrW8s5fMtNStJBugvLaTpLBKhDKw91IDKwHEO4zgGv0K8U+HPBv7VHwgg+BPxOltY9b0NZJfhn4nu7jyvscrnc+lXEvaznOdjE4t5ir/6tpMfEXiv4a2Pg+4vrbXE1G1udPkkhudNvFCSxTIxVonyNysG4IPIwa+p4b4txFan9TzKFsRTsm4r3ai+zUhropdY/YleN2uWUv6jyDC4fi7KpZllk48sV+8hKVp03a7T01W/LJfEuid0uc0SxS/ufMuR+4iPzD++3Zf8a6WW4t7mFoLmFHjPBjYZFcxBqctpEIY0BC/hUh1ssMsxU+g5r6mrz1JXZ4FfD1K1S/bYt3umpbkyaReNEB/ywkO5fwPb8aq/249odt/AUP8AfA+U1Xn1iTbiMY9zVV7yeTPmNkHquOtcNbA0akddGb06EpK1TX8z2z9iv4NXP7Vn7TPhL4F28zxafquoed4gvYjzaaVApmvJs9iIUYL6syjvX1f/AMFOvDXwc+J3xkv9O+Efws0TQjZ6sdAii8OyLYRXEtnatc6jczKuYUjtFeK23BRlopXZmNVP+CSXgOP4F/B2T9oCC1RPGPxc8Tnwr4HkuBiPTtEsCl3rOpvnrEoQJ7tEF6M1eTfFfxDNF4ajubO8la48SQXEsBmfdJbaM93LJmQ5/wBbe3DPI56mKADkSV/Ouc4/E5lx0/YVHGGGXs4pNpSm23Uk0mrqLhyWe7hNKzsfr/DuT4HB8Ot1qSk6j5neKbSVuVK6erTvptdPufPV58JzeiDUoZtVtbK+Ekmm3N3ZDZdRo7IzxsQm9Q6lSQOGBHUV0+mfs26lpnhOy8far4sm0/R9Q1GfT7LVbvw9I9tLdQpHJNCJI5Cd6JNExGOjr6108ut+KvFo0nT/ABNqctzFoumx6ZpEDKqpaWqySSCJAuMAySSyEkZZpGYkk17i3jOD4b+AvhHpEeiW+pHR7PW/Fktjd6vbWivPqOoNaQNm4Dq+INKjbGw8SCvoMw4gzXD04xpy1beicdlGTXvSjZXaim2rJsjD5BlGJqJTprldv5vnpF9N7dkZX7H37C/if4/eKo/CXwq/aE8GXeqld5sDpt+8yrkLuMYwdoLKCeAM19tfsrfs6fGjwJ4puPCfwT/4Kb/sv2+vw3j2k2ka1pdw9wJ0ZlaNRMfmYMCCEzyKZ+wn46tfi/8AGLw18XrTwpZ6M/hOz1KwnvU8XWGpXWofbHi2QyCzjj8uGHy5GXzctlwBwK+qtF8deEPBP/BOvwp8O7/4l6f4T1Xxb4HvNP8ADmuX2i3Vxbafe3UFy63sstrDJ9lCyTKwmcryeCcV+Trj7iKXEDws56vkXL+6lyybne8ow95KMYy0s9WnqjuzPwz4Mlho4r6snNXaleae100m3bXT8Tivi5+yb/wVK/ae0i68CeKv21P2ZfE8GgXHk6hF4csbwTWEjqxCTfZVLRMRkhW54NfAv7Sn7G+kfDrxZqnwu+JP7a3wRt9f0ydo9T0yxbWpHhlAyYyPJIyM9Bmv1f8A+Cf1j8DbmXWfFX7N3xR8B654d0z4f+DvCLab4I1AXQs7vT4r6eaa5lVVDPM14SCcuwQsxBOB8Z/tNXMOmT/F74fXnwj8MzDxb8YNQe08f+INS0y2js1i8h7q1eS5PmpL5SnyShIJlbgEc+xmvFecYfHwpqpZPsoQe8b3501om3a12loeHhPDnhLHYpYyvh+eokrNyl+kle225+a3jj9mC9g0W98R+Hfi94c1rTLNwt1e6XpmoeVETnaCZY1PXjpxXnvjH9nLxb4U02HX/Ed3dxWVyIzHP/ZDxjEqF4s+Y+5BIgLJvC7wCVzX6Q6N8G/hV8UPH+uX2ladBo/gLXPE+myQpZ7BC2gWqyzXcw8s4yyW0x5APz57188/FrWvFviPxx4r8f8AivRdSsrH4qTSHVk1e1WGCFHk36W0KmTdH9m8uNF3KMJkDhsV6+ScdZhiajpOeseVtSUVLVRfLpFLmXv3t1ilbW69rEcF5LhIXhQSvfZzt1s9ZPR6fJ36Hk37HXwR0XxN8TBpl14Vv/EsNrYT6pqWhJ4kGmT6jY2ql7mC3ZFLfafLLMig5Ow1+gn7an7EP7Pvxd/Z++Inw0/Zs+DXhrTXufBNl48+EWs2mnmXVNU/s4SPqFhJcSSPK8jRSTL5QONyxnFfAPwm+MVv8IvFOma3J8M7PUfEGleIUmF/f6zPAqoDsNusMZUKzM0iGRieJFyK/Sn4IfGTxJ4q+CWkeP8AwdY3n/CW+AdTvZ7Lw9eKVvLXU9KAa80x0zllu9Jb6NNaSNjJrwuOcw4iwOd4bMaNSShGSS998rldSTcVJx5fdSbcYvllNNNuJ3ZXlGSV8LOiqUVNpptRSfzlZNter0R+GChXUSoPlPSpo5QPvDgd6+kv+Cpf7MGhfsz/ALWWrW3w6gB8C+OLGDxh8P5lHytpOoAypEv/AFxl86HHbyh6180SSKrFfSv6kyTMsNm+VUcbQ+CpFSXdXWz809GujTR+QY7C1MLi50JrWLaLMt2iLuVs49DXZ/COKVILnxBcHaJP3ELHsowWP54H4GuGtYDeyrbxkAu2Bk8V6hpcUGj6VbWEMyJHDGNgJ5z3Y+5OSB269enZXyrHZ9JYKhpGXxS6Rj+rb0S669Ls9nhvNMu4ZrSzfFLmdNNU4dZ1GrL0UVduVtNN20n3Gk67D4PmXUrSNJ9ZQhrV5FDR6aw5EmDw8/dc5WL7xy+NmPPcXt3cyXd3dPLJLIXlmlcs7sTkliTkknkmsQ+ILe1/dRKzgDjAx/OmS+JLmQYjKx/QZP5mv2HIcqyXhvBLD4SOvV/ak+8n19Nl0R+a8R53nfFOZSxeNle+y+zFdorovxe7bZvecQhIIwOpJ4qKXU7OMHN0pI6gHJFc/d6ihi+0XNzhR1Z27+lZV14hlkylgmwf89WHP4Dt+PNenWzaNJanjUctlUZ19x4m0yziEt1cFBjjI5b6Dqf881k3fxLvgxTQbVYO3nzAO/4DoP1rl5XeRjK7lmP3mY5J/GkjfbXj1s6xdTSL5V5b/f8A5Ho08qw0NZLmfnt93+ZoXuqX+qz/AGjUr2W4kHRpXzj6DoPwxUW4Ee/8qgSYdcU/epGd1ed7SU3eWrOzkUFaK0EYNjjFNZuw/OnFiRnoKawOM0m0NIXJxz2pGcHkUmO/amNk8BahyZaimLu5xnFICQ3J4pAGA6fpTgSFxjNTuVZIPlHU/jTW55A7cUjMAeKQHJzms5TsMcrMBy3613uhLF8M/Cb+KNRiR9Uvhssrd/4B15HoOGb/AICvesTSfD0eh2Q8TeI1KBSDb27D5ie3B7nsO3U1ka3rd7r98b2+lPA2xRhsiNeyj/Huea8rMsd9WpcsX7z28vM6sNR553eyKc89xcyvc3UrPJI5eSRzksxOST7k0mD0JpQmSQ3agpyMV8k1c9YNrBv60rH5cE804jPFIUZgeAaTVxrQ184A701ueM0qlgcnFKQMZC/rXvHlojYNnmkIB4FSFSfmxSFepqJFkYHUbSaNuOp/Kl4HTmkLEDIH41m0BpeE/GHiHwL4gg8T+FtRNreW+QrgZV1P3kdejI3Qqf5gEe5aJ4z8H/Hy2M9i8ekeKEizcWDvlLnH8SHq4/8AH17gjmvnk7jwf1psLTwXCXFvM8csThopI3KsjDoQRyD714Wa5Ph8xSl8M1s/0fdHl5nk2GzOKk/dmtpfo+6/pHtOq2ep6FenTtXtnglXkK/Rh6g9CPcVANRP3Afzqp4M/aIg1KyTwx8Y9MOpW3SPVoI/38fuyjG7/eXDeoaus/4Vnp/iTT2134YeKbTWLXqYfPAlT2PTB9mCmviMVga+Dly1o28+j+f+Z8HjMuxGAnbERsujWsX8+nozDjvZMgl+n6Vw3jjRf7O1lr6FP3F2xdSOiv8AxL+fP411+pWOpaJc/YtXsprWXsk6Fc/TsfwqC9srfWLF9PvAdrcqw6o3YiunKsU8vxan9l6P0/4BODqvC1udfC9/Q4AEjlR+FWtL1iTRtSg1L7NHL5MofypR8rY7U7UNKudJunsrvG5eQR0YdiPaqUh7V+hKcKkOaLumfSfu60O6f5HsGjeNLPxLaDULC43DpLG5+aNvRv8AHoaux3RkGQ1eNaLe6hot8NR0+Qqw4dSfldfQj0/lXpuga9a6vp6Xto2AeJIyeUbup/zyK8mvhvZu62PkMyymOElzU/hf4eR0Cz4HzHmobueJ4mjlVSpGGVhnNVGuyqkg/nVWe7L53P0rCMLHlQw7crliDxDrOhyeVZ3pktG4WGf5gh9AeoFXV8cXL8TJs9TFz/OsISk53LkHqDTBGyD7+QTWjoUp7xN5YShN3lFX7nTxeL4zExW6PQ8P1/KuL/aeC/Efwu/je3hLaxZRRpqsqn5ry2TCrK3dpI1CqW6tGATzGS1zYF+61MlvvJjICgjGCpGQR3BHcVj9Qoe2hVtrB3T/ADXo/wDLsexkOOxfD2MdfBya5k4yXSUXun+j6PU+bXkI/oc01zg8n9a3viZ4THhTxAz6fGV067y9oMk+Uf4os+2eP9kj3rAU4+brX0cJqqro/V8PWp4ijGrB6SX9fNdRcFiBmtfwV4L1vx54osPB/h+ESXmpXaW8AY4ALH7xPZQMknsAay1IB3Zr2T9ku+0jw1deIviFLdQ/2jp2mfZdGgaQb/On3B5VBOSFjUjI6eZXNjqscPhJT3a29ThznHV8uyyrXpK80vdX95tJX8rtX8rnv3iP9qW4+C/hCD4J6Vp2m67D4d8FyeDtC8Q21zPpt3YaZNO096iQbpbeSad2dXuMLIyPg9OPCta+MOia1rk13qtxeWodFWNfsgl8tUTy448q/KqiqBgDntXJfErVmmuBALjfIzMz/NnH/wCvk1xbG7d9+84B784r8zocJ5RTqyrRhaU7ttPdt3ejuld62SSvd7tnt5LxbxG8sp0sRVU7JbxSeit9lI9x+F3xU+D3hDxk+pfEC1XxDo02mX1u9hJdz2MkM8sEiW92koVh5kExSUKQVcIUbhsjvfEX7Qnwt+JHio3Om+JdI0nS9P0fTNE0ezvdciaSKzsrFLdJGd9itJJKJ53wMBpyB0FfL0fB5bj0z0ra0WJ7iUKtisoHUMq4/WufGcK4LET53OSdrd1vfbRX87X6Ht0eOsTgKXvUouzvu1+bZ+tnww/bF/ZB8Ya34Am8P6/8M/AV34f+Hk2ieJNQTxPpkB1u/LQeTMwg25A8uQlpfmHmHk19Pf8ABPb9s3VJtG8G/BLxZoPgPwro3h/RILTxB4xufjroN9Fera25RFtba1mMpaWUJky4VI92ckgV+IXg3QNOvZYYZvA9jK7uAqNZQNuJz32/pivqf4AeE/2ffD0i23xY/Yn8MeLEkXKyHRjHKnXoYSA4+uCa/O8T4V4D27nGs5PS3NFu3LzWtacekre9zLRWseVj/HbD4VKhUwjUdfhmnvrrdPr2P16/ZX1L4PfDvxn8dPEcHi/wH4e0LxR8YpdQ8PSWniLTbeC8tI9G063a5RY5cBGnin5wCTuOOcn5A0CfwJ8Svi746+IX7TXiH4VaNpGn+ONa1PwvoGs+MdI1aS8uruCKDzkbzykdkkUStggSSSyE4GwV8/fGXwx+x5aaOtx4L/4Jw+CtKyCWu9U0a6JB5/hM5XH1/Kvlr4taf8PtIDalpPwc8GWyzSFBFpmgQxCHrzzkge5HapxvhvWzKnKM8W4txUVJQ96KsleL9o1dpWbae+lmc2D8eMrp4uNPD4OUn2bST9br59D6W+Mf7SHwj+DWp/FJPg58QPBlg2t+GDFoNvpGvWy2y6i87xzTxrG5SF2gkd8DA5Ar5V8Z/HT9mvXvhloHgi0+F3hPTPFdnIsviv4ox+LtT1HV9alDSlwsLMLaGJwyggIzfICrDJrybxLLp/mO9tpcCZJ4jhRQPYYrlNVeQP8AuVwT1+YAD8utfUZD4fYHKaX8acptxblflb5YKC5rP3lbW0uZczva9rfSVvEqrmrjJ4VRXRc2i1v2Vvl00O917x74R126XVZfEGLmaIfbxFBKzM4UrvXHBJAVjk9cGvrL4E/8FHrv4c+MX+J3hDwfLNquoafoza1e6/raWNpcatpweH7ftjEs8nn2rSwyIfvGZiT0FfADy3UOSZD9Qf8A69anhPXDb3JaSTDK2ME9BXu5jwTkmZ4dUsVFzilazdlZuLt7tna8Yu1+iOOpxxnuGhOpg1CLf93m6NX95tX1fQ+wv2+fF+vftW/s3ad400/xZoL2Xwige10Dwr4e8PSRR2WmXEq+dvu7iVri6ZWEcmWVEADlVXJr4HUu37wt15NfZf7KHjXRB4ql8J+IVWfS/EVjLYahbFspKrqw29f4lLKPdh6V80eP/hpD8N/idrngeS+juodH1SW3gnjkDCdAco5xx90qSPXI7V9Twfl9HA3yvDxUYR96KS0Sk7y16+9dtu7berbPz7KOJs0zPMsVTzSbnVupxk0leL0a0SXutdtmuxj+G7FraZNUuYgSpzBG3b/aP9B+NdAdZuGBIRcnqeaqIVcdfyoZAoLbunrX7NgqX1OgoU3p18/M7K8lXqc0ywb+4b+JR9FFV7jVXhYqZi7/AN0Hp9fT6VQudSZiY7RiF7yev0/xqFGCjAFFTGt6RfzKhhktWi5JfTXDh7iUkjhB2Uew7U9Zc96phg3U/SpYXIOMdeKxjVbepo4KK0LSvkYA/WnAbjgD8KdHCqqrPIDuHKKOR9TUhKLzGuK6YRurs53LsJ5RC57/AFpCxHBFK0hY7dwH40iXMULb4kEjg/KXGQPfHf8AGrbgtidSzaaTqF8A0MQVP+ekhwv/ANf8K0LfwrAvzXmonP8AdhXH6n/CsptX1cnzDfyE+hP9Klh16/iO6Rlf2K/4VvSqYVP3k2c9SGKfwtL+vM1xoWiRj/j3kc+rTn+mKeumaInA0uMnvuLH+tU7bW4bn5XBjb3OR+dWDI6nOfoa7IzoNXjFfccUo107Sk/vZI+n6SOBpdv9Np/xqKaw0vODpaD3R2H9afbyy3E/2e3heSQn7kakn8hXRad4Fu5bY6n4juotNtEGXeeQAgficD+ftWNSpR5W9PuQ6cKzdk397OWtvDVpqdwtnp1vctM5+SOI7yfwxW/P8P8AQPhxpi6/411jdfMN1hpkCqzuR3IPBx/ePyr/ALRwKdc/FDQPCEMun/DvTElncFX1O7TI+qqeX/HC+xrhtS1DUNavpdT1W+lubiVsyzzPlm/+t7Dgdq+WzDOKMbwopN9+h7uDwVZPmqN+hNreval4jvftupP0yIoVOVjHoPX3J5P6CoAMZpUAAy3ahQScg18tOc6k+aTu2eyoqKsgAVsjvTgBwCMUYBNL65qRiNgDIFJg9aUguOTSFiVwO3WgDTJVh97HFO6Ac00HGAMYpAQx6Y9DXuHmIVjg4Jo3DZjPP1oZedoHP1pCQEI71LSKAgAcjI9KQqnXPH1pxwerc4pp6CoaGRudo45oDDnPFOIDdBxSMoJ5/OspItO4pA25p+narqei3o1LRNTuLO4T7s9rMUcfiD09qYVBGCD+NMljH4+1ZShGStJXQ2oyVnsd/oX7Tfj+yjWx8VafYa/bDhkv4dshH+8oxn3Kmujsvi/8Add51vw7rWgzMPmazAmiB/4CScf8ArxraCaR0LcHFeZWyjBVHdRs/L/LY8Wvw9leIlzKHI/7rt+G34Hsev6T8GvFdmJtA+NdhHLGf3cepW5jcg9R822qdv8AATV9TlUeH/HHhy+V/u7NRVSf1NeSMgJxnj0zSfZYGOWgjPHUoM1rh8M8NT5ISdvMzhkDox5aVZ284p/lY9xX9lf4sbcpBpDD+8NXUZ/Sr3hz9m74yaLqAmW00owyELOo1mPBX16dRXz+beHP+oTH+4KY9vCqnEafgoq5KtNWbX3E1Miq1IOMqq1/u/8A2x9Zt+zv8S8ff0jn01dT/SoW/Z3+JAJzHph+mqL/AIV8mPZw/e8iMf8AABTWsICeIY/++BXP9Wqr7X4Hlf6nVOmIX/gH/wBufWL/ALP3xFU48rTT/wBxNf8ACmn4B/EVP+WGnfjqS/4V8m/YYVBxbp9dgo+zxjH7lfyo9hW/m/Ar/U+p1rr/AMA/+3Pq2b4B/EZwcQ6b9f7USq0n7PHxLJz9msD9NTU/0r5XNsqtxGuPZRS+VjgKPbij2Fb+b8C48J1YvSuv/AP/ALc+kfF37LfjTxLoNxo15baepdd0Mn9ormOQZ2t/Q+oJryxP2NvjREuJI9F3Dggawv8AhXnrQDqyCo2iIOVOB9a6cM50G+bX8P8AM+gyrLa+XQlCVXmi9bctrP8A8CZ6FJ+yD8Y0bmDSPx1hP8K9s8K+DPE2hfso6b8DNc8GaXe3Vv4s1HVLp99vJhZooUjKTAiRW/dkEKw4A65r5RMT/wARyPrUfkY5VT19elefnGW4HOYQjXi/ckpK0rapNJ7eZ9HhMZXwbk6VveVndXVnbo/Q9f1D9m3xVd30jrH9mViSBJeo4Xk/3uf1p0X7IHxH1NM6Vq2mSc8CSbaf/HS1eO7MZBY/99GljiUcjP51w1MrrWSo1WvW0v8AL8xUq9Jybr0YS9E4fk2vwPb7X9gv9omWTzbW00aUHpnVdmf++lFbujfsP/tJ6ZMGuPAlrKg53RanDIv6sK+exPKox5re3zHihru8JxHcOPYSH/Gub+yczvrXi1/17f8A8mGKp5LiaTi8PJPuqn6ODPqzTv2fPjR4bbzL74e2y467ruJD36FXB/D9a94+FHhX9pf4V3ckt38DNXtw8WJJYfFVqgIOT/FJjnjP5V+akzTuf3ksh/7aH/Gq7ieMbUldR6K5H9a5sXkmJqJKlVS73g3+U42/E+chwnw5WcnioTl2tNRt6+5K/wCB+rXjL4jfGbXrQ2Uvw41GIgEBJ/F1iwHX1ckj2PFeKeOPhp8f/GDSQaZ8NI2MrHJGt2pJHPBCuM/jXwYBcbtxuZev/PVv8amSW6T7l5KPpK3+NcseH8fB3VaP/gt//LBUuDOEKVb2nsaja71V/wDKz6z1j9gD9sDxBcPdWHwtghRlJDTa/axqBz6y5rAuP+Cdn7UNiGk1fR/Dtsq8t5viiFsf98Zr5t3zucySu5PXc5P8zQQyjjcM/wB04rppZRm6l7+JjbypNP73Uf5H08cPw9RpctLDSv3dS/5Qj+Z9AX37DvxZiH+n634eiCjnyb2SXH/jgB/OsyP9jy80+88zV/GQbn5lsWiT17ux/lXiBa4HAnkA/wCuh/xpFklUkmZ/f5zXf/Z1WULe1l6rlX6MzjKNJ/uqUF6qcv8A3Ij73/Zr8Efsp/DFzqfj74WXPjLUbdWMOm6rqkk0JYBsMw3xQBckcMj9OhrhP2wfht47/aY+Nt18UvB3w48LeFtLbSbOxsdC0jy7WG2jt4tn3Y41UlupbAJz7CvkTG47x19zTwCowOM1ORcP5bkubzzNyq1azi4pzqycYxbTajD4Vdpa2v52HicXi8VRVFqnCF72hTUW33bu2/vseyD9k34vQHDwaV9f7VUfzFR3H7I/xkvAdy6IiZ4Q6wvP145rx11JyCefrUfkjGefpmvuJZ9UlHl5dPX/AIB56wcE73/r7z19/wBjv4wA7i+ifhrC/wCFRn9kb4wRkjytGI741lP8K8mEZ44707ZjhgKy/th3+D8f+AX9X8/6+89ch/ZJ+LfTytG+v9rr/hU8f7J/xXhyxj0k8dtVX/CvHlhXrtGfcdKQRAAkxj8K1jnjj9j8f+AZywil1/r7z2M/st/FdRkw6UPrqq/4U0fswfFYE4i0r8dVX/CvHHjXPMf40giQN9wAelX/AKwVP5Px/wCAT9Rg+v8AX3nsZ/Zc+KxByukAe+rL/hUZ/Zf+KSkkppOB1P8Aaq/4V5EqbmwFAx3qQRgrtIFL+35/yfj/AMAf1GO1/wCvvPVm/Zt+JCn95LpKgd/7SB/kKguPgPr9hubVvFeh24j+/uvD8v5gV5eLdOjIuPpUy20WNyQLnHXaKf8ArBPbk/H/AIAngY9Jfh/wT0RPBHgTTBnWPi/pS46paqJD+jH+VK+ufBnRYvLgudT1WVf4lhKIT/wLaMfnXnqxMOQMe1OWMjkY/Gs5Z/jGrQSX4gsDR+1qdrc/Fy9t0MPhXQLOwTGBI6+a/f2C/mDXOapr2sa7c/atc1Se6kB4M0mQv+6Oi/gBVFR2JPSpFUEYFebWxeJxH8STZ006NKkvdVh4OTndUiDrk4pgwBxgU9BkcnFZI0AcDkd6eB15/Km5zwfwpQQP4ccUwFDAHGOtI5GQBSElepAo3EjimIC+T3x3pSwYYA/XpTeM9aACflHX0zRcZ//Z";


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

// ── PlayerPhoto: WikiPhoto with SVG Avatar fallback ──
function PlayerPhoto({name,team,g=0,a=0,sz=120}){
  const col   = COLS[team]  || '#4F8EF7';
  const col2  = COLS2[team] || '#FFFFFF';
  const flag  = FLAGS[team] || '🏳️';
  const num   = PLAYER_NUMBERS[name] || '10';
  // Last name for jersey (like MESSI, KANE, MBAPPÉ)
  const parts = (name||'').split(' ');
  const jersey_name = parts.length>1 ? parts[parts.length-1].toUpperCase() : (name||'').toUpperCase();

  // Contrast text color based on jersey brightness
  const r=parseInt(col.slice(1,3),16),g2=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
  const brightness=(r*299+g2*587+b*114)/1000;
  const textCol = brightness>128 ? '#1a1a1a' : '#FFFFFF';
  const nameSize = jersey_name.length>7 ? 7 : jersey_name.length>5 ? 8.5 : 10;

  return(
    <div style={{width:sz,height:Math.round(sz*1.25),borderRadius:14,overflow:'hidden',
      flexShrink:0,boxShadow:`0 8px 24px ${col}44, 0 2px 8px rgba(0,0,0,.4)`,
      border:`2px solid ${col}66`, cursor:'pointer', position:'relative'}}>
      <svg viewBox="0 0 120 150" width="100%" height="100%"
        xmlns="http://www.w3.org/2000/svg">

        {/* ── GRASS BACKGROUND ── */}
        <defs>
          <linearGradient id={`grass_${num}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a5c1a"/>
            <stop offset="100%" stopColor="#0f3d0f"/>
          </linearGradient>
        </defs>
        <rect width="120" height="150" fill={`url(#grass_${num})`}/>
        {/* Grass stripes */}
        {[0,1,2,3,4,5,6,7,8].map(i=>(
          <rect key={i} x="0" y={i*18} width="120" height="9"
            fill="rgba(255,255,255,.03)"/>
        ))}
        {/* Grass texture lines */}
        {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>(
          <line key={i} x1={i*12} y1="0" x2={i*12} y2="150"
            stroke="rgba(255,255,255,.02)" strokeWidth="1"/>
        ))}

        {/* ── JERSEY SHADOW ── */}
        <ellipse cx="60" cy="135" rx="38" ry="5"
          fill="rgba(0,0,0,.35)"/>

        {/* ── JERSEY BODY (back view) ── */}
        {/* Main body */}
        <path d="M 26 44 
          C 26 42 32 37 40 35
          Q 60 31 80 35
          C 88 37 94 42 94 44
          L 90 118
          C 60 124 60 124 30 118
          Z"
          fill={col} stroke={col2} strokeWidth="1.5" strokeOpacity="0.4"/>

        {/* Left sleeve */}
        <path d="M 26 44
          C 20 46 12 52 8 68
          Q 6 76 11 78
          L 14 76
          Q 11 70 13 64
          C 17 52 24 48 28 46
          Z"
          fill={col} stroke={col2} strokeWidth="1.5" strokeOpacity="0.4"/>

        {/* Right sleeve */}
        <path d="M 94 44
          C 100 46 108 52 112 68
          Q 114 76 109 78
          L 106 76
          Q 109 70 107 64
          C 103 52 96 48 92 46
          Z"
          fill={col} stroke={col2} strokeWidth="1.5" strokeOpacity="0.4"/>

        {/* Collar (back neck) */}
        <path d="M 44 35 Q 60 30 76 35 Q 60 39 44 35 Z"
          fill={col} stroke={col2} strokeWidth="1.5"/>
        <path d="M 46 35 Q 60 32 74 35"
          fill="none" stroke={col2} strokeWidth="1.5" strokeOpacity="0.7"/>

        {/* Subtle jersey fold/shadow */}
        <path d="M 60 55 L 60 115" stroke="rgba(0,0,0,.12)" strokeWidth="2"/>
        <path d="M 26 44 C 35 80 35 100 30 118" stroke="rgba(0,0,0,.08)" strokeWidth="1.5" fill="none"/>
        <path d="M 94 44 C 85 80 85 100 90 118" stroke="rgba(0,0,0,.08)" strokeWidth="1.5" fill="none"/>

        {/* ── PLAYER NAME ── */}
        <text x="60" y="64"
          textAnchor="middle"
          fontSize={nameSize}
          fontWeight="900"
          fontFamily="'Arial Black',Arial,sans-serif"
          fill={textCol}
          letterSpacing="1.5">
          {jersey_name}
        </text>

        {/* ── JERSEY NUMBER ── */}
        <text x="60" y="105"
          textAnchor="middle"
          fontSize="34"
          fontWeight="900"
          fontFamily="'Arial Black',Arial,sans-serif"
          fill={textCol}
          opacity="0.95">
          {num}
        </text>
        {/* Number outline for visibility */}
        <text x="60" y="105"
          textAnchor="middle"
          fontSize="34"
          fontWeight="900"
          fontFamily="'Arial Black',Arial,sans-serif"
          fill="none"
          stroke={brightness>128?'rgba(255,255,255,.4)':'rgba(0,0,0,.2)'}
          strokeWidth="1.5">
          {num}
        </text>

        {/* ── TEAM FLAG (bottom strip) ── */}
        <rect x="0" y="138" width="120" height="12"
          fill={`${col}cc`}/>
        <text x="60" y="147"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          fontFamily="Arial,sans-serif"
          fill={textCol}
          letterSpacing=".5">
          {flag} {team}
        </text>
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
      <img src={APP_LOGO} alt="Mundial 2026"
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
        <img src={APP_LOGO} alt="Mundial 2026"
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
            <img src={APP_LOGO} alt="logo"
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
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if(!window._fbDB) return;
    try{
      const {doc,getDoc,getFirestore}=window._fbFirestore||{};
      if(!getDoc) return;
      const db=getFirestore();
      getDoc(doc(db,'live','scorers')).then(snap=>{
        if(snap.exists()&&snap.data().list?.length>0)
          setScorers(snap.data().list);
      }).finally(()=>setLoading(false));
    }catch(e){setLoading(false);}
  },[]);

  return(
    <div className="scr fin">
      <div style={{padding:'18px 16px 8px'}}>
        <div style={{fontFamily:'var(--ff)',fontSize:28,letterSpacing:2}}>GOLEADORES</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>
          Candidatos a la Bota de Oro · FIFA World Cup 2026
        </div>
      </div>

      {/* Jersey grid — 2 columns */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,padding:'8px 16px 16px'}}>
        {scorers.map((p,i)=>{
          const rank=i+1;
          const rankColor=rank===1?'#F6C90E':rank===2?'#C0C0C0':rank===3?'#CD7F32':'var(--muted)';
          const isOpen=sel===i;
          return(
            <div key={p.n} onClick={()=>setSel(isOpen?null:i)}
              style={{display:'flex',flexDirection:'column',alignItems:'center',
                cursor:'pointer',position:'relative'}}>

              {/* Rank badge */}
              <div style={{position:'absolute',top:-6,left:'50%',transform:'translateX(-50%)',
                zIndex:2,background:rank<=3?rankColor:'var(--surf2)',
                color:rank<=3&&rank!==2?'#000':'var(--txt)',
                fontFamily:'var(--ff)',fontSize:11,letterSpacing:.5,
                padding:'2px 10px',borderRadius:10,
                boxShadow:'0 2px 8px rgba(0,0,0,.3)'}}>
                {rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`#${rank}`}
              </div>

              {/* Jersey card */}
              <PlayerPhoto name={p.n} team={p.team} g={p.g} a={p.a} sz={144}/>

              {/* Goals counter */}
              <div style={{width:'100%',background:'var(--surf)',borderRadius:'0 0 12px 12px',
                border:`1px solid ${(COLS[p.team]||'var(--br)')}44`,borderTop:'none',
                padding:'6px 8px 8px',marginTop:-2}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{textAlign:'center',flex:1}}>
                    <div style={{fontFamily:'var(--ff)',fontSize:28,
                      color:p.g>0?'var(--gold)':'var(--muted)',lineHeight:1}}>{p.g}</div>
                    <div style={{fontSize:8,color:'var(--muted)',fontWeight:700,letterSpacing:.5}}>GOLES</div>
                  </div>
                  <div style={{width:1,height:30,background:'var(--br)'}}/>
                  <div style={{textAlign:'center',flex:1}}>
                    <div style={{fontFamily:'var(--ff)',fontSize:22,
                      color:p.a>0?'var(--acc)':'var(--muted)',lineHeight:1}}>{p.a}</div>
                    <div style={{fontSize:8,color:'var(--muted)',fontWeight:700,letterSpacing:.5}}>ASIST.</div>
                  </div>
                </div>
              </div>

              {/* Bio expandible */}
              {isOpen&&(
                <div style={{width:'100%',background:'var(--surf2)',borderRadius:10,
                  padding:'10px 10px',marginTop:6,fontSize:11,color:'var(--dim)',
                  lineHeight:1.6,animation:'fin .2s ease',border:'1px solid var(--br)'}}>
                  <div style={{fontWeight:700,color:'var(--txt)',marginBottom:4}}>{p.n}</div>
                  {p.bio}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Profile Screen ───────────────────────────────
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
  const chatEndRef=useRef(null);

  // Subscribe to Firestore chat in real-time when viewing a group (like WhatsApp)
  // Placed here AFTER all state/ref declarations to avoid TDZ crash
  useEffect(()=>{
    if(!selGroup?.code) return;
    const gid=selGroup.id;           // local state key
    const grpCode=selGroup.code;     // Firestore path key
    const subscribeFn=fbSubscribeChat||window._fbSubscribeChat;
    if(!subscribeFn) return;
    const unsubscribe=subscribeFn(grpCode,(messages)=>{
      setChats(prev=>{
        const local=(prev[gid]||[]).filter(m=>m.id.startsWith('cm_'));
        const fsIds=new Set(messages.map(m=>m.id));
        const localOnly=local.filter(m=>!fsIds.has(m.id));
        const merged=[...messages,...localOnly].sort((a,b)=>(a.ts||0)-(b.ts||0));
        return {...prev,[gid]:merged};
      });
      setTimeout(()=>chatEndRef.current?.scrollIntoView({behavior:'smooth'}),80);
    });
    return()=>{if(typeof unsubscribe==='function')unsubscribe();};
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
    const myIni=(myName)[0].toUpperCase();
    const msgId='cm_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
    const msg={id:msgId,uid:user?.id||'user',name:myName,ini:myIni,
      col:'var(--gold)',text:txt,ts:Date.now()};
    // 1. Optimistic update — show immediately
    setChats(prev=>({...prev,[gid]:[...(prev[gid]||[]),msg]}));
    setChatInput('');
    setTimeout(()=>chatEndRef.current?.scrollIntoView({behavior:'smooth'}),50);
    // 2. Save to Firestore — use group CODE as path (groups/{code}/messages)
    const fn=fbSendMsg||window._fbSendMsg;
    const grpCode=selGroup?.code||gid; // code is the Firestore document ID
    if(fn){
      fn(grpCode, user?.id||'anon', myName, txt)
        .catch(e=>console.warn('sendMsg error:',e));
    }
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

    const visibleTabs=[['ranking','🏆 Ranking'],['pronosticos','🔮 Mis Pronósticos'],
      ...(locked?[['todos','👥 Ver Todos'],['reporte','📊 Reporte']]:[['info','ℹ️ Info']]),
      ['chat','💬 Chat'],
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
            <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
              {/* Chat header */}
              <div style={{padding:'10px 16px 8px',borderBottom:'1px solid var(--br)',
                background:'rgba(255,255,255,.02)',flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',letterSpacing:.5}}>
                  💬 CHAT DEL GRUPO · {allM.length} MIEMBROS
                </div>
                <div style={{fontSize:10,color:'var(--dim)',marginTop:2}}>
                  Los mensajes son visibles para todos los miembros
                </div>
              </div>

              {/* Messages */}
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
                  const isMe=msg.uid==='user';
                  const ts=new Date(msg.ts);
                  const timeStr=ts.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
                  const dateStr=ts.toLocaleDateString('es',{day:'numeric',month:'short'});
                  const showDate=i===0||new Date((chats[gid]||[])[i-1]?.ts).toDateString()!==ts.toDateString();
                  return(
                    <div key={msg.id}>
                      {showDate&&(
                        <div style={{textAlign:'center',margin:'6px 0'}}>
                          <span style={{fontSize:10,color:'var(--muted)',background:'var(--surf)',
                            padding:'2px 10px',borderRadius:20}}>{dateStr}</span>
                        </div>
                      )}
                      <div style={{display:'flex',gap:8,
                        flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end'}}>
                        {/* Avatar */}
                        {!isMe&&(
                          <div style={{width:30,height:30,borderRadius:'50%',
                            background:msg.col+'25',border:`1.5px solid ${msg.col}55`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>
                            {msg.ini}
                          </div>
                        )}
                        {isMe&&(
                          <div style={{width:30,height:30,borderRadius:'50%',
                            background:'rgba(246,201,14,.2)',border:'1.5px solid rgba(246,201,14,.5)',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:11,fontWeight:700,color:'var(--gold)',flexShrink:0}}>
                            {msg.ini}
                          </div>
                        )}
                        {/* Bubble */}
                        <div style={{maxWidth:'72%'}}>
                          {!isMe&&(
                            <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,
                              fontWeight:600,paddingLeft:2}}>{msg.name}</div>
                          )}
                          <div style={{
                            background:isMe?'var(--gold)':'var(--surf)',
                            color:isMe?'#000':'var(--txt)',
                            padding:'9px 12px',
                            borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px',
                            fontSize:13,lineHeight:1.45,
                            border:isMe?'none':'1px solid var(--br)',
                            boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                          }}>{msg.text}</div>
                          <div style={{fontSize:9,color:'var(--muted)',marginTop:3,
                            textAlign:isMe?'right':'left',paddingRight:isMe?2:0,paddingLeft:isMe?0:2}}>
                            {timeStr}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef}/>
              </div>

              {/* Input */}
              <div style={{padding:'10px 12px',borderTop:'1px solid var(--br)',
                background:'var(--surf)',flexShrink:0,
                display:'flex',gap:8,alignItems:'flex-end'}}>
                <textarea
                  value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg(gid);}}}
                  placeholder="Escribe un mensaje... (Enter para enviar)"
                  rows={1}
                  style={{flex:1,background:'var(--surf2)',border:'1.5px solid var(--br)',
                    borderRadius:12,padding:'10px 14px',color:'var(--txt)',
                    fontFamily:'var(--fb)',fontSize:14,outline:'none',resize:'none',
                    lineHeight:1.4,maxHeight:100,overflowY:'auto',
                    transition:'border-color .2s'}}
                  onFocus={e=>e.target.style.borderColor='var(--gold)'}
                  onBlur={e=>e.target.style.borderColor='var(--br)'}/>
                <button
                  onClick={()=>sendMsg(gid)}
                  disabled={!chatInput.trim()}
                  style={{width:42,height:42,borderRadius:12,
                    background:chatInput.trim()?'var(--gold)':'rgba(255,255,255,.08)',
                    border:'none',cursor:chatInput.trim()?'pointer':'not-allowed',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:18,flexShrink:0,transition:'all .15s'}}>
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
                    display="Más +2.5"/>
                  <OBtn id={`m${mid}-total`} category="Total Goles" val="under" odds={1.95}
                    display="Menos -2.5"/>
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
                <input type="number" inputMode="numeric" pattern="[0-9]*"
                  min="0" max="9" placeholder="0" value={ex.h}
                  onChange={e=>setExact(p=>({...p,[mid]:{...ex,h:e.target.value}}))}
                  onFocus={e=>{e.target.select();e.preventDefault();}}
                  onTouchStart={e=>e.stopPropagation()}
                  style={{width:50,padding:'9px 6px',background:'var(--surf2)',border:'1.5px solid var(--br)',
                    borderRadius:10,color:'var(--txt)',fontSize:22,fontFamily:'var(--ff)',
                    textAlign:'center',outline:'none',WebkitAppearance:'none',MozAppearance:'textfield'}}/>
                <span style={{fontFamily:'var(--ff)',fontSize:24,color:'var(--muted)'}}>–</span>
                <input type="number" inputMode="numeric" pattern="[0-9]*"
                  min="0" max="9" placeholder="0" value={ex.a}
                  onChange={e=>setExact(p=>({...p,[mid]:{...ex,a:e.target.value}}))}
                  onFocus={e=>{e.target.select();e.preventDefault();}}
                  onTouchStart={e=>e.stopPropagation()}
                  style={{width:50,padding:'9px 6px',background:'var(--surf2)',border:'1.5px solid var(--br)',
                    borderRadius:10,color:'var(--txt)',fontSize:22,fontFamily:'var(--ff)',
                    textAlign:'center',outline:'none',WebkitAppearance:'none',MozAppearance:'textfield'}}/>
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
                // Trofeo SVG
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M8 21h8M12 17v4M5 3H3v3c0 2.21 1.79 4 4 4M19 3h2v3c0 2.21-1.79 4-4 4"
                    stroke={isActive?'#F6C90E':'#E2B840'} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 17c-3.87 0-7-3.13-7-7V3h14v7c0 3.87-3.13 7-7 7z"
                    fill={isActive?'rgba(246,201,14,.25)':'rgba(226,184,64,.12)'}
                    stroke={isActive?'#F6C90E':'#E2B840'} strokeWidth="2"/>
                  <circle cx="12" cy="8" r="2" fill={isActive?'#F6C90E':'#E2B840'}/>
                </svg>
              ):(
                // Corona SVG
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
                    fontSize: isPremium?9:9,
                    fontWeight: isPremium?800:600,
                    color: isPremium?(isActive?'#F6C90E':'#C9A840'):(isActive?'var(--gold)':'var(--muted)'),
                    letterSpacing: isPremium?.5:0,
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
