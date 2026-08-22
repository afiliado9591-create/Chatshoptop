/* ChatShop — corrige Comprar agora no chat para acionar o mesmo produto na Loja Virtual. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));

function activeIndex(){
  const n=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX);
  return Number.isInteger(n)&&n>=0?n:0;
}
function closeProductChat(){
  $('#spfProductChat')?.classList.remove('open');
  $('#pubChatOverlay')?.classList.remove('open');
  $('#virtualChatOverlay')?.classList.remove('open');
}
function productCard(idx){
  return $(`.sg-card[data-product-index="${idx}"]`)
    || $(`.cgc[data-i="${idx}"]`)
    || $(`.csv-card[data-product-index="${idx}"]`)
    || $(`.vs-card[data-product-index="${idx}"]`)
    || $$('.csv-card')[idx]
    || $$('.vs-card')[idx]
    || $$('#pubFeed .pub-slide')[idx]
    || null;
}
function realBuy(card){
  if(!card)return null;
  return card.querySelector('.csv-open,.vs-open,.spr-buy,.pub-slide-buy,.sg-buy,.cgc-buy,[data-product]:not([data-product-chat]),button[data-buy],a[data-buy]');
}
function clickRealProduct(idx){
  let card=productCard(idx);
  let buy=realBuy(card);
  if(buy){buy.click();return true;}

  /* Alguns layouts só criam o botão Comprar depois de abrir os detalhes. */
  if(card){
    card.click();
    setTimeout(()=>{
      const detail=$('.sg-detail-wrap,.csv-detail,.vs-detail,#csvProductBody,#vsProductBody');
      const detailBuy=detail?.querySelector?.('.csv-open,.vs-open,.spr-buy,.pub-slide-buy,.sg-buy,.cgc-buy,[data-product]:not([data-product-chat]),button[data-buy],a[data-buy]');
      if(detailBuy)detailBuy.click();
    },100);
    return true;
  }
  return false;
}

document.addEventListener('click',function(e){
  const btn=e.target?.closest?.('.spf-chat-product-buy');
  if(!btn)return;
  const d=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||{};
  if(String(d.storeType||'').toLowerCase()!=='virtual')return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const idx=activeIndex();
  closeProductChat();
  requestAnimationFrame(()=>{
    if(!clickRealProduct(idx)){
      /* Nunca envia para a home como fallback. Mantém o cliente na loja se o botão não existir. */
      console.warn('ChatShop: botão de compra do produto não encontrado para índice',idx);
    }
  });
},true);
})();
