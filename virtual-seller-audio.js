/* Loja Virtual: botão verde de áudio igual ao catálogo, inclusive na versão com frete/SuperFrete. */
(function(){
'use strict';
/* Recursos da vitrine publicada não devem executar dentro do painel/editor. */
if(location.hostname==='alibr.com.br'||location.hostname==='www.alibr.com.br')return;

let storeData = window.__CHATSHOP_STORE_DATA || null;
let featureData = window.__CHATSHOP_STORE_FEATURE_DATA || null;
let currentAudio = null;
let currentButton = null;
let activeProductIndex = -1;
let scheduled = false;

const clean=v=>String(v==null?'':v).trim();
function slugBase(value){
  return clean(value||'produto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'produto';
}
function buildProductSlugs(ps){
  const used={};
  return ps.map(p=>{
    const base=slugBase(p?.name);
    used[base]=(used[base]||0)+1;
    return used[base]===1?base:`${base}-${used[base]}`;
  });
}
function currentPathSlug(){
  const m=location.pathname.match(/^\/produto\/([^/]+)\/?$/i);
  if(!m)return'';
  try{return decodeURIComponent(m[1]).toLowerCase()}catch(e){return clean(m[1]).toLowerCase()}
}
function storeProducts(){
  if(storeData && Array.isArray(storeData.products)) return storeData.products;
  if(featureData && Array.isArray(featureData.products)) return featureData.products;
  return [];
}
function indexFromCurrentUrl(){
  const wanted=currentPathSlug();
  if(!wanted)return-1;
  const ps=storeProducts();
  return buildProductSlugs(ps).indexOf(wanted);
}
function controls(){
  return (storeData && storeData.adminControl) || (featureData && featureData.adminControl) || {};
}
function money(v){
  const s=clean(v); if(!s) return '';
  let n=Number(s.replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'));
  return Number.isFinite(n)&&n>0?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):s;
}
function fallbackText(p,context='catalog'){
  const name=clean(p?.name)||'Produto';
  if(context==='sale'){
    const sales=clean(p?.sellerSalesAudioText);
    if(sales)return sales;
    return `${name}. Escolha a cor, ajuste a quantidade e toque em Adicionar à sacola para continuar sua compra.`;
  }
  const t=clean(p?.sellerAudioText)||clean(p?.voiceText)||clean(p?.cardDescription)||clean(p?.displayText);
  if(t) return t;
  const price=money(p?.price);
  return price?`${name}. ${price}. Toque em Ver produto para conferir todos os detalhes.`:`${name}. Toque em Ver produto para conferir todos os detalhes.`;
}
function stopPlayback(){
  try{speechSynthesis.cancel()}catch(e){}
  if(currentAudio){try{currentAudio.pause();currentAudio.currentTime=0}catch(e){} currentAudio=null;}
  if(currentButton){currentButton.innerHTML=currentButton.classList.contains('virtual-seller-audio-detail')?'🔊 Como comprar':'🔊 Detalhes do produto';currentButton=null;}
}
function speak(text){
  const t=clean(text); if(!t){stopPlayback();return;}
  try{
    const u=new SpeechSynthesisUtterance(t);
    u.lang='pt-BR';
    u.onend=stopPlayback;
    u.onerror=stopPlayback;
    speechSynthesis.speak(u);
  }catch(e){stopPlayback()}
}
function playProduct(p,btn,context='catalog'){
  if(currentButton===btn){stopPlayback();return;}
  stopPlayback();
  currentButton=btn;
  btn.innerHTML='⏹️ Parar áudio';
  if(context==='sale'){speak(fallbackText(p,'sale'));return}
  const mode=clean(p?.sellerAudioMode||'off');
  const url=clean(p?.sellerAudioUrl);
  if((mode==='upload'||mode==='record')&&url){
    try{
      const a=new Audio(url);
      currentAudio=a;
      a.onended=stopPlayback;
      a.onerror=()=>{currentAudio=null;speak(fallbackText(p,'catalog'))};
      a.play().catch(()=>{currentAudio=null;speak(fallbackText(p,'catalog'))});
      return;
    }catch(e){}
  }
  speak(fallbackText(p,'catalog'));
}
function fallbackFromCard(card){
  const name=clean(card.querySelector('.vs-card-name,.csv-name,.cgc-name')?.textContent)||'Produto';
  const price=clean(card.querySelector('.vs-card-price,.csv-price,.cgc-price')?.textContent);
  return {name,price};
}
function productForIndex(index,card){
  const ps=storeProducts();
  return ps[index] || fallbackFromCard(card);
}
function detailBody(){
  return document.getElementById('csvProductBody') || document.getElementById('vsProductBody');
}
function productForDetail(){
  const ps=storeProducts();
  const urlIndex=indexFromCurrentUrl();
  if(urlIndex>=0&&ps[urlIndex]){
    activeProductIndex=urlIndex;
    return ps[urlIndex];
  }
  const body=detailBody();
  const name=clean(body?.querySelector('.csv-dname,.vs-detail-name')?.textContent);
  const price=clean(body?.querySelector('.csv-dprice,.vs-detail-price')?.textContent);
  if(name){
    const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const byName=ps.findIndex(p=>norm(p?.name)===norm(name));
    if(byName>=0){
      activeProductIndex=byName;
      return ps[byName];
    }
  }
  if(activeProductIndex>=0&&ps[activeProductIndex]) return ps[activeProductIndex];
  return name?{name,price}:null;
}
function makeButton(resolveProduct,cls){
  const b=document.createElement('button');
  b.type='button';
  b.className='virtual-seller-audio-btn '+cls;
  const sale=cls.includes('virtual-seller-audio-detail');
  b.innerHTML=sale?'🔊 Como comprar':'🔊 Detalhes do produto';
  b.setAttribute('aria-label',sale?'Ouvir como comprar':'Ouvir detalhes do produto');
  b.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    const p=resolveProduct();
    if(p) playProduct(p,b,sale?'sale':'catalog');
  };
  return b;
}
function addButtonsFor(selector,openSelector,imageSelector){
  document.querySelectorAll(selector).forEach((card,fallbackIndex)=>{
    if(card.querySelector('.virtual-seller-audio-card')) return;
    const open=card.querySelector(openSelector);
    let index=Number(open?.dataset.product);
    if(!Number.isInteger(index)||index<0){
      index=Number(card.dataset.i);
      if(!Number.isInteger(index)||index<0) index=fallbackIndex;
    }
    const host=card.querySelector(imageSelector)||card;
    if(getComputedStyle(host).position==='static') host.style.position='relative';
    host.appendChild(makeButton(()=>productForIndex(index,card),'virtual-seller-audio-card'));
  });
}
function addCardButtons(){
  if(controls().sellerAudioPaused) return;
  addButtonsFor('.csv-card','.csv-open[data-product]','.csv-photo');
  addButtonsFor('.vs-card','.vs-open[data-product]','.vs-card-img');
  addButtonsFor('.cgc','.cgc-buy','.cgc-img');
}
function addDetailButton(){
  if(controls().sellerAudioPaused) return;
  const body=detailBody();
  if(!body || body.querySelector('.virtual-seller-audio-detail')) return;
  const hasDetail=body.querySelector('.csv-dname,.vs-detail-name');
  if(!hasDetail) return;
  const b=makeButton(()=>productForDetail(),'virtual-seller-audio-detail');
  const price=body.querySelector('.csv-dprice,.vs-detail-price');
  if(price) price.insertAdjacentElement('afterend',b); else body.appendChild(b);
}
function apply(){
  scheduled=false;
  const urlIndex=indexFromCurrentUrl();
  if(urlIndex>=0)activeProductIndex=urlIndex;
  if(controls().sellerAudioPaused){
    stopPlayback();
    document.querySelectorAll('.virtual-seller-audio-btn').forEach(x=>x.remove());
    return;
  }
  addCardButtons();
  addDetailButton();
}
function schedule(){
  if(scheduled) return;
  scheduled=true;
  requestAnimationFrame(apply);
}

async function loadStore(){
  const host=location.hostname.toLowerCase().replace(/\.$/,'');
  if(!host.endsWith('.alibr.com.br')||host==='www.alibr.com.br') return;
  const slug=host.slice(0,-'.alibr.com.br'.length);
  if(!slug||slug.includes('.')) return;
  for(let i=0;i<12;i++){
    try{
      const db=window.firebase?.firestore?.();
      if(db){
        const snap=await db.collection('chatshops').doc(slug).get();
        if(snap.exists){storeData={slug,...snap.data()};const urlIndex=indexFromCurrentUrl();if(urlIndex>=0)activeProductIndex=urlIndex;schedule();return;}
      }
    }catch(e){}
    await new Promise(r=>setTimeout(r,300));
  }
}

if(!document.getElementById('virtualSellerAudioStyle')){
  const s=document.createElement('style');
  s.id='virtualSellerAudioStyle';
  s.textContent=`
  .virtual-seller-audio-btn{border:0!important;border-radius:999px!important;background:#16a34a!important;color:#fff!important;font-weight:900!important;box-shadow:0 3px 12px rgba(0,0,0,.28)!important;cursor:pointer!important;pointer-events:auto!important;line-height:1.15!important;font-family:Arial,sans-serif!important}
  .virtual-seller-audio-card{position:absolute!important;left:8px!important;right:8px!important;bottom:8px!important;z-index:25!important;width:calc(100% - 16px)!important;padding:10px 8px!important;font-size:12px!important;display:flex!important;align-items:center!important;justify-content:center!important}
  .virtual-seller-audio-detail{position:relative!important;width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0 0 13px!important;padding:12px 14px!important;font-size:14px!important;z-index:2!important}
  @media(max-width:520px){.virtual-seller-audio-card{font-size:11px!important;padding:9px 6px!important}.virtual-seller-audio-detail{font-size:13px!important}}
  `;
  document.head.appendChild(s);
}

document.addEventListener('click',e=>{
  const open=e.target.closest?.('.csv-open[data-product],.vs-open[data-product]');
  if(open){
    activeProductIndex=Number(open.dataset.product);
    setTimeout(schedule,20);
    setTimeout(schedule,120);
    return;
  }
  const gridCard=e.target.closest?.('.cgc[data-i]');
  if(gridCard&&!e.target.closest?.('.cgc-buy')){
    const i=Number(gridCard.dataset.i);
    if(Number.isInteger(i)&&i>=0)activeProductIndex=i;
    setTimeout(schedule,20);
    setTimeout(schedule,120);
    return;
  }
  if(e.target.closest?.('[data-close="product"],.cgc-back,.cgc-menu')){
    stopPlayback();
    activeProductIndex=-1;
  }
},true);

window.addEventListener('popstate',()=>{activeProductIndex=indexFromCurrentUrl();schedule()});
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
loadStore();
[100,300,700,1200,2000,3500].forEach(ms=>setTimeout(schedule,ms));
setInterval(schedule,1500);
})();