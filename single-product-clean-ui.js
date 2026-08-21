/* ChatShop — produto único limpo: Comprar, Ouvir descrição e Falar com vendedor; menu opcional. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
let hydratedMenu=false;
function storeData(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function isSingle(){const d=storeData();return d?.storeType==='virtual'&&d?.virtualDisplayMode==='single'}
function menuEnabled(){const d=storeData();return d?.showSingleProductMenu===true}
function ensureStyle(){
  if($('#singleProductCleanUiStyle'))return;
  const style=document.createElement('style');style.id='singleProductCleanUiStyle';
  style.textContent=`
    body.chatshop-virtual-tiktok .vts-share,
    body.chatshop-virtual-tiktok .vts-bag,
    body.chatshop-virtual-tiktok #csvBag,
    body.chatshop-virtual-tiktok .vs-bag,
    body.chatshop-virtual-tiktok .vts-card-category{display:none!important}
    body.chatshop-virtual-tiktok #pubChatToggle{display:none!important}
    body.chatshop-virtual-tiktok .vts-actions{display:flex!important;flex-direction:column!important;gap:10px!important}
    body.chatshop-virtual-tiktok .vts-play{display:grid!important}
    body.chatshop-virtual-tiktok.single-menu-off .vts-categories,
    body.chatshop-virtual-tiktok.single-menu-off .pub-cat-menu,
    body.chatshop-virtual-tiktok.single-menu-off .vcm-menu,
    body.chatshop-virtual-tiktok.single-menu-off .category-menu,
    body.chatshop-virtual-tiktok.single-menu-off .catalog-categories{display:none!important}
  `;
  document.head.appendChild(style);
}
function speakProduct(product,button){
  const text=String(product?.voiceText||product?.displayText||product?.cardDescription||product?.description||product?.name||'').trim();
  if(!text){alert('Este produto ainda não tem uma descrição para ouvir.');return}
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=1;
    if(button){button.classList.add('speaking');const old=button.firstChild?.nodeValue;button.dataset.oldIcon=old||'▶️';if(button.firstChild)button.firstChild.nodeValue='⏸️';u.onend=u.onerror=()=>{button.classList.remove('speaking');if(button.firstChild)button.firstChild.nodeValue=button.dataset.oldIcon||'▶️'}}
    speechSynthesis.speak(u);
  }catch(e){console.warn('Falha ao falar descrição:',e)}
}
function cleanCard(card,index,product){
  const actions=card.querySelector('.vts-actions');if(!actions)return;
  actions.querySelectorAll('.vts-share,.vts-bag').forEach(x=>x.remove());
  let play=actions.querySelector('.vts-play');
  if(!play){
    play=document.createElement('button');play.type='button';play.className='vts-action vts-play';play.innerHTML='▶️<span>Ouvir descrição</span>';
    play.onclick=e=>{e.preventDefault();e.stopPropagation();if(play.classList.contains('speaking')){speechSynthesis.cancel();play.classList.remove('speaking');if(play.firstChild)play.firstChild.nodeValue='▶️';return}window.__CHATSHOP_ACTIVE_PRODUCT=product;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index;speakProduct(product,play)};
    const seller=actions.querySelector('.vts-seller');seller?actions.insertBefore(play,seller):actions.appendChild(play);
  }
  const seller=actions.querySelector('.vts-seller');if(seller){seller.innerHTML='💬<span>Falar com o vendedor</span>'}
  const buy=card.querySelector('.csv-open,.vs-open,[data-product]');if(buy)buy.textContent='Comprar';
}
function applyPublic(){
  if(!isSingle()&&!document.body?.classList.contains('chatshop-virtual-tiktok'))return false;
  ensureStyle();
  document.body?.classList.toggle('single-menu-off',!menuEnabled());
  const d=storeData(),products=Array.isArray(d?.products)?d.products:[];
  $$('.csv-card,.vs-card').forEach((card,i)=>cleanCard(card,i,products[i]||{}));
  if(!menuEnabled())$$('.vts-categories,.pub-cat-menu,.vcm-menu,.category-menu,.catalog-categories').forEach(x=>x.style.setProperty('display','none','important'));
  return true;
}
function ensureEditor(){
  const box=$('#virtualSingleProductField');if(!box||$('#singleProductMenuField'))return false;
  const row=document.createElement('label');row.id='singleProductMenuField';row.style.cssText='display:flex;gap:8px;align-items:flex-start;background:#fff;border:1px solid #d1fae5;border-radius:10px;padding:10px;margin-top:8px';
  row.innerHTML='<input id="showSingleProductMenu" type="checkbox"><span><b>☰ Mostrar menu na tela de produto único</b><small style="display:block;color:#6b7280">Opcional. Desmarcado deixa a tela somente com produto, Comprar, Ouvir descrição e Falar com o vendedor.</small></span>';
  box.appendChild(row);
  const input=$('#showSingleProductMenu');
  input.checked=storeData()?.showSingleProductMenu===true;
  input.addEventListener('change',()=>{try{window.debounce?.()}catch(e){}});
  hydratedMenu=true;
  return true;
}
function wrapEditor(){
  ensureEditor();
  if(typeof window.collect==='function'&&!window.collect.__singleProductMenuWrapped){
    const old=window.collect;const fn=function(){const value=old();value.showSingleProductMenu=$('#showSingleProductMenu')?.checked===true;return value};fn.__singleProductMenuWrapped=true;window.collect=fn;try{collect=fn}catch(e){}
  }
  if(typeof window.populateForm==='function'&&!window.populateForm.__singleProductMenuWrapped){
    const old=window.populateForm;const fn=async function(value){const result=await old(value);setTimeout(()=>{ensureEditor();const input=$('#showSingleProductMenu');if(input)input.checked=value?.showSingleProductMenu===true},0);return result};fn.__singleProductMenuWrapped=true;window.populateForm=fn;try{populateForm=fn}catch(e){}
  }
}
function boot(){
  let tries=0;const timer=setInterval(()=>{tries++;wrapEditor();applyPublic();if(tries>120)clearInterval(timer)},120);
  if(document.body)new MutationObserver(()=>requestAnimationFrame(applyPublic)).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

(function(){
'use strict';
function loadCarousel(){
  if(document.querySelector('script[data-single-product-carousel]'))return;
  const s=document.createElement('script');s.src='/single-product-carousel-clean.js?v=20260821-0918';s.defer=true;s.dataset.singleProductCarousel='1';document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCarousel,{once:true});else loadCarousel();
})();

(function(){
'use strict';
function loadFocus(){
  if(document.querySelector('script[data-single-product-focus-v2]'))return;
  const s=document.createElement('script');s.src='/single-product-focus-v2.js?v=20260821-1040';s.defer=true;s.dataset.singleProductFocusV2='1';document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadFocus,{once:true});else loadFocus();
})();

(function(){
'use strict';
function loadFinalCleanup(){
  const old=document.querySelector('script[data-single-product-final-cleanup]');if(old)old.remove();
  const s=document.createElement('script');s.src='/single-product-final-cleanup.js?v=20260821-1248';s.defer=true;s.dataset.singleProductFinalCleanup='1';document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadFinalCleanup,{once:true});else loadFinalCleanup();
})();

(function(){
'use strict';
function loadGalleryGrid(){
  const old=document.querySelector('script[data-single-product-gallery-grid]');if(old)old.remove();
  const s=document.createElement('script');s.src='/single-product-gallery-grid.js?v=20260821-1519-reference';s.defer=true;s.dataset.singleProductGalleryGrid='1';document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadGalleryGrid,{once:true});else loadGalleryGrid();
})();

(function(){
'use strict';
function loadKeyboardFix(){
  if(document.querySelector('script[data-product-chat-keyboard-fix]'))return;
  const s=document.createElement('script');s.src='/product-chat-keyboard-fix.js?v=20260821-1710';s.defer=true;s.dataset.productChatKeyboardFix='1';document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadKeyboardFix,{once:true});else loadKeyboardFix();
})();
