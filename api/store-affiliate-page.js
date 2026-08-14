const PROJECT_ID='chatshop-97ea3';
const API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const COLLECTION='chatshops';
const BASE_DOMAIN='alibr.com.br';

function host(v){return String(v||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fv(v){
  if(!v)return null;
  if('stringValue'in v)return v.stringValue;
  if('booleanValue'in v)return !!v.booleanValue;
  if('integerValue'in v)return Number(v.integerValue);
  if('doubleValue'in v)return Number(v.doubleValue);
  if('timestampValue'in v)return v.timestampValue;
  if(v.arrayValue)return (v.arrayValue.values||[]).map(fv);
  if(v.mapValue){const o={};for(const[k,x]of Object.entries(v.mapValue.fields||{}))o[k]=fv(x);return o}
  return null;
}
function docData(doc){const o={};for(const[k,v]of Object.entries(doc?.fields||{}))o[k]=fv(v);return o}
async function getBySlug(slug){
  const u=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(slug)}?key=${API_KEY}`;
  const r=await fetch(u,{headers:{accept:'application/json'}});if(!r.ok)return null;const d=await r.json();return{slug,data:docData(d)};
}
async function getByCustomDomain(h){
  const candidates=h.startsWith('www.')?[h,h.slice(4)]:[h,`www.${h}`];
  const url=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  for(const candidate of [...new Set(candidates)]){
    const body={structuredQuery:{from:[{collectionId:COLLECTION}],where:{fieldFilter:{field:{fieldPath:'customDomain'},op:'EQUAL',value:{stringValue:candidate}}},limit:1}};
    const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(body)});if(!r.ok)continue;
    const rows=await r.json();const doc=Array.isArray(rows)?rows.find(x=>x?.document)?.document:null;if(!doc)continue;
    const data=docData(doc);const slug=String(data.slug||String(doc.name||'').split('/').pop()||'').trim();if(slug)return{slug,data};
  }
  return null;
}
async function resolveStore(rawHost){
  const h=host(rawHost);if(!h)return null;
  if(h.endsWith(`.${BASE_DOMAIN}`)){
    const slug=h.slice(0,-(`.${BASE_DOMAIN}`.length));
    if(slug&&slug!=='www'&&!slug.includes('.'))return getBySlug(slug);
  }
  if(h!==BASE_DOMAIN&&h!==`www.${BASE_DOMAIN}`&&!h.endsWith('.vercel.app'))return getByCustomDomain(h);
  return null;
}
module.exports=async function(req,res){
  try{
    const raw=req.headers['x-forwarded-host']||req.headers.host||'';
    const found=await resolveStore(raw);
    if(!found)return res.status(404).send('<!doctype html><meta charset="utf-8"><title>Programa de afiliados</title><p>Loja não encontrada.</p>');
    const s=found.data||{},ap=s.affiliateProgram&&typeof s.affiliateProgram==='object'?s.affiliateProgram:{};
    const enabled=String(s.planTier||'')==='profissional'&&ap.enabled===true;
    if(!enabled)return res.status(404).send('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Programa de afiliados</title><body style="font-family:Arial;padding:30px;text-align:center"><h2>Programa de afiliados indisponível</h2><p>Esta loja não está aceitando novos afiliados no momento.</p></body>');
    const brand=esc(s.brand||found.slug),logo=esc(s.logo||''),main=/^#[0-9a-f]{6}$/i.test(s.mainColor||'')?s.mainColor:'#6d28d9';
    const commission=Math.max(0,Math.min(100,Number(ap.commissionPercent||0)));
    const terms=esc(ap.terms||'Divulgue a loja com seu link exclusivo. As regras de comissão são definidas pelo lojista.');
    const config=JSON.stringify({apiKey:'AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8',authDomain:'chatshop-97ea3.firebaseapp.com',projectId:PROJECT_ID}).replace(/</g,'\\u003c');
    const slug=JSON.stringify(found.slug).replace(/</g,'\\u003c');
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public,max-age=0,s-maxage=10');
    return res.status(200).send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seja afiliado · ${brand}</title><script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#f6f7fb;color:#1f2937}.head{background:${main};color:#fff;padding:24px 18px}.wrap{max-width:620px;margin:auto}.brand{display:flex;gap:12px;align-items:center}.logo{width:54px;height:54px;border-radius:50%;background:#fff2;display:grid;place-items:center;overflow:hidden;font-weight:900}.logo img{width:100%;height:100%;object-fit:cover}.card{background:#fff;margin:18px auto;padding:20px;border-radius:18px;box-shadow:0 10px 35px #0001}.card h1{font-size:24px;margin:0 0 8px}.muted{color:#6b7280;font-size:13px;line-height:1.5}.pill{display:inline-block;background:#ecfdf5;color:#047857;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900;margin:8px 0}.field{margin:12px 0}.field label{display:block;font-size:12px;font-weight:800;margin-bottom:5px}.field input{width:100%;padding:11px;border:1px solid #d1d5db;border-radius:10px;font:inherit}.btn{width:100%;border:0;border-radius:11px;background:${main};color:#fff;padding:13px;font-size:15px;font-weight:900;cursor:pointer}.ok{display:none;background:#ecfdf5;border:1px solid #a7f3d0;padding:14px;border-radius:12px;margin-top:14px}.url{word-break:break-all;background:#fff;border:1px dashed #34d399;border-radius:9px;padding:10px;margin:8px 0;font-size:12px}.err{color:#b91c1c;font-size:12px;margin-top:8px}</style></head><body><div class="head"><div class="wrap"><div class="brand"><div class="logo">${logo?`<img src="${logo}" alt="">`:'🤝'}</div><div><b>${brand}</b><div style="opacity:.9;font-size:13px">Programa de afiliados</div></div></div></div></div><main class="wrap"><section class="card"><h1>Cadastre-se como afiliado</h1><p class="muted">Preencha seus dados para gerar seu link exclusivo de divulgação desta loja.</p>${commission?`<div class="pill">Comissão informada pela loja: ${commission}%</div>`:''}<p class="muted">${terms}</p><div id="form"><div class="field"><label>Seu nome</label><input id="name" autocomplete="name"></div><div class="field"><label>WhatsApp</label><input id="whatsapp" inputmode="tel" placeholder="DDD + número"></div><div class="field"><label>E-mail</label><input id="email" type="email" autocomplete="email"></div><div class="field"><label>Instagram ou rede social (opcional)</label><input id="social" placeholder="@seuperfil"></div><button class="btn" id="send">Quero ser afiliado</button><div class="err" id="err"></div></div><div class="ok" id="ok"><b>✅ Cadastro realizado!</b><p class="muted">Use este link para divulgar a loja:</p><div class="url" id="link"></div><button class="btn" id="copy" type="button">Copiar meu link</button></div></section></main><script>firebase.initializeApp(${config});const db=firebase.firestore(),auth=firebase.auth(),SLUG=${slug};function code(){return'af_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)};document.getElementById('send').onclick=async()=>{const n=document.getElementById('name').value.trim(),w=document.getElementById('whatsapp').value.replace(/\D/g,''),e=document.getElementById('email').value.trim(),s=document.getElementById('social').value.trim(),er=document.getElementById('err');er.textContent='';if(!n||w.length<10||!e){er.textContent='Preencha nome, WhatsApp e e-mail.';return}const b=document.getElementById('send');b.disabled=true;b.textContent='Cadastrando...';try{if(!auth.currentUser)await auth.signInAnonymously();const c=code();await db.collection('chatshops').doc(SLUG).collection('leads').add({type:'affiliate_application',affiliateCode:c,affiliateName:n,affiliateWhatsapp:w,affiliateEmail:e,affiliateSocial:s,affiliateStatus:'active',data:firebase.firestore.FieldValue.serverTimestamp()});const link=location.origin+'/?ref='+encodeURIComponent(c);document.getElementById('form').style.display='none';document.getElementById('ok').style.display='block';document.getElementById('link').textContent=link;document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(link);document.getElementById('copy').textContent='✅ Link copiado'}catch(x){}}}catch(x){console.error(x);er.textContent='Não foi possível concluir o cadastro agora.';b.disabled=false;b.textContent='Quero ser afiliado'}};</script></body></html>`);
  }catch(e){console.error(e);return res.status(500).send('Não foi possível abrir o programa de afiliados agora.');}
};