// Autenticación simulada (solo para pruebas)
const K = '__fakeUser';
let user = (() => { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } })();
const subs = new Set();
const fire = () => subs.forEach(f => f(user));
export function getAuth() { return {}; }
export class GoogleAuthProvider { setCustomParameters() {} }
export async function signInWithPopup() { user = window.__fakeLogin || { uid: 'u1', email: 'test@gmail.com', displayName: 'Prueba' }; localStorage.setItem(K, JSON.stringify(user)); fire(); return { user }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export function onAuthStateChanged(a, f) { subs.add(f); setTimeout(() => f(user), 0); return () => subs.delete(f); }
export async function signOut() { user = null; localStorage.removeItem(K); fire(); }
