/* Proxy ChatShop com Loja Virtual, frete por km e SuperFrete. */
const PROJECT_ID = 'chatshop-97ea3';
const API_KEY = 'AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const COLLECTION = 'chatshops';
const BASE_DOMAIN = 'alibr.com.br';

function normalizeHost(value) {
  return String(value || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

async function findSlugForCustomDomain(host) {
  const clean = normalizeHost(host);
  if (!clean) return '';
  const candidates = clean.startsWith('www.')
    ? [clean, clean.slice(4)]
    : [clean, `www.${clean}`];
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;

  for (const candidate of [...new Set(candidates)]) {
    try {
      const body = {
        structuredQuery: {
          from: [{ collectionId: COLLECTION }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'customDomain' },
              op: 'EQUAL',
              value: { stringValue: candidate }
            }
          },
          limit: 1
        }
      };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) continue;
      const rows = await r.json();
      const doc = Array.isArray(rows) ? rows.find(x => x && x.document)?.document : null;
      if (!doc) continue;
      const fieldSlug = doc.fields?.slug?.stringValue;
      if (fieldSlug) return String(fieldSlug).trim();
      const name = String(doc.name || '');
      const fallback = name.split('/').pop();
      if (fallback) return fallback;
    } catch (e) {
      console.warn('Falha ao procurar domínio próprio:', candidate, e);
    }
  }
  return '';
}

function removeScript(html, filename) {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<script\\s+[^>]*src=["']/${escaped}(?:\\?[^"']*)?["'][^>]*><\\/script>`, 'ig');
  return html.replace(re, '');
}

module.exports = async function handler(request, response) {
  try {
    const forwardedHost = request.headers['x-forwarded-host'];
    const rawHost = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || request.headers.host || '');
    const host = normalizeHost(rawHost);
    const proto = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
    const query = new URLSearchParams();
    if (request.query && request.query.product) {
      const product = Array.isArray(request.query.product) ? request.query.product[0] : request.query.product;
      if (product) query.set('product', String(product));
    }

    let renderHost = rawHost;
    const isAlibr = host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}` || host.endsWith(`.${BASE_DOMAIN}`);
    const isVercel = host.endsWith('.vercel.app');
    if (host && !isAlibr && !isVercel) {
      const customSlug = await findSlugForCustomDomain(host);
      if (customSlug) renderHost = `${customSlug}.${BASE_DOMAIN}`;
    }

    const target = `${proto}://${renderHost}/api/render.js${query.toString() ? '?' + query.toString() : ''}`;
    const upstream = await fetch(target, { headers: { accept: 'text/html', 'x-chatshop-proxy': 'superfrete' } });
    let html = await upstream.text();

    html = removeScript(html, 'superfrete-domain-fix.js');
    html = removeScript(html, 'superfrete-upgrade.js');
    html = removeScript(html, 'plan-access-control.js');
    html = removeScript(html, 'store-affiliate-program.js');
    html = removeScript(html, 'mercadopago-oauth-ui.js');
    html = removeScript(html, 'virtual-payment-fix.js');
    html = removeScript(html, 'payment-choice-persist.js');

    const virtualTag = '<script src="/virtual-shipping-upgrade.js?v=20260813-1707"></script>';
    const superfreteDomainFixTag = '<script src="/superfrete-domain-fix.js?v=20260814-1058"></script>';
    const superfreteTag = '<script src="/superfrete-upgrade.js?v=20260814-1058"></script>';
    const virtualChatTag = '<script src="/virtual-chat-description-fix.js?v=20260813-2102"></script>';
    const virtualScrollTag = '<script src="/virtual-scroll-fix.js?v=20260813-2147"></script>';
    const virtualSellerAudioTag = '<script src="/virtual-seller-audio.js?v=20260813-2302"></script>';
    const ownerMetricsTag = '<script src="/store-owner-metrics.js?v=20260814-0500"></script>';
    const virtualCategoryMenuTag = '<script src="/virtual-category-menu.js?v=20260814-0523"></script>';
    const virtualThemeFooterTag = '<script src="/virtual-store-theme-footer.js?v=20260814-0613"></script>';
    const customDomainChatTag = '<script src="/custom-domain-chat.js?v=20260814-0754"></script>';
    const adminPublicPagesTag = '<script src="/admin-public-pages.js?v=20260814-1350"></script>';
    const planAccessTag = '<script src="/plan-access-control.js?v=20260814-1615"></script>';
    const storeAffiliateProgramTag = '<script src="/store-affiliate-program.js?v=20260814-1640"></script>';
    const mercadoPagoOauthTag = '<script src="/mercadopago-oauth-ui.js?v=20260814-1825"></script>';
    const paymentChoicePersistTag = '<script src="/payment-choice-persist.js?v=20260815-0105"></script>';
    const virtualPaymentFixTag = '<script src="/virtual-payment-fix.js?v=20260815-0105"></script>';
    let inject = '';
    if (!html.includes('/virtual-shipping-upgrade.js')) inject += virtualTag + '\n';
    inject += superfreteDomainFixTag + '\n';
    inject += superfreteTag + '\n';
    if (!html.includes('/virtual-chat-description-fix.js')) inject += virtualChatTag + '\n';
    if (!html.includes('/virtual-scroll-fix.js')) inject += virtualScrollTag + '\n';
    if (!html.includes('/virtual-seller-audio.js')) inject += virtualSellerAudioTag + '\n';
    if (!html.includes('/store-owner-metrics.js')) inject += ownerMetricsTag + '\n';
    if (!html.includes('/virtual-category-menu.js')) inject += virtualCategoryMenuTag + '\n';
    if (!html.includes('/virtual-store-theme-footer.js')) inject += virtualThemeFooterTag + '\n';
    if (!html.includes('/custom-domain-chat.js')) inject += customDomainChatTag + '\n';
    if (!html.includes('/admin-public-pages.js')) inject += adminPublicPagesTag + '\n';
    inject += planAccessTag + '\n';
    inject += storeAffiliateProgramTag + '\n';
    inject += mercadoPagoOauthTag + '\n';
    inject += paymentChoicePersistTag + '\n';
    inject += virtualPaymentFixTag + '\n';
    if (inject) {
      const pos = html.toLowerCase().lastIndexOf('</body>');
      html = pos >= 0 ? html.slice(0, pos) + inject + html.slice(pos) : html + '\n' + inject;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5, stale-while-revalidate=10');
    return response.status(upstream.status || 200).send(html);
  } catch (error) {
    console.error('Erro no proxy ChatShop SuperFrete:', error);
    return response.status(500).send('<!doctype html><html><body>Não foi possível abrir o ChatShop agora.</body></html>');
  }
};