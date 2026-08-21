/* ChatShop — cartão do produto abaixo da galeria no modo produto único. Não altera collect/publicação. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function data(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function products(){const d=data();return Array.isArray(d?.products)?d.products:[]}
function isSingle(){return !!$('#pubFeed .pub-slide')&&!document.body?.classList.contains('store-grid-layout')&&!document.body?.classList.contains('chatshop-grid-clean')}
function ensureStyle(){if($('#singleProductBelowCardStyle'))return;const s=document.createElement('style');s.id='singleProductBelowCardStyle';s.textContent=`body.chatshop-single-gallery .spg-grid{bottom:220px!important}body.chatshop-single-gallery .spg-product-card{position:absolute;left:12px;right:12px;bottom:112px;z-index:11;background:rgba(255,255,255,.96);border-radius:16px;padding:13px 15px;box-shadow:0 5px 18px rgba(0,0,0,.18);border:1px solid rgba(0,0,0,.06);display:flex;align-items:center;gap:12px}body.chatshop-single-gallery .spg-product-card-main{min-width:0;flex:1}body.chatshop-single-gallery .spg-product-card-name{display:block;color:#111827!important;text-shadow:none!important;font-size:16px!important;line-height:1.25;font-weight:900;white-space:normal;overflow-wrap:anywhere}body.chatshop-single-gallery .spg-product-card-price{display:block;color:var(--store-price,var(--store-main,#7A2E3B))!important;text-shadow:none!important;font-size:16px!important;font-weight:900;margin-top:5px}body.chatshop-single-gallery .spg-product-card-hint{font-size:11px;color:#6b7280;margin-top:4px}body.chatshop-single-gallery .pub-slide-overlay{display:none!important}@media(max-width:420px){body.chatshop-single-gallery .spg-grid{bottom:214px!important}.spg-product-card{bottom:108px!important;padding:12px!important}.spg-product-card-name{font-size:15px!important}}`;document.head.appendChild(s)}
function decorate(){if(!isSingle())return false;ensureStyle();const ps=products();$$('#pubFeed .pub-slide').forEach((slide,index)=>{const p=ps[index]||{};let card=slide.querySelector('.spg-product-card');if(!card){card=document.createElement('div');card.className='spg-product-card';slide.appendChild(card)}card.innerHTML='<div class="spg-product-card-main"><span class="spg-product-card-name"></span><span class="spg-product-card-price"></span><div class="spg-product-card-hint">Toque em uma imagem para ampliar e ver as opções</div></div>';card.querySelector('.spg-product-card-name').textContent=String(p?.name||'Produto');card.querySelector('.spg-product-card-price').textContent=String(p?.price||'Consulte')});return true}
function forceCloseGalleryModal(){
  const modal=$('#spgModal');
  if(modal){modal.classList.remove('open');modal.style.setProperty('display','none','important');modal.setAttribute('aria-hidden','true')}
  if(document.body){document.body.classList.remove('spg-modal-open');document.body.style.removeProperty('overflow');document.body.style.removeProperty('touch-action');document.body.style.removeProperty('position');document.body.style.removeProperty('width')}
  document.documentElement?.style.removeProperty('overflow');
  try{speechSynthesis.cancel()}catch(e){}
}
function installModalUnfreeze(){
  if(window.__spgModalUnfreezeInstalled)return;window.__spgModalUnfreezeInstalled=true;
  const handler=e=>{const close=e.target?.closest?.('.spg-close');if(!close)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();forceCloseGalleryModal()};
  ['touchstart','touchend','pointerdown','pointerup','click'].forEach(ev=>document.addEventListener(ev,handler,true));
  window.addEventListener('pageshow',()=>{if(!$('#spgModal')?.classList.contains('open'))forceCloseGalleryModal()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!$('#spgModal')?.classList.contains('open'))forceCloseGalleryModal()});
}
function boot(){installModalUnfreeze();let n=0;const t=setInterval(()=>{n++;decorate();if(n>240)clearInterval(t)},100);if(document.body)new MutationObserver(()=>requestAnimationFrame(decorate)).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',decorate,{once:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
