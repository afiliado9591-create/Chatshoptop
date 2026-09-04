const admin=require('firebase-admin');
const PROJECT_ID='chatshop-97ea3';
const API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const COLLECTION='chatshops';
const BASE_DOMAIN='alibr.com.br';

function host(v){return String(v||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function fv(v){if(!v)return null;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return!!v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('timestampValue'in v)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(fv);if(v.mapValue){const o={};for(const[k,x]of Object.entries(v.mapValue.fields||{}))o[k]=fv(x);return o}return null}
function docData(doc){const o={};for(const[k,v]of Object.entries(doc?.fields||{}))o[k]=fv(v);return o}
function slugify(s){return String(s||'produto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'produto'}
function productSlugs(products){const used={};return(products||[]).map(p=>{const b=slugify(p?.name);used[b]=(used[b]||0)+1;return used[b]===1?b:b+'-'+used[b]})}
function clean(v,max=200){return String(v||'').trim().slice(0,max)}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim())}
function affiliateCode(){return'af_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function json(res,status,data){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.status(status).end(JSON.stringify(data))}

function getAdmin(){
  if(admin.apps.length)return admin.app();
  const raw=process.env.CHATSHOP_FIREBASE_SERVICE_ACCOUNT;
  if(!raw)throw new Error('CHATSHOP_FIREBASE_SERVICE_ACCOUNT ausente');
  const service=JSON.parse(raw);
  return admin.initializeApp({credential:admin.credential.cert(service),projectId:PROJECT_ID});
}

async function getBySlug(slug){
  const u=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(slug)}?key=${API_KEY}`;
  const r=await fetch(u,{headers:{accept:'application/json'},cache:'no-store'});
  if(!r.ok)return null;
  const d=await r.json();
  return{slug,data:docData(d)};
}
async function getByCustomDomain(h){
  const candidates=h.startsWith('www.')?[h,h.slice(4)]:[h,'www.'+h];
  const url=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  for(const candidate of[...new Set(candidates)]){
    const body={structuredQuery:{from:[{collectionId:COLLECTION}],where:{fieldFilter:{field:{fieldPath:'customDomain'},op:'EQUAL',value:{stringValue:candidate}}},limit:1}};
    const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    if(!r.ok)continue;
    const rows=await r.json(),doc=Array.isArray(rows)?rows.find(x=>x?.document)?.document:null;
    if(doc){const data=docData(doc),slug=String(data.slug||String(doc.name||'').split('/').pop()||'').trim();if(slug)return{slug,data}}
  }
  return null;
}
async function resolveStore(raw){
  const h=host(raw);
  if(h.endsWith('.'+BASE_DOMAIN)){
    const s=h.slice(0,-('.'+BASE_DOMAIN).length);
    if(s&&s!=='www'&&!s.includes('.'))return getBySlug(s);
  }
  if(h!==BASE_DOMAIN&&h!=='www.'+BASE_DOMAIN&&!h.endsWith('.vercel.app'))return getByCustomDomain(h);
  return null;
}
function paragraphs(text){return String(text||'').split(/\n\s*\n/).filter(Boolean).map(x=>'<p>'+esc(x).replace(/\n/g,'<br>')+'</p>').join('')}
function shell(s,found,title,body,affiliateEnabled){
  const brand=esc(s.brand||found.slug),logo=String(s.logo||''),main=/^#[0-9a-f]{6}$/i.test(s.mainColor||'')?s.mainColor:'#7A2E3B';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · ${brand}</title><meta name="description" content="${esc(title+' — '+brand)}"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#f8fafc;color:#1f2937;line-height:1.6}.head{background:${main};color:#fff}.headin,.wrap,.footin{max-width:820px;margin:auto;padding:16px}.brand{display:flex;gap:10px;align-items:center;color:#fff;text-decoration:none;font-weight:900}.logo{width:44px;height:44px;border-radius:50%;background:#fff2;display:grid;place-items:center;overflow:hidden}.logo img{width:100%;height:100%;object-fit:cover}.nav{display:flex;gap:7px;overflow:auto;padding-top:11px}.nav a{color:#fff;text-decoration:none;border:1px solid #ffffff55;border-radius:999px;padding:6px 10px;font-size:12px;white-space:nowrap}.wrap{padding-top:22px;padding-bottom:48px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:22px;box-shadow:0 8px 28px #0001}.card h1{font-size:clamp(27px,6vw,42px);line-height:1.12;margin:0 0 12px}.card p{color:#4b5563}.btn{display:inline-block;border:0;border-radius:11px;background:${main};color:#fff;padding:12px 16px;font-weight:900;text-decoration:none;cursor:pointer}.btn:disabled{opacity:.6;cursor:wait}.field{margin:12px 0}.field label{display:block;font-size:12px;font-weight:800;margin-bottom:5px}.field input{width:100%;padding:11px;border:1px solid #d1d5db;border-radius:10px;font:inherit}.muted{color:#6b7280;font-size:13px}.pill{display:inline-block;background:#ecfdf5;color:#047857;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}.ok{display:none;background:#ecfdf5;border:1px solid #a7f3d0;padding:14px;border-radius:12px;margin-top:14px}.url{word-break:break-all;background:#fff;border:1px dashed #34d399;border-radius:9px;padding:9px;font-size:12px}.products{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}.product-link{display:flex;justify-content:space-between;gap:8px;align-items:center;border:1px solid #d1fae5;background:#fff;border-radius:9px;padding:9px;font-size:12px}.product-link button{border:0;background:${main};color:#fff;border-radius:7px;padding:7px;font-weight:800}.foot{border-top:1px solid #e5e7eb;background:#fff}.footin{font-size:12px;color:#6b7280;display:flex;gap:12px;flex-wrap:wrap}.footin a{color:inherit}@media(max-width:600px){.card{padding:18px}.headin{padding-bottom:12px}}</style></head><body><header class="head"><div class="headin"><a class="brand" href="/"><span class="logo">${/^https?:\/\//i.test(logo)?'<img src="'+esc(logo)+'" alt="">':'🛍️'}</span><span>${brand}</span></a><nav class="nav"><a href="/">Loja</a><a href="/quem-somos">Quem somos</a><a href="/politica-de-privacidade">Privacidade</a>${affiliateEnabled?'<a href="/afiliados">Ganhe dinheiro</a>':''}</nav></div></header><main class="wrap"><section class="card">${body}</section></main><footer class="foot"><div class="footin"><span>© ${new Date().getFullYear()} ${brand}</span><a href="/quem-somos">Quem somos</a><a href="/politica-de-privacidade">Política de Privacidade</a>${affiliateEnabled?'<a href="/afiliados">Afiliados</a>':''}</div></footer></body></html>`;
}

async function handleAffiliatePost(req,res,found){
  const s=found.data||{},ap=s.affiliateProgram||{};
  if(ap.enabled!==true)return json(res,403,{ok:false,error:'Programa de afiliados indisponível.'});
  const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  const name=clean(body.name,120),whatsapp=clean(body.whatsapp,30).replace(/\D/g,''),email=clean(body.email,180).toLowerCase(),social=clean(body.social,220);
  if(!name||whatsapp.length<10||!validEmail(email))return json(res,400,{ok:false,error:'Preencha nome, WhatsApp e e-mail corretamente.'});
  try{
    const app=getAdmin(),db=app.firestore(),code=affiliateCode(),entry={affiliateCode:code,affiliateName:name,affiliateWhatsapp:whatsapp,affiliateEmail:email,affiliateSocial:social,affiliateStatus:'active',createdAt:admin.firestore.FieldValue.serverTimestamp()};
    await db.collection('chatshops').doc(found.slug).collection('leads').add({type:'affiliate_application',...entry});
    await db.collection('chatshops').doc(found.slug).set({affiliateDirectory:{[code]:entry}},{merge:true});
    const products=Array.isArray(s.products)?s.products:[],slugs=productSlugs(products);
    return json(res,200,{ok:true,code,products:products.map((p,i)=>({name:String(p?.name||'Produto'),slug:slugs[i]}))});
  }catch(e){
    console.error('affiliate-register',e);
    const setup=String(e?.message||'').includes('CHATSHOP_FIREBASE_SERVICE_ACCOUNT');
    return json(res,setup?503:500,{ok:false,error:setup?'Cadastro ainda não configurado no servidor.':'Não foi possível concluir o cadastro agora.'});
  }
}

module.exports=async function(req,res){
  try{
    const found=await resolveStore(req.headers['x-forwarded-host']||req.headers.host||'');
    if(!found)return req.method==='POST'?json(res,404,{ok:false,error:'Loja não encontrada.'}):res.status(404).send('Loja não encontrada.');
    if(req.method==='POST')return handleAffiliatePost(req,res,found);
    const s=found.data||{},pages=s.storePages||{},ap=s.affiliateProgram||{},enabled=ap.enabled===true,page=String(req.query?.page||'affiliate');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public,max-age=0,s-maxage=10');
    if(page==='about'){
      const title=pages.aboutTitle||'Quem somos',text=pages.aboutText||('Conheça a '+(s.brand||found.slug)+'. Trabalhamos para oferecer produtos, atendimento e uma experiência de compra simples e segura.');
      return res.status(200).send(shell(s,found,title,'<h1>'+esc(title)+'</h1>'+paragraphs(text),enabled));
    }
    if(page==='privacy'){
      const text=pages.privacyText||'Esta loja utiliza os dados informados pelo cliente somente para atendimento, processamento de pedidos, entrega e cumprimento das obrigações aplicáveis. Os pagamentos são processados pelo provedor escolhido pela loja. Para exercer seus direitos ou tirar dúvidas, entre em contato pelos canais oficiais da loja.';
      return res.status(200).send(shell(s,found,'Política de Privacidade','<h1>Política de Privacidade</h1>'+paragraphs(text),enabled));
    }
    if(!enabled)return res.status(404).send(shell(s,found,'Programa de afiliados','<h1>Programa de afiliados indisponível</h1><p>Esta loja não está aceitando novos afiliados no momento.</p>',false));

    const products=Array.isArray(s.products)?s.products:[],slugs=productSlugs(products),productData=products.map((p,i)=>({name:String(p?.name||'Produto'),slug:slugs[i]}));
    const headline=pages.affiliateHeadline||ap.headline||'Ganhe dinheiro indicando nossa loja';
    const description=pages.affiliateDescription||ap.description||'Cadastre-se, receba seu link exclusivo e divulgue nossos produtos.';
    const cta=pages.affiliateCta||ap.cta||'Quero ser afiliado';
    const commission=Math.max(0,Math.min(100,Number(ap.commissionPercent||0)));
    const terms=esc(ap.terms||'As regras de comissão são definidas pelo lojista.');
    const prod=JSON.stringify(productData).replace(/</g,'\\u003c');

    const body=`<h1>${esc(headline)}</h1><p>${esc(description)}</p>${commission?'<div class="pill">Comissão informada: '+commission+'%</div>':''}<p class="muted">${terms}</p><div id="form"><div class="field"><label>Seu nome</label><input id="name" autocomplete="name"></div><div class="field"><label>WhatsApp</label><input id="whatsapp" inputmode="tel" autocomplete="tel"></div><div class="field"><label>E-mail</label><input id="email" type="email" autocomplete="email"></div><div class="field"><label>Instagram ou rede social (opcional)</label><input id="social"></div><button class="btn" id="send" type="button">${esc(cta)}</button><div id="err" style="color:#b91c1c;font-size:12px;margin-top:8px"></div></div><div class="ok" id="ok"><b>✅ Cadastro realizado!</b><p class="muted">Link geral da loja:</p><div class="url" id="link"></div><button class="btn" id="copy" type="button">Copiar link da loja</button><div id="productLinks"></div></div><script>
const PRODUCTS=${prod};
const byId=id=>document.getElementById(id);
const formEl=byId('form'),nameEl=byId('name'),whatsappEl=byId('whatsapp'),emailEl=byId('email'),socialEl=byId('social'),sendEl=byId('send'),errEl=byId('err'),okEl=byId('ok'),linkEl=byId('link'),copyEl=byId('copy'),productLinksEl=byId('productLinks');
function copyText(t,b){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(()=>b.textContent='✅ Copiado').catch(()=>fallbackCopy(t,b));}else fallbackCopy(t,b)}
function fallbackCopy(t,b){const x=document.createElement('textarea');x.value=t;x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();try{document.execCommand('copy');b.textContent='✅ Copiado'}catch(e){}x.remove()}
sendEl.addEventListener('click',async()=>{
  const n=String(nameEl.value||'').trim(),w=String(whatsappEl.value||'').replace(/\\D/g,''),e=String(emailEl.value||'').trim(),so=String(socialEl.value||'').trim();
  errEl.textContent='';
  if(!n||w.length<10||!e||!e.includes('@')){errEl.textContent='Preencha nome, WhatsApp e e-mail corretamente.';return}
  sendEl.disabled=true;sendEl.textContent='Cadastrando...';
  try{
    const r=await fetch(location.pathname+location.search,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:n,whatsapp:w,email:e,social:so})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.ok)throw new Error(j.error||'Não foi possível concluir o cadastro agora.');
    const c=j.code,general=location.origin+'/?ref='+encodeURIComponent(c),products=Array.isArray(j.products)?j.products:PRODUCTS;
    formEl.style.display='none';okEl.style.display='block';linkEl.textContent=general;copyEl.onclick=()=>copyText(general,copyEl);
    productLinksEl.innerHTML=products.length?'<p class="muted"><b>Links dos produtos:</b></p><div class="products">'+products.map(p=>{const u=location.origin+'/produto/'+encodeURIComponent(p.slug)+'?ref='+encodeURIComponent(c);return'<div class="product-link"><span>'+String(p.name||'Produto').replace(/[&<>]/g,'')+'</span><button type="button" data-url="'+u.replace(/"/g,'&quot;')+'">Copiar</button></div>'}).join('')+'</div>':'';
    productLinksEl.querySelectorAll('button').forEach(b=>b.onclick=()=>copyText(b.dataset.url,b));
  }catch(x){console.error(x);errEl.textContent=x.message||'Não foi possível concluir o cadastro agora.';sendEl.disabled=false;sendEl.textContent=${JSON.stringify(cta)};}
});
<\/script>`;
    return res.status(200).send(shell(s,found,headline,body,true));
  }catch(e){
    console.error(e);
    if(req.method==='POST')return json(res,500,{ok:false,error:'Não foi possível concluir o cadastro agora.'});
    return res.status(500).send('Não foi possível abrir esta página agora.');
  }
};
