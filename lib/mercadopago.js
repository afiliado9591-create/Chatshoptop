const crypto = require('crypto');

const PROJECT_ID = 'chatshop-97ea3';
const FIREBASE_API_KEY = 'AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const BASE_DOMAIN = 'alibr.com.br';
const DEFAULT_REDIRECT_URI = 'https://www.alibr.com.br/api/mercadopago/callback';

function env() {
  return {
    clientId: String(process.env.MP_CLIENT_ID || process.env.MERCADOPAGO_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.MP_CLIENT_SECRET || process.env.MERCADOPAGO_CLIENT_SECRET || '').trim(),
    redirectUri: String(process.env.MP_REDIRECT_URI || DEFAULT_REDIRECT_URI).trim(),
    stateSecret: String(process.env.MP_OAUTH_STATE_SECRET || process.env.MP_CLIENT_SECRET || process.env.MERCADOPAGO_CLIENT_SECRET || '').trim(),
    tokenSecret: String(process.env.MP_TOKEN_ENCRYPTION_KEY || process.env.MP_CLIENT_SECRET || process.env.MERCADOPAGO_CLIENT_SECRET || '').trim(),
  };
}

function platformReady() {
  const e = env();
  return !!(e.clientId && e.clientSecret && e.redirectUri && e.stateSecret && e.tokenSecret);
}

function b64url(value) {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64url(value) {
  const s = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(s + '='.repeat((4 - (s.length % 4)) % 4), 'base64');
}
function deriveKey(secret, purpose) {
  return crypto.createHmac('sha256', String(secret)).update('chatshop:' + purpose + ':v1').digest();
}
function sealObject(obj, purpose, secret) {
  if (!secret) throw new Error('secret_missing');
  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret, purpose);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(obj), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', b64url(iv), b64url(tag), b64url(encrypted)].join('.');
}
function openObject(token, purpose, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('invalid_sealed_value');
  const iv = fromB64url(parts[1]);
  const tag = fromB64url(parts[2]);
  const encrypted = fromB64url(parts[3]);
  const key = deriveKey(secret, purpose);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
}

function createState(payload) {
  const e = env();
  return sealObject(payload, 'oauth-state', e.stateSecret);
}
function readState(state) {
  const e = env();
  return openObject(state, 'oauth-state', e.stateSecret);
}
function encryptMerchantTokens(payload) {
  const e = env();
  return sealObject(payload, 'merchant-tokens', e.tokenSecret);
}
function decryptMerchantTokens(vault) {
  const e = env();
  return openObject(vault, 'merchant-tokens', e.tokenSecret);
}

function pkceVerifier(nonce) {
  const e = env();
  return b64url(crypto.createHmac('sha256', deriveKey(e.stateSecret, 'pkce')).update(String(nonce)).digest());
}
function pkceChallenge(verifier) {
  return b64url(crypto.createHash('sha256').update(String(verifier)).digest());
}

function normalizeSlug(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

async function parseJsonSafe(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch (_) { return { raw: text }; }
}

async function verifyFirebaseUser(request) {
  const auth = String(request.headers.authorization || request.headers.Authorization || '');
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('firebase_token_missing'), { statusCode: 401 });
  const idToken = match[1].trim();
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  const body = await parseJsonSafe(r);
  const user = Array.isArray(body.users) ? body.users[0] : null;
  if (!r.ok || !user || !user.localId) throw Object.assign(new Error('firebase_token_invalid'), { statusCode: 401 });
  return { uid: String(user.localId), email: String(user.email || ''), idToken };
}

function firestoreValue(v) {
  if (!v || typeof v !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(v, 'stringValue')) return v.stringValue;
  if (Object.prototype.hasOwnProperty.call(v, 'booleanValue')) return !!v.booleanValue;
  if (Object.prototype.hasOwnProperty.call(v, 'integerValue')) return Number(v.integerValue);
  if (Object.prototype.hasOwnProperty.call(v, 'doubleValue')) return Number(v.doubleValue);
  if (Object.prototype.hasOwnProperty.call(v, 'timestampValue')) return v.timestampValue;
  if (Object.prototype.hasOwnProperty.call(v, 'nullValue')) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(firestoreValue);
  if (v.mapValue) {
    const out = {};
    for (const [k, x] of Object.entries(v.mapValue.fields || {})) out[k] = firestoreValue(x);
    return out;
  }
  return null;
}
function decodeFirestoreDocument(doc) {
  const out = {};
  for (const [k, v] of Object.entries((doc && doc.fields) || {})) out[k] = firestoreValue(v);
  return out;
}

async function firestoreGet(path, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}?key=${FIREBASE_API_KEY}`;
  const headers = { accept: 'application/json' };
  if (idToken) headers.authorization = `Bearer ${idToken}`;
  const r = await fetch(url, { headers });
  if (r.status === 404) return null;
  const body = await parseJsonSafe(r);
  if (!r.ok) {
    const err = new Error('firestore_read_failed');
    err.statusCode = r.status;
    err.details = body;
    throw err;
  }
  return decodeFirestoreDocument(body);
}

async function loadOwnedProfessionalStore(slug, firebaseUser) {
  const clean = normalizeSlug(slug);
  if (!clean) throw Object.assign(new Error('invalid_store'), { statusCode: 400 });
  const [userDoc, storeDoc] = await Promise.all([
    firestoreGet(`users/${encodeURIComponent(firebaseUser.uid)}`, firebaseUser.idToken),
    firestoreGet(`chatshops/${encodeURIComponent(clean)}`, firebaseUser.idToken)
  ]);
  if (!userDoc) throw Object.assign(new Error('user_not_found'), { statusCode: 404 });
  if (!storeDoc) throw Object.assign(new Error('store_not_found'), { statusCode: 404 });
  if (String(storeDoc.ownerUid || '') !== firebaseUser.uid) throw Object.assign(new Error('not_store_owner'), { statusCode: 403 });
  if (String(userDoc.plan || 'aprendiz') !== 'profissional') throw Object.assign(new Error('professional_plan_required'), { statusCode: 403 });
  return { slug: clean, userDoc, storeDoc };
}

function publicStoreUrl(store, slug) {
  const custom = String(store && store.customDomain || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  return custom ? `https://${custom}` : `https://${slug}.${BASE_DOMAIN}`;
}

module.exports = {
  PROJECT_ID,
  FIREBASE_API_KEY,
  BASE_DOMAIN,
  env,
  platformReady,
  createState,
  readState,
  encryptMerchantTokens,
  decryptMerchantTokens,
  pkceVerifier,
  pkceChallenge,
  normalizeSlug,
  verifyFirebaseUser,
  firestoreGet,
  loadOwnedProfessionalStore,
  publicStoreUrl,
  parseJsonSafe,
};
