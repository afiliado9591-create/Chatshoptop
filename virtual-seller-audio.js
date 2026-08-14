/* Loja Virtual: mostra o mesmo botão verde de áudio do catálogo em todos os produtos. */
(function(){
'use strict';

let featureData = window.__CHATSHOP_STORE_FEATURE_DATA || {adminControl:{},products:[]};
let fullStore = window.__CHATSHOP_STORE_DATA || null;
let currentAudio = null;
let currentButton = null;
let activeProductIndex = -1;
let scheduled = false;

function clean(v){ return String(v == null ? '' : v).trim(); }
function controls(){ return (fullStore && fullStore.adminControl) || featureData.adminControl || {}; }
function products(){
  if (fullStore && Array.isArray(fullStore.products) && fullStore.products.length) return fullStore.products;
  return Array.isArray(featureData.products) ? featureData.products : [];
}
function money(v){
  const s=clean(v); if(!s) return '';
  const n=Number(s.replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'));
  return Number.isFinite(n)&&n>0?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):s;
}
function fallbackText(p){
  const explicit = clean(p?.sellerAudioText) || clean(p?.voiceText) || clean(p?.cardDescription) || clean(p?.displayText);
  if (explicit) return explicit;
  const name = clean(p?.name) || 'Produto';
  const price = money(p?.price);
  return price ? `${name}. ${price}. Toque em Ver produto para conferir todos os detalhes.` : `${name}. Toque em Ver produto para conferir todos os detalhes.`;
}
function hasPlayableAudio(p){ return !!(p && clean(p.name)); }

function stopPlayback(){
  try { speechSynthesis.cancel(); } catch(e) {}
  if (currentAudio) {
    try { currentAudio.pause(); currentAudio.currentTime = 0; } catch(e) {}
    currentAudio = null;
  }
  if (currentButton) {
    currentButton.innerHTML = '🔊 Detalhes do produto';
    currentButton = null;
  }
}

function speak(text, btn){
  const t=clean(text); if(!t){ stopPlayback(); return; }
  try {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'pt-BR';
    u.onend = stopPlayback;
    u.onerror = stopPlayback;
    speechSynthesis.speak(u);
  } catch(e) { stopPlayback(); }
}

function playProductAudio(p, btn){
  if (!p || !btn) return;
  if (currentButton === btn) { stopPlayback(); return; }
  stopPlayback();
  currentButton = btn;
  btn.innerHTML = '⏹️ Parar áudio';

  const mode = clean(p.sellerAudioMode || 'off');
  const url = clean(p.sellerAudioUrl);
  if ((mode === 'upload' || mode === 'record') && url) {
    try {
      const a = new Audio(url);
      currentAudio = a;
      a.onended = stopPlayback;
      a.onerror = function(){ currentAudio=null; speak(fallbackText(p),btn); };
      a.play().catch(function(){ currentAudio=null; speak(fallbackText(p),btn); });
      return;
    } catch(e) {}
  }
  speak(fallbackText(p), btn);
}

function productForDetail(){
  const ps = products();
  if (activeProductIndex >= 0 && ps[activeProductIndex]) return ps[activeProductIndex];
  const name = clean(document.querySelector('#vsProductBody .vs-detail-name')?.textContent);
  if (!name) return null;
  return ps.find(p => clean(p?.name) === name) || null;
}

function makeButton(p, extraClass){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'seller-audio-btn virtual-seller-audio-btn' + (extraClass ? ' ' + extraClass : '');
  b.innerHTML = '🔊 Detalhes do produto';
  b.setAttribute('aria-label', 'Ouvir detalhes do produto');
  b.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    playProductAudio(p, b);
  };
  return b;
}

function addButtonsToCards(){
  if (controls().sellerAudioPaused) return;
  const ps = products();
  document.querySelectorAll('.vs-card').forEach((card, fallbackIndex) => {
    const old=card.querySelector('.virtual-seller-audio-btn');
    const open = card.querySelector('.vs-open[data-product]');
    let index = Number(open && open.dataset.product);
    if (!Number.isInteger(index) || index < 0) index = fallbackIndex;
    const p = ps[index];
    if (!p || !hasPlayableAudio(p)) { if(old) old.remove(); return; }
    if (old) return;
    const host = card.querySelector('.vs-card-img') || card;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(makeButton(p, 'virtual-seller-audio-card'));
  });
}

function addButtonToProductPage(){
  if (controls().sellerAudioPaused) return;
  const body = document.getElementById('vsProductBody');
  if (!body || !body.querySelector('.vs-detail-name')) return;
  const p = productForDetail();
  if (!p || !hasPlayableAudio(p)) return;
  let b = body.querySelector('.virtual-seller-audio-detail');
  if (b) return;
  b = makeButton(p, 'virtual-seller-audio-detail');
  const price = body.querySelector('.vs-detail-price');
  if (price) price.insertAdjacentElement('afterend', b);
  else body.appendChild(b);
}

function apply(){
  scheduled = false;
  if (controls().sellerAudioPaused) {
    stopPlayback();
    document.querySelectorAll('.virtual-seller-audio-btn').forEach(x => x.remove());
    return;
  }
  addButtonsToCards();
  addButtonToProductPage();
}
function schedule(){
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(apply);
}

async function loadFullStore(){
  if (fullStore && Array.isArray(fullStore.products) && fullStore.products.length) { schedule(); return; }
  const host=location.hostname.toLowerCase().replace(/\.$/,'');
  if(!host.endsWith('.alibr.com.br') || host==='www.alibr.com.br') return;
  const slug=host.slice(0,-'.alibr.com.br'.length);
  if(!slug || slug.includes('.')) return;
  for(let attempt=0;attempt<8;attempt++){
    try{
      const db=window.firebase?.firestore?.();
      if(db){
        const snap=await db.collection('chatshops').doc(slug).get();
        if(snap.exists){ fullStore={slug,...snap.data()}; schedule(); return; }
      }
    }catch(e){}
    await new Promise(r=>setTimeout(r,350));
  }
}

if (!document.getElementById('virtualSellerAudioStyle')) {
  const st = document.createElement('style');
  st.id = 'virtualSellerAudioStyle';
  st.textContent = `
    .virtual-seller-audio-btn{border:0!important;border-radius:999px!important;padding:10px 12px!important;background:#16a34a!important;color:#fff!important;font-size:12px!important;font-weight:900!important;box-shadow:0 3px 12px rgba(0,0,0,.25)!important;cursor:pointer!important;pointer-events:auto!important;line-height:1.15!important}
    .virtual-seller-audio-card{position:absolute!important;left:8px!important;right:8px!important;bottom:8px!important;z-index:6!important;width:calc(100% - 16px)!important}
    .virtual-seller-audio-detail{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0 0 13px!important;padding:12px 14px!important;font-size:14px!important}
    @media(max-width:520px){.virtual-seller-audio-card{font-size:11px!important;padding:9px 8px!important}.virtual-seller-audio-detail{font-size:13px!important}}
  `;
  document.head.appendChild(st);
}

document.addEventListener('click', function(e){
  const open = e.target.closest && e.target.closest('.vs-open[data-product]');
  if (open) {
    activeProductIndex = Number(open.dataset.product);
    setTimeout(schedule, 20);
    return;
  }
  if (e.target.closest && e.target.closest('[data-close="product"]')) {
    stopPlayback();
    activeProductIndex = -1;
  }
}, true);

new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once:true});
else schedule();
loadFullStore();
setTimeout(schedule, 500);
setTimeout(schedule, 1500);
setTimeout(schedule, 3000);
})();