/* URLs públicas no domínio principal para lojas e catálogos do ChatShop. */
const app = require('./app-superfrete');

function cleanSlug(value){
  return String(value||'').trim().toLowerCase();
}

module.exports = async function handler(request,response){
  const rawSlug = request.query && request.query.slug;
  const slug = cleanSlug(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);

  if(!/^[a-z0-9-]{3,80}$/.test(slug)){
    return response.status(404).send('<!doctype html><html lang="pt-BR"><body>Loja ou catálogo não encontrado.</body></html>');
  }

  const publicHost = `${slug}.alibr.com.br`;
  request.headers = {
    ...request.headers,
    host: publicHost,
    'x-forwarded-host': publicHost,
    'x-forwarded-proto': 'https'
  };

  return app(request,response);
};
