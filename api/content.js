const admin=require('firebase-admin');
const PROJECT_ID = 'chatshop-97ea3';
const API_KEY = 'AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const BASE_DOMAIN = 'www.alibr.com.br';

const PLANOS_ASSINATURA={
  basico:{nome:'ChatShop Básico',valor:18.00},
  profissional:{nome:'ChatShop Profissional',valor:49.90}
};

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
    .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
}

function cleanSlug(value){
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9-]/g,'').slice(0,90);
}
function clean(v,max=200){return String(v||'').trim().slice(0,max)}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim())}
async function parseJsonSafe(r){const t=await r.text();try{return t?JSON.parse(t):{}}catch(_){return{raw:t}}}

async function getPlatformAccessToken(){
  const direct=clean(process.env.MP_ACCESS_TOKEN||process.env.MERCADOPAGO_ACCESS_TOKEN||process.env.MERCADO_PAGO_ACCESS_TOKEN||'',500);
  if(direct)return direct;
  const clientId=clean(process.env.MP_CLIENT_ID||process.env.MERCADOPAGO_CLIENT_ID||'',300);
  const clientSecret=clean(process.env.MP_CLIENT_SECRET||process.env.MERCADOPAGO_CLIENT_SECRET||'',300);
  if(!clientId||!clientSecret)return '';
  try{
    const r=await fetch('https://api.mercadopago.com/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret}).toString()});
    const j=await parseJsonSafe(r);
    if(r.ok&&j?.access_token)return String(j.access_token);
  }catch(_){}
  return '';
}

function parseServiceAccount(raw){
  let text=String(raw||'').trim();
  if(!text)throw new Error('CHATSHOP_FIREBASE_SERVICE_ACCOUNT ausente');
  try{let parsed=JSON.parse(text);if(typeof parsed==='string')parsed=JSON.parse(parsed);if(parsed.private_key)parsed.private_key=String(parsed.private_key).replace(/\\n/g,'\n');return parsed}catch(_){}
  const start=text.indexOf('{');if(start<0)throw new Error('CHATSHOP_FIREBASE_SERVICE_ACCOUNT inválida');
  let depth=0,inString=false,escapeNext=false,end=-1;
  for(let i=start;i<text.length;i++){const ch=text[i];if(escapeNext){escapeNext=false;continue}if(ch==='\\'&&inString){escapeNext=true;continue}if(ch==='"'){inString=!inString;continue}if(inString)continue;if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0){end=i;break}}}
  if(end<0)throw new Error('CHATSHOP_FIREBASE_SERVICE_ACCOUNT inválida');
  const parsed=JSON.parse(text.slice(start,end+1));if(parsed.private_key)parsed.private_key=String(parsed.private_key).replace(/\\n/g,'\n');return parsed;
}
function getAdmin(){if(admin.apps.length)return admin.app();const service=parseServiceAccount(process.env.CHATSHOP_FIREBASE_SERVICE_ACCOUNT);return admin.initializeApp({credential:admin.credential.cert(service),projectId:PROJECT_ID})}
function money(v){const n=Number(v);return Number.isFinite(n)?n:0}
async function shopAdsCampaign(id){const cid=clean(id,180);if(!cid)return null;const snap=await getAdmin().firestore().collection('shopadsCampaigns').doc(cid).get();return snap.exists?{id:snap.id,...snap.data()}:null}
async function confirmShopAdsPayment(paymentId,expectedCampaign,expectedUid){
  const accessToken=await getPlatformAccessToken();if(!accessToken)throw new Error('Pagamento ainda não configurado.');
  const pid=clean(paymentId,100);if(!pid)throw new Error('Pagamento inválido.');
  const r=await fetch('https://api.mercadopago.com/v1/payments/'+encodeURIComponent(pid),{headers:{authorization:'Bearer '+accessToken,accept:'application/json'}});
  const p=await parseJsonSafe(r);if(!r.ok)throw new Error('Não foi possível confirmar o pagamento no Mercado Pago.');
  const ref=String(p.external_reference||'');const parts=ref.split(':');if(parts[0]!=='shopads'||!parts[1]||!parts[2])throw new Error('Pagamento não pertence ao ShopAds.');
  const campaignId=parts[1],ownerUid=parts.slice(2).join(':');
  if(expectedCampaign&&campaignId!==expectedCampaign)throw new Error('Pagamento não corresponde a esta campanha.');
  if(expectedUid&&ownerUid!==expectedUid)throw new Error('Pagamento não corresponde a este anunciante.');
  const c=await shopAdsCampaign(campaignId);if(!c||String(c.ownerUid||'')!==ownerUid)throw new Error('Campanha não encontrada para este pagamento.');
  const paid=String(p.status||'')==='approved';const amount=money(p.transaction_amount);const expected=money(c.budget);
  if(paid&&Math.abs(amount-expected)>0.01)throw new Error('O valor confirmado não corresponde ao orçamento da campanha.');
  const patch={paymentStatus:paid?'approved':String(p.status||'pending'),paymentId:String(p.id||pid),paymentAmount:amount,paymentUpdatedAt:admin.firestore.FieldValue.serverTimestamp()};
  if(paid){patch.paidAt=admin.firestore.FieldValue.serverTimestamp();patch.status='revisao';patch.submittedAt=admin.firestore.FieldValue.serverTimestamp()}
  await getAdmin().firestore().collection('shopadsCampaigns').doc(campaignId).set(patch,{merge:true});
  return{approved:paid,status:String(p.status||'pending'),campaignId,amount};
}

