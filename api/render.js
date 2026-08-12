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
  return String(slug || 'Loja online').split('-').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function publicHttpsImage(value) {
  const v = String(value || '').trim();
  return /^https:\/\//i.test(v) ? v : '';
}

function chooseImage(store) {
  const candidates = [store?.shareImage, store?.logo,
    ...(Array.isArray(store?.products) ? store.products.map(p => p && p.image) : [])];
  for (const item of candidates) {
    const url = publicHttpsImage(item);
    if (url) return url;
  }
  return '';
}

async function getStoreBySlug(slug) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(slug)}?key=${API_KEY}`;
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) return null;
  const doc = await r.json();
  return decodeFirestoreFields(doc.fields || {});
}

async function getStoreByCustomDomain(host) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  const body = { structuredQuery: { from: [{ collectionId: COLLECTION }], where: { fieldFilter: {
    field: { fieldPath: 'customDomain' }, op: 'EQUAL', value: { stringValue: host }
  }}, limit: 1 }};
  const r = await fetch(url, { method:'POST', headers:{'content-type':'application/json',accept:'application/json'}, body:JSON.stringify(body) });
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
  return re.test(html) ? html.replace(re, tag) : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function injectShareMeta(html, { title, description, image, url }) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${htmlEscape(title)}</title>`);
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

function scriptRegex(filename) {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<script\\s+src=[\"']/${escaped}(?:\\?[^\"']*)?[\"']\\s+defer><\\/script>`, 'ig');
}

function removeScript(html, filename) {
  return html.replace(scriptRegex(filename), '');
}

function forceScript(html, filename, version) {
  html = removeScript(html, filename);
  const tag = `<script src=\"/${filename}?v=${version}\" defer></script>`;
  const pos = html.toLowerCase().lastIndexOf('</body>');
  return pos >= 0 ? html.slice(0,pos) + tag + '\n' + html.slice(pos) : html + '\n' + tag;
}

function injectUpgrades(html, storefrontMode) {
  const version = '20260812-6';

  // O editor precisa do controle de escolha de layout.
  // A loja publicada NÃO carrega store-layout-upgrade.js, porque ele possui
  // um renderizador antigo de grade que disputava com o card final e escondia
  // nome, descrição, preço e botão, deixando só a foto.
  if (storefrontMode) {
    html = removeScript(html, 'store-layout-upgrade.js');
    html = forceScript(html, 'catalog-editor-upgrade.js', version);
    html = forceScript(html, 'marketplace-grid-fix.js', version);
    html = forceScript(html, 'marketplace-image-fix.js', version);
  } else {
    html = removeScript(html, 'marketplace-grid-fix.js');
    html = removeScript(html, 'marketplace-image-fix.js');
    html = forceScript(html, 'catalog-editor-upgrade.js', version);
    html = forceScript(html, 'store-layout-upgrade.js', version);
  }
  return html;
}

module.exports = async function handler(request, response) {
  try {
    const forwardedHost = request.headers['x-forwarded-host'];
    const rawHost = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || request.headers.host || '');
    const host = String(rawHost).toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
    const proto = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';

    const isBase = host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`;
    const isVercelHost = host.endsWith('.vercel.app');
    const storefrontMode = !!host && !isBase && !isVercelHost;

    const staticResponse = await fetch(`${proto}://${rawHost}/index.html`, { headers:{accept:'text/html'} });
    let html = injectUpgrades(await staticResponse.text(), storefrontMode);

    if (isBase || isVercelHost || !host) {
      response.setHeader('Content-Type','text/html; charset=utf-8');
      response.setHeader('Cache-Control','public, max-age=0, s-maxage=20');
      return response.status(200).send(html);
    }

    let slug = '';
    let store = null;
    if (host.endsWith(`.${BASE_DOMAIN}`)) {
      slug = host.slice(0, -(`.${BASE_DOMAIN}`.length));
      try { store = await getStoreBySlug(slug); } catch(e) { console.warn('store lookup failed',e); }
    } else {
      try { store = await getStoreByCustomDomain(host); } catch(e) { console.warn('custom domain lookup failed',e); }
    }

    const fallbackTitle = slug ? prettySlug(slug) : 'Loja online';
    const title = String(store?.shareTitle || store?.brand || fallbackTitle).trim() || fallbackTitle;
    const description = String(store?.shareDescription || store?.welcome || `Conheça os produtos da ${title} e fale com nosso atendimento.`)
      .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    const image = chooseImage(store);
    html = injectShareMeta(html, { title, description, image, url:`${proto}://${rawHost}/` });

    response.setHeader('Content-Type','text/html; charset=utf-8');
    response.setHeader('Cache-Control','public, max-age=0, s-maxage=20, stale-while-revalidate=30');
    return response.status(200).send(html);
  } catch(error) {
    console.error('Erro ao montar loja:', error);
    response.setHeader('Content-Type','text/html; charset=utf-8');
    return response.status(500).send('<!doctype html><html><head><title>Loja online</title></head><body>Não foi possível abrir a loja agora.</body></html>');
  }
};
