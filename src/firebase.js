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

// ── USUARIOS ────────────────────────────────────────────────────

// Busca usuario por email (normalizado) — retorna el doc con más datos o null
export async function findUserByEmail(email) {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const q = query(collection(db,'users'), where('email','==', normalizedEmail));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    // Preferir doc con pago o regalo; si no, el primero
    const best = snap.docs.find(d => (d.data().paquetes > 0) || d.data().gifted)
                 || snap.docs[0];
    return { id: best.id, ...best.data() };
  } catch(e) { console.warn('findUserByEmail error:', e); return null; }
}

export async function saveUserToFirestore(user) {
  if(!user?.id || !user?.email) return;
  const normalizedEmail = user.email.toLowerCase().trim();
  try {
    let targetId = user.id;

    // SIEMPRE buscar primero por email para evitar duplicados
    const existingByEmail = await findUserByEmail(normalizedEmail);
    if (existingByEmail) {
      // Ya existe un doc con este email — reutilizarlo
      targetId = existingByEmail.id;
    } else {
      // No existe por email — verificar si user.id ya tiene doc (mismo dispositivo)
      const directSnap = await getDoc(doc(db, 'users', user.id));
      if (directSnap.exists()) {
        targetId = user.id;
      }
      // Si tampoco existe por ID: usuario nuevo, usar user.id
    }

    // No incluir 'gifted' — solo giftCoinsInFirestore debe escribirlo.
    await setDoc(doc(db,'users', targetId), {
      name:      user.name      || '',
      email:     normalizedEmail,
      paquetes:  user.paquetes  || 0,
      isAdmin:   user.isAdmin   || false,
      sessionId: user.sessionId || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return targetId;
  } catch(e) { console.warn('saveUser error:', e); return null; }
}

export async function getAllUsersFromFirestore() {
  try {
    const snap = await getDocs(collection(db,'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.warn('getUsers error:', e); return []; }
}

// Lee UN solo documento de usuario — 1 lectura en vez de N (usa para session check)
export async function getUserFromFirestore(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    return null;
  } catch(e) { console.warn('getUser error:', e); return null; }
}

export async function giftCoinsInFirestore(userId, gifted, giftedCoins=1000) {
  if(!userId) return null;
  try {
    await setDoc(doc(db,'users', userId), {
      gifted,
      giftedAt:    gifted ? new Date().toISOString() : null,
      giftedCoins: gifted ? giftedCoins : null,
    }, { merge: true });
    return userId;
  } catch(e) { console.warn('giftCoins error:', e); return null; }
}

// Regalo de monedas buscando por EMAIL (más seguro que por ID)
export async function giftCoinsByEmail(email, gifted, giftedCoins=1000) {
  if(!email) return null;
  try {
    const existing = await findUserByEmail(email);
    if (!existing) {
      console.warn('giftCoinsByEmail: usuario no encontrado:', email);
      return null;
    }
    await setDoc(doc(db,'users', existing.id), {
      gifted,
      giftedAt:    gifted ? new Date().toISOString() : null,
      giftedCoins: gifted ? giftedCoins : null,
    }, { merge: true });
    return existing.id;
  } catch(e) { console.warn('giftCoinsByEmail error:', e); return null; }
}

// ── GRUPOS — usa el CÓDIGO como ID del documento ─────────────────
// Estructura: groups/{CODE}            → datos del grupo
//             groups/{CODE}/messages   → chat del grupo
//
// Usar el CÓDIGO como ID permite lookup directo sin índice:
//   getDoc(doc(db,'groups','WC26-ABCDE')) ← siempre funciona

export async function saveGroupToFirestore(group, userId) {
  // Sanitize: Firestore rejects undefined values
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
  // Direct document read — no query, no index, always works
  const snap = await getDoc(doc(db, 'groups', code));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.data().id || snap.id };
}

// ── CHAT EN TIEMPO REAL ─────────────────────────────────────────
// groupCode = the group's WC26-XXXXX code (same as Firestore document ID)

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

// ── Suscripción al documento de un usuario (expulsión en tiempo real) ──────
export function subscribeToUserDoc(userId, callback) {
  return onSnapshot(
    doc(db, 'users', userId),
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    err => console.warn('userDoc snapshot error:', err)
  );
}

// ── Suscripción a documentos en vivo (colección 'live') ─────────────────────
// El servidor escribe aquí: live/matches, live/standings, live/scorers, live/fixtures
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
    // Marcar como eliminado en vez de borrar el documento.
    // El flag forceDelete hace que checkAdminFlags expulse al usuario al abrir la app.
    await setDoc(doc(db,'users', userId), {
      forceDelete: true,
      deleted:     true,
      deletedAt:   new Date().toISOString(),
    }, { merge: true });
  } catch(e) { console.warn('deleteUser error:', e); }
}

export default app;
