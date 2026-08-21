/* ChatShop — limpeza final da página de 1 produto por tela. Não toca em collect/publicação. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function data(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function isVirtualSingle(){const d=data();return document.body?.classList.contains('chatshop-virtual-tiktok')||(d?.storeType==='virtual'&&d?.virtualDisplayMode==='single')}
function isAffiliateSingle(){return !!$('#pubFeed .pub-slide')&&!document.body?.classList.contains('store-grid-layout')&&!document.body?.classList.contains('chatshop-grid-clean')}
function isSingle(){return isVirtualSingle()||isAffiliateSingle()}
function ensureStyle(){
  if($('#singleProductFinalCleanupStyle'))return;
  const s=document.createElement('style');s.id='singleProductFinalCleanupStyle';
  s.textContent=`
    body.chatshop-single-final-clean footer,
    body.chatshop-single-final-clean #footer,
    body.chatshop-single-final-clean .footer,
    body.chatshop-single-final-clean .site-footer,
    body.chatshop-single-final-clean .store-footer,
    body.chatshop-single-final-clean .csv-footer,
    body.chatshop-single-final-clean .vs-footer,
    body.chatshop-single-final-clean .rodape,
    body.chatshop-single-final-clean #rodape,
    body.chatshop-single-final-clean [data-footer],
    body.chatshop-single-final-clean #pubChatToggle,
    body.chatshop-single-final-clean .pub-chat-toggle,
    body.chatshop-single-final-clean .global-chat-toggle,
    body.chatshop-single-final-clean .general-chat-button,
    body.chatshop-virtual-tiktok .vts-share,
    body.chatshop-virtual-tiktok .vts-bag,
    body.chatshop-virtual-tiktok #csvBag,
    body.chatshop-virtual-tiktok .vs-bag{display:none!important}
    body.chatshop-single-final-clean{padding-bottom:0!important;margin-bottom:0!important;min-height:100dvh!important}
    body.chatshop-single-final-clean #pubFeed{height:100dvh!important;margin:0!important;padding:0!important}
    body.chatshop-single-final-clean .pub-slide{height:100dvh!important;min-height:100dvh!important;margin:0!important;padding-bottom:0!important}
    body.chatshop-single-final-clean .spf-aff-actions{position:absolute;right:14px;bottom:112px;z-index:18;display:flex;flex-direction:column;gap:10px;align-items:center}
    body.chatshop-single-final-clean .spf-aff-btn{width:56px;height:56px;border:0;border-radius:50%;background:rgba(255,255,255,.96);color:#111827;box-shadow:0 4px 16px rgba(0,0,0,.28);font-size:22px;display:grid;place-items:center;cursor:pointer;position:relative}
    body.chatshop-single-final-clean .spf-aff-btn span{position:absolute;right:64px;background:rgba(17,24,39,.86);color:#fff;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;opacity:0;pointer-events:none}
    body.chatshop-single-final-clean .spf-aff-btn:active span,body.chatshop-single-final-clean .spf-aff-btn:focus span{opacity:1}
    @media(max-width:560px){body.chatshop-single-final-clean .spf-aff-actions{right:10px;bottom:105px}body.chatshop-single-final-clean .spf-aff-btn{width:52px;height:52px}}
  `;
  document.head.appendChild(s);
}
function productText(p){
  const base=String(p?.voiceText||p?.displayText||p?.cardDescription||p?.description||p?.name||'').trim();
  return (base||String(p?.name||'Conheça este produto'))+' Se gostou deste produto, toque no botão Comprar para continuar a compra.';
}
function speak(p,btn){
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(productText(p));u.lang='pt-BR';u.rate=1;btn?.classList.add('speaking');u.onend=u.onerror=()=>btn?.classList.remove('speaking');speechSynthesis.speak(u)}catch(e){console.warn('Voz do produto:',e)}
}
function openProductChat(p,index){
  window.__CHATSHOP_ACTIVE_PRODUCT=p;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index;
  const trigger=$('#pubChatToggle');
  if(trigger){trigger.dataset.productIndex=String(index);trigger.dataset.productName=String(p?.name||'');trigger.click();return}
  const overlay=$('.pub-chat-overlay');if(overlay)overlay.classList.add('open');
}
function cleanupVirtual(card){
  const primary=card.querySelector('.csv-open,.vs-open');
  if(primary){primary.textContent='Comprar';primary.style.removeProperty('display')}
  card.querySelectorAll('button,a').forEach(el=>{
    if(el===primary||el.closest('.vts-play')||el.closest('.vts-seller'))return;
    if(el.classList.contains('vts-play')||el.classList.contains('vts-seller'))return;
    const t=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(/^(comprar|comprar agora|adicionar|adicionar à sacola|adicionar a sacola)$/.test(t)||t.includes('compartilhar')||t.includes('fale com o vendedor')||t.includes('conversar sobre este produto'))el.style.setProperty('display','none','important');
  });
}
function cleanupAffiliate(){
  const d=data(),products=Array.isArray(d?.products)?d.products:[];
  $$('#pubFeed .pub-slide').forEach((slide,index)=>{
    const p=products[index]||{};
    const buy=slide.querySelector('.pub-slide-buy');if(buy){buy.textContent='Comprar';buy.style.removeProperty('display')}
    slide.querySelectorAll('button,a').forEach(el=>{
      if(el===buy||el.closest('.spf-aff-actions'))return;
      const t=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(t.includes('ouvir')||t.includes('conversar sobre este produto')||t.includes('fale com o vendedor')||t==='comprar'||t==='comprar agora')el.style.setProperty('display','none','important');
    });
    let actions=slide.querySelector('.spf-aff-actions');
    if(!actions){actions=document.createElement('div');actions.className='spf-aff-actions';slide.appendChild(actions)}
    let play=actions.querySelector('.spf-aff-play');
    if(!play){play=document.createElement('button');play.type='button';play.className='spf-aff-btn spf-aff-play';actions.appendChild(play)}
    play.innerHTML='🔊<span>Ouvir sobre o produto</span>';play.onclick=e=>{e.preventDefault();e.stopPropagation();speak(p,play)};
    let chat=actions.querySelector('.spf-aff-chat');
    if(!chat){chat=document.createElement('button');chat.type='button';chat.className='spf-aff-btn spf-aff-chat';actions.appendChild(chat)}
    chat.innerHTML='💬<span>Falar sobre este produto</span>';chat.onclick=e=>{e.preventDefault();e.stopPropagation();openProductChat(p,index)};
  });
}
function apply(){
  if(!isSingle())return false;
  ensureStyle();document.body?.classList.add('chatshop-single-final-clean');
  const global=$('#pubChatToggle');if(global)global.style.setProperty('display','none','important');
  $$('footer,#footer,.footer,.site-footer,.store-footer,.csv-footer,.vs-footer,.rodape,#rodape,[data-footer]').forEach(x=>x.style.setProperty('display','none','important'));
  if(isVirtualSingle())$$('.csv-card,.vs-card').forEach(cleanupVirtual);
  if(isAffiliateSingle())cleanupAffiliate();
  return true;
}
function boot(){let n=0;const timer=setInterval(()=>{n++;apply();if(n>240)clearInterval(timer)},100);if(document.body)new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',apply,{once:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
