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
  if(idx<0){const card=btn?.closest?.('.csv-card,.vs-card,.pub-slide,.sg-card,.cgc,[data-product-index]');if(card?.dataset?.productIndex!=null)idx=Number(card.dataset.productIndex);else if(card?.dataset?.i!=null)idx=Number(card.dataset.i);else if(card){const sel=card.matches('.csv-card')?'.csv-card':card.matches('.vs-card')?'.vs-card':card.matches('.pub-slide')?'.pub-slide':card.matches('.cgc')?'.cgc':'.sg-card';idx=$$(sel).indexOf(card);}}
  if(idx>=0){window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=idx;const p=products()[idx];if(p)window.__CHATSHOP_ACTIVE_PRODUCT=p;}
  return idx;
}
function activeIndex(){const n=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX);return Number.isInteger(n)&&n>=0?n:-1;}
function closeChat(){$('#spfProductChat')?.classList.remove('open');$('#pubChatOverlay')?.classList.remove('open');$('#virtualChatOverlay')?.classList.remove('open');}
function openSalesPage(idx){
  const selectors=[`button.csv-open[data-product="${idx}"]`,`button.vs-open[data-product="${idx}"]`];
  for(const sel of selectors){const b=$(sel);if(b){b.click();return true;}}
  const csv=$$('.csv-card')[idx];const cb=csv?.querySelector('button.csv-open[data-product],button.csv-open');if(cb){cb.click();return true;}
  const vs=$$('.vs-card')[idx];const vb=vs?.querySelector('button.vs-open[data-product],button.vs-open');if(vb){vb.click();return true;}
  return false;
}
document.addEventListener('pointerdown',e=>{const seller=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');if(seller)remember(seller);},true);
document.addEventListener('click',function(e){
  const seller=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');if(seller)remember(seller);
  const buy=e.target?.closest?.('.spf-chat-product-buy');if(!buy)return;
  const d=store();if(String(d.storeType||'').toLowerCase()!=='virtual')return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const idx=activeIndex();if(idx<0){console.warn('ChatShop: produto do chat não identificado');return;}
  closeChat();requestAnimationFrame(()=>{if(!openSalesPage(idx))console.warn('ChatShop: página de venda interna não encontrada para produto',idx);});
},true);
})();