async function handleShopAdsPayment(req,res){
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed',message:'Método não permitido.'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}),campaignId=clean(body.campaignId,180),uid=clean(body.uid,180),email=clean(body.email,180).toLowerCase();
    if(!campaignId||!uid||!validEmail(email))return res.status(400).json({error:'Dados inválidos.',message:'Entre novamente e tente pagar a campanha.'});
    const c=await shopAdsCampaign(campaignId);if(!c)return res.status(404).json({error:'campaign_not_found',message:'Campanha não encontrada.'});
    if(String(c.ownerUid||'')!==uid||String(c.ownerEmail||'').toLowerCase()!==email)return res.status(403).json({error:'forbidden',message:'Esta campanha não pertence à sua conta.'});
    const budget=money(c.budget);if(budget<5)return res.status(400).json({error:'budget_too_low',message:'O orçamento mínimo da campanha é R$ 5,00.'});
    if(c.paymentStatus==='approved')return res.status(200).json({ok:true,alreadyPaid:true,message:'Esta campanha já está paga.'});
    const accessToken=await getPlatformAccessToken();if(!accessToken)return res.status(503).json({error:'payment_not_configured',message:'Pagamento ainda não configurado no Mercado Pago.'});
    const origin='https://www.alibr.com.br',returnUrl=`${origin}/?shopads_payment=return&campaign=${encodeURIComponent(campaignId)}`,externalReference=`shopads:${campaignId}:${uid}`;
    const preference={items:[{id:campaignId,title:String('ShopAds - '+(c.title||'Campanha')).slice(0,120),quantity:1,currency_id:'BRL',unit_price:Number(budget.toFixed(2))}],payer:{email},external_reference:externalReference,statement_descriptor:'SHOPADS',back_urls:{success:returnUrl,failure:returnUrl,pending:returnUrl},auto_return:'approved',notification_url:`${origin}/api/content.js?action=shopads-webhook`,metadata:{shopads_campaign_id:campaignId,shopads_owner_uid:uid}};
    const r=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+accessToken,'x-idempotency-key':`shopads-${campaignId}-${Date.now()}`},body:JSON.stringify(preference)});const j=await parseJsonSafe(r);
    if(!r.ok||!j?.init_point){console.error('ShopAds preference error:',r.status,j);return res.status(400).json({error:'preference_failed',message:'O Mercado Pago não conseguiu criar o pagamento agora.'});}
    await getAdmin().firestore().collection('shopadsCampaigns').doc(campaignId).set({paymentStatus:'pending',paymentPreferenceId:String(j.id||''),paymentAmount:budget,paymentRequestedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    return res.status(200).json({ok:true,checkoutUrl:j.init_point,preferenceId:j.id||'',amount:budget});
  }catch(e){console.error('shopads-pagamento',e);return res.status(500).json({error:'shopads_payment_failed',message:String(e.message||'Não foi possível iniciar o pagamento.')});}
}
async function handleShopAdsStatus(req,res){
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  try{const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});const result=await confirmShopAdsPayment(clean(body.paymentId,100),clean(body.campaignId,180),clean(body.uid,180));return res.status(200).json({ok:true,...result})}catch(e){console.error('shopads-status',e);return res.status(400).json({error:'payment_not_confirmed',message:String(e.message||'Pagamento ainda não confirmado.')})}
}
async function handleShopAdsWebhook(req,res){
  try{const id=clean(req.query?.['data.id']||req.query?.id||req.body?.data?.id||req.body?.id,100);if(id)await confirmShopAdsPayment(id,'','');return res.status(200).json({ok:true})}catch(e){console.error('shopads-webhook',e);return res.status(200).json({ok:false})}
}

