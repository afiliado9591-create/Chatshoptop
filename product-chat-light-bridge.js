/* ChatShop — ponte mínima entre botão do produto e chat leve. */
(function(){
'use strict';
function store(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function products(){const d=store();return Array.isArray(d?.products)?d.products:[]}
function productIndexFromButton(btn){
  const direct=Number(btn?.dataset?.productIndex);if(Number.isFinite(direct))return direct;
  const card=btn?.closest?.('.csv-card,.vs-card,.pub-slide');if(!card)return -1;
  const list=Array.from(document.querySelectorAll(card.matches('.pub-slide')?'.pub-slide':'.csv-card,.vs-card'));
  return list.indexOf(card);
}
function openFromButton(btn){
  const index=productIndexFromButton(btn);if(index<0)return false;
  const p=products()[index]||window.__CHATSHOP_ACTIVE_PRODUCT||{};
  if(typeof window.__CHATSHOP_OPEN_PRODUCT_CHAT!=='function')return false;
  window.__CHATSHOP_OPEN_PRODUCT_CHAT(p,index);return true;
}
document.addEventListener('click',function(e){
  const btn=e.target?.closest?.('.spr-chat,.vts-seller');if(!btn)return;
  if(openFromButton(btn)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
},true);
})();
