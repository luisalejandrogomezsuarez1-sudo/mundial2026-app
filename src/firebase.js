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

// ── USUARIOS EN FIRESTORE ───────────────────────────────────────
export async function saveUserToFirestore(user) {
  if(!user?.id) return;
  try {
    await setDoc(doc(db,'users', user.id), {
      name:      user.name      || '',
      email:     user.email     || '',
      paquetes:  user.paquetes  || 0,
      gifted:    user.gifted    || false,
      isAdmin:   user.isAdmin   || false,
      sessionId: user.sessionId || '',   // ← tracks active device
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

// ── CHAT EN TIEMPO REAL ─────────────────────────────────────────
export async function sendChatMessage(groupId, userId, userName, text) {
  try {
    await addDoc(collection(db,'groups', groupId, 'messages'), {
      userId, userName, text,
      timestamp: serverTimestamp(),
    });
  } catch(e) { console.warn('sendMsg error:', e); }
}

export function subscribeToChatMessages(groupId, callback) {
  const q = query(
    collection(db,'groups', groupId, 'messages'),
    orderBy('timestamp','asc'),
    limit(200)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({
      id: d.id, ...d.data(),
      ts: d.data().timestamp?.toMillis() || Date.now()
    })));
  }, err => console.warn('chat snapshot error:', err));
}

// ── GRUPOS EN FIRESTORE ─────────────────────────────────────────
export async function saveGroupToFirestore(group, userId) {
  try {
    await setDoc(doc(db,'groups', group.id), {
      ...group,
      ownerId:   userId,
      createdAt: new Date().toISOString(),
    });
  } catch(e) { console.warn('saveGroup error:', e); }
}

export async function getGroupByCode(code) {
  try {
    const q = query(collection(db,'groups'), where('code','==',code));
    const snap = await getDocs(q);
    if(snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  } catch(e) { console.warn('getGroup error:', e); return null; }
}

export default app;

// Make Firestore available globally for App.jsx dynamic access
if(typeof window !== 'undefined'){
  window._fbDB = db;
  window._fbFirestore = { doc, onSnapshot, getDoc, getDocs, getFirestore: ()=>db };
}
