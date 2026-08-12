const PROJECT_ID = 'chatshop-97ea3';
const API_KEY = 'AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const COLLECTION = 'chatshops';
const BASE_DOMAIN = 'alibr.com.br';

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeFirestoreValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeFirestoreValue);
  if ('mapValue' in v) return decodeFirestoreFields(v.mapValue.fields || {});
  return null;
}

function decodeFirestoreFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) out[key] = decodeFirestoreValue(value);
  return out;
}

function prettySlug(slug) {
  return String(slug || 'Loja online')
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function publicHttpsImage(value) {
  const v = String(value || '').trim();
  return /^https:\/\//i.test(v) ? v : '';
}

function chooseImage(store) {
  const candidates = [
    store?.shareImage,
    store?.logo,
    ...(Array.isArray(store?.products) ? store.products.map(p => p && p.image) : [])
  ];
  for (const item of candidates) {
    const url = publicHttpsImage(item);
    if (url) return url;
  }
  return '';
}

async function getStoreBySlug(slug) {
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(slug)}?key=${API_KEY}`;
  const r = await fetch(endpoint, { headers: { accept: 'application/json' } });
  if (!r.ok) return null;
  const doc = await r.json();
  return decodeFirestoreFields(doc.fields || {});
}

async function getStoreByCustomDomain(host) {
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: COLLECTION }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'customDomain' },
          op: 'EQUAL',
          value: { stringValue: host }
        }
      },
      limit: 1
    }
  };
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) return null;
  const rows = await r.json();
  const doc = Array.isArray(rows) ? rows.find(x => x.document)?.document : null;
  return doc ? decodeFirestoreFields(doc.fields || {}) : null;
}

function upsertMeta(html, attr, key, content) {
  const safe = htmlEscape(content);
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<meta\\s+[^>]*${attr}=[\"']${escapedKey}[\"'][^>]*>`, 'i');
  const tag = `<meta ${attr}=\"${htmlEscape(key)}\" content=\"${safe}\">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function injectShareMeta(html, { title, description, image, url }) {
  const safeTitle = htmlEscape(title);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = upsertMeta(html, 'name', 'description', description);
  html = upsertMeta(html, 'property', 'og:type', 'website');
  html = upsertMeta(html, 'property', 'og:title', title);
  html = upsertMeta(html, 'property', 'og:description', description);
  html = upsertMeta(html, 'property', 'og:url', url);
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:title', title);
  html = upsertMeta(html, 'name', 'twitter:description', description);
  if (image) {
    html = upsertMeta(html, 'property', 'og:image', image);
    html = upsertMeta(html, 'name', 'twitter:image', image);
  }
  return html;
}

function injectEditorUpgrade(html) {
  const tags = [];
  if (!html.includes('catalog-editor-upgrade.js')) {
    tags.push('<script src="/catalog-editor-upgrade.js?v=20260812-3" defer></script>');
  }
  if (!html.includes('store-layout-upgrade.js')) {
    tags.push('<script src="/store-layout-upgrade.js?v=20260812-4" defer></script>');
  }
  if (!html.includes('marketplace-grid-fix.js')) {
    tags.push('<script src="/marketplace-grid-fix.js?v=20260812-1" defer></script>');
  }
  if (!html.includes('marketplace-image-fix.js')) {
    tags.push('<script src="/marketplace-image-fix.js?v=20260812-1" defer></script>');
  }
  if (!tags.length) return html;
  const injection = tags.join('\n');
  const lower = html.toLowerCase();
  const index = lower.lastIndexOf('</body>');
  if (index < 0) return html + '\n' + injection;
  return html.slice(0, index) + injection + '\n' + html.slice(index);
}

module.exports = async function handler(request, response) {
  try {
    const forwardedHost = request.headers['x-forwarded-host'];
    const rawHost = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || request.headers.host || '');
    const host = String(rawHost).toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');

    const proto = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
    const staticUrl = `${proto}://${rawHost}/index.html`;
    const staticResponse = await fetch(staticUrl, { headers: { accept: 'text/html' } });
    let html = await staticResponse.text();
    html = injectEditorUpgrade(html);

    const isBase = host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`;
    const isVercelHost = host.endsWith('.vercel.app');

    if (isBase || isVercelHost || !host) {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
      return response.status(200).send(html);
    }

    let slug = '';
    let store = null;

    if (host.endsWith(`.${BASE_DOMAIN}`)) {
      slug = host.slice(0, -(`.${BASE_DOMAIN}`.length));
      try { store = await getStoreBySlug(slug); } catch (e) { console.warn('OG Firestore slug lookup failed:', e); }
    } else {
      try { store = await getStoreByCustomDomain(host); } catch (e) { console.warn('OG custom-domain lookup failed:', e); }
    }

    const fallbackTitle = slug ? prettySlug(slug) : 'Loja online';
    const title = String(store?.shareTitle || store?.brand || fallbackTitle).trim() || fallbackTitle;
    const description = String(
      store?.shareDescription ||
      store?.welcome ||
      `Conheça os produtos da ${title} e fale com nosso atendimento.`
    ).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const image = chooseImage(store);
    const canonicalUrl = `${proto}://${rawHost}/`;

    html = injectShareMeta(html, { title, description, image, url: canonicalUrl });

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    return response.status(200).send(html);
  } catch (error) {
    console.error('Erro ao montar metadados da loja:', error);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(500).send('<!doctype html><html><head><title>Loja online</title></head><body>Não foi possível abrir a loja agora.</body></html>');
  }
};
