// ═══════════════════════════════════════════════════════════════
// 🔥 FIREBASE CONFIG — Mundial FIFA 2026
// Proyecto: mundial2026-15686
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp,
  doc, setDoc, getDoc, getDocs, updateDoc, where, deleteDoc
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            "AIzaSyDKTMsCt1brO5EO7oN96n9nMNJ0Vr9-S80",
  authDomain:        "mundial2026-15686.firebaseapp.com",
  projectId:         "mundial2026-15686",
  storageBucket:     "mundial2026-15686.firebasestorage.app",
  messagingSenderId: "141362189480",
  appId:             "1:141362189480:web:659d913e985ea7c2005e9d"
};

const app        = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth= getAuth(app);

// ═══════════════════════════════════════════════════════════════
// 🔐 FIREBASE AUTH NATIVO
// Capa que envuelve el Auth real de Firebase. El UID que devuelve cada
// función es el ID definitivo del documento en users/{uid}.
// ═══════════════════════════════════════════════════════════════

// Crear cuenta. Devuelve el objeto user (user.uid). Lanza el error de Firebase
// (auth/email-already-in-use, auth/weak-password, etc.) para que el caller lo maneje.
export async function authRegister(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
  return cred.user;
}

// Iniciar sesión. Lanza auth/user-not-found, auth/wrong-password, etc.
export async function authLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
  return cred.user;
}

export async function authLogout() {
  try { await signOut(auth); } catch(e) { console.warn('authLogout error:', e); }
}

// Suscribirse a cambios de sesión. Firebase persiste la sesión solo en cada
// dispositivo y la restaura al recargar. Devuelve la función de desuscripción.
export function authOnChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── ID CANÓNICO ─────────────────────────────────────────────────
// Email normalizado → ID de documento Firestore determinista.
// Mismo email = mismo ID en cualquier dispositivo = imposible crear duplicados.
// Ej: "luis@gmail.com" → "u_luis_at_gmail_com"
function emailToDocId(email) {
  return 'u_' + email.replace('@', '_at_').replace(/[^a-z0-9]/g, '_');
}

