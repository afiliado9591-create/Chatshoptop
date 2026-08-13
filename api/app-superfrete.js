/* Proxy ChatShop com Loja Virtual, frete por km e SuperFrete. */
module.exports = async function handler(request, response) {
  try {
    const forwardedHost = request.headers['x-forwarded-host'];
    const rawHost = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || request.headers.host || '');
    const proto = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
    const query = new URLSearchParams();
    if (request.query && request.query.product) {
      const product = Array.isArray(request.query.product) ? request.query.product[0] : request.query.product;
      if (product) query.set('product', String(product));
    }
    const target = `${proto}://${rawHost}/api/render.js${query.toString() ? '?' + query.toString() : ''}`;
    const upstream = await fetch(target, { headers: { accept: 'text/html', 'x-chatshop-proxy': 'superfrete' } });
    let html = await upstream.text();
    const virtualTag = '<script src="/virtual-shipping-upgrade.js?v=20260813-1707"></script>';
    const superfreteTag = '<script src="/superfrete-upgrade.js?v=20260813-1908"></script>';
    const virtualChatTag = '<script src="/virtual-chat-description-fix.js?v=20260813-2047"></script>';
    let inject = '';
    if (!html.includes('/virtual-shipping-upgrade.js')) inject += virtualTag + '\n';
    if (!html.includes('/superfrete-upgrade.js')) inject += superfreteTag + '\n';
    if (!html.includes('/virtual-chat-description-fix.js')) inject += virtualChatTag + '\n';
    if (inject) {
      const pos = html.toLowerCase().lastIndexOf('</body>');
      html = pos >= 0 ? html.slice(0, pos) + inject + html.slice(pos) : html + '\n' + inject;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=20');
    return response.status(upstream.status || 200).send(html);
  } catch (error) {
    console.error('Erro no proxy ChatShop SuperFrete:', error);
    return response.status(500).send('<!doctype html><html><body>Não foi possível abrir o ChatShop agora.</body></html>');
  }
};
