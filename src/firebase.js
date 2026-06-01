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
  getAuth, GoogleAuthProvider, signInWithPopup,
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
export const googleProvider = new GoogleAuthProvider();

// ── ID CANÓNICO ─────────────────────────────────────────────────
// Email normalizado → ID de documento Firestore determinista.
// Mismo email = mismo ID en cualquier dispositivo = imposible crear duplicados.
// Ej: "luis@gmail.com" → "u_luis_at_gmail_com"
function emailToDocId(email) {
  return 'u_' + email.replace('@', '_at_').replace(/[^a-z0-9]/g, '_');
}

// ── USUARIOS ────────────────────────────────────────────────────
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
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.email);

    // Deduplicar por email: cuando existen el doc viejo (u_TIMESTAMP) y el canónico
    // (u_luis_at_gmail_com) para el mismo email, el canónico siempre gana.
    // Sin esto, el doc viejo con gifted:true puede sobreescribir el canónico con gifted:false.
    const isCanonical = id => id.includes('_at_');
    const byEmail = new Map();
    docs.forEach(d => {
      const key = d.email?.toLowerCase() || d.id; // agrupar por email; sin email → por ID
      const prev = byEmail.get(key);
      if (!prev || isCanonical(d.id)) byEmail.set(key, d); // el canónico siempre reemplaza al viejo
    });
    return [...byEmail.values()];
  } catch(e) { console.warn('getUsers error:', e); return []; }
}

// Lee UN solo documento — 1 lectura, usa para session check
export async function getUserFromFirestore(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
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
    if (!qsnap.empty) {
      // Si hubiera varios docs con el mismo email, preferir el que tiene regalo/pago
      const best = qsnap.docs.find(d => d.data().gifted || d.data().paquetes > 0) || qsnap.docs[0];
      return { id: best.id, ...best.data() };
    }
    // Fallback: doc canónico (usuarios creados directamente con ID canónico)
    const snap = await getDoc(doc(db, 'users', emailToDocId(normalizedEmail)));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
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
      // Actualizar todos los docs reales con este email (cubre viejos + canónico)
      await Promise.all(snap.docs.map(d => setDoc(doc(db,'users', d.id), data, { merge: true })));
      return;
    }
    // Sin doc por email (usuario regalado antes de existir su doc): usar ID canónico
    await setDoc(doc(db,'users', emailToDocId(normalizedEmail)), data, { merge: true });
  } catch(e) { console.warn('giftCoinsByEmail error:', e); }
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
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    err => console.warn('userDoc snapshot error:', err)
  );
}

// ── Suscripción a documentos en vivo (colección 'live') ─────────
export function subscribeToLiveDoc(docId, callback) {
  return onSnapshot(
    doc(db, 'live', docId),
    snap => { if (snap.exists()) callback(snap.data()); },
    err => console.warn(`live/${docId} snapshot error:`, err)
  );
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
