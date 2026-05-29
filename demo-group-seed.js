// ══════════════════════════════════════════════════════════════════════
//  SCRIPT DE PRUEBA — Grupo con 5 miembros y quinielas
//  Instrucciones:
//    1. Abre la app en el navegador y logéate con luis.alejandro.gomezsuarez1@gmail.com
//    2. Abre DevTools → Console (F12 → pestaña Console)
//    3. Pega TODO este texto y presiona Enter
//    4. Recarga la página (F5) y ve a Grupos
//
//  Para eliminar: entra al grupo → ícono 🗑 → Eliminar grupo
// ══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  /* 1 ── Localiza el usuario en la DB local */
  const TARGET_EMAIL = 'luis.alejandro.gomezsuarez1@gmail.com';
  const allUsers = JSON.parse(localStorage.getItem('wc2026_users_db') || '[]');
  const me = allUsers.find(u => (u.email || '').toLowerCase() === TARGET_EMAIL);
  if (!me) {
    alert('❌ Usuario no encontrado.\nAsegúrate de haber iniciado sesión con ' + TARGET_EMAIL);
    return;
  }

  /* 2 ── Genera el array de apuestas de un miembro */
  const mkBets = (campeon, bota, balon, gol2, gol3, grupos, partidos) => {
    const b = [];
    b.push({ id: 'campeon',    cat: 'CAMPEÓN DEL MUNDO',  sel: campeon, odds: null });
    b.push({ id: 'bota-oro',   cat: 'BOTA DE ORO',         sel: bota,    odds: null });
    b.push({ id: 'balon-oro',  cat: 'BALÓN DE ORO',         sel: balon,   odds: null });
    b.push({ id: 'goleador-1', cat: 'TOP GOLEADOR #1',      sel: bota,    odds: null });
    b.push({ id: 'goleador-2', cat: 'TOP GOLEADOR #2',      sel: gol2,    odds: null });
    b.push({ id: 'goleador-3', cat: 'TOP GOLEADOR #3',      sel: gol3,    odds: null });
    'ABCDEFGHIJKL'.split('').forEach((l, i) =>
      b.push({ id: 'grp-' + l, cat: 'GANADOR GRUPO ' + l, sel: grupos[i], odds: null })
    );
    partidos.forEach(([mid, res, btts]) => {
      b.push({ id: mid + '-1x2',  cat: 'RESULTADO P' + mid,    sel: res,  odds: null });
      b.push({ id: mid + '-btts', cat: 'AMBOS ANOTAN P' + mid, sel: btts, odds: null });
    });
    return b;
  };

  /* 3 ── Datos de cada miembro ────────────────────────────────────── */

  // Grupos A-L: ganadores pronosticados por cada miembro
  //             A            B       C         D      E          F              G         H           I          J            K           L
  const G1 = ['México',    'Canadá', 'Brasil', 'USA', 'Alemania','Países Bajos','España',  'Uruguay',  'Francia', 'Argentina', 'Portugal', 'Inglaterra'];
  const G2 = ['Corea del Sur','Canadá','Brasil','USA','Alemania','Países Bajos','Bélgica', 'España',   'Francia', 'Argentina', 'Colombia', 'Inglaterra'];
  const G3 = ['México',    'Suiza',  'Marruecos','Australia','Ecuador','Japón', 'Bélgica', 'España',   'Francia', 'Argentina', 'Portugal', 'Croacia'];
  const G4 = ['México',    'Canadá', 'Haití',  'USA', 'Costa de Marfil','Países Bajos','Irán','Uruguay','Senegal','Austria','Portugal','Ghana'];
  const G5 = ['México',    'Qatar',  'Brasil', 'Paraguay','Alemania','Suecia', 'Egipto',  'Arabia Saudita','Noruega','Argentina','Colombia','Panamá'];

  // Partidos 1-10: [id, resultado 1X2, ambos anotan si/no]
  const P1 = [[1,'1','si'],[2,'2','no'],[3,'1','si'],[4,'1','no'],[5,'2','si'],[6,'X','no'],[7,'1','si'],[8,'2','no'],[9,'2','si'],[10,'1','no']];
  const P2 = [[1,'1','si'],[2,'X','no'],[3,'1','si'],[4,'1','si'],[5,'2','no'],[6,'1','si'],[7,'1','si'],[8,'2','no'],[9,'1','no'],[10,'1','si']];
  const P3 = [[1,'1','no'],[2,'1','si'],[3,'1','si'],[4,'X','no'],[5,'2','si'],[6,'2','si'],[7,'1','si'],[8,'2','no'],[9,'X','si'],[10,'1','si']];
  const P4 = [[1,'X','no'],[2,'2','no'],[3,'1','si'],[4,'1','si'],[5,'1','si'],[6,'X','no'],[7,'1','no'],[8,'2','si'],[9,'2','no'],[10,'1','si']];
  const P5 = [[1,'1','si'],[2,'2','si'],[3,'X','no'],[4,'1','si'],[5,'X','si'],[6,'1','no'],[7,'1','si'],[8,'X','si'],[9,'1','si'],[10,'2','no']];

  const now = Date.now();
  const day = 86400000;

  const members = [
    {
      id: 'tdemo_m1', name: 'Carlos M.',  ini: 'C', col: '#F6C90E',
      locked: true, lockedAt: now - day * 3, pts: 312,
      bets: mkBets('Brasil',    'Vinicius Jr.', 'Mbappé',       'Haaland',     'Pedri',        G1, P1)
    },
    {
      id: 'tdemo_m2', name: 'Valeria R.',  ini: 'V', col: '#FF6B6B',
      locked: true, lockedAt: now - day * 2, pts: 287,
      bets: mkBets('Argentina', 'Messi',        'Haaland',      'Lamine Yamal','Kane',          G2, P2)
    },
    {
      id: 'tdemo_m3', name: 'Miguel A.',   ini: 'M', col: '#4ECDC4',
      locked: true, lockedAt: now - day * 4, pts: 245,
      bets: mkBets('Francia',   'Mbappé',       'Lamine Yamal', 'Messi',       'Vinicius Jr.',  G3, P3)
    },
    {
      id: 'tdemo_m4', name: 'Ana G.',      ini: 'A', col: '#A855F7',
      locked: true, lockedAt: now - day * 1, pts: 198,
      bets: mkBets('España',    'Pedri',        'Kane',         'Mbappé',      'Haaland',       G4, P4)
    },
    {
      id: 'tdemo_m5', name: 'Roberto K.', ini: 'R', col: '#3B82F6',
      locked: true, lockedAt: now - day * 5, pts: 156,
      bets: mkBets('México',    'Raúl Jiménez', 'Vinicius Jr.', 'Mbappé',      'Messi',         G5, P5)
    },
  ];

  /* 4 ── Arma el grupo ─────────────────────────────────────────────── */
  const testGroup = {
    id:      'g_tdemo_' + now,
    name:    '⚽ TEST DEMO — BORRAR',
    desc:    'Grupo de prueba · 5 miembros con quinielas completas',
    code:    'WC26-DEMO9',
    created: now,
    members: members,
  };

  /* 5 ── Guarda en localStorage del usuario */
  const key = 'wc2026_groups_' + me.id;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const clean = existing.filter(g => g.code !== 'WC26-DEMO9'); // evita duplicado
  clean.push(testGroup);
  localStorage.setItem(key, JSON.stringify(clean));

  alert(
    '✅ Grupo de prueba creado.\n\n' +
    '👥 5 miembros con quinielas bloqueadas y puntos:\n' +
    '   🥇 Carlos M.   — 312 pts\n' +
    '   🥈 Valeria R.  — 287 pts\n' +
    '   🥉 Miguel A.   — 245 pts\n' +
    '      Ana G.      — 198 pts\n' +
    '      Roberto K.  — 156 pts\n' +
    '      Tú (Luis)   — 0 pts (sin bloquear)\n\n' +
    'Recarga la página (F5) y abre GRUPOS para verlo.\n' +
    'Para eliminar: entra al grupo → ícono 🗑 → Eliminar'
  );
})();
