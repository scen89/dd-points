const AUTH_KEY = 'dengdeng_auth_v1';
const ITERATIONS = 100000;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch (e) {
    return null;
  }
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function randomHex(bytes) {
  const b = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(b);
  return toHex(b);
}

async function hashSecret(secret, saltHex, iterations) {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations },
    key,
    256
  );
  return toHex(new Uint8Array(bits));
}

function loadAuth(storage) {
  const s = storage || safeStorage();
  if (!s) return null;
  try {
    const raw = s.getItem(AUTH_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw);
    if (!a || typeof a !== 'object' || typeof a.salt !== 'string' || typeof a.pinHash !== 'string') return null;
    return a;
  } catch (e) {
    return null;
  }
}

function saveAuth(auth, storage) {
  const s = storage || safeStorage();
  if (!s) return false;
  try {
    s.setItem(AUTH_KEY, JSON.stringify(auth));
    return true;
  } catch (e) {
    return false;
  }
}

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function validPin(pin) {
  return /^\d{4,6}$/.test(String(pin || ''));
}

export function generateRecoveryCode() {
  const b = new Uint8Array(8);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b).map(x => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('');
}

export function formatRecoveryCode(code) {
  const c = normalizeCode(code);
  return c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : String(code || '');
}

export function hasPin(storage) {
  const a = loadAuth(storage);
  return !!(a && a.pinHash);
}

export function isRemembered(storage) {
  const a = loadAuth(storage);
  return !!(a && a.pinHash && a.remember === true);
}

export function isCodeAcked(storage) {
  const a = loadAuth(storage);
  return !!(a && a.pinHash && a.codeAck === true);
}

export function remember(storage) {
  const a = loadAuth(storage);
  if (!a) return { ok: false, error: '尚未设置密码' };
  a.remember = true;
  return { ok: saveAuth(a, storage) };
}

export function forget(storage) {
  const a = loadAuth(storage);
  if (!a) return { ok: false };
  a.remember = false;
  return { ok: saveAuth(a, storage) };
}

export function acknowledgeCode(storage) {
  const a = loadAuth(storage);
  if (!a) return { ok: false };
  a.codeAck = true;
  return { ok: saveAuth(a, storage) };
}

export async function regenerateRecoveryCode(storage) {
  const a = loadAuth(storage);
  if (!a) return { ok: false, error: '尚未设置密码' };
  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashSecret(recoveryCode, a.salt, a.iterations || ITERATIONS);
  a.recoveryHash = recoveryHash;
  a.codeAck = false;
  if (!saveAuth(a, storage)) return { ok: false, error: '本机保存失败' };
  return { ok: true, recoveryCode };
}

export function clearAuth(storage) {
  const s = storage || safeStorage();
  if (!s) return { ok: false };
  try {
    s.removeItem(AUTH_KEY);
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

export async function setPin(pin, storage) {
  if (!validPin(pin)) return { ok: false, error: '密码需为 4-6 位数字' };
  const salt = randomHex(16);
  const pinHash = await hashSecret(String(pin), salt, ITERATIONS);
  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashSecret(recoveryCode, salt, ITERATIONS);
  const auth = { v: 1, salt, iterations: ITERATIONS, pinHash, recoveryHash, remember: false, codeAck: false, createdAt: Date.now() };
  if (!saveAuth(auth, storage)) return { ok: false, error: '本机保存失败，空间可能已满' };
  return { ok: true, recoveryCode };
}

export async function verifyPin(pin, storage) {
  const a = loadAuth(storage);
  if (!a) return false;
  const h = await hashSecret(String(pin || ''), a.salt, a.iterations || ITERATIONS);
  return h === a.pinHash;
}

async function replacePin(newPin, storage, keepRemember) {
  const res = await setPin(newPin, storage);
  if (!res.ok) return res;
  if (keepRemember) {
    const next = loadAuth(storage);
    if (next) {
      next.remember = true;
      saveAuth(next, storage);
    }
  }
  return res;
}

export async function changePin(currentPin, newPin, storage) {
  const a = loadAuth(storage);
  if (!a) return { ok: false, error: '尚未设置密码' };
  const okPin = await verifyPin(currentPin, storage);
  if (!okPin) return { ok: false, error: '当前密码不正确' };
  return replacePin(newPin, storage, a.remember === true);
}

export async function resetWithRecovery(code, newPin, storage) {
  const a = loadAuth(storage);
  if (!a) return { ok: false, error: '尚未设置密码' };
  if (!validPin(newPin)) return { ok: false, error: '密码需为 4-6 位数字' };
  const normalized = normalizeCode(code);
  if (normalized.length !== 8) return { ok: false, error: '恢复码不正确' };
  const h = await hashSecret(normalized, a.salt, a.iterations || ITERATIONS);
  if (h !== a.recoveryHash) return { ok: false, error: '恢复码不正确' };
  return replacePin(newPin, storage, a.remember === true);
}
