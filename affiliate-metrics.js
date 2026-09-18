(function(){
'use strict';
const $=(s,r)=> (r||document).querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let installed=false;

function authToken(){
  try{return window.auth?.currentUser?.getIdToken?.()}catch(e){return null}
}
function ensureStyles(){
  if($('#affiliateMetricsStyle'))return;
  const s=document.createElement('style');s.id='affiliateMetricsStyle';s.textContent=`
  .afm-overlay{position:fixed;inset:0;background:#0008;z-index:10000;display:flex;align-items:center;justify-content:center;padding:14px}
  .afm-box{width:min(760px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 20px 60px #0004}
  .afm-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.afm-close{border:0;background:none;font-size:24px;cursor:pointer}
  .afm-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0}.afm-card{border:1px solid #e5e7eb;border-radius:12px;padding:12px}.afm-card b{display:block;font-size:22px;margin-top:3px}.afm-muted{font-size:11px;color:#6b7280}.afm-table{width:100%;border-collapse:collapse;font-size:12px}.afm-table th,.afm-table td{text-align:left;padding:9px;border-bottom:1px solid #eee}.afm-empty{padding:18px;border:1px dashed #d1d5db;border-radius:12px;color:#6b7280;text-align:center}
  @media(max-width:600px){.afm-cards{grid-template-columns:repeat(2,1fr)}.afm-box{padding:14px}}
  `;document.head.appendChild(s);
}
function openModal(){
  ensureStyles();
  let m=$('#affiliateMetricsModal');
  if(!m){m=document.createElement('div');m.id='affiliateMetricsModal';m.className='afm-overlay';m.innerHTML=`<div class="afm-box"><div class="afm-head"><div><h2 style="margin:0">📊 Minhas métricas de afiliado</h2><div class="afm-muted">Cliques e vendas gerados pelos seus links do ChatShop</div></div><button class="afm-close" data-afm-close>×</button></div><div id="afmContent" style="margin-top:12px">Carregando...</div></div>`;document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-afm-close]'))m.remove()})}
  loadMetrics();
}
async function loadMetrics(){
  const box=$('#afmContent');if(!box)return;box.innerHTML='Carregando suas métricas...';
  const token=await authToken();
  if(!token){box.innerHTML='<div class="afm-empty">Entre na sua conta do ChatShop para ver suas métricas.</div>';return}
  try{
    const r=await fetch('/api/affiliate-metrics.js',{headers:{Authorization:'Bearer '+token}});
    const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j.message||'Não foi possível carregar.');
    const s=j.summary||{};
    const fmt=n=>Number(n||0).toLocaleString('pt-BR');
    const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    box.innerHTML=`<div class="afm-cards"><div class="afm-card">Cliques<b>${fmt(s.clicks)}</b></div><div class="afm-card">Vendas aprovadas<b>${fmt(s.sales)}</b></div><div class="afm-card">Conversão<b>${String(s.conversion||0).replace('.',',')}%</b></div><div class="afm-card">Comissão estimada<b>${money(s.commission)}</b></div></div>${j.stores?.length?'<table class="afm-table"><thead><tr><th>Loja</th><th>Cliques</th><th>Vendas</th><th>Valor vendido</th><th>Comissão</th></tr></thead><tbody>'+j.stores.map(x=>'<tr><td><b>'+esc(x.brand)+'</b><div class="afm-muted">Link: '+esc(x.code)+'</div></td><td>'+fmt(x.clicks)+'</td><td>'+fmt(x.sales)+'</td><td>'+money(x.totalSalesValue)+'</td><td>'+money(x.estimatedCommission)+'</td></tr>').join('')+'</tbody></table>':'<div class="afm-empty">Você ainda não tem uma afiliação ChatShop vinculada ao seu e-mail.</div>'}`;
  }catch(e){box.innerHTML='<div class="afm-empty">'+esc(e.message||'Não foi possível carregar as métricas.')+'</div>'}
}
function addButton(){
  if($('#affiliateMetricsBtn'))return;
  const head=document.querySelector('#dashboard .dash-head>div:last-child');
  if(!head)return;
  const b=document.createElement('button');b.className='btn';b.id='affiliateMetricsBtn';b.type='button';b.textContent='📊 Métricas de afiliado';b.onclick=openModal;head.insertBefore(b,head.firstChild);
}
function trackPublic(){
  try{
    const p=new URLSearchParams(location.search),ref=p.get('ref');if(!ref)return;
    const host=location.hostname.toLowerCase();const m=host.match(/^([a-z0-9-]+)\\.alibr\\.com\\.br$/);if(!m)return;
    const slug=m[1],key='chatshop_af_click_'+slug+'_'+ref,now=Date.now(),last=Number(localStorage.getItem(key)||0);
    if(last&&now-last<30*60*1000)return;
    localStorage.setItem(key,String(now));
    window.__CHATSHOP_AFFILIATE_REF=ref;
    fetch('/api/affiliate-track.js',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug,affiliateCode:ref,productSlug:new URLSearchParams(location.search).get('product')||'',source:'storefront',visitorId:localStorage.getItem('chatshop_visitor_id')||''})}).catch(()=>{});
  }catch(e){}
  try{const p=new URLSearchParams(location.search),ref=p.get('ref');if(ref){localStorage.setItem('chatshop_affiliate_ref',ref);window.__CHATSHOP_AFFILIATE_REF=ref}}catch(e){}
}
function install(){
  if(installed)return;installed=true;ensureStyles();
  const tick=()=>{addButton();trackPublic()};
  tick();setTimeout(tick,300);setTimeout(tick,1200);
  new MutationObserver(tick).observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();