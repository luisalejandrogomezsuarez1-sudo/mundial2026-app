// ═══════════════════════════════════════════════════════════════
// 🔥 FIREBASE CONFIG — Mundial FIFA 2026
// Proyecto: mundial2026-15686
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp,
  doc, setDoc, getDoc, getDocs, updateDoc, where
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
export async function saveUserToFirestore(user) {
  if(!user?.id) return;
  try {
    await setDoc(doc(db,'users', user.id), {
      name:      user.name      || '',
      email:     user.email     || '',
      paquetes:  user.paquetes  || 0,
      gifted:    user.gifted    || false,
      isAdmin:   user.isAdmin   || false,
      sessionId: user.sessionId || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch(e) { console.warn('saveUser error:', e); }
}

export async function getAllUsersFromFirestore() {
  try {
    const snap = await getDocs(collection(db,'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.warn('getUsers error:', e); return []; }
}

export async function giftCoinsInFirestore(userId, gifted) {
  try {
    await updateDoc(doc(db,'users', userId), {
      gifted, giftedAt: gifted ? new Date().toISOString() : null
    });
  } catch(e) { console.warn('giftCoins error:', e); }
}

// ── GRUPOS — usa el CÓDIGO como ID del documento ─────────────────
// Estructura: groups/{CODE}            → datos del grupo
//             groups/{CODE}/messages   → chat del grupo
//
// Usar el CÓDIGO como ID permite lookup directo sin índice:
//   getDoc(doc(db,'groups','WC26-ABCDE')) ← siempre funciona

export async function saveGroupToFirestore(group, userId) {
  // ONE single write — code is the document ID
  await setDoc(doc(db, 'groups', group.code), {
    id:        group.id,
    name:      group.name,
    desc:      group.desc      || '',
    code:      group.code,
    created:   group.created   || Date.now(),
    members:   group.members   || [],
    ownerId:   userId          || '',
    createdAt: new Date().toISOString(),
  });
  // No try/catch — let errors propagate so createGroup can show them
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
    limit(500)
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

export default app;
