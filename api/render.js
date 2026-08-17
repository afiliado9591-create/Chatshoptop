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

function productSlugBase(value) {
  return String(value || 'produto')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,90) || 'produto';
}

function buildProductSlugs(store) {
  const used = {};
  const products = Array.isArray(store?.products) ? store.products : [];
  return products.map(p => {
    const base = productSlugBase(p?.name);
    used[base] = (used[base] || 0) + 1;
    return used[base] === 1 ? base : `${base}-${used[base]}`;
  });
}

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}

function productDescription(product, storeTitle) {
  const custom = [product?.cardDescription, product?.displayText, product?.voiceText]
    .map(cleanText).find(Boolean);
  if (custom) return custom.slice(0,220);
  const keys = Array.isArray(product?.keywords) ? product.keywords.filter(Boolean).slice(0,7).join(', ') : '';
  if (keys) return `${product?.name || 'Produto'} — ${keys}. Veja detalhes e opções para comprar na ${storeTitle}.`.slice(0,220);
  return `Veja ${product?.name || 'este produto'} na ${storeTitle}, confira preço, detalhes e opção de compra.`;
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

async function getPlatformSeo() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/config/platformSeo?key=${API_KEY}`;
  try { const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)return{};const doc=await r.json();return decodeFirestoreFields(doc.fields||{}); } catch(e) { return {}; }
}

function cleanGaId(value){const v=String(value||'').trim().toUpperCase();return /^G-[A-Z0-9]+$/.test(v)?v:''}
function cleanVerification(value){const v=String(value||'').trim();return /^[A-Za-z0-9_\-=]{6,200}$/.test(v)?v:''}
function injectAnalyticsSeo(html,settings={}){
  const ga=cleanGaId(settings.googleAnalyticsId),verification=cleanVerification(settings.googleSearchConsoleVerification);
  if(verification)html=upsertMeta(html,'name','google-site-verification',verification);
  if(ga){html=upsertMeta(html,'name','chatshop-google-analytics-id',ga);html=forceScript(html,'analytics-loader.js','20260816-1700')}
  return html;
}

function upsertMeta(html, attr, key, content) {
  const safe = htmlEscape(content);
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<meta\\s+[^>]*${attr}=[\"']${escapedKey}[\"'][^>]*>`, 'i');
  const tag = `<meta ${attr}=\"${htmlEscape(key)}\" content=\"${safe}\">`;
  return re.test(html) ? html.replace(re, tag) : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function injectCanonical(html, url) {
  const tag = `<link rel=\"canonical\" href=\"${htmlEscape(url)}\">`;
  const re = /<link\s+[^>]*rel=[\"']canonical[\"'][^>]*>/i;
  return re.test(html) ? html.replace(re, tag) : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function injectShareMeta(html, { title, description, image, url, type='website' }) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${htmlEscape(title)}</title>`);
  html = upsertMeta(html, 'name', 'description', description);
  html = upsertMeta(html, 'property', 'og:type', type);
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
  return injectCanonical(html, url);
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

function injectUpgrades(html, storefrontMode, layout) {
  const version = '20260817-1305-admin-store-export';
  const scripts = [
    'catalog-editor-upgrade.js',
    'store-layout-upgrade.js',
    'marketplace-grid-fix.js',
    'marketplace-image-fix.js',
    'storefront-grid-final.js',
    'storefront-grid-direct.js',
    'product-url-upgrade.js',
    'admin-content-pages.js',
    'seller-audio-admin-controls.js',
    'seller-audio-admin-fix.js',
    'seller-audio-upload-fix.js',
    'product-seller-button-control.js',
    'virtual-single-product-mode.js'
  ];
  scripts.forEach(name => { html = removeScript(html, name); });

  if (storefrontMode) {
    if (layout === 'grid') {
      html = forceScript(html, 'storefront-grid-direct.js', version);
      html = forceScript(html, 'product-url-upgrade.js', version);
      html = forceScript(html, 'seller-audio-admin-controls.js', version);
    } else {
      html = forceScript(html, 'catalog-editor-upgrade.js', version);
      html = forceScript(html, 'seller-audio-admin-controls.js', version);
    }
  } else {
    html = forceScript(html, 'catalog-editor-upgrade.js', version);
    html = forceScript(html, 'store-layout-upgrade.js', version);
    html = forceScript(html, 'admin-content-pages.js', version);
    html = forceScript(html, 'seller-audio-admin-controls.js', version);
    html = forceScript(html, 'seller-audio-admin-fix.js', version);
    html = forceScript(html, 'seller-audio-upload-fix.js', version);
  }
  html = forceScript(html, 'product-seller-button-control.js', version);
  html = forceScript(html, 'virtual-single-product-mode.js', '20260817-1755-bootstrap-markup');
  return html;
}

function safeJsonForScript(value) {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function disableLegacyStoreAutoload(html) {
  const marker = 'if(STOREFRONT_MODE || CUSTOM_DOMAIN_MODE) loadPublishedStore();';
  const replacement = 'if(!window.__CHATSHOP_GRID_DIRECT_ACTIVE && !window.__CHATSHOP_DIRECT_STORE_ACTIVE && (STOREFRONT_MODE || CUSTOM_DOMAIN_MODE)) loadPublishedStore();';
  return html.includes(marker) ? html.replace(marker, replacement) : html;
}

function injectGridBootstrap(html, store, productSlug='') {
  if (!store || store.homeLayout !== 'grid') return html;
  const payload = safeJsonForScript(store);
  const requested = safeJsonForScript(productSlug || '');
  const bootstrap = `<style id=\"chatshopGridBootstrapStyle\">html.chatshop-grid-pending body{background:#f5f5f5!important}html.chatshop-grid-pending #storefrontScreen{visibility:hidden!important}</style>\n<script id=\"chatshopGridBootstrap\">document.documentElement.classList.add('chatshop-grid-pending');window.__CHATSHOP_GRID_DIRECT_ACTIVE=true;window.__CHATSHOP_HOME_LAYOUT='grid';window.__CHATSHOP_STORE_DATA=${payload};window.__CHATSHOP_PRODUCT_SLUG=${requested};</script>`;
  return html.replace(/<\/head>/i, `${bootstrap}\n</head>`);
}

function injectDirectVirtualBootstrap(html, store) {
  if (!store || store.storeType !== 'virtual') return html;
  const payload = safeJsonForScript(store);
  const bootstrap = `<style id="chatshopDirectVirtualStyle">html.chatshop-virtual-pending body{background:#f8fafc!important}html.chatshop-virtual-pending #storefrontScreen{visibility:hidden!important}</style>\n<script id="chatshopDirectVirtualBootstrap">document.documentElement.classList.add('chatshop-virtual-pending');window.__CHATSHOP_DIRECT_STORE_ACTIVE=true;window.__CHATSHOP_STORE_DATA=${payload};</script>`;
  return html.replace(/<\/head>/i, `${bootstrap}\n</head>`);
}

function injectStoreFeatureBootstrap(html, store) {
  if (!store) return html;
  const payload = safeJsonForScript({
    slug: store.slug || '',
    storeType: store.storeType || 'affiliate',
    brand: store.brand || store.storeName || store.name || 'Minha Loja',
    storeName: store.storeName || '',
    logo: store.logo || '',
    mainColor: store.mainColor || '',
    headerColor: store.headerColor || '',
    darkColor: store.darkColor || '',
    accentColor: store.accentColor || '',
    chatBg: store.chatBg || '',
    welcome: store.welcome || '',
    whatsapp: store.whatsapp || '',
    planTier: store.planTier || store.plan || '',
    affiliateProgram: store.affiliateProgram || {},
    adminControl: store.adminControl || {},
    virtualDisplayMode: store.virtualDisplayMode || 'catalog',
    virtualFeaturedProduct: Number(store.virtualFeaturedProduct) || 0,
    qna: Array.isArray(store.qna) ? store.qna : [],
    products: Array.isArray(store.products) ? store.products : []
  });
  const bootstrap = `<script id=\"chatshopStoreFeatureBootstrap\">window.__CHATSHOP_STORE_FEATURE_DATA=${payload};</script>`;
  return html.replace(/<\/head>/i, `${bootstrap}\n</head>`);
}

module.exports = async function handler(request, response) {
  try {
    const forwardedHost = request.headers['x-forwarded-host'];
    const rawHost = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || request.headers.host || '');
    const host = String(rawHost).toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
    const proto = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
    const rawProduct = request.query && request.query.product;
    const requestedProductSlug = String(Array.isArray(rawProduct) ? rawProduct[0] : (rawProduct || '')).toLowerCase().trim();

    const isBase = host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`;
    const isVercelHost = host.endsWith('.vercel.app');

    const staticResponse = await fetch(`${proto}://${rawHost}/index.html`, { headers:{accept:'text/html'} });
    let html = await staticResponse.text();

    if (isBase || isVercelHost || !host) {
      html = injectUpgrades(html, false, 'editor');
      html = injectAnalyticsSeo(html, await getPlatformSeo());
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

    const productSlugs = buildProductSlugs(store);
    const productIndex = requestedProductSlug ? productSlugs.indexOf(requestedProductSlug) : -1;
    const requestedProduct = productIndex >= 0 && Array.isArray(store?.products) ? store.products[productIndex] : null;
    const layout = store?.homeLayout === 'grid' ? 'grid' : 'single';
    html = injectStoreFeatureBootstrap(html, store);
    html = injectAnalyticsSeo(html, store || {});
    html = injectUpgrades(html, true, layout);
    if (layout === 'grid') {
      html = disableLegacyStoreAutoload(html);
      html = injectGridBootstrap(html, store, requestedProduct ? productSlugs[productIndex] : '');
    } else if (store?.storeType === 'virtual') {
      // Domínios próprios não devem consultar a loja uma segunda vez no navegador.
      html = disableLegacyStoreAutoload(html);
      html = injectDirectVirtualBootstrap(html, store);
    }

    const fallbackTitle = slug ? prettySlug(slug) : 'Loja online';
    const storeTitle = String(store?.shareTitle || store?.brand || fallbackTitle).trim() || fallbackTitle;
    let title = storeTitle;
    let description = String(store?.shareDescription || store?.welcome || `Conheça os produtos da ${storeTitle} e fale com nosso atendimento.`)
      .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    let image = chooseImage(store);
    let pageUrl = `${proto}://${rawHost}/`;
    let ogType = 'website';

    if (requestedProduct) {
      const productName = String(requestedProduct.name || 'Produto').trim() || 'Produto';
      title = `${productName} | ${storeTitle}`;
      description = productDescription(requestedProduct, storeTitle);
      image = publicHttpsImage(requestedProduct.image) || image;
      pageUrl = `${proto}://${rawHost}/produto/${encodeURIComponent(productSlugs[productIndex])}`;
      ogType = 'product';
    }

    html = injectShareMeta(html, { title, description, image, url:pageUrl, type:ogType });

    response.setHeader('Content-Type','text/html; charset=utf-8');
    response.setHeader('Cache-Control','public, max-age=0, s-maxage=10, stale-while-revalidate=20');
    return response.status(requestedProductSlug && !requestedProduct ? 404 : 200).send(html);
  } catch(error) {
    console.error('Erro ao montar loja:', error);
    response.setHeader('Content-Type','text/html; charset=utf-8');
    return response.status(500).send('<!doctype html><html><head><title>Loja online</title></head><body>Não foi possível abrir a loja agora.</body></html>');
  }
};
