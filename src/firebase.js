// ═══════════════════════════════════════════════════════════════
// 🔥 FIREBASE CONFIG — Mundial FIFA 2026
// ═══════════════════════════════════════════════════════════════
// INSTRUCCIONES:
// 1. Ve a console.firebase.google.com
// 2. Crea proyecto "mundial2026"
// 3. Agrega app Web → copia las credenciales aquí abajo
// 4. Habilita: Firestore, Authentication (Email + Google), Cloud Messaging
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp, doc, setDoc, getDoc
} from 'firebase/firestore';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ── REEMPLAZA CON TUS CREDENCIALES DE FIREBASE ──────────────────
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "mundial2026.firebaseapp.com",
  projectId:         "mundial2026",
  storageBucket:     "mundial2026.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};
// ────────────────────────────────────────────────────────────────

const app        = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth= getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ── CHAT EN TIEMPO REAL ─────────────────────────────────────────
// Enviar mensaje a un grupo
export async function sendChatMessage(groupId, userId, userName, text) {
  await addDoc(collection(db, 'groups', groupId, 'messages'), {
    userId, userName, text,
    timestamp: serverTimestamp(),
  });
}

// Escuchar mensajes en tiempo real (actualiza para TODOS los usuarios)
export function subscribeToChatMessages(groupId, callback) {
  const q = query(
    collection(db, 'groups', groupId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );
  // Retorna función para cancelar la suscripción
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      ts: d.data().timestamp?.toMillis() || Date.now()
    }));
    callback(msgs);
  });
}

// ── USUARIOS EN FIRESTORE ───────────────────────────────────────
export async function saveUserToFirestore(user) {
  await setDoc(doc(db, 'users', user.id), {
    name:      user.name,
    email:     user.email,
    paquetes:  user.paquetes || 0,
    gifted:    user.gifted || false,
    createdAt: user.createdAt || new Date().toISOString(),
  }, { merge: true });
}

export async function getUserFromFirestore(userId) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? snap.data() : null;
}

// ── PUSH NOTIFICATIONS (FCM) ────────────────────────────────────
let messaging = null;
try {
  messaging = getMessaging(app);
} catch(e) {
  console.warn('FCM not available:', e);
}

export async function requestPushPermission(vapidKey) {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(messaging, { vapidKey });
    console.log('FCM Token:', token);
    return token;
  } catch(e) {
    console.warn('Push permission error:', e);
    return null;
  }
}

export function onPushMessage(callback) {
  if (!messaging) return () => {};
  return onMessage(messaging, payload => callback(payload));
}

// ── AUTH HELPERS ────────────────────────────────────────────────
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function registerWithEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export function logoutFirebase() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export default app;
