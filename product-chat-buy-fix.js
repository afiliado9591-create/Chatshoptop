/* Compra do chat controlada exclusivamente por product-chat-card.js. */
(function(){
'use strict';
document.addEventListener('pointerdown',function(e){
  const btn=e.target&&e.target.closest&&e.target.closest('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');
  if(!btn)return;
  const d=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||{};
  const list=Array.isArray(d.products)?d.products:[];
  let idx=Number(btn.dataset.productIndex||btn.dataset.chatProduct||btn.dataset.product);
  if(!Number.isInteger(idx)||idx<0){
    const card=btn.closest('.csv-card,.vs-card,.pub-slide,.sg-card,.cgc');
    if(card){
      const all=Array.from(document.querySelectorAll(card.matches('.csv-card')?'.csv-card':card.matches('.vs-card')?'.vs-card':card.matches('.pub-slide')?'.pub-slide':card.matches('.cgc')?'.cgc':'.sg-card'));
      idx=all.indexOf(card);
    }
  }
  if(Number.isInteger(idx)&&idx>=0){
    window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=idx;
    if(list[idx])window.__CHATSHOP_ACTIVE_PRODUCT=list[idx];
  }
},true);
})();
