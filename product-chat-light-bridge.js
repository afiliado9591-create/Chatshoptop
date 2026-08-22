/* ChatShop — ponte entre botão do produto e chat leve com contexto completo. */
(function(){
'use strict';
function store(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function products(){const d=store();return Array.isArray(d?.products)?d.products:[]}
function productIndexFromButton(btn){
  const candidates=[btn?.dataset?.productIndex,btn?.dataset?.chatProduct,btn?.dataset?.product];
  for(const value of candidates){const n=Number(value);if(Number.isInteger(n)&&n>=0)return n;}
  const card=btn?.closest?.('[data-product-index],.csv-card,.vs-card,.pub-slide,.sg-card,.cgc');
  if(!card)return -1;
  if(card.dataset?.productIndex!=null){const n=Number(card.dataset.productIndex);if(Number.isInteger(n)&&n>=0)return n;}
  if(card.dataset?.i!=null){const n=Number(card.dataset.i);if(Number.isInteger(n)&&n>=0)return n;}
  const selector=card.matches('.pub-slide')?'.pub-slide':card.matches('.csv-card')?'.csv-card':card.matches('.vs-card')?'.vs-card':card.matches('.sg-card')?'.sg-card':card.matches('.cgc')?'.cgc':'.csv-card,.vs-card';
  return Array.from(document.querySelectorAll(selector)).indexOf(card);
}
function openFromButton(btn){
  const index=productIndexFromButton(btn);if(index<0)return false;
  const p=products()[index]||null;if(!p)return false;
  window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index;
  window.__CHATSHOP_ACTIVE_PRODUCT=p;
  if(typeof window.__CHATSHOP_OPEN_PRODUCT_CHAT!=='function')return false;
  try{
    window.__CHATSHOP_OPEN_PRODUCT_CHAT(p,index);
  }catch(err){
    try{window.__CHATSHOP_OPEN_PRODUCT_CHAT(index)}catch(e){return false}
  }
  return true;
}
document.addEventListener('pointerdown',function(e){
  const btn=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');
  if(!btn)return;
  const index=productIndexFromButton(btn);const p=index>=0?products()[index]:null;
  if(p){window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index;window.__CHATSHOP_ACTIVE_PRODUCT=p;}
},true);
document.addEventListener('click',function(e){
  const btn=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');if(!btn)return;
  if(openFromButton(btn)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
},true);
})();
