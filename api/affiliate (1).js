const admin = require('firebase-admin');
const { verifyFirebaseUser, decryptMerchantTokens } = require('../lib/mercadopago');

const PROJECT_ID = 'chatshop-97ea3';
const COLLECTION = 'chatshops';

function parseServiceAccount(raw) {
  let text = String(raw || '').trim();
  if (!text) throw new Error('service_account_missing');
  let parsed;
  try {
    parsed = JSON.parse(text);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  } catch (_) {
    const start = text.indexOf('{');
    if (start < 0) throw new Error('service_account_invalid');
    let depth = 0, str = false, esc = false, end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && str) { esc = true; continue; }
      if (ch === '"') { str = !str; continue; }
      if (str) continue;
      if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) { end = i; break; }
    }
    parsed = JSON.parse(text.slice(start, end + 1));
  }
  if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
  return parsed;
}

function initAdmin() {
  if (admin.apps.length) return admin.app();
  const sa = parseServiceAccount(process.env.CHATSHOP_FIREBASE_SERVICE_ACCOUNT);
  return admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT_ID });
}

function db() {
  return initAdmin().firestore();
}

function clean(v, max = 120) {
  return String(v || '').trim().slice(0, max);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function searchPayments(vault) {
  const r = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=100', {
    headers: { authorization: 'Bearer ' + vault.accessToken, accept: 'application/json' },
  });
  if (!r.ok) return [];
  const j = await r.json().catch(() => ({}));
  return Array.isArray(j.results) ? j.results : [];
}

// ---- POST ?action=checkout ----
async function handleCheckout(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const base = host ? proto + '://' + host : 'https://www.alibr.com.br';
  const r = await fetch(base + '/api/mercadopago/checkout.js', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-host': host },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) return res.status(r.status || 400).json(j);
  const code = clean(body.affiliateRef), slug = clean(body.slug, 80);
  if (code && slug && j.orderNumber) {
    try {
      await db().collection('chatshops').doc(slug).collection('affiliateAttributions').doc(String(j.orderNumber)).set({
        affiliateCode: code,
        orderNumber: String(j.orderNumber),
        customerPhone: clean(body.customerPhone, 30),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('affiliate attribution save', e.message);
    }
  }
  return res.status(200).json(j);
}

// ---- POST ?action=track ----
async function handleTrack(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const slug = clean(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const code = clean(body.affiliateCode, 120);
  if (!slug || !code) return res.status(400).json({ ok: false, error: 'missing_data' });
  const storeRef = db().collection(COLLECTION).doc(slug);
  const snap = await storeRef.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: 'store_not_found' });
  const store = snap.data() || {};
  const entry = store.affiliateDirectory?.[code];
  if (!entry || entry.affiliateStatus === 'inactive') return res.status(404).json({ ok: false, error: 'affiliate_not_found' });
  const now = admin.firestore.Timestamp.now();
  await storeRef.collection('affiliateClicks').add({
    affiliateCode: code,
    affiliateEmail: String(entry.affiliateEmail || '').toLowerCase(),
    affiliateName: String(entry.affiliateName || ''),
    productSlug: clean(body.productSlug, 120),
    productName: clean(body.productName, 180),
    visitorId: clean(body.visitorId, 180),
    source: clean(body.source, 80) || 'storefront',
    createdAt: now,
  });
  return res.status(200).json({ ok: true });
}

// ---- GET (métricas do afiliado logado) ----
async function handleMetrics(req, res) {
  const user = await verifyFirebaseUser(req);
  const database = db();
  const storesSnap = await database.collection('chatshops').get();
  const mine = [];
  for (const doc of storesSnap.docs) {
    const store = doc.data() || {}, directory = store.affiliateDirectory || {};
    for (const [code, entry] of Object.entries(directory)) {
      if (String(entry?.affiliateEmail || '').toLowerCase() === String(user.email || '').toLowerCase() && entry?.affiliateStatus !== 'inactive') {
        mine.push({ slug: doc.id, code, name: String(entry.affiliateName || 'Afiliado'), brand: String(store.brand || doc.id), commissionPercent: num(store.affiliateProgram?.commissionPercent), storeType: String(store.storeType || 'affiliate'), entry });
      }
    }
  }
  const result = [];
  for (const item of mine) {
    const storeRef = database.collection('chatshops').doc(item.slug);
    const clicksSnap = await storeRef.collection('affiliateClicks').where('affiliateCode', '==', item.code).get();
    let total = 0, approvedSales = 0;
    if (item.storeType === 'virtual' && item.entry && item.entry.affiliateCode && item.entry.affiliateStatus !== 'inactive') {
      const store = (await storeRef.get()).data() || {};
      if (store.mercadoPagoConnection?.connected === true && store.mercadoPagoVault) {
        try {
          const vault = decryptMerchantTokens(store.mercadoPagoVault), payments = await searchPayments(vault);
          const attrs = await storeRef.collection('affiliateAttributions').where('affiliateCode', '==', item.code).get();
          const attributed = new Set(attrs.docs.map(d => String(d.data()?.orderNumber || d.id)));
          for (const p of payments) {
            const external = String(p?.external_reference || '');
            const orderNumber = external.split(':').pop() || '';
            if (!attributed.has(orderNumber)) continue;
            const status = String(p?.status || '').toLowerCase();
            if (status === 'approved') { approvedSales++; total += num(p.transaction_amount || 0); }
          }
        } catch (e) {
          console.warn('affiliate-metrics payments', item.slug, e.message);
        }
      }
    }
    result.push({
      slug: item.slug, brand: item.brand, code: item.code,
      clicks: clicksSnap.size, sales: approvedSales, totalSalesValue: Number(total.toFixed(2)),
      commissionPercent: item.commissionPercent,
      estimatedCommission: Number((total * item.commissionPercent / 100).toFixed(2)),
    });
  }
  const summary = result.reduce((a, x) => ({ clicks: a.clicks + x.clicks, sales: a.sales + x.sales, total: a.total + x.totalSalesValue, commission: a.commission + x.estimatedCommission }), { clicks: 0, sales: 0, total: 0, commission: 0 });
  summary.conversion = summary.clicks ? Number((summary.sales / summary.clicks * 100).toFixed(2)) : 0;
  return res.status(200).json({ ok: true, affiliate: user.email, stores: result, summary });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (req.method === 'GET') {
      return await handleMetrics(req, res);
    }
    if (req.method === 'POST') {
      const action = clean(req.query?.action, 30);
      if (action === 'checkout') return await handleCheckout(req, res);
      if (action === 'track') return await handleTrack(req, res);
      return res.status(400).json({ ok: false, error: 'invalid_action' });
    }
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  } catch (e) {
    console.error('affiliate', e);
    const code = e?.message || 'affiliate_failed';
    return res.status(e?.statusCode || 500).json({
      ok: false,
      error: code,
      message: code === 'firebase_token_missing' || code === 'firebase_token_invalid'
        ? 'Entre novamente no ChatShop.'
        : 'Não foi possível processar a solicitação.',
    });
  }
};
