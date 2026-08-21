/* ChatShop — limpeza final da página de 1 produto por tela. Não toca em collect/publicação. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function isSingle(){
  const d=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null;
  return document.body?.classList.contains('chatshop-virtual-tiktok') || (d?.storeType==='virtual'&&d?.virtualDisplayMode==='single');
}
function ensureStyle(){
  if($('#singleProductFinalCleanupStyle'))return;
  const s=document.createElement('style');s.id='singleProductFinalCleanupStyle';
  s.textContent=`
    body.chatshop-virtual-tiktok footer,
    body.chatshop-virtual-tiktok #footer,
    body.chatshop-virtual-tiktok .footer,
    body.chatshop-virtual-tiktok .site-footer,
    body.chatshop-virtual-tiktok .store-footer,
    body.chatshop-virtual-tiktok .csv-footer,
    body.chatshop-virtual-tiktok .vs-footer,
    body.chatshop-virtual-tiktok .rodape,
    body.chatshop-virtual-tiktok #rodape,
    body.chatshop-virtual-tiktok [data-footer],
    body.chatshop-virtual-tiktok #pubChatToggle,
    body.chatshop-virtual-tiktok .global-chat-toggle,
    body.chatshop-virtual-tiktok .general-chat-button,
    body.chatshop-virtual-tiktok .vts-share,
    body.chatshop-virtual-tiktok .vts-bag,
    body.chatshop-virtual-tiktok #csvBag,
    body.chatshop-virtual-tiktok .vs-bag{display:none!important}
    body.chatshop-virtual-tiktok{padding-bottom:0!important;margin-bottom:0!important;min-height:100dvh!important}
    body.chatshop-virtual-tiktok .csv-page,
    body.chatshop-virtual-tiktok .vs-page,
    body.chatshop-virtual-tiktok .csv-grid,
    body.chatshop-virtual-tiktok .vs-grid,
    body.chatshop-virtual-tiktok .csv-card,
    body.chatshop-virtual-tiktok .vs-card{margin-bottom:0!important;padding-bottom:0!important}
  `;
  document.head.appendChild(s);
}
function cleanupCard(card){
  const primary=card.querySelector('.csv-open,.vs-open');
  if(primary){primary.textContent='Comprar';primary.style.removeProperty('display')}
  card.querySelectorAll('button,a').forEach(el=>{
    if(el===primary||el.closest('.vts-play')||el.closest('.vts-seller'))return;
    if(el.classList.contains('vts-play')||el.classList.contains('vts-seller'))return;
    const t=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(/^(comprar|comprar agora|adicionar|adicionar à sacola|adicionar a sacola)$/.test(t) || t.includes('compartilhar') || t.includes('fale com o vendedor') || t.includes('conversar sobre este produto')){
      el.style.setProperty('display','none','important');
    }
  });
  const actions=card.querySelector('.vts-actions');
  if(actions){
    actions.querySelectorAll('.vts-share,.vts-bag').forEach(x=>x.style.setProperty('display','none','important'));
    const play=actions.querySelector('.vts-play');if(play){play.style.removeProperty('display');const sp=play.querySelector('span');if(sp)sp.textContent='Ouvir sobre o produto'}
    const seller=actions.querySelector('.vts-seller');if(seller){seller.style.removeProperty('display');const sp=seller.querySelector('span');if(sp)sp.textContent='Falar sobre este produto'}
  }
}
function apply(){
  if(!isSingle())return false;
  ensureStyle();
  document.body?.classList.add('chatshop-single-final-clean');
  const global=$('#pubChatToggle');if(global)global.style.setProperty('display','none','important');
  $$('footer,#footer,.footer,.site-footer,.store-footer,.csv-footer,.vs-footer,.rodape,#rodape,[data-footer]').forEach(x=>x.style.setProperty('display','none','important'));
  $$('.csv-card,.vs-card').forEach(cleanupCard);
  return true;
}
function boot(){
  let n=0;const timer=setInterval(()=>{n++;apply();if(n>160)clearInterval(timer)},100);
  if(document.body)new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',apply,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
