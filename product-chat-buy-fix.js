/* ChatShop — guarda o produto e abre a página de venda interna correta. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function store(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||{};}
function products(){const d=store();return Array.isArray(d.products)?d.products:[];}
function remember(btn){
  let idx=-1;
  for(const v of [btn?.dataset?.productIndex,btn?.dataset?.chatProduct,btn?.dataset?.product]){const n=Number(v);if(Number.isInteger(n)&&n>=0){idx=n;break;}}
  if(idx<0){
    const card=btn?.closest?.('.csv-card,.vs-card,.pub-slide,.sg-card,.cgc,[data-product-index]');
    if(card?.dataset?.productIndex!=null)idx=Number(card.dataset.productIndex);
    else if(card?.dataset?.i!=null)idx=Number(card.dataset.i);
    else if(card){
      const sel=card.matches('.csv-card')?'.csv-card':card.matches('.vs-card')?'.vs-card':card.matches('.pub-slide')?'.pub-slide':card.matches('.cgc')?'.cgc':'.sg-card';
      idx=$$(sel).indexOf(card);
    }
  }
  if(idx>=0){window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=idx;const p=products()[idx];if(p)window.__CHATSHOP_ACTIVE_PRODUCT=p;}
  return idx;
}
function activeIndex(){const n=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX);return Number.isInteger(n)&&n>=0?n:-1;}
function closeChat(){
  $('#spfProductChat')?.classList.remove('open');
  $('#pubChatOverlay')?.classList.remove('open');
  $('#virtualChatOverlay')?.classList.remove('open');
}
function safeInternalClick(el){
  if(!el||el.tagName==='A')return false;
  el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  return true;
}
function openSalesPage(idx){
  if(typeof window.__CHATSHOP_OPEN_SALES_PRODUCT==='function'){
    try{if(window.__CHATSHOP_OPEN_SALES_PRODUCT(idx)!==false)return true;}catch(err){}
  }
  const csvButton=$(`button.csv-open[data-product="${idx}"]`)||$$('.csv-card')[idx]?.querySelector('button.csv-open');
  if(csvButton&&safeInternalClick(csvButton))return true;
  const vsButton=$(`button.vs-open[data-product="${idx}"]`)||$$('.vs-card')[idx]?.querySelector('button.vs-open');
  if(vsButton&&safeInternalClick(vsButton))return true;
  const sg=$(`.sg-card[data-product-index="${idx}"]`)||$$('.sg-card[data-product-index]')[idx];
  if(sg&&safeInternalClick(sg))return true;
  const cgc=$(`.cgc[data-i="${idx}"]`)||$$('.cgc[data-i]')[idx];
  if(cgc&&safeInternalClick(cgc))return true;
  const slide=$$('#pubFeed .pub-slide')[idx];
  if(slide&&safeInternalClick(slide))return true;
  return false;
}
function withNavigationGuard(fn){
  const oldOpen=window.open;
  let active=true;
  const stopAnchors=e=>{
    if(!active)return;
    const a=e.target?.closest?.('a');
    if(!a)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };
  document.addEventListener('click',stopAnchors,true);
  try{window.open=function(){return null;};}catch(err){}
  try{fn();}finally{
    setTimeout(()=>{
      active=false;
      document.removeEventListener('click',stopAnchors,true);
      try{window.open=oldOpen;}catch(err){}
    },900);
  }
}
document.addEventListener('pointerdown',e=>{
  const seller=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');
  if(seller)remember(seller);
},true);
document.addEventListener('click',function(e){
  const seller=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');
  if(seller)remember(seller);

  const buy=e.target?.closest?.('.spf-chat-product-buy');
  if(!buy)return;
  const d=store();
  if(String(d.storeType||'').toLowerCase()!=='virtual')return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const idx=activeIndex();
  if(idx<0){console.warn('ChatShop: produto do chat não identificado');return;}

  withNavigationGuard(()=>{
    closeChat();
    setTimeout(()=>{
      if(!openSalesPage(idx))console.warn('ChatShop: página de venda interna não encontrada para produto',idx);
    },80);
  });
},true);
})();
