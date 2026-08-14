/* Loja Virtual: botão verde de áudio igual ao catálogo, visível imediatamente. */
(function(){
'use strict';

let storeData = window.__CHATSHOP_STORE_DATA || null;
let featureData = window.__CHATSHOP_STORE_FEATURE_DATA || null;
let currentAudio = null;
let currentButton = null;
let activeProductIndex = -1;
let scheduled = false;

const clean=v=>String(v==null?'':v).trim();

function storeProducts(){
  if(storeData && Array.isArray(storeData.products)) return storeData.products;
  if(featureData && Array.isArray(featureData.products)) return featureData.products;
  return [];
}
function controls(){
  return (storeData && storeData.adminControl) || (featureData && featureData.adminControl) || {};
}
function money(v){
  const s=clean(v); if(!s) return '';
  let n=Number(s.replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'));
  return Number.isFinite(n)&&n>0?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):s;
}
function fallbackText(p){
  const t=clean(p?.sellerAudioText)||clean(p?.voiceText)||clean(p?.cardDescription)||clean(p?.displayText);
  if(t) return t;
  const name=clean(p?.name)||'Produto';
  const price=money(p?.price);
  return price?`${name}. ${price}. Toque em Ver produto para conferir todos os detalhes.`:`${name}. Toque em Ver produto para conferir todos os detalhes.`;
}
function stopPlayback(){
  try{speechSynthesis.cancel()}catch(e){}
  if(currentAudio){try{currentAudio.pause();currentAudio.currentTime=0}catch(e){} currentAudio=null;}
  if(currentButton){currentButton.innerHTML='🔊 Detalhes do produto';currentButton=null;}
}
function speak(text){
  const t=clean(text); if(!t){stopPlayback();return;}
  try{
    const u=new SpeechSynthesisUtterance(t);u.lang='pt-BR';u.onend=stopPlayback;u.onerror=stopPlayback;speechSynthesis.speak(u);
  }catch(e){stopPlayback()}
}
function playProduct(p,btn){
  if(currentButton===btn){stopPlayback();return;}
  stopPlayback();currentButton=btn;btn.innerHTML='⏹️ Parar áudio';
  const mode=clean(p?.sellerAudioMode||'off');
  const url=clean(p?.sellerAudioUrl);
  if((mode==='upload'||mode==='record')&&url){
    try{
      const a=new Audio(url);currentAudio=a;a.onended=stopPlayback;a.onerror=()=>{currentAudio=null;speak(fallbackText(p))};a.play().catch(()=>{currentAudio=null;speak(fallbackText(p))});return;
    }catch(e){}
  }
  speak(fallbackText(p));
}
function fallbackFromCard(card){
  return {name:clean(card.querySelector('.vs-card-name')?.textContent)||'Produto',price:clean(card.querySelector('.vs-card-price')?.textContent)};
}
function productForIndex(index,card){
  const ps=storeProducts();
  return ps[index] || fallbackFromCard(card);
}
function productForDetail(){
  const ps=storeProducts();
  if(activeProductIndex>=0&&ps[activeProductIndex]) return ps[activeProductIndex];
  const body=document.getElementById('vsProductBody');
  const name=clean(body?.querySelector('.vs-detail-name')?.textContent);
  const price=clean(body?.querySelector('.vs-detail-price')?.textContent);
  return ps.find(p=>clean(p?.name)===name) || (name?{name,price}:null);
}
function makeButton(resolveProduct,cls){
  const b=document.createElement('button');
  b.type='button';b.className='seller-audio-btn virtual-seller-audio-btn '+cls;b.innerHTML='🔊 Detalhes do produto';
  b.onclick=e=>{e.preventDefault();e.stopPropagation();const p=resolveProduct();if(p)playProduct(p,b)};
  return b;
}
function addCardButtons(){
  if(controls().sellerAudioPaused)return;
  document.querySelectorAll('.vs-card').forEach((card,fallbackIndex)=>{
    if(card.querySelector('.virtual-seller-audio-card'))return;
    const open=card.querySelector('.vs-open[data-product]');
    let index=Number(open?.dataset.product);if(!Number.isInteger(index)||index<0)index=fallbackIndex;
    const host=card.querySelector('.vs-card-img')||card;
    if(getComputedStyle(host).position==='static')host.style.position='relative';
    host.appendChild(makeButton(()=>productForIndex(index,card),'virtual-seller-audio-card'));
  });
}
function addDetailButton(){
  if(controls().sellerAudioPaused)return;
  const body=document.getElementById('vsProductBody');
  if(!body||!body.querySelector('.vs-detail-name')||body.querySelector('.virtual-seller-audio-detail'))return;
  const b=makeButton(()=>productForDetail(),'virtual-seller-audio-detail');
  const price=body.querySelector('.vs-detail-price');
  if(price)price.insertAdjacentElement('afterend',b);else body.appendChild(b);
}
function apply(){
  scheduled=false;
  if(controls().sellerAudioPaused){stopPlayback();document.querySelectorAll('.virtual-seller-audio-btn').forEach(x=>x.remove());return;}
  addCardButtons();addDetailButton();
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}

async function loadStore(){
  const host=location.hostname.toLowerCase().replace(/\.$/,'');
  if(!host.endsWith('.alibr.com.br')||host==='www.alibr.com.br')return;
  const slug=host.slice(0,-'.alibr.com.br'.length);if(!slug||slug.includes('.'))return;
  for(let i=0;i<12;i++){
    try{
      const db=window.firebase?.firestore?.();
      if(db){const snap=await db.collection('chatshops').doc(slug).get();if(snap.exists){storeData={slug,...snap.data()};schedule();return;}}
    }catch(e){}
    await new Promise(r=>setTimeout(r,300));
  }
}

if(!document.getElementById('virtualSellerAudioStyle')){
  const s=document.createElement('style');s.id='virtualSellerAudioStyle';s.textContent=`
  .virtual-seller-audio-btn{border:0!important;border-radius:999px!important;background:#16a34a!important;color:#fff!important;font-weight:900!important;box-shadow:0 3px 12px rgba(0,0,0,.25)!important;cursor:pointer!important;pointer-events:auto!important;line-height:1.15!important}
  .virtual-seller-audio-card{position:absolute!important;left:8px!important;right:8px!important;bottom:8px!important;z-index:8!important;width:calc(100% - 16px)!important;padding:10px 8px!important;font-size:12px!important}
  .virtual-seller-audio-detail{position:relative!important;width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0 0 13px!important;padding:12px 14px!important;font-size:14px!important}
  @media(max-width:520px){.virtual-seller-audio-card{font-size:11px!important;padding:9px 6px!important}.virtual-seller-audio-detail{font-size:13px!important}}
  `;document.head.appendChild(s);
}

document.addEventListener('click',e=>{
  const open=e.target.closest?.('.vs-open[data-product]');
  if(open){activeProductIndex=Number(open.dataset.product);setTimeout(schedule,30);return;}
  if(e.target.closest?.('[data-close="product"]')){stopPlayback();activeProductIndex=-1;}
},true);

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
loadStore();
setTimeout(schedule,250);setTimeout(schedule,700);setTimeout(schedule,1500);setTimeout(schedule,3000);
})();