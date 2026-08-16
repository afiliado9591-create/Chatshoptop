const crypto = require('crypto');

const PROJECT_ID = 'chatshop-97ea3';
const API_KEY = 'AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const COLLECTION = 'chatshops';
const BASE_DOMAIN = 'alibr.com.br';

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(JSON.stringify(body));
}

function onlyDigits(v) { return String(v || '').replace(/\D/g, ''); }
function asNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/[^0-9,.-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function decode(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = decode(v);
  return out;
}

async function getStoreBySlug(slug) {
  if (!slug) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(slug)}?key=${API_KEY}`;
  const r = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!r.ok) return null;
  const doc = await r.json();
  return decodeFields(doc.fields || {});
}

async function getStoreByCustomDomain(host) {
  if (!host) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  const body = { structuredQuery: { from: [{ collectionId: COLLECTION }], where: { fieldFilter: {
    field: { fieldPath: 'customDomain' }, op: 'EQUAL', value: { stringValue: host }
  }}, limit: 1 }};
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  });
  if (!r.ok) return null;
  const rows = await r.json();
  const doc = Array.isArray(rows) ? rows.find(x => x.document)?.document : null;
  return doc ? decodeFields(doc.fields || {}) : null;
}

function keyFromEnv() {
  const secret = String(process.env.CHATSHOP_SUPERFRETE_SECRET || '').trim();
  if (!secret) return null;
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}
function decryptToken(payload, key) {
  const parts = String(payload || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Token protegido inválido.');
  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  const encrypted = Buffer.from(parts[3], 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function deriveSlug(host) {
  const h = String(host || '').toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  const suffix = '.' + BASE_DOMAIN;
  if (!h.endsWith(suffix)) return '';
  const slug = h.slice(0, -suffix.length);
  return slug && !slug.includes('.') && slug !== 'www' ? slug : '';
}

function cleanServices(value) {
  const allowed = new Set(['1', '2', '17', '3', '33']);
  const list = (Array.isArray(value) ? value : String(value || '').split(','))
    .map(x => String(x).trim()).filter(x => allowed.has(x));
  return [...new Set(list)].join(',') || '1,2,17,3,33';
}

function normalizeQuoteResponse(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.services) ? raw.services : [];
  const names = { '1': 'PAC', '2': 'SEDEX', '17': 'Mini Envios', '3': 'Jadlog', '31': 'Loggi', '33': 'J&T' };
  return list.map((item, index) => {
    const id = String(item?.id ?? item?.service?.id ?? item?.service ?? item?.code ?? index);
    const name = String(item?.name ?? item?.service?.name ?? item?.company?.name ?? names[id] ?? `Frete ${index + 1}`);
    const price = asNumber(item?.price ?? item?.custom_price ?? item?.discount ?? item?.value ?? item?.amount);
    const days = asNumber(item?.delivery_time ?? item?.custom_delivery_time ?? item?.delivery?.days ?? item?.deadline ?? item?.days);
    const error = item?.error ? String(item.error) : item?.message && !price ? String(item.message) : '';
    return { id, name, price, days, error, raw: item };
  }).filter(x => x.price > 0 || x.error);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método não permitido.' });

  try {
    const host = String(req.body?.host || req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
    const requestedSlug = String(req.body?.storeSlug || '').trim().toLowerCase();
    const slug = requestedSlug || deriveSlug(host);
    const store = slug ? await getStoreBySlug(slug) : await getStoreByCustomDomain(host);
    if (!store) return send(res, 404, { error: 'Loja não encontrada.' });

    const shipping = store.shipping && typeof store.shipping === 'object' ? store.shipping : {};
    const sf = shipping.superfrete && typeof shipping.superfrete === 'object' ? shipping.superfrete : {};
    if (shipping.mode !== 'superfrete') return send(res, 400, { error: 'A SuperFrete não está ativa nesta loja.' });

    const destination = onlyDigits(req.body?.toPostalCode || '');
    if (destination.length !== 8) return send(res, 400, { error: 'Digite um CEP de destino válido com 8 números.' });

    const configuredOrigins = (Array.isArray(sf.origins) ? sf.origins : [])
      .slice(0, 4)
      .map((origin, index) => ({
        id: String(origin?.id || 'origin-' + (index + 1)),
        label: String(origin?.label || 'Origem ' + (index + 1)),
        postalCode: onlyDigits(origin?.postalCode || origin?.cep || '')
      }))
      .filter(origin => origin.postalCode.length === 8);

    if (!configuredOrigins.length) {
      const legacyPostalCode = onlyDigits(sf.originPostalCode || sf.originCep || '');
      if (legacyPostalCode.length === 8) {
        configuredOrigins.push({ id: 'origin-1', label: 'Origem principal', postalCode: legacyPostalCode });
      }
    }
    if (!configuredOrigins.length) return send(res, 400, { error: 'O lojista precisa cadastrar pelo menos um CEP de origem válido.' });

    const key = keyFromEnv();
    if (!key) return send(res, 503, { error: 'A integração SuperFrete ainda precisa ser ativada no servidor.', code: 'SUPERFRETE_SECRET_NOT_CONFIGURED' });
    if (!sf.tokenCipher) return send(res, 400, { error: 'O lojista ainda não conectou o token da SuperFrete.' });
    const token = decryptToken(sf.tokenCipher, key);

    const products = Array.isArray(store.products) ? store.products : [];
    const requestedItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!requestedItems.length) return send(res, 400, { error: 'A sacola está vazia.' });

    const groups = new Map();
    for (const item of requestedItems.slice(0, 100)) {
      const index = Number(item?.index);
      const quantity = Math.max(1, Math.min(99, Math.floor(asNumber(item?.quantity) || 1)));
      const product = Number.isInteger(index) && index >= 0 ? products[index] : null;
      if (!product) continue;

      const weight = asNumber(product.weight ?? product.sfWeight);
      const height = asNumber(product.height ?? product.sfHeight);
      const width = asNumber(product.width ?? product.sfWidth);
      const length = asNumber(product.length ?? product.sfLength);
      if (!(weight > 0 && height > 0 && width > 0 && length > 0)) {
        return send(res, 400, { error: `O produto "${String(product.name || 'Produto')}" está sem peso ou dimensões para calcular o frete.` });
      }

      const requestedOriginId = String(product.shippingOriginId || configuredOrigins[0].id);
      const origin = configuredOrigins.find(candidate => candidate.id === requestedOriginId) || configuredOrigins[0];
      if (!groups.has(origin.id)) groups.set(origin.id, { origin, products: [] });
      groups.get(origin.id).products.push({ quantity, weight, height, width, length });
    }
    if (!groups.size) return send(res, 400, { error: 'Nenhum produto válido foi encontrado na sacola.' });

    const environment = sf.environment === 'sandbox' ? 'sandbox' : 'production';
    const base = environment === 'sandbox' ? 'https://sandbox.superfrete.com' : 'https://api.superfrete.com';
    const contact = String(process.env.CHATSHOP_CONTACT_EMAIL || 'afiliado9591@gmail.com').trim();

    async function quoteGroup(group) {
      const requestBody = {
        from: { postal_code: group.origin.postalCode },
        to: { postal_code: destination },
        services: cleanServices(sf.services),
        options: { own_hand: false, receipt: false, insurance_value: 0, use_insurance_value: false },
        products: group.products
      };
      const upstream = await fetch(`${base}/api/v0/calculator`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': `ChatShop/1.0 (${contact})`,
          accept: 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      const text = await upstream.text();
      let raw;
      try { raw = text ? JSON.parse(text) : null; } catch { raw = { message: text }; }
      if (!upstream.ok) {
        const message = raw?.message || raw?.error || raw?.errors?.[0]?.message || 'A SuperFrete não conseguiu calcular o frete.';
        throw new Error(`${group.origin.label}: ${String(message)}`);
      }
      return { origin: group.origin, quotes: normalizeQuoteResponse(raw).filter(quote => !quote.error && quote.price > 0) };
    }

    const packageQuotes = await Promise.all([...groups.values()].map(quoteGroup));
    if (packageQuotes.some(pkg => !pkg.quotes.length)) {
      return send(res, 400, { error: 'Nenhuma modalidade de frete ficou disponível para um dos endereços de origem.' });
    }

    let quotes;
    if (packageQuotes.length === 1) {
      quotes = packageQuotes[0].quotes;
    } else {
      quotes = packageQuotes[0].quotes.map(firstQuote => {
        const matching = packageQuotes.map(pkg => pkg.quotes.find(quote => quote.id === firstQuote.id));
        if (matching.some(quote => !quote)) return null;
        return {
          id: firstQuote.id,
          name: `${firstQuote.name} · ${packageQuotes.length} pacotes`,
          price: matching.reduce((total, quote) => total + Number(quote.price || 0), 0),
          days: Math.max(...matching.map(quote => Number(quote.days || 0))),
          packageCount: packageQuotes.length,
          packages: packageQuotes.map((pkg, index) => ({
            originId: pkg.origin.id,
            originLabel: pkg.origin.label,
            price: Number(matching[index].price || 0),
            days: Number(matching[index].days || 0)
          }))
        };
      }).filter(Boolean);
    }

    if (!quotes.length) {
      return send(res, 400, { error: 'Não existe uma mesma modalidade disponível para todos os endereços deste pedido.' });
    }

    return send(res, 200, {
      ok: true,
      environment,
      packageCount: packageQuotes.length,
      origins: packageQuotes.map(pkg => ({ id: pkg.origin.id, label: pkg.origin.label })),
      quotes
    });
  } catch (error) {
    console.error('Erro na cotação SuperFrete:', error);
    const message = String(error?.message || 'Não foi possível calcular o frete agora.');
    return send(res, 500, { error: message.includes('auth') ? 'Falha ao ler o token SuperFrete.' : message });
  }
};
