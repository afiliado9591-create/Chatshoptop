/* ChatShop — produto único com até 4 imagens em grade e visualizador em tela cheia. Não altera collect/publicação. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function data(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function products(){const d=data();return Array.isArray(d?.products)?d.products:[]}
function isAffiliateSingle(){return !!$('#pubFeed .pub-slide')&&!document.body?.classList.contains('store-grid-layout')&&!document.body?.classList.contains('chatshop-grid-clean')}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function imagesOf(p){const list=Array.isArray(p?.images)?p.images:[];return [...new Set([p?.image,...list].map(x=>String(x||'').trim()).filter(Boolean))].slice(0,4)}
function ensureStyle(){
  if($('#singleProductGalleryGridStyle'))return;
  const s=document.createElement('style');s.id='singleProductGalleryGridStyle';
  s.textContent=`
  body.chatshop-single-gallery #pubFeed .pub-slide>img{display:none!important}
  body.chatshop-single-gallery #pubFeed .pub-slide{background:#f8fafc!important;align-items:stretch!important}
  .spg-grid{position:absolute;inset:46px 10px 150px 10px;z-index:4;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:8px}
  .spg-grid.spg-one{grid-template-columns:1fr;grid-template-rows:1fr}
  .spg-grid.spg-two{grid-template-columns:1fr 1fr;grid-template-rows:1fr}
  .spg-grid.spg-three{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}.spg-grid.spg-three .spg-thumb:first-child{grid-row:1/3}
  .spg-thumb{border:0;border-radius:15px;overflow:hidden;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.16);padding:0;cursor:pointer;position:relative}
  .spg-thumb img{position:static!important;width:100%!important;height:100%!important;object-fit:contain!important;background:#fff!important;display:block!important}
  .spg-thumb:after{content:'🔍';position:absolute;right:7px;bottom:7px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(17,24,39,.72);color:#fff;font-size:14px}
  body.chatshop-single-gallery .pub-slide-overlay{z-index:8!important;padding:0 12px 84px!important;background:linear-gradient(180deg,transparent 0%,transparent 55%,rgba(255,255,255,.92) 100%)!important;pointer-events:none}
  body.chatshop-single-gallery .pub-slide-textbox{pointer-events:auto;max-width:calc(100% - 84px)!important}
  body.chatshop-single-gallery .spf-aff-actions{z-index:12!important}
  .spg-modal{position:fixed;inset:0;z-index:1600;background:#09090b;display:none;flex-direction:column}.spg-modal.open{display:flex}
  .spg-modal-image-wrap{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:54px 10px 118px}.spg-modal-image{max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;background:#fff}
  .spg-close{position:absolute;top:12px;right:12px;width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.94);font-size:24px;font-weight:900;z-index:2}
  .spg-info{position:absolute;left:12px;right:64px;top:14px;color:#fff;text-shadow:0 1px 4px #000}.spg-info b{display:block;font-size:16px}.spg-info span{font-weight:900;font-size:14px}
  .spg-actions{position:absolute;left:10px;right:10px;bottom:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .spg-actions button,.spg-actions a{border:0;border-radius:13px;padding:12px 8px;text-align:center;text-decoration:none;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;gap:5px;min-height:50px}
  .spg-buy{background:var(--store-buy,var(--store-main,#7A2E3B));color:#fff}.spg-listen,.spg-chat{background:#fff;color:#111827}
  @media(max-width:420px){.spg-grid{inset:42px 8px 154px}.spg-actions button,.spg-actions a{font-size:11px;padding:10px 5px}.spg-modal-image-wrap{padding-bottom:112px}}
  `;
  document.head.appendChild(s);
}
function productText(p){const base=String(p?.voiceText||p?.displayText||p?.cardDescription||p?.description||p?.name||'').trim();return (base||String(p?.name||'Conheça este produto'))+' Se gostou deste produto, toque no botão Comprar.'}
function speak(p,btn){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(productText(p));u.lang='pt-BR';u.rate=1;btn.disabled=true;u.onend=u.onerror=()=>{btn.disabled=false};speechSynthesis.speak(u)}catch(e){btn.disabled=false}}
function ensureModal(){
  let m=$('#spgModal');if(m)return m;
  m=document.createElement('div');m.id='spgModal';m.className='spg-modal';m.innerHTML=`<button type="button" class="spg-close" aria-label="Fechar">×</button><div class="spg-info"><b id="spgName"></b><span id="spgPrice"></span></div><div class="spg-modal-image-wrap"><img id="spgImage" class="spg-modal-image" alt=""></div><div class="spg-actions"><button type="button" class="spg-listen">🔊 Ouvir</button><button type="button" class="spg-chat">💬 Falar</button><a class="spg-buy" target="_blank" rel="noopener">🛒 Comprar</a></div>`;
  document.body.appendChild(m);m.querySelector('.spg-close').onclick=()=>m.classList.remove('open');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});return m;
}
function openImage(p,index,src,slide){
  const m=ensureModal();$('#spgImage',m).src=src;$('#spgImage',m).alt=String(p?.name||'Produto');$('#spgName',m).textContent=String(p?.name||'Produto');$('#spgPrice',m).textContent=String(p?.price||'');
  const buy=$('.spg-buy',m);const original=slide?.querySelector('.pub-slide-buy');buy.href=String(p?.link||original?.href||'#');buy.onclick=e=>{if(original&&(!p?.link||p.link==='#')){e.preventDefault();original.click()}};
  $('.spg-listen',m).onclick=()=>speak(p,$('.spg-listen',m));$('.spg-chat',m).onclick=()=>{m.classList.remove('open');const chat=slide?.querySelector('.spf-aff-chat');if(chat){chat.click();return}window.__CHATSHOP_ACTIVE_PRODUCT=p;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index};m.classList.add('open');
}
function decorate(){
  if(!isAffiliateSingle())return false;ensureStyle();document.body?.classList.add('chatshop-single-gallery');const ps=products();
  $$('#pubFeed .pub-slide').forEach((slide,index)=>{
    const p=ps[index]||{};const imgs=imagesOf(p);if(!imgs.length)return;
    let grid=slide.querySelector('.spg-grid');
    const key=imgs.join('|');if(grid?.dataset.key===key)return;grid?.remove();grid=document.createElement('div');grid.className='spg-grid '+(imgs.length===1?'spg-one':imgs.length===2?'spg-two':imgs.length===3?'spg-three':'spg-four');grid.dataset.key=key;
    imgs.forEach((src,i)=>{const b=document.createElement('button');b.type='button';b.className='spg-thumb';b.setAttribute('aria-label','Abrir imagem '+(i+1));b.innerHTML='<img src="'+esc(src)+'" alt="'+esc(p?.name||'Produto')+'">';b.onclick=e=>{e.preventDefault();e.stopPropagation();openImage(p,index,src,slide)};grid.appendChild(b)});slide.appendChild(grid);
  });return true;
}
function loadBelowCard(){if(document.querySelector('script[data-single-product-card-below]'))return;const s=document.createElement('script');s.src='/single-product-card-below.js?v=20260821-1804';s.defer=true;s.dataset.singleProductCardBelow='1';document.head.appendChild(s)}
function boot(){loadBelowCard();let n=0;const t=setInterval(()=>{n++;decorate();if(n>240)clearInterval(t)},100);if(document.body)new MutationObserver(()=>requestAnimationFrame(decorate)).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',decorate,{once:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
