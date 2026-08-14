/* Loja Virtual: mostra o mesmo botão verde de áudio dos produtos do catálogo. */
(function(){
'use strict';

const featureData = window.__CHATSHOP_STORE_FEATURE_DATA || null;
if (!featureData) return;

let currentAudio = null;
let currentButton = null;
let activeProductIndex = -1;
let scheduled = false;

function controls(){ return featureData.adminControl || {}; }
function products(){ return Array.isArray(featureData.products) ? featureData.products : []; }
function clean(v){ return String(v == null ? '' : v).trim(); }

function hasAudio(p){
  const mode = clean(p && p.sellerAudioMode || 'off');
  if (mode === 'tts') return !!clean(p && p.sellerAudioText);
  return (mode === 'upload' || mode === 'record') && !!clean(p && p.sellerAudioUrl);
}

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

function playProductAudio(p, btn){
  if (!p || !btn) return;
  if (currentButton === btn) { stopPlayback(); return; }
  stopPlayback();
  currentButton = btn;
  btn.innerHTML = '⏹️ Parar áudio';

  const mode = clean(p.sellerAudioMode || 'off');
  if (mode === 'tts') {
    const text = clean(p.sellerAudioText);
    if (!text) { stopPlayback(); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      u.onend = stopPlayback;
      u.onerror = stopPlayback;
      speechSynthesis.speak(u);
    } catch(e) { stopPlayback(); }
    return;
  }

  const url = clean(p.sellerAudioUrl);
  if (!url) { stopPlayback(); return; }
  try {
    const a = new Audio(url);
    currentAudio = a;
    a.onended = stopPlayback;
    a.onerror = stopPlayback;
    a.play().catch(stopPlayback);
  } catch(e) { stopPlayback(); }
}

function productAt(index){
  const ps = products();
  const i = Number(index);
  return Number.isInteger(i) && i >= 0 && ps[i] ? ps[i] : null;
}

function productForDetail(){
  const ps = products();
  if (activeProductIndex >= 0 && ps[activeProductIndex]) return ps[activeProductIndex];
  const name = clean(document.querySelector('#vsProductBody .vs-detail-name')?.textContent);
  if (!name) return null;
  return ps.find(p => clean(p && p.name) === name) || null;
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
    if (card.querySelector('.virtual-seller-audio-btn')) return;
    const open = card.querySelector('.vs-open[data-product]');
    let index = Number(open && open.dataset.product);
    if (!Number.isInteger(index) || index < 0) index = fallbackIndex;
    const p = ps[index];
    if (!p || !hasAudio(p)) return;
    const host = card.querySelector('.vs-card-img') || card;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(makeButton(p, 'virtual-seller-audio-card'));
  });
}

function addButtonToProductPage(){
  if (controls().sellerAudioPaused) return;
  const body = document.getElementById('vsProductBody');
  if (!body || !body.querySelector('.vs-detail-name')) return;
  if (body.querySelector('.virtual-seller-audio-detail')) return;
  const p = productForDetail();
  if (!p || !hasAudio(p)) return;
  const b = makeButton(p, 'virtual-seller-audio-detail');
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
setTimeout(schedule, 500);
setTimeout(schedule, 1500);
})();