// ── USUARIOS (Firebase Auth) ────────────────────────────────────
// Escribe/actualiza el doc del usuario usando el UID de Firebase Auth como ID
// del documento. Reemplaza a saveUserToFirestore para el flujo Auth nativo.
export async function saveAuthUserToFirestore(uid, user) {
  if(!uid || !user?.email) return null;
  const normalizedEmail = user.email.toLowerCase().trim();
  try {
    await setDoc(doc(db, 'users', uid), {
      name:      user.name      || '',
      email:     normalizedEmail,
      paquetes:  user.paquetes  || 0,
      isAdmin:   user.isAdmin   || false,
      ...(user.bd   ? { bd:user.bd }    : {}),
      ...(user.nat  ? { nat:user.nat }  : {}),
      ...(user.gen  ? { gen:user.gen }  : {}),
      ...(user.lang ? { lang:user.lang }: {}),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return uid;
  } catch(e) { console.warn('saveAuthUser error:', e); return null; }
}

// Migración perezosa: en el primer login con Auth, copia los datos del/los
// doc(s) viejo(s) (ID u_TIMESTAMP o canónico u_..._at_...) hallados por email al
// doc definitivo users/{uid}. NO borra los viejos: los marca migrated:true para
// trazabilidad y para que getAllUsersFromFirestore los oculte. Idempotente.
export async function migrateUserDataToUid(uid, email) {
  if(!uid || !email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  try {
    // Si el doc nuevo ya fue migrado antes, no repetir
    const newSnap = await getDoc(doc(db, 'users', uid));
    if (newSnap.exists() && newSnap.data().migratedFrom) return { ...newSnap.data(), id: uid };

    // Buscar docs viejos con este email (excluye el propio uid)
    const snap = await getDocs(query(collection(db,'users'), where('email','==', normalizedEmail)));
    const olds = snap.docs.filter(d => d.id !== uid).map(d => ({ ...d.data(), id:d.id }));
    if (!olds.length) return newSnap.exists() ? { ...newSnap.data(), id: uid } : null;

    // Mejor doc viejo: el que tenga regalo o paquetes
    const best = olds.find(d => d.gifted || d.paquetes > 0) || olds[0];
    // Excluir 'id' para NO escribir el id legacy dentro del doc users/{uid} (contaminaba)
    const { forceDelete:_1, deleted:_2, deletedAt:_3, sessionId:_4, id:_5, ...safe } = best;

    await setDoc(doc(db,'users', uid), {
      ...safe,
      email:        normalizedEmail,
      paquetes:     Math.max(0, ...olds.map(o=>o.paquetes||0)),
      gifted:       olds.some(o=>o.gifted) || false,
      giftedCoins:  best.giftedCoins || null,
      migratedFrom: best.id,
      migratedAt:   new Date().toISOString(),
    }, { merge: true });

    // Marcar los viejos como migrados (sin borrar)
    await Promise.all(olds.map(o =>
      setDoc(doc(db,'users', o.id), { migratedTo: uid, migrated: true }, { merge: true })
    ));

    const merged = await getDoc(doc(db,'users', uid));
    return { ...merged.data(), id: uid };
  } catch(e) { console.warn('migrateUserData error:', e); return null; }
}

// ── USUARIOS (legado localStorage/canónico — aún en uso hasta Fase 2/3) ──
export async function saveUserToFirestore(user) {
  if(!user?.id || !user?.email) return null;
  const normalizedEmail = user.email.toLowerCase().trim();
  const canonId = emailToDocId(normalizedEmail);

  try {
    // Ruta rápida: doc canónico ya existe (login normal desde cualquier dispositivo)
    const canonSnap = await getDoc(doc(db, 'users', canonId));
    if (canonSnap.exists()) {
      await setDoc(doc(db, 'users', canonId), {
        name:      user.name      || '',
        email:     normalizedEmail,
        paquetes:  user.paquetes  || 0,
        isAdmin:   user.isAdmin   || false,
        sessionId: user.sessionId || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return canonId;
    }

    // Primera vez: buscar doc anterior para migrar datos de pago/regalo
    let oldData = null;
    if (user.id !== canonId) {
      const oldSnap = await getDoc(doc(db, 'users', user.id));
      if (oldSnap.exists()) oldData = oldSnap.data();
    }
    // Fallback por email (cubre docs creados por giftCoins sin campo email)
    if (!oldData) {
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
      if (!snap.empty) {
        const best = snap.docs.find(d => d.data().paquetes > 0 || d.data().gifted) || snap.docs[0];
        oldData = best.data();
      }
    }

    // Excluir flags de eliminación — permite re-registro limpio
    const { forceDelete: _1, deleted: _2, deletedAt: _3, ...safeOld } = (oldData || {});

    // Crear doc canónico preservando paquetes y regalo del doc anterior
    await setDoc(doc(db, 'users', canonId), {
      ...safeOld,
      name:      user.name      || safeOld.name      || '',
      email:     normalizedEmail,
      paquetes:  Math.max(user.paquetes || 0, safeOld.paquetes || 0),
      isAdmin:   user.isAdmin   || safeOld.isAdmin   || false,
      sessionId: user.sessionId || '',
      updatedAt: new Date().toISOString(),
    });

    return canonId;
  } catch(e) { console.warn('saveUser error:', e); return null; }
}

export async function getAllUsersFromFirestore() {
  try {
    const snap = await getDocs(collection(db,'users'));
    // Descartar docs artefacto SIN email (fantasmas de regalos viejos): no son
    // usuarios reales y aparecían como filas "Quitar" sin nombre en el panel.
    // Ocultar también los docs viejos ya migrados a un uid de Auth (migrated:true):
    // sus datos viven ahora en users/{uid}, mostrarlos duplicaría al usuario.
    const docs = snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(d => d.email && !d.migrated); // id del doc gana

    // Deduplicar por email: cuando existen el doc viejo (u_TIMESTAMP) y el canónico
    // (u_luis_at_gmail_com) para el mismo email, el canónico siempre gana.
    // Sin esto, el doc viejo con gifted:true puede sobreescribir el canónico con gifted:false.
    // Desempate por email: gana el doc con MÁS datos reales (pago/regalo/paquetes),
    // no ciegamente el canónico. Los pagos reales se acreditan en users/{uid} de Auth
    // (id sin '_at_'), así que priorizar el canónico hacía que el panel leyera un doc
    // viejo sin totalPagado → ingresos en $0. Puntaje: pago > regalo > paquetes > recencia.
    const score = d => (d.totalPagado||0)*1e6 + (d.gifted?5e5:0) + (d.paquetes||0)*1e3
                       + (d.updatedAt ? Date.parse(d.updatedAt)/1e9 : 0);
    const byEmail = new Map();
    docs.forEach(d => {
      const key = d.email?.toLowerCase() || d.id; // agrupar por email; sin email → por ID
      const prev = byEmail.get(key);
      if (!prev || score(d) > score(prev)) byEmail.set(key, d); // gana el de más datos reales
    });
    return [...byEmail.values()];
  } catch(e) { console.warn('getUsers error:', e); return []; }
}

// Lee UN solo documento — 1 lectura, usa para session check
export async function getUserFromFirestore(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) return { ...snap.data(), id: snap.id }; // id del doc gana sobre campo id legacy
    return null;
  } catch(e) { console.warn('getUser error:', e); return null; }
}

// Busca el doc REAL por email. Antes resolvía el ID canónico primero, lo que
// devolvía documentos fantasma (sin email, creados por la versión vieja de
// giftCoinsByEmail) en vez del doc real. Como el regalo se escribe en el doc
// hallado por email, leer por email primero asegura que el listener del receptor
// y el login apunten al MISMO doc donde se escribe el regalo → las monedas llegan.
export async function findUserByEmail(email) {
  if(!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const qsnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
    // Ignorar docs ya migrados a un uid de Auth: sus datos viven en users/{uid}.
    const live = qsnap.docs.filter(d => !d.data().migrated);
    if (live.length) {
      // Si hubiera varios docs con el mismo email, preferir el que tiene regalo/pago
      const best = live.find(d => d.data().gifted || d.data().paquetes > 0) || live[0];
      return { ...best.data(), id: best.id }; // id del doc gana sobre campo id legacy
    }
    // Fallback: doc canónico (usuarios creados directamente con ID canónico)
    const snap = await getDoc(doc(db, 'users', emailToDocId(normalizedEmail)));
    if (snap.exists()) return { ...snap.data(), id: snap.id };
    return null;
  } catch(e) { console.warn('findUserByEmail error:', e); return null; }
}

export async function giftCoinsInFirestore(userId, gifted, giftedCoins=1000) {
  if(!userId) return;
  try {
    await setDoc(doc(db,'users', userId), {
      gifted,
      giftedAt:    gifted ? new Date().toISOString() : null,
      giftedCoins: gifted ? giftedCoins : null,
    }, { merge: true });
  } catch(e) { console.warn('giftCoins error:', e); }
}

// Regalar/revocar monedas por email — busca el/los documento(s) REAL(es) por email
// y escribe en todos. Los docs con ID viejo (u_TIMESTAMP) no coinciden con el ID
// canónico, así que escribir solo al canónico creaba un doc fantasma y nunca
// actualizaba el real (revocar no surtía efecto).
export async function giftCoinsByEmail(email, gifted, giftedCoins=1000) {
  if(!email) return;
  const normalizedEmail = email.toLowerCase().trim();
  const data = {
    gifted,
    giftedAt:    gifted ? new Date().toISOString() : null,
    giftedCoins: gifted ? giftedCoins : null,
  };
  try {
    const snap = await getDocs(query(collection(db,'users'), where('email','==', normalizedEmail)));
    if (!snap.empty) {
      // Escribir en TODOS los docs con este email (incluidos migrated:true) Y, si un
      // doc viejo apunta a un doc de Auth (migratedTo), también en users/{migratedTo}:
      // ahí es donde el receptor migrado realmente escucha (gift-listener).
      const targets = new Set();
      snap.docs.forEach(d => {
        targets.add(d.id);                         // el doc hallado por email
        const mt = d.data().migratedTo;
        if (mt) targets.add(mt);                    // su doc de Auth real
      });
      await Promise.all([...targets].map(id => setDoc(doc(db,'users', id), data, { merge: true })));
      return;
    }
    // Sin doc por email (usuario regalado antes de existir su doc): usar ID canónico
    await setDoc(doc(db,'users', emailToDocId(normalizedEmail)), data, { merge: true });
  } catch(e) { console.warn('giftCoinsByEmail error:', e); }
}

// ── PRONÓSTICOS POR USUARIO ──────────────────────────────────────
// Guarda los bets del usuario en su propio doc users/{uid}.bets, para que el
// motor de puntos (Paso 2) los calcule aunque el usuario NO esté en ningún grupo.
// Se llama al pulsar GUARDAR. merge:true → no pisa otros campos del doc.
export async function saveUserBetsToFirestore(userId, bets, meta={}) {
  if(!userId) return { ok:false };
  try {
    const clean = (Array.isArray(bets)?bets:[]).map(b=>({
      id: b.id,
      category: b.category||b.cat||'',
      selection: b.selection||b.sel||'',
      odds: Number(b.odds)||0,
      ts: b.ts||Date.now(),
    }));
    await setDoc(doc(db,'users', userId), {
      bets: clean,
      betsSaved: true,
      betsLockedAt: new Date().toISOString(),
      betsCount: clean.length,
      ...meta,
    }, { merge: true });
    return { ok:true, count: clean.length };
  } catch(e) { console.warn('saveUserBets error:', e); return { ok:false, error:e.message }; }
}

// ── Quiniela de Eliminatorias ────────────────────────────────────────────────
export async function saveElimBetsToFirestore(userId, elimBets) {
  if(!userId) return { ok:false };
  try {
    await setDoc(doc(db,'users', userId), {
      elimBets,
      elimBetsSavedAt: new Date().toISOString(),
    }, { merge: true });
    return { ok:true };
  } catch(e) { console.warn('saveElimBets error:', e); return { ok:false, error:e.message }; }
}

export async function getElimBetsFromFirestore(userId) {
  if(!userId) return null;
  try {
    const snap = await getDoc(doc(db,'users', userId));
    return snap.exists() ? (snap.data().elimBets || null) : null;
  } catch(e) { console.warn('getElimBets error:', e); return null; }
}

// ── Actualizar coinsSpent del usuario (devolución de bloque al editar) ──
export async function updateCoinsSpent(userId, coinsSpent) {
  if(!userId) return { ok:false };
  try {
    await setDoc(doc(db,'users', userId), {
      coinsSpent: Math.max(0, Number(coinsSpent)||0),
    }, { merge: true });
    return { ok:true };
  } catch(e) { console.warn('updateCoinsSpent error:', e); return { ok:false, error:e.message }; }
}

// ── GRUPOS — usa el CÓDIGO como ID del documento ─────────────────
export async function saveGroupToFirestore(group, userId) {
  const data = {
    id:        group.id        || 'g_unknown',
    name:      group.name      || 'Grupo',
    desc:      group.desc      || '',
    code:      group.code,
    created:   group.created   || Date.now(),
    members:   (group.members  || []).map(m=>({
      id:     m.id     || 'anon',
      name:   m.name   || 'Usuario',
      ini:    m.ini    || 'U',
      joined: m.joined || Date.now(),
    })),
    ownerId:   userId          || '',
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'groups', group.code), data);
  } catch(e) {
    console.error('saveGroup Firestore error:', e);
    throw new Error('No se pudo guardar el grupo en Firestore: ' + e.message);
  }
}

export async function getGroupByCode(code) {
  const snap = await getDoc(doc(db, 'groups', code));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.data().id || snap.id };
}