async function handleSubscription(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed',message:'Método não permitido.'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const plano=clean(body.plano,30).toLowerCase();
    const cfg=PLANOS_ASSINATURA[plano];
    const uid=clean(body.uid,160);
    const email=clean(body.email,180).toLowerCase();
    if(!cfg)return res.status(400).json({error:'Plano inválido.',message:'Plano inválido.'});
    if(!uid||!validEmail(email))return res.status(400).json({error:'Usuário ou e-mail inválido. Entre novamente no ChatShop.',message:'Usuário ou e-mail inválido. Entre novamente no ChatShop.'});
    const accessToken=await getPlatformAccessToken();
    if(!accessToken)return res.status(503).json({error:'Pagamento ainda não configurado. Cadastre MP_ACCESS_TOKEN na Vercel.',message:'Pagamento ainda não configurado. Cadastre MP_ACCESS_TOKEN na Vercel.'});
    const origin='https://www.alibr.com.br';
    const payload={reason:cfg.nome,external_reference:`chatshop-plan:${uid}:${plano}:${Date.now()}`,payer_email:email,back_url:`${origin}/?assinatura=retorno&plano=${encodeURIComponent(plano)}`,auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:cfg.valor,currency_id:'BRL'}};
    const r=await fetch('https://api.mercadopago.com/preapproval',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+accessToken,'x-idempotency-key':`chatshop-${uid}-${plano}-${Date.now()}`},body:JSON.stringify(payload)});
    const j=await parseJsonSafe(r);
    if(!r.ok||!j?.init_point){console.error('MP subscription error:',r.status,j);const detail=j&&(j.message||j.error||j.cause?.[0]?.description);const msg=detail?`Mercado Pago: ${String(detail).slice(0,220)}`:'O Mercado Pago não conseguiu criar a assinatura agora.';return res.status(400).json({error:msg,message:msg});}
    return res.status(200).json({ok:true,link:j.init_point,init_point:j.init_point,checkoutUrl:j.init_point,subscriptionId:j.id||'',status:j.status||'',plano,valor:cfg.valor});
  }catch(e){console.error('assinatura:',e);return res.status(500).json({error:'Não foi possível iniciar a assinatura. Tente novamente em instantes.',message:'Não foi possível iniciar a assinatura. Tente novamente em instantes.'});}
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
async function getPlatformSeo(){
  const url=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/config/platformSeo?key=${API_KEY}`;
  try{const r=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});if(r.ok){const j=await r.json();return decodeFields(j.fields||{})}}catch(e){}return{};
}

module.exports = async function handler(req,res){
  const action=String(req.query?.action||'');
  if(action==='assinatura')return handleSubscription(req,res);
  if(action==='shopads-pagamento')return handleShopAdsPayment(req,res);
  if(action==='shopads-status')return handleShopAdsStatus(req,res);
  if(action==='shopads-webhook')return handleShopAdsWebhook(req,res);
  try{
    const slug = cleanSlug(req.query && req.query.slug);
    if(!slug){ res.status(404).send('Página não encontrada.'); return; }
    const page = await getPage(slug);
    const platformSeo = await getPlatformSeo();
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
    const ga=/^G-[A-Z0-9]+$/.test(String(platformSeo.googleAnalyticsId||'').toUpperCase())?String(platformSeo.googleAnalyticsId).toUpperCase():'';
    const verification=/^[A-Za-z0-9_\-=]{6,200}$/.test(String(platformSeo.googleSearchConsoleVerification||''))?String(platformSeo.googleSearchConsoleVerification):'';
    const jsonLd = {'@context':'https://schema.org','@type':'Article',headline:title,description,mainEntityOfPage:canonical,publisher:{'@type':'Organization',name:'ChatShop',url:`https://${BASE_DOMAIN}/site`},...(ogImage ? {image:[ogImage]} : {})};

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${verification ? `<meta name="google-site-verification" content="${esc(verification)}">` : ''}
${ga ? `<meta name="chatshop-google-analytics-id" content="${esc(ga)}"><script src="/analytics-loader.js?v=20260816-1700" defer></script>` : ''}
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
