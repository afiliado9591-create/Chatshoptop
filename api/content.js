const PROJECT_ID = 'chatshop-97ea3';
const API_KEY = 'AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const BASE_DOMAIN = 'www.alibr.com.br';

function decodeValue(v){
  if(!v || typeof v !== 'object') return null;
  if('stringValue' in v) return v.stringValue;
  if('booleanValue' in v) return v.booleanValue;
  if('integerValue' in v) return Number(v.integerValue);
  if('doubleValue' in v) return Number(v.doubleValue);
  if('timestampValue' in v) return v.timestampValue;
  if('nullValue' in v) return null;
  if('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if('mapValue' in v){
    const out = {};
    for(const [k,val] of Object.entries(v.mapValue.fields || {})) out[k] = decodeValue(val);
    return out;
  }
  return null;
}

function decodeFields(fields){
  const out = {};
  for(const [k,v] of Object.entries(fields || {})) out[k] = decodeValue(v);
  return out;
}

function esc(value){
  return String(value == null ? '' : value)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function cleanSlug(value){
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9-]/g,'').slice(0,90);
}

function bodyHtml(text){
  return String(text || '').trim().split(/\n\s*\n/).filter(Boolean).map(block => {
    return `<p>${esc(block).replace(/\n/g,'<br>')}</p>`;
  }).join('\n');
}

async function getPage(slug){
  const docId = `content_${slug}`;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/config/${encodeURIComponent(docId)}?key=${API_KEY}`;
  const r = await fetch(url, {headers:{accept:'application/json'}, cache:'no-store'});
  if(!r.ok) return null;
  const json = await r.json();
  return decodeFields(json.fields || {});
}

module.exports = async function handler(req,res){
  try{
    const slug = cleanSlug(req.query && req.query.slug);
    if(!slug){ res.status(404).send('Página não encontrada.'); return; }
    const page = await getPage(slug);
    if(!page || page.type !== 'contentPage' || page.published === false){
      res.status(404).setHeader('Content-Type','text/html; charset=utf-8');
      res.send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página não encontrada · ChatShop</title></head><body style="font-family:Arial,sans-serif;padding:30px"><h1>Página não encontrada</h1><p>Esta página não existe ou ainda não foi publicada.</p><a href="https://${BASE_DOMAIN}/site">Voltar ao início</a></body></html>`);
      return;
    }

    const title = String(page.title || 'Conteúdo ChatShop').trim();
    const description = String(page.seoDescription || '').trim() || String(page.body || '').replace(/\s+/g,' ').slice(0,160);
    const canonical = `https://${BASE_DOMAIN}/conteudo/${encodeURIComponent(slug)}`;
    const image = String(page.image || '').trim();
    const ogImage = /^https:\/\//i.test(image) ? image : '';
    const keywords = Array.isArray(page.keywords) ? page.keywords.join(', ') : '';
    const links = Array.isArray(page.links) ? page.links.filter(x => x && x.label && /^https?:\/\//i.test(String(x.url || ''))) : [];
    const jsonLd = {
      '@context':'https://schema.org',
      '@type':'Article',
      headline:title,
      description,
      mainEntityOfPage:canonical,
      publisher:{'@type':'Organization',name:'ChatShop',url:`https://${BASE_DOMAIN}/site`},
      ...(ogImage ? {image:[ogImage]} : {})
    };

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ChatShop</title>
<meta name="description" content="${esc(description)}">
${keywords ? `<meta name="keywords" content="${esc(keywords)}">` : ''}
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)} · ChatShop">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)} · ChatShop">
<meta name="twitter:description" content="${esc(description)}">
${ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}">` : ''}
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g,'\\u003c')}</script>
<style>
:root{--p:#6d28d9;--p2:#4c1d95;--ink:#17141f;--muted:#6b7280;--line:#e7e5e4;--bg:#fafafa}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,sans-serif;line-height:1.65}.top{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}.topin{max-width:1120px;margin:auto;min-height:68px;padding:10px 18px;display:flex;align-items:center;gap:16px}.brand{font-size:20px;font-weight:900;color:var(--p2);text-decoration:none;white-space:nowrap}.menu{display:flex;gap:6px;align-items:center;overflow-x:auto;flex:1}.menu a{padding:8px 10px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:800;white-space:nowrap;color:#4b5563}.menu a:hover{background:#f3e8ff;color:var(--p2)}.cta{background:var(--p);color:#fff;text-decoration:none;font-weight:900;padding:9px 14px;border-radius:10px;font-size:13px;white-space:nowrap}.wrap{max-width:900px;margin:24px auto;padding:0 16px 50px}.article{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.06)}.heroimg{width:100%;max-height:460px;object-fit:contain;background:#fafafa;display:block}.inside{padding:24px}.kicker{font-size:12px;font-weight:900;color:var(--p);text-transform:uppercase;letter-spacing:.08em}.article h1{font-size:clamp(28px,6vw,44px);line-height:1.12;margin:8px 0 15px}.lead{font-size:18px;color:#5b6472;margin-bottom:24px}.body p{font-size:17px;margin:0 0 18px}.links{margin-top:28px;padding-top:20px;border-top:1px solid #eee}.links h2{font-size:19px}.links a{display:block;margin:8px 0;color:#5b21b6;font-weight:800;text-decoration:none}.bottomcta{margin-top:28px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;padding:18px}.bottomcta a{display:inline-block;background:var(--p);color:#fff;text-decoration:none;font-weight:900;padding:11px 16px;border-radius:10px}.foot{border-top:1px solid var(--line);background:#fff}.footin{max-width:1120px;margin:auto;padding:24px 18px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:12px}.foot a{color:inherit}@media(max-width:700px){.topin{align-items:flex-start;flex-wrap:wrap}.brand{padding-top:4px}.menu{order:3;width:100%}.cta{margin-left:auto}.inside{padding:18px}.lead{font-size:16px}.body p{font-size:16px}.wrap{margin-top:16px}}
</style>
</head>
<body>
<header class="top"><div class="topin"><a class="brand" href="https://${BASE_DOMAIN}/site">🛍️ ChatShop</a><nav class="menu"><a href="https://${BASE_DOMAIN}/site">Início</a><a href="https://${BASE_DOMAIN}/p/chatshop">Conheça o ChatShop</a><a href="https://${BASE_DOMAIN}/p/politica-de-privacidade">Privacidade</a></nav><a class="cta" href="https://${BASE_DOMAIN}/">Entrar</a></div></header>
<main class="wrap"><article class="article">${image ? `<img class="heroimg" src="${esc(image)}" alt="${esc(title)}">` : ''}<div class="inside"><div class="kicker">Conteúdo ChatShop</div><h1>${esc(title)}</h1>${description ? `<div class="lead">${esc(description)}</div>` : ''}<div class="body">${bodyHtml(page.body)}</div>${links.length ? `<section class="links"><h2>Links relacionados</h2>${links.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} →</a>`).join('')}</section>` : ''}<div class="bottomcta"><b>Quer criar sua própria loja com catálogo e chat vendedor?</b><p>Monte seu ChatShop e compartilhe seu link com seus clientes.</p><a href="https://${BASE_DOMAIN}/">Criar meu ChatShop</a></div></div></article></main>
<footer class="foot"><div class="footin"><span>© 2026 ChatShop · Alibr</span><span><a href="https://${BASE_DOMAIN}/p/politica-de-privacidade">Política de Privacidade</a></span></div></footer>
</body>
</html>`;

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.status(200).send(html);
  }catch(error){
    console.error('Erro ao renderizar conteúdo:',error);
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('Não foi possível abrir esta página agora.');
  }
};