// ── CHAT EN TIEMPO REAL ─────────────────────────────────────────
export async function sendChatMessage(groupCode, userId, userName, text) {
  try {
    await addDoc(collection(db, 'groups', groupCode, 'messages'), {
      userId,
      userName,
      text,
      ini:       (userName || '?')[0].toUpperCase(),
      timestamp: serverTimestamp(),
      ts:        Date.now(),
    });
  } catch(e) { console.warn('sendMsg error:', e); }
}

export function subscribeToChatMessages(groupCode, callback) {
  const q = query(
    collection(db, 'groups', groupCode, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(50)
  );
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => {
      const data = d.data();
      return {
        id:   d.id,
        uid:  data.userId   || 'anon',
        name: data.userName || 'Usuario',
        ini:  data.ini      || (data.userName || '?')[0].toUpperCase(),
        col:  'var(--acc)',
        text: data.text     || '',
        ts:   data.timestamp?.toMillis() || data.ts || Date.now(),
      };
    });
    callback(msgs);
  }, err => console.warn('chat snapshot error:', err));
}

// ── Suscripción al documento de un usuario ──────────────────────
export function subscribeToUserDoc(userId, callback) {
  return onSnapshot(
    doc(db, 'users', userId),
    snap => callback(snap.exists() ? { ...snap.data(), id: snap.id } : null), // id del doc gana
    err => console.warn('userDoc snapshot error:', err)
  );
}

