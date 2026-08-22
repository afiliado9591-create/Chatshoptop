/* ChatShop — mantém o produto específico do chat e aciona a compra correta na Loja Virtual. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
let lastProductIndex=-1;

function store(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||{};}
function products(){const d=store();return Array.isArray(d?.products)?d.products:[];}
function indexFromButton(btn){
  for(const v of [btn?.dataset?.productIndex,btn?.dataset?.chatProduct,btn?.dataset?.product]){
    const n=Number(v);if(Number.isInteger(n)&&n>=0)return n;
  }
  const card=btn?.closest?.('[data-product-index],.csv-card,.vs-card,.pub-slide,.sg-card,.cgc');
  if(!card)return -1;
  if(card.dataset?.productIndex!=null){const n=Number(card.dataset.productIndex);if(Number.isInteger(n)&&n>=0)return n;}
  if(card.dataset?.i!=null){const n=Number(card.dataset.i);if(Number.isInteger(n)&&n>=0)return n;}
  const sel=card.matches('.pub-slide')?'.pub-slide':card.matches('.csv-card')?'.csv-card':card.matches('.vs-card')?'.vs-card':card.matches('.sg-card')?'.sg-card':card.matches('.cgc')?'.cgc':'.csv-card,.vs-card';
  return $$(sel).indexOf(card);
}
function rememberProduct(btn){
  const idx=indexFromButton(btn);if(idx<0)return;
  lastProductIndex=idx;
  window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=idx;
  const p=products()[idx];if(p)window.__CHATSHOP_ACTIVE_PRODUCT=p;
}
function activeIndex(){
  const n=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX);
  if(Number.isInteger(n)&&n>=0)return n;
  return lastProductIndex>=0?lastProductIndex:0;
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
  if(card){
    card.click();
    setTimeout(()=>{
      const detail=$('.sg-detail-wrap,.csv-detail,.vs-detail,#csvProductBody,#vsProductBody');
      const detailBuy=detail?.querySelector?.('.csv-open,.vs-open,.spr-buy,.pub-slide-buy,.sg-buy,.cgc-buy,[data-product]:not([data-product-chat]),button[data-buy],a[data-buy]');
      if(detailBuy)detailBuy.click();
    },120);
    return true;
  }
  return false;
}

/* Guarda o produto ANTES de qualquer outro código abrir o chat. */
document.addEventListener('pointerdown',function(e){
  const btn=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');
  if(btn)rememberProduct(btn);
},true);
document.addEventListener('click',function(e){
  const seller=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');
  if(seller)rememberProduct(seller);
},true);

document.addEventListener('click',function(e){
  const btn=e.target?.closest?.('.spf-chat-product-buy');
  if(!btn)return;
  const d=store();
  if(String(d.storeType||'').toLowerCase()!=='virtual')return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const idx=activeIndex();
  closeProductChat();
  requestAnimationFrame(()=>{
    if(!clickRealProduct(idx))console.warn('ChatShop: botão de compra do produto não encontrado para índice',idx);
  });
},true);
})();