// ── Suscripción a documentos en vivo (colección 'live') ─────────
// Antes abría un onSnapshot a Firestore por cada usuario, multiplicando las
// lecturas. Ahora hace polling al endpoint /api/live/:docId del servidor, que
// mantiene los datos en memoria y es el ÚNICO que lee Firestore.
// Misma firma: (docId, callback) → función de limpieza que detiene el polling.
// El callback recibe el mismo objeto que devolvía snap.data() ({...data, updatedAt}).
export function subscribeToLiveDoc(docId, callback) {
  let stopped = false;
  const fetchOnce = async () => {
    try {
      const res = await fetch(`/api/live/${docId}`);
      if (!res.ok) return;                       // error transitorio: reintenta el próximo ciclo
      const data = await res.json();
      // Solo invocar al callback si hay datos (equivale al snap.exists() de onSnapshot)
      if (!stopped && data && Object.keys(data).length) callback(data);
    } catch (e) {
      console.warn(`live/${docId} poll error:`, e); // no romper; reintenta en el siguiente ciclo
    }
  };
  fetchOnce();                                    // inmediato al suscribirse
  const id = setInterval(fetchOnce, 60000);       // luego cada 60s
  return () => { stopped = true; clearInterval(id); };
}

export async function deleteUserFromFirestore(userId) {
  if(!userId) return;
  try {
    await setDoc(doc(db,'users', userId), {
      forceDelete: true,
      deleted:     true,
      deletedAt:   new Date().toISOString(),
    }, { merge: true });
  } catch(e) { console.warn('deleteUser error:', e); }
}

export default app;